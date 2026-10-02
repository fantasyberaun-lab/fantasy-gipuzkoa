// Utilidades de texto y de tablas, sin dependencias (se pueden probar solas).

import type { FilaTabla, Pagina, Tabla } from "./tipos";

export class ErrorImportador extends Error {}

export function sinTildes(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Cabecera comparable: sin tildes, minúsculas, sin paréntesis ni puntos.
//   "Ran. (Initial ranking)" -> "ran"   ·   "N.º" -> "n"   ·   "FIDE ID" -> "fide id"
export function normalizarCabecera(t: string): string {
  return sinTildes(t)
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[.\u00ba\u00aa:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function entero(t: string | undefined | null): number | null {
  if (!t) return null;
  const m = t.replace(/\s/g, "").match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

// Un ID FIDE son solo dígitos; "0" o vacío = sin ID.
export function limpiarFideId(t: string | undefined | null): string | null {
  const digitos = (t ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return digitos.length > 0 ? digitos : null;
}

const TITULOS = /^(?:GM|IM|FM|CM|WGM|WIM|WFM|WCM|NM|AGM|AIM|AFM)\s+/;
export function limpiarNombre(t: string): string {
  return t.replace(/\s+/g, " ").trim().replace(TITULOS, "");
}

// "2026/10/03" o "2026-10-03" -> "2026-10-03"
export function fechaISO(t: string | undefined | null): string | null {
  const m = (t ?? "").match(/(\d{4})[/.-](\d{2})[/.-](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function textoONulo(t: string | undefined | null): string | null {
  const limpio = (t ?? "").replace(/\s+/g, " ").trim();
  return limpio === "" ? null : limpio;
}

// ---------- Tablas ----------

export interface TablaLocalizada {
  cabeceras: string[]; // normalizadas
  datos: FilaTabla[];
}

function cabeceraDe(tabla: Tabla): { cabeceras: string[]; indice: number } | null {
  if (tabla.filas.length === 0) return null;
  const indiceTh = tabla.filas.findIndex((f) => f.cabecera);
  const indice = indiceTh >= 0 ? indiceTh : 0;
  return {
    cabeceras: tabla.filas[indice].celdas.map((c) => normalizarCabecera(c.texto)),
    indice,
  };
}

// Primera tabla cuya cabecera cumple el predicado.
export function localizarTabla(
  pagina: Pagina,
  cumple: (cabeceras: string[]) => boolean
): TablaLocalizada | null {
  for (const tabla of pagina.tablas) {
    const cab = cabeceraDe(tabla);
    if (!cab || !cumple(cab.cabeceras)) continue;
    const datos = tabla.filas
      .slice(cab.indice + 1)
      .filter((f) => !f.cabecera && f.celdas.length >= 2);
    return { cabeceras: cab.cabeceras, datos };
  }
  return null;
}

// Posición de la primera cabecera que coincida con alguno de los nombres,
// dentro de [desde, hasta). -1 si no hay.
export function indiceCabecera(
  cabeceras: string[],
  nombres: string[],
  desde = 0,
  hasta = cabeceras.length
): number {
  for (let i = desde; i < Math.min(hasta, cabeceras.length); i++) {
    if (nombres.includes(cabeceras[i])) return i;
  }
  return -1;
}

export function celda(fila: FilaTabla, i: number): string {
  return i >= 0 ? (fila.celdas[i]?.texto ?? "").trim() : "";
}
