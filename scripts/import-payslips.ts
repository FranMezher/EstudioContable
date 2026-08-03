import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { detectPayslip } from "./lib/parse-payslip";
import { resolveFolder } from "./lib/resolve-folder";

/**
 * ---------------------------------------------------------------------------
 * IMPORTADOR DE LA CARPETA MENSUAL DE RECIBOS
 * ---------------------------------------------------------------------------
 *
 * Lo corre el estudio. Habla con la app por la API REST, no con la base: la
 * PC solo guarda una API key (revocable con un clic), en vez de las
 * credenciales de Postgres y de Blob, que son mucho más peligrosas.
 *
 * Por defecto SIMULA: informa qué haría sin cargar nada. Para importar de
 * verdad hay que agregar --confirmar. Es a propósito: en PowerShell, `npm run`
 * se come los flags, y así el error siempre cae del lado seguro.
 *
 *   npx tsx scripts/import-payslips.ts                → simulación
 *   npx tsx scripts/import-payslips.ts --confirmar    → importa de verdad
 *   npx tsx scripts/import-payslips.ts --confirmar --periodo 2026-06
 *   npx tsx scripts/import-payslips.ts --confirmar --empresa "Acme SRL"
 *
 * Se configura UNA sola vez en el .env de esa PC:
 *   API_KEY        (único obligatorio) key de acceso total, Configuración → API keys
 *   RECIBOS_ROOT   carpeta raíz a recorrer (o se pasa --carpeta)
 *   API_URL        solo si el portal cambia de dirección (ver DEFAULT_API_URL)
 *
 * El mapa carpeta → empresa vive en scripts/import.config.json.
 */

/** Dirección del portal. Se puede pisar con API_URL en el .env. */
const DEFAULT_API_URL = "https://estudio-contable-mu.vercel.app";

type Config = {
  /** Nombre de carpeta (en minúsculas) → id o CUIT de la empresa. */
  companies: Record<string, string>;
};

type ItemStatus = "OK" | "DUPLICADO" | "SIN_EMPLEADO" | "SIN_EMPRESA" | "SIN_PERIODO" | "ERROR";

type Reporte = {
  fileName: string;
  status: ItemStatus;
  message?: string;
  detectedCuil?: string | null;
  detectedLegajo?: string | null;
  detectedCompany?: string | null;
  periodMonth?: number | null;
  periodYear?: number | null;
  employeeId?: string | null;
  payslipId?: string | null;
};

// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    // Falla seguro: si el flag no llega (PowerShell se come los flags de
    // `npm run`), lo peor que pasa es que simule en vez de importar.
    dryRun: !args.includes("--confirmar"),
    periodo: get("--periodo"),
    empresa: get("--empresa"),
    root: get("--carpeta") ?? process.env.RECIBOS_ROOT,
  };
}

async function loadConfig(): Promise<Config> {
  const file = path.join(process.cwd(), "scripts", "import.config.json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as Config;
  } catch {
    console.warn(`⚠️  No encontré ${file}. Se van a resolver las empresas solo por CUIT.`);
    return { companies: {} };
  }
}

/** Recorre la carpeta buscando PDFs. */
async function findPdfs(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findPdfs(full)));
    else if (entry.name.toLowerCase().endsWith(".pdf")) out.push(full);
  }
  return out;
}

/** La empresa sale del nombre de alguna carpeta del camino. */
function resolveCompanyRef(filePath: string, root: string, config: Config): string | null {
  const rel = path.relative(root, filePath);
  const partes = rel.split(path.sep).slice(0, -1);
  for (const parte of partes.reverse()) {
    const ref = config.companies[parte.toLowerCase().trim()];
    if (ref) return ref;
  }
  return null;
}

// ---------------------------------------------------------------------------

class Api {
  constructor(
    private base: string,
    private key: string
  ) {}

