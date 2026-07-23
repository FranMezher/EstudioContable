import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { detectPayslip } from "./lib/parse-payslip";

/**
 * ---------------------------------------------------------------------------
 * IMPORTADOR DE LA CARPETA MENSUAL DE RECIBOS
 * ---------------------------------------------------------------------------
 *
 * Corre en la PC del estudio y habla con la app por la API REST, no con la
 * base: la PC solo necesita una API key, ni credenciales de Postgres ni de
 * Blob.
 *
 *   npx tsx scripts/import-payslips.ts --dry-run
 *   npx tsx scripts/import-payslips.ts --periodo 2026-06
 *   npx tsx scripts/import-payslips.ts --empresa "Acme SRL"
 *
 * Configuración por variables de entorno (.env):
 *   RECIBOS_ROOT   carpeta raíz a recorrer
 *   API_URL        URL de la app (ej: https://recibos.mezherpampin.com.ar)
 *   API_KEY        key generada en Configuración → API keys
 *
 * El mapa carpeta → empresa vive en scripts/import.config.json.
 */

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
    dryRun: args.includes("--dry-run"),
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
  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;

  if (!args.root) throw new Error("Falta RECIBOS_ROOT (o pasá --carpeta <ruta>)");
  if (!apiUrl || !apiKey) throw new Error("Faltan API_URL y API_KEY en el .env");

  const root = path.resolve(args.root);
  const config = await loadConfig();
  const api = new Api(apiUrl, apiKey);

  const me = await api.me();
  console.log(`🔑 Conectado a ${apiUrl} (alcance: ${me.scope})`);
  console.log(`📁 Carpeta: ${root}`);
  if (args.dryRun) console.log("🧪 Simulación: no se sube nada.\n");

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
  const run = args.dryRun ? null : await api.startRun(label, false);
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
        detectedCompany: companyRef,
        periodMonth: detected.periodMonth,
        periodYear: detected.periodYear,
      };

      if (!companyRef && me.scope === "studio") {
        reportes.push({
          ...base,
          status: "SIN_EMPRESA",
          message: `No pude deducir la empresa de "${rel}". Agregá la carpeta a import.config.json.`,
        });
        console.log(`  ✗ ${rel} — sin empresa`);
        continue;
      }

      if (!detected.cuil) {
        reportes.push({
          ...base,
          status: "SIN_EMPLEADO",
          message: "No encontré el CUIL ni en el nombre del archivo ni en el texto del PDF.",
        });
        console.log(`  ✗ ${rel} — sin CUIL`);
        continue;
      }

      if (!detected.periodMonth || !detected.periodYear) {
        reportes.push({
          ...base,
          status: "SIN_PERIODO",
          message: "No pude determinar el mes y año del recibo.",
        });
        console.log(`  ✗ ${rel} — sin período`);
        continue;
      }

      if (args.dryRun) {
        console.log(
          `  · ${rel} → CUIL ${detected.cuil}, ${detected.periodMonth}/${detected.periodYear}` +
            `, empresa ${companyRef ?? "(la de la key)"} [${detected.from}]`
        );
        continue;
      }

      const res = await api.importPayslip({
        companyRef,
        cuil: detected.cuil,
        employeeName: detected.employeeName,
        periodMonth: detected.periodMonth,
        periodYear: detected.periodYear,
        netAmount: detected.netAmount,
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
      reportes.push({
        fileName: rel,
        status: message.includes("no existe") || message.includes("CUIL") ? "SIN_EMPLEADO" : "ERROR",
        message,
      });
      console.log(`  ✗ ${rel} — ${message}`);
    }
  }

  if (args.dryRun) {
    console.log("\n🧪 Simulación terminada. Sacá --dry-run para importar de verdad.");
    return;
  }

  if (run) await api.finishRun(run.id, reportes);

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
