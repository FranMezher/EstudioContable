import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { resolveFolder } from "./lib/resolve-folder";

/**
 * ---------------------------------------------------------------------------
 * PANEL DE IMPORTACIÓN — interfaz visual para la PC del estudio
 * ---------------------------------------------------------------------------
 *
 * Se abre con doble clic en "Panel de importacion.cmd": levanta un servidor
 * local y abre el navegador con una página que tiene, por cada empresa, un
 * botón para importar sus recibos. También se pueden agregar/quitar empresas
 * desde la misma página, sin editar ningún archivo.
 *
 * Es local (127.0.0.1): nadie de afuera puede entrar. Por debajo llama al
 * importador de siempre (scripts/import-payslips.ts).
 */

type Empresa = { nombre: string; carpeta: string };
type Config = { empresas: Empresa[] };

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, "scripts", "importador.config.json");
const PORT = 4317;

function loadConfig(): Config {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG, "utf8")) as Config;
    if (!Array.isArray(c.empresas)) return { empresas: [] };
    return c;
  } catch {
    return { empresas: [] };
  }
}

function saveConfig(c: Config) {
  fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2) + "\n", "utf8");
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (ch) => (data += ch));
    req.on("end", () => resolve(data));
  });
}

/** Corre el importador para una carpeta y va mandando cada línea por SSE. */
function correr(
  carpeta: string,
  confirmar: boolean,
  meses: number,
  onLine: (line: string) => void
): Promise<number> {
  return new Promise((resolve) => {
    const conf = confirmar ? "--confirmar" : "";
    // meses > 0 → últimos N meses; 0 → todos (sin filtro de fecha).
    const filtro = meses > 0 ? `--meses ${meses}` : "--todos";
    const cmd = `npx tsx scripts/import-payslips.ts ${conf} ${filtro} --carpeta "${carpeta}"`;
    const hijo = spawn(cmd, { shell: true, cwd: ROOT });
    const rlOut = readline.createInterface({ input: hijo.stdout });
    const rlErr = readline.createInterface({ input: hijo.stderr });
    rlOut.on("line", onLine);
    rlErr.on("line", (l) => {
      // Se ignora el ruido conocido del driver de Postgres.
      if (/Warning|libpq|sslmode|prepare|trace-warnings|next major|libpq-ssl/i.test(l)) return;
      if (l.trim()) onLine(l);
    });
    hijo.on("close", (code) => resolve(code ?? 0));
  });
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // --- página ---
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGE);
    return;
  }

  // --- logo ---
  if (req.method === "GET" && url.pathname === "/brand-mark.png") {
    const p = path.join(ROOT, "public", "brand-mark.png");
    if (fs.existsSync(p)) {
      res.writeHead(200, { "Content-Type": "image/png" });
      fs.createReadStream(p).pipe(res);
      return;
    }
    res.writeHead(404).end();
    return;
  }

  // --- lista de empresas (con si la carpeta existe) ---
  if (req.method === "GET" && url.pathname === "/api/empresas") {
    const cfg = loadConfig();
    const lista = cfg.empresas.map((e) => ({ ...e, existe: fs.existsSync(resolveFolder(e.carpeta)) }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(lista));
    return;
  }

  // --- agregar empresa ---
  if (req.method === "POST" && url.pathname === "/api/agregar") {
    const { nombre, carpeta } = JSON.parse((await readBody(req)) || "{}");
    if (!nombre?.trim() || !carpeta?.trim()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Completá el nombre y la carpeta." }));
      return;
    }
    const cfg = loadConfig();
    cfg.empresas.push({ nombre: nombre.trim(), carpeta: carpeta.trim() });
    saveConfig(cfg);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // --- quitar empresa ---
  if (req.method === "POST" && url.pathname === "/api/quitar") {
    const { index } = JSON.parse((await readBody(req)) || "{}");
    const cfg = loadConfig();
    if (index >= 0 && index < cfg.empresas.length) {
      cfg.empresas.splice(index, 1);
      saveConfig(cfg);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // --- importar (salida en vivo por SSE) ---
  if (req.method === "GET" && url.pathname === "/run") {
    const modo = url.searchParams.get("modo") === "real";
    const sel = url.searchParams.get("empresa") ?? "";
    // Meses hacia atrás. Por defecto 2; 0 = todos (sin filtro de fecha).
    const mesesRaw = url.searchParams.get("meses");
    let meses = 2;
    if (mesesRaw !== null && mesesRaw !== "") {
      const n = Number(mesesRaw);
      if (Number.isFinite(n) && n >= 0) meses = Math.floor(n);
    }
    const cfg = loadConfig();
    const objetivos = sel === "all" ? cfg.empresas : [cfg.empresas[Number(sel)]].filter(Boolean);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const send = (line: string) => res.write(`data: ${JSON.stringify(line)}\n\n`);

    if (objetivos.length === 0) {
      send("No hay empresas para importar.");
      res.write("event: done\ndata: \"\"\n\n");
      res.end();
      return;
    }

    (async () => {
      for (const e of objetivos) {
        send(`\u25B6 ${e.nombre}`);
        const carpeta = resolveFolder(e.carpeta);
        if (!fs.existsSync(carpeta)) {
          send(`  ✗ Carpeta no encontrada: ${e.carpeta}`);
          continue;
        }
        if (carpeta !== e.carpeta) send(`  (usando ${carpeta})`);
        await correr(carpeta, modo, meses, send);
        send("");
      }
      res.write(`event: done\ndata: ${JSON.stringify(modo ? "real" : "sim")}\n\n`);
      res.end();
    })();
    return;
  }

  res.writeHead(404).end();
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error("[panel] error:", e instanceof Error ? e.message : e);
    try {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Error interno" }));
    } catch {
      /* respuesta ya iniciada */
    }
  });
});

