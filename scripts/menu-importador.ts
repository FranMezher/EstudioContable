import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";

/**
 * ---------------------------------------------------------------------------
 * MENÚ DEL IMPORTADOR — para la PC del estudio
 * ---------------------------------------------------------------------------
 *
 * Se abre con doble clic en "Importar recibos.cmd". Muestra la lista de
 * empresas (cada una con su carpeta) y deja elegir cuál importar, o todas.
 * Por debajo llama al importador de siempre (scripts/import-payslips.ts).
 *
 * La lista de empresas y carpetas vive en scripts/importador.config.json.
 */

type Empresa = { nombre: string; carpeta: string };
type Config = { empresas: Empresa[] };

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, "scripts", "importador.config.json");

const c = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  azul: "\x1b[38;5;67m", oro: "\x1b[38;5;179m",
  verde: "\x1b[32m", rojo: "\x1b[31m",
};

function limpiar() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function cabecera() {
  console.log(`${c.azul}${c.bold}`);
  console.log("  ┌───────────────────────────────────────────────┐");
  console.log("  │   MEZHER PAMPIN · Importador de recibos        │");
  console.log("  └───────────────────────────────────────────────┘");
  console.log(c.reset);
}

function cargarConfig(): Config {
  if (!fs.existsSync(CONFIG)) {
    cabecera();
    console.log(`${c.rojo}  No encontré scripts/importador.config.json${c.reset}\n`);
    console.log("  Copiá el archivo de ejemplo y completá tus empresas:\n");
    console.log(`${c.dim}    copy scripts\\importador.config.example.json scripts\\importador.config.json${c.reset}\n`);
    process.exit(1);
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8")) as Config;
    if (!Array.isArray(cfg.empresas) || cfg.empresas.length === 0) {
      throw new Error("El archivo no tiene ninguna empresa cargada.");
    }
    return cfg;
  } catch (e) {
    console.log(`${c.rojo}  El config tiene un error: ${e instanceof Error ? e.message : e}${c.reset}`);
    process.exit(1);
  }
}

function preguntar(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((res) => rl.question(q, (a) => res(a.trim())));
}

/** Corre el importador para una carpeta y espera a que termine. */
function importar(carpeta: string, confirmar: boolean): Promise<number> {
  return new Promise((resolve) => {
    // Con shell:true y las comillas, la ruta puede tener espacios sin romperse.
    const conf = confirmar ? "--confirmar" : "";
    const cmd = `npx tsx scripts/import-payslips.ts ${conf} --carpeta "${carpeta}"`;
    const hijo = spawn(cmd, { stdio: "inherit", shell: true, cwd: ROOT });
    hijo.on("close", (code) => resolve(code ?? 0));
  });
}

async function main() {
  const cfg = cargarConfig();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  for (;;) {
    limpiar();
    cabecera();
    console.log(`${c.bold}  Empresas:${c.reset}\n`);
    cfg.empresas.forEach((e, i) => {
      const existe = fs.existsSync(e.carpeta);
      const marca = existe ? `${c.verde}●${c.reset}` : `${c.rojo}○${c.reset}`;
      console.log(`   ${c.oro}${String(i + 1).padStart(2)}${c.reset})  ${marca}  ${e.nombre}`);
      console.log(`        ${c.dim}${e.carpeta}${existe ? "" : "  (no encontrada)"}${c.reset}`);
    });
    console.log(`\n   ${c.oro} T${c.reset})  Importar TODAS las empresas`);
    console.log(`   ${c.oro} S${c.reset})  Simular (ver qué haría, sin cargar nada)`);
    console.log(`   ${c.oro} Q${c.reset})  Salir\n`);

    const op = (await preguntar(rl, "  Elegí una opción: ")).toLowerCase();

    if (op === "q") break;

    // Simular: primero pide qué empresa (o todas) y corre en modo simulación.
    const simular = op === "s";
    let seleccion = op;
    if (simular) {
      seleccion = (await preguntar(rl, "  ¿Qué empresa simular? (número o T para todas): ")).toLowerCase();
    }

    let carpetas: Empresa[] = [];
    if (seleccion === "t") {
      carpetas = cfg.empresas;
    } else {
      const idx = Number(seleccion) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= cfg.empresas.length) {
        console.log(`${c.rojo}\n  Opción inválida.${c.reset}`);
        await preguntar(rl, "  Enter para volver…");
        continue;
      }
      carpetas = [cfg.empresas[idx]];
    }

    const confirmar = !simular;
    if (confirmar) {
      const cuales = carpetas.length === 1 ? carpetas[0].nombre : `${carpetas.length} empresas`;
      const ok = (await preguntar(rl, `\n  Vas a IMPORTAR de verdad (${cuales}). ¿Seguir? [s/N]: `)).toLowerCase();
      if (ok !== "s") continue;
    }

    for (const e of carpetas) {
      console.log(`\n${c.azul}${c.bold}  ▶ ${e.nombre}${c.reset}`);
      if (!fs.existsSync(e.carpeta)) {
        console.log(`${c.rojo}    Carpeta no encontrada: ${e.carpeta} (se saltea)${c.reset}`);
        continue;
      }
      await importar(e.carpeta, confirmar);
    }

    await preguntar(rl, `\n  ${c.dim}Listo. Enter para volver al menú…${c.reset}`);
  }

  rl.close();
  console.log("\n  Hasta luego 👋\n");
}

main();