  private async call<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base.replace(/\/$/, "")}/api/v1${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: T;
      error?: { message: string };
    };
    if (!res.ok && res.status !== 207) {
      throw new Error(json.error?.message ?? `HTTP ${res.status}`);
    }
    return json.data as T;
  }

  me() {
    return this.call<{ scope: string }>("GET", "/me");
  }

  startRun(sourceLabel: string, isDryRun: boolean) {
    return this.call<{ id: string }>("POST", "/import-runs", { sourceLabel, isDryRun });
  }

  finishRun(runId: string, items: Reporte[]) {
    return this.call<{ createdCount: number }>("POST", `/import-runs/${runId}/finish`, { items });
  }

  importPayslip(payload: Record<string, unknown>) {
    return this.call<{ status: "OK" | "DUPLICADO"; payslipId?: string; employeeId: string }>(
      "POST",
      "/payslips/import",
      payload
    );
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  // La URL del portal es siempre la misma, así que va por defecto: lo único
  // que hay que configurar en la PC del estudio es API_KEY.
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  const apiKey = process.env.API_KEY;

  if (!args.root) {
    throw new Error(
      "Falta indicar la carpeta. Poné RECIBOS_ROOT en el .env o pasá --carpeta <ruta>.\n" +
        '   Con npm hay que separar los flags con "--":\n' +
        '     npm run import:recibos -- --carpeta "ejemplos-recibos" --dry-run'
    );
  }

  const root = resolveFolder(path.resolve(args.root));
  const config = await loadConfig();

  // En simulación no se sube nada, así que no se necesita API: sirve para
  // probar el reconocimiento sin API key. Solo la carga real la exige.
  const api = apiKey ? new Api(apiUrl, apiKey) : null;
  let scope = "studio";

  if (args.dryRun) {
    console.log("🧪 SIMULACIÓN — no se sube nada. Para importar de verdad agregá --confirmar.\n");
    if (api) scope = (await api.me().catch(() => ({ scope: "studio" }))).scope;
  } else {
    if (!api) {
      throw new Error(
        "Falta API_KEY en el .env.\n" +
          "   Generala una sola vez en el portal: Configuración → API keys (acceso total)\n" +
          "   y agregá al .env de esta PC:  API_KEY=mp_live_xxxxx"
      );
    }
    const me = await api.me();
    scope = me.scope;
    console.log(`🔑 Conectado a ${apiUrl} (alcance: ${scope})`);
  }
  console.log(`📁 Carpeta: ${root}`);

  let archivos = await findPdfs(root);
  if (args.periodo) {
    archivos = archivos.filter((f) => f.toLowerCase().includes(args.periodo!.toLowerCase()));
  }
  if (args.empresa) {
    archivos = archivos.filter((f) => f.toLowerCase().includes(args.empresa!.toLowerCase()));
  }

  if (archivos.length === 0) {
    console.log("No se encontraron PDFs con ese filtro.");
    return;
  }
  console.log(`Encontré ${archivos.length} PDF(s).\n`);

  const label = `${root}${args.periodo ? ` · ${args.periodo}` : ""}`;
  const run = args.dryRun || !api ? null : await api.startRun(label, false);
  const reportes: Reporte[] = [];

  for (const filePath of archivos) {
    const fileName = path.basename(filePath);
    const rel = path.relative(root, filePath);

    try {
      const buffer = await fs.readFile(filePath);
      const sourceHash = crypto.createHash("sha256").update(buffer).digest("hex");
      const detected = await detectPayslip(filePath, buffer);
      const companyRef = resolveCompanyRef(filePath, root, config);

      const base: Reporte = {
        fileName: rel,
        status: "ERROR",
        detectedCuil: detected.cuil,
        detectedLegajo: detected.legajo,
        detectedCompany: companyRef ?? detected.employerCuit,
        periodMonth: detected.periodMonth,
        periodYear: detected.periodYear,
      };

      // La empresa puede salir de la carpeta (config) o del CUIT del empleador
      // que viene dentro del PDF. Solo falla si no hay ninguno de los dos.
      const tieneEmpresa = companyRef || detected.employerCuit;
      if (!tieneEmpresa && scope === "studio") {
        reportes.push({
          ...base,
          status: "SIN_EMPRESA",
          message: `No pude identificar la empresa de "${rel}" (ni por carpeta ni por CUIT del PDF).`,
        });
        console.log(`  ✗ ${rel} — sin empresa`);
        continue;
      }

      if (!detected.cuil && !detected.legajo) {
        reportes.push({
          ...base,
          status: "SIN_EMPLEADO",
          message: "No encontré CUIL ni legajo en el nombre ni en el texto del PDF.",
        });
        console.log(`  ✗ ${rel} — sin CUIL ni legajo`);
        continue;
      }

      if (!detected.periodMonth || !detected.periodYear) {
        reportes.push({
          ...base,
          status: "SIN_PERIODO",
          message: "No pude determinar el mes y año (¿PDF escaneado sin texto?).",
        });
        console.log(`  ✗ ${rel} — sin período`);
        continue;
      }

      if (args.dryRun) {
        console.log(
          `  · ${rel} → Leg ${detected.legajo ?? "?"} / CUIL ${detected.cuil ?? "?"}, ` +
            `${detected.periodMonth}/${detected.periodYear}, Liq ${detected.liqNumber ?? "?"}, ` +
            `neto ${detected.netAmount ?? "?"}, empresa ${companyRef ?? detected.employerCuit ?? "(key)"} [${detected.from}]`
        );
        continue;
      }

      const res = await api!.importPayslip({
        companyRef,
        employerCuit: detected.employerCuit,
        cuil: detected.cuil,
        legajo: detected.legajo,
        dni: detected.dni,
        employeeName: detected.employeeName,
        periodMonth: detected.periodMonth,
        periodYear: detected.periodYear,
        netAmount: detected.netAmount,
        liqNumber: detected.liqNumber,
        fileBase64: buffer.toString("base64"),
        fileName,
        sourceHash,
      });

      reportes.push({
        ...base,
        status: res.status,
        employeeId: res.employeeId,
        payslipId: res.payslipId ?? null,
      });
      console.log(`  ${res.status === "OK" ? "✓" : "="} ${rel} — ${res.status.toLowerCase()}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      // El servidor distingue los dos casos por el texto del mensaje.
      const status: ItemStatus = /empresa/i.test(message)
        ? "SIN_EMPRESA"
        : /empleado|legajo|CUIL/i.test(message)
          ? "SIN_EMPLEADO"
          : "ERROR";
      reportes.push({ fileName: rel, status, message });
      console.log(`  ✗ ${rel} — ${message}`);
    }
  }

  if (args.dryRun) {
    console.log("\n🧪 Simulación terminada. No se cargó nada.");
    console.log("   Para importar de verdad:  npx tsx scripts/import-payslips.ts --confirmar");
    return;
  }

  if (run && api) await api.finishRun(run.id, reportes);

  const ok = reportes.filter((r) => r.status === "OK").length;
  const dup = reportes.filter((r) => r.status === "DUPLICADO").length;
  const err = reportes.length - ok - dup;

  console.log(`\n📊 ${ok} cargados · ${dup} ya estaban · ${err} con problema`);
  if (err > 0) console.log("   Revisalos en el panel: Estudio → Importaciones.");
}

main().catch((e) => {
  console.error(`\n❌ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