const URL_PANEL = `http://127.0.0.1:${PORT}`;

function abrirNavegador() {
  try {
    spawn("cmd", ["/c", "start", "", URL_PANEL], { stdio: "ignore" });
  } catch {
    /* si no abre solo, el usuario copia la URL a mano */
  }
}

// Si el puerto ya está ocupado, es que el panel ya estaba abierto: en vez de
// romper con un error feo, lo reusamos abriendo el navegador y salimos.
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.log(`\n  El panel ya estaba abierto. Te llevo a él:  ${URL_PANEL}`);
    console.log("  (Podés cerrar esta ventana.)\n");
    abrirNavegador();
    setTimeout(() => process.exit(0), 400);
  } else {
    console.error(`\n  No se pudo iniciar el panel: ${err.message}\n`);
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Panel de importación abierto en:  ${URL_PANEL}`);
  console.log("  (Dejá esta ventana abierta mientras lo usás. Cerrala para terminar.)\n");
  abrirNavegador();
});

// ---------------------------------------------------------------------------
// La página (HTML + CSS + JS, todo inline, sin dependencias)
// ---------------------------------------------------------------------------
const PAGE = /* html */ `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Importador de recibos · Mezher Pampin</title>
<style>
  :root {
    --brand:#28538a; --brand-deep:#1e3a5f; --accent:#bd6f26;
    --ink:#17212e; --muted:#6d7c8b; --line:#dbe3ee; --bg:#eef2f8; --surface:#fff;
    --ok:#2f7a52; --danger:#b23b3b;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
  .top { background:linear-gradient(160deg,var(--brand-deep),#16293f); color:#fff; padding:22px 24px;
    display:flex; align-items:center; gap:14px; }
  .top img { width:44px; height:44px; border-radius:10px; background:#fff; padding:4px; }
  .top h1 { margin:0; font-size:18px; font-weight:600; letter-spacing:.2px; }
  .top p { margin:2px 0 0; font-size:12.5px; color:#9db8d6; }
  .wrap { max-width:900px; margin:0 auto; padding:24px; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:14px;
    box-shadow:0 8px 24px -16px rgba(20,29,41,.2); margin-bottom:18px; overflow:hidden; }
  .card h2 { margin:0; padding:16px 20px; font-size:14px; border-bottom:1px solid var(--line);
    background:#f6f8fc; letter-spacing:.02em; }
  .card .body { padding:16px 20px; }
  .empresa { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid #eef2f7; }
  .empresa:last-child { border-bottom:0; }
  .dot { width:10px; height:10px; border-radius:50%; flex:none; }
  .dot.ok { background:var(--ok); } .dot.no { background:var(--danger); }
  .empresa .info { flex:1; min-width:0; }
  .empresa .nombre { font-weight:600; font-size:14.5px; }
  .empresa .ruta { font-size:12px; color:var(--muted); word-break:break-all; }
  .btns { display:flex; gap:8px; flex:none; }
  button { font:inherit; font-size:13px; font-weight:600; border-radius:9px; padding:8px 14px;
    border:1px solid transparent; cursor:pointer; transition:.12s; }
  .primary { background:var(--brand); color:#fff; } .primary:hover { background:var(--brand-deep); }
  .accent { background:var(--accent); color:#fff; } .accent:hover { filter:brightness(.94); }
  .ghost { background:#fff; color:var(--muted); border-color:var(--line); }
  .ghost:hover { background:#f6f8fc; color:var(--ink); }
  .del { background:transparent; color:var(--danger); border:0; font-size:18px; padding:4px 8px; }
  button:disabled { opacity:.5; cursor:default; }
  .allrow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .mesesbox { display:flex; align-items:center; gap:6px; margin-left:auto; font-size:13px; color:var(--muted); font-weight:600; }
  .mesesbox input { width:52px; padding:7px 8px; border:1px solid var(--line); border-radius:8px; font:inherit; font-size:13px; text-align:center; }
  .mesesbox input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 3px rgba(40,83,138,.14); }
  .field { display:flex; flex-direction:column; gap:5px; }
  .field label { font-size:12px; font-weight:600; color:var(--muted); }
  .field input { padding:9px 11px; border:1px solid var(--line); border-radius:9px; font:inherit; font-size:14px; }
  .field input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 3px rgba(40,83,138,.14); }
  .addgrid { display:grid; grid-template-columns:1fr 1.4fr auto; gap:12px; align-items:end; }
  .hint { font-size:12.5px; color:var(--muted); margin:8px 0 0; }
  #consola { display:none; }
  #consola.show { display:block; }
  pre.log { margin:0; background:#0f1e2c; color:#d7e6f4; padding:16px; border-radius:12px; min-height:120px;
    max-height:340px; overflow:auto; font-family:"Cascadia Code",Consolas,monospace; font-size:12.5px;
    line-height:1.55; white-space:pre-wrap; }
  .badge { display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; }
  .badge.sim { background:#f6ecd4; color:#9c6a12; } .badge.real { background:#e2f0e8; color:var(--ok); }
  @media (max-width:620px){ .addgrid{ grid-template-columns:1fr; } }
</style>
</head>
<body>
  <div class="top">
    <img src="/brand-mark.png" alt="" />
    <div>
      <h1>Importador de recibos</h1>
      <p>Mezher Pampin · panel local</p>
    </div>
  </div>

  <div class="wrap">
    <div class="card">
      <h2>Empresas</h2>
      <div class="body">
        <div id="lista"></div>
        <div id="vacio" class="hint" style="display:none">
          Todavía no cargaste ninguna empresa. Agregá la primera abajo. 👇
        </div>
        <div class="allrow" style="margin-top:14px">
          <button class="accent" onclick="run('all','real')" id="btnTodas">Importar TODAS</button>
          <button class="ghost" onclick="run('all','sim')">Simular todas</button>
          <label class="mesesbox">Solo últimos
            <input id="meses" type="number" min="0" step="1" value="2" /> meses
          </label>
        </div>
        <p class="hint">Se importan solo los recibos de los <b>últimos 2 meses</b> (por la fecha del archivo), para saltear los años de recibos viejos. Poné <b>0</b> para importar todos.</p>
      </div>
    </div>

    <div class="card">
      <h2>Agregar empresa</h2>
      <div class="body">
        <div class="addgrid">
          <div class="field">
            <label>Nombre</label>
            <input id="nombre" placeholder="ZEITAKU S.A." />
          </div>
          <div class="field">
            <label>Carpeta de sus recibos</label>
            <input id="carpeta" placeholder="C:\\EstudioContable\\szeitaku" />
          </div>
          <button class="primary" onclick="agregar()">Agregar</button>
        </div>
        <p class="hint">Pegá la ruta completa de la carpeta donde están los PDF de esa empresa.</p>
        <p id="addmsg" class="hint" style="color:var(--danger)"></p>
      </div>
    </div>

    <div class="card" id="consola">
      <h2>Resultado <span id="modo"></span></h2>
      <div class="body"><pre class="log" id="log"></pre></div>
    </div>
  </div>

<script>
  const $ = (s) => document.querySelector(s);
  let running = false;

  async function cargar() {
    const empresas = await fetch("/api/empresas").then(r => r.json());
    const cont = $("#lista"); cont.innerHTML = "";
    $("#vacio").style.display = empresas.length ? "none" : "block";
    $("#btnTodas").disabled = empresas.length === 0;
    empresas.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "empresa";
      row.innerHTML =
        '<span class="dot ' + (e.existe ? "ok" : "no") + '" title="' +
          (e.existe ? "Carpeta encontrada" : "Carpeta no encontrada") + '"></span>' +
        '<div class="info"><div class="nombre"></div><div class="ruta"></div></div>' +
        '<div class="btns">' +
          '<button class="primary">Importar</button>' +
          '<button class="ghost">Simular</button>' +
          '<button class="del" title="Quitar">×</button>' +
        '</div>';
      row.querySelector(".nombre").textContent = e.nombre;
      row.querySelector(".ruta").textContent = e.carpeta + (e.existe ? "" : "  · no encontrada");
      const [bImp, bSim, bDel] = row.querySelectorAll("button");
      bImp.onclick = () => run(String(i), "real");
      bSim.onclick = () => run(String(i), "sim");
      bDel.onclick = () => quitar(i, e.nombre);
      cont.appendChild(row);
    });
  }

  async function agregar() {
    const nombre = $("#nombre").value, carpeta = $("#carpeta").value;
    $("#addmsg").textContent = "";
    const r = await fetch("/api/agregar", { method:"POST", body: JSON.stringify({ nombre, carpeta }) });
    const j = await r.json();
    if (j.error) { $("#addmsg").textContent = j.error; return; }
    $("#nombre").value = ""; $("#carpeta").value = "";
    cargar();
  }

  async function quitar(index, nombre) {
    if (!confirm("¿Quitar " + nombre + " de la lista?")) return;
    await fetch("/api/quitar", { method:"POST", body: JSON.stringify({ index }) });
    cargar();
  }

  function run(empresa, modo) {
    if (running) return;
    if (modo === "real" && !confirm("Vas a IMPORTAR de verdad. ¿Seguir?")) return;
    running = true;
    document.querySelectorAll("button").forEach(b => b.disabled = true);
    const log = $("#log"); log.textContent = "";
    $("#consola").classList.add("show");
    $("#modo").innerHTML = modo === "real"
      ? '<span class="badge real">Cargando de verdad</span>'
      : '<span class="badge sim">Simulación</span>';
    $("#consola").scrollIntoView({ behavior:"smooth" });

    const mEl = $("#meses");
    const meses = mEl && mEl.value !== "" ? mEl.value : "2";
    const ev = new EventSource("/run?empresa=" + encodeURIComponent(empresa) + "&modo=" + modo + "&meses=" + encodeURIComponent(meses));
    ev.onmessage = (m) => {
      log.textContent += JSON.parse(m.data) + "\\n";
      log.scrollTop = log.scrollHeight;
    };
    ev.addEventListener("done", () => {
      ev.close(); running = false;
      document.querySelectorAll("button").forEach(b => b.disabled = false);
      $("#btnTodas").disabled = false;
      log.textContent += "\\n— listo —\\n";
      log.scrollTop = log.scrollHeight;
      cargar();
    });
    ev.onerror = () => {
      ev.close(); running = false;
      document.querySelectorAll("button").forEach(b => b.disabled = false);
    };
  }

  cargar();
</script>
</body>
</html>`;
