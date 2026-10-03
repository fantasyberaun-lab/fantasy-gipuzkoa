// Utilidades mínimas de CSV para el panel de admin (sin dependencias).
// Lectura: detecta el separador (; , o tabulador) y admite comillas.
// Escritura: separador ";" y BOM UTF-8, para que Excel en español lo abra bien.

export function parseCsv(texto: string): string[][] {
  const limpio = texto.replace(/^\uFEFF/, "");
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? "";
  const cuenta = (c: string) => primeraLinea.split(c).length - 1;
  const sep = [";", "\t", ","].reduce((mejor, c) => (cuenta(c) > cuenta(mejor) ? c : mejor), ";");

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (comillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          comillas = false;
        }
      } else {
        campo += ch;
      }
    } else if (ch === '"') {
      comillas = true;
    } else if (ch === sep) {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.some((c) => c.trim() !== "")) filas.push(fila);
      fila = [];
    } else {
      campo += ch;
    }
  }
  fila.push(campo);
  if (fila.some((c) => c.trim() !== "")) filas.push(fila);
  return filas;
}

function celda(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(filas: (string | number | boolean | null | undefined)[][]): string {
  return "\uFEFF" + filas.map((f) => f.map(celda).join(";")).join("\r\n") + "\r\n";
}

export function descargarTexto(nombre: string, contenido: string, tipo = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Busca las columnas de ID FIDE y Elo en la cabecera (acepta variantes).
// Devuelve los datos listos para la base de datos y cuántas filas se ignoran.
export function leerEloDeCsv(filas: string[][]):
  | { ok: true; datos: { fide_id: string; elo: number }[]; ignoradas: number }
  | { ok: false; mensaje: string } {
  if (filas.length < 2) return { ok: false, mensaje: "El CSV está vacío." };
  const cab = filas[0].map(norm);
  const iFide = cab.findIndex((c) => ["fideid", "idfide", "fide", "id"].includes(c));
  const iElo = cab.findIndex((c) => ["elo", "rating", "rtg", "std", "standard", "elofide"].includes(c));
  if (iFide < 0 || iElo < 0) {
    return {
      ok: false,
      mensaje: 'No encuentro las columnas "fide_id" y "elo" en la primera fila del CSV.',
    };
  }

  const datos: { fide_id: string; elo: number }[] = [];
  let ignoradas = 0;
  for (const f of filas.slice(1)) {
    const fide = (f[iFide] ?? "").trim();
    const elo = parseInt((f[iElo] ?? "").trim(), 10);
    if (!fide || !Number.isFinite(elo) || elo <= 0) {
      ignoradas++;
      continue;
    }
    datos.push({ fide_id: fide, elo });
  }
  return { ok: true, datos, ignoradas };
}
