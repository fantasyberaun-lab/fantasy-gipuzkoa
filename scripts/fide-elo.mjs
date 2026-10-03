// Actualización mensual de Elo desde la lista FIDE (XML por stdin).
//
//   unzip -p lista.zip | node scripts/fide-elo.mjs
//
// 1) Lee de Supabase los fide_id de tus jugadores.
// 2) Recorre el XML en streaming (el fichero completo pesa cientos de MB) y se
//    queda solo con esos IDs y su rating estándar.
// 3) Llama a la función aplicar_actualizacion_elo (0061). Con APLICAR != "true"
//    solo hace la vista previa y la imprime.
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (obligatorias)
//   APLICAR=true|false                         (por defecto false = vista previa)
//   PERIODO=YYYY-MM-01                         (por defecto, el mes actual en UTC)
//   FIDE_URL                                   (solo para comprobar Last-Modified)
//   FORZAR=true                                (salta la comprobación de fecha)
//
// Requiere el paquete "sax" (npm install --no-save sax).

import sax from "sax";

const URL_SB = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APLICAR = process.env.APLICAR === "true";
const hoy = new Date();
const PERIODO =
  process.env.PERIODO ??
  `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}-01`;

if (!URL_SB || !KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const cabeceras = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// Si la lista descargada es del mes anterior (la FIDE aún no ha publicado la
// nueva), no se aplica nada: se reintentará otro día.
async function listaEsDelPeriodo() {
  if (process.env.FORZAR === "true" || !process.env.FIDE_URL) return true;
  try {
    const r = await fetch(process.env.FIDE_URL, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
    const lm = r.headers.get("last-modified");
    if (!lm) return true; // sin dato, no se puede comprobar
    const d = new Date(lm);
    const mesLista = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return mesLista === PERIODO.slice(0, 7);
  } catch {
    return true;
  }
}

async function idsFide() {
  const ids = new Set();
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_SB}/rest/v1/players?select=fide_id&fide_id=not.is.null`, {
      headers: { ...cabeceras, Range: `${desde}-${desde + 999}` },
    });
    if (!r.ok) throw new Error(`No se pudieron leer los jugadores: ${r.status} ${await r.text()}`);
    const filas = await r.json();
    for (const f of filas) if (f.fide_id && String(f.fide_id).trim()) ids.add(String(f.fide_id).trim());
    if (filas.length < 1000) break;
  }
  return ids;
}

function leerLista(ids) {
  return new Promise((resolve, reject) => {
    const encontrados = new Map();
    const parser = sax.createStream(true);
    let etiqueta = "";
    let actual = null;
    parser.on("opentag", (n) => {
      etiqueta = n.name.toLowerCase();
      if (etiqueta === "player") actual = {};
    });
    parser.on("text", (t) => {
      if (actual && (etiqueta === "fideid" || etiqueta === "rating")) {
        actual[etiqueta] = (actual[etiqueta] ?? "") + t.trim();
      }
    });
    parser.on("closetag", (nombre) => {
      if (nombre.toLowerCase() !== "player" || !actual) return;
      const id = actual.fideid;
      const elo = parseInt(actual.rating ?? "", 10);
      if (id && ids.has(id) && Number.isFinite(elo) && elo > 0) encontrados.set(id, elo);
      actual = null;
    });
    parser.on("error", reject);
    parser.on("end", () => resolve(encontrados));
    process.stdin.pipe(parser);
  });
}

if (!(await listaEsDelPeriodo())) {
  console.log(`La lista de la FIDE todavía no es de ${PERIODO.slice(0, 7)}. No se hace nada; se reintentará.`);
  process.exit(0);
}

const ids = await idsFide();
console.log(`Jugadores con ID FIDE en la base: ${ids.size}`);

const encontrados = await leerLista(ids);
console.log(`Encontrados en la lista con Elo estándar: ${encontrados.size}`);

// Salvaguarda: si casi ninguno aparece, el fichero no es el esperado.
if (ids.size > 0 && encontrados.size < ids.size * 0.5) {
  console.error("Se han encontrado menos de la mitad de los jugadores: el fichero parece incorrecto. Se aborta.");
  process.exit(1);
}

const datos = [...encontrados].map(([fide_id, elo]) => ({ fide_id, elo }));
const r = await fetch(`${URL_SB}/rest/v1/rpc/aplicar_actualizacion_elo`, {
  method: "POST",
  headers: cabeceras,
  body: JSON.stringify({ p_periodo: PERIODO, p_datos: datos, p_aplicar: APLICAR }),
});
const cuerpo = await r.json();
if (!r.ok || !cuerpo.ok) {
  console.error("Error al aplicar:", JSON.stringify(cuerpo));
  process.exit(1);
}

console.log(APLICAR ? "APLICADO" : "VISTA PREVIA (no se ha cambiado nada)", cuerpo.periodo);
console.log(JSON.stringify(cuerpo.resumen, null, 2));
for (const f of cuerpo.filas.slice(0, 60)) {
  console.log(`${f.nombre}: Elo ${f.elo_antes} -> ${f.elo_despues} | valor ${f.valor_antes} -> ${f.valor_despues} M${f.aviso ? "  [REVISAR]" : ""}`);
}
if (cuerpo.filas.length > 60) console.log(`... y ${cuerpo.filas.length - 60} más`);
