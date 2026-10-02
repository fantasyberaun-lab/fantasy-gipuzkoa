// Lector de Info64 (info64.org). Probado a mano contra el Campeonato de
// Gipuzkoa Rápido 2026: las páginas llegan con todo el contenido en el HTML
// (no hace falta navegador) y tienen URLs limpias:
//   /{slug}            ficha + ranking inicial (con ID FIDE y Elo)
//   /{slug}/{ronda}    emparejamientos y resultados de esa ronda
//
// Todas las funciones de este archivo son puras: reciben una Pagina ya
// leída (ver html.ts) y devuelven datos normalizados.

import type { JugadorOrigen, Pagina, RondaOrigen, TorneoOrigen } from "./tipos";
import {
  ErrorImportador,
  celda,
  entero,
  fechaISO,
  limpiarFideId,
  limpiarNombre,
  localizarTabla,
  textoONulo,
} from "./texto";
import { interpretarResultadoPartida, interpretarSinRival } from "./resultados";

const RESERVADOS = new Set([
  "search",
  "search-player",
  "search-game",
  "calendar",
  "info",
  "accounts",
  "static",
  "media",
  "admin",
]);

// Primer tramo de la ruta: /campeonato-xxx/3 -> "campeonato-xxx".
export function slugInfo64(url: URL): string | null {
  const slug = url.pathname.split("/").filter(Boolean)[0];
  if (!slug || RESERVADOS.has(slug)) return null;
  return slug;
}

export function urlInfo64(origen: string, slug: string, ronda?: number): string {
  const ruta = ronda ? `/${slug}/${ronda}` : `/${slug}`;
  // hl=en fija el idioma: así las cabeceras de las tablas no cambian.
  return `${origen}${ruta}?hl=en`;
}

const num = (t: string): number | null => {
  const n = entero(t);
  return n != null && n > 0 ? n : null;
};

export function parsearRankingInfo64(pagina: Pagina): JugadorOrigen[] {
  const tabla = localizarTabla(
    pagina,
    (h) =>
      h.some((x) => /^name/.test(x)) &&
      h.some((x) => /^ran/.test(x)) &&
      !h.some((x) => /^white/.test(x))
  );
  if (!tabla) return [];

  const h = tabla.cabeceras;
  const iId = h.findIndex((x) => /^fide\s*-?id/.test(x));
  const iRank = h.findIndex((x) => /^ran/.test(x));
  const iNombre = h.findIndex((x) => /^name/.test(x));
  const iElo = h.findIndex((x, i) => i !== iId && /^(fide|elo|rtg)/.test(x));
  const iClub = h.findIndex((x) => /^(origin|origen|club)/.test(x));

  const jugadores: JugadorOrigen[] = [];
  for (const fila of tabla.datos) {
    const nombre = limpiarNombre(celda(fila, iNombre));
    if (!nombre) continue;
    jugadores.push({
      rank: entero(celda(fila, iRank)),
      nombre,
      fideId: limpiarFideId(celda(fila, iId)),
      elo: num(celda(fila, iElo)),
      club: textoONulo(celda(fila, iClub)),
    });
  }
  return jugadores;
}

export function parsearTorneoInfo64(
  pagina: Pagina,
  urlCanonica: string,
  slug: string
): TorneoOrigen {
  const nombre =
    textoONulo(
      pagina.titulo.replace(/\s*-\s*info64\.org\s*$/i, "").replace(/\s*-\s*Round\s+\d+\s*$/i, "")
    ) ?? slug;

  const jugadores = parsearRankingInfo64(pagina);
  const avisos: string[] = [];
  if (jugadores.length === 0) {
    avisos.push("No he encontrado la lista de jugadores en la página de Info64.");
  }

  let lugar: string | null = null;
  let fechaInicio: string | null = null;
  let fechaFin: string | null = null;
  let arbitroPrincipal: string | null = null;
  let ritmoJuego: string | null = null;

  for (const linea of pagina.lineas) {
    // "Deba, from 2026-04-26 to 2026-04-26"
    const m = linea.match(/^(.*?),\s*from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
    if (m && !fechaInicio) {
      lugar = textoONulo(m[1]);
      fechaInicio = fechaISO(m[2]);
      fechaFin = fechaISO(m[3]);
      continue;
    }
    const a = linea.match(/Chief Arbiter:\s*(.+)$/i);
    if (a && !arbitroPrincipal) arbitroPrincipal = textoONulo(a[1].replace(/\s*\(.*?\)\s*$/, ""));
    const r = linea.match(/Rate of play:\s*(.+)$/i);
    if (r && !ritmoJuego) ritmoJuego = textoONulo(r[1]);
  }

  const patron = new RegExp(`/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(\\d+)/?(?:[?#].*)?$`);
  const rondas = new Set<number>();
  for (const enlace of pagina.enlaces) {
    const m = enlace.match(patron);
    if (m) rondas.add(Number(m[1]));
  }

  return {
    fuente: "info64",
    url: urlCanonica,
    nombre,
    organizador: null,
    federacion: null,
    director: null,
    arbitroPrincipal,
    lugar,
    fechaInicio,
    fechaFin,
    // Info64 no indica el total de rondas, solo las que ya han publicado.
    numeroRondas: null,
    sistema: null,
    ritmoJuego,
    computoElo: null,
    ultimaActualizacion: null,
    jugadores,
    rondasPublicadas: [...rondas].sort((x, y) => x - y),
    avisos,
  };
}

export function parsearRondaInfo64(
  pagina: Pagina,
  numero: number,
  ranking: JugadorOrigen[]
): RondaOrigen {
  const porRank = new Map<number, JugadorOrigen>();
  for (const j of ranking) if (j.rank != null) porRank.set(j.rank, j);

  const tabla = localizarTabla(
    pagina,
    (h) => h.some((x) => /^white/.test(x)) && h.some((x) => /^black/.test(x))
  );
  if (!tabla) {
    throw new ErrorImportador(
      `Info64 no muestra todavía emparejamientos de la ronda ${numero} (o ha cambiado el formato de la página).`
    );
  }

  const h = tabla.cabeceras;
  const iBrd = h.findIndex((x) => /^(brd|board|mesa|tab)/.test(x));
  const iW = h.findIndex((x) => /^white/.test(x));
  const iB = h.findIndex((x) => /^black/.test(x));
  const iRes = h.findIndex((x) => /^res/.test(x));
  if (iW < 0 || iB < 0 || iRes < 0) {
    throw new ErrorImportador(
      `Info64: no reconozco las columnas de la ronda ${numero} (${h.join(" | ")}).`
    );
  }

  // Cada lado ocupa las columnas desde su nombre hasta la siguiente frontera.
  const limite = (desde: number) =>
    Math.min(...[iW, iB, iRes].filter((i) => i > desde), h.length);
  const buscar = (re: RegExp, desde: number, hasta: number) => {
    for (let i = desde; i < hasta; i++) if (re.test(h[i])) return i;
    return -1;
  };

  const lado = (fila: (typeof tabla.datos)[number], iNombre: number): JugadorOrigen | null => {
    const textoNombre = celda(fila, iNombre);
    if (!textoNombre) return null;
    const hasta = limite(iNombre);
    const rank = entero(celda(fila, buscar(/^ran/, iNombre + 1, hasta)));
    const elo = entero(celda(fila, buscar(/^fide/, iNombre + 1, hasta)));
    const base = rank != null ? porRank.get(rank) : undefined;
    return {
      rank,
      nombre: limpiarNombre(textoNombre),
      fideId: base?.fideId ?? null,
      elo: elo && elo > 0 ? elo : (base?.elo ?? null),
      club: base?.club ?? null,
    };
  };

  const partidas: RondaOrigen["partidas"] = [];
  const sinRival: RondaOrigen["sinRival"] = [];
  const avisos: string[] = [];

  for (const fila of tabla.datos) {
    if (fila.celdas.length <= iRes) continue;
    const blancas = lado(fila, iW);
    const negras = lado(fila, iB);
    const texto = celda(fila, iRes);
    if (!blancas && !negras) continue;

    if (blancas && negras) {
      const resultado = interpretarResultadoPartida(texto);
      if (resultado === "desconocido") {
        avisos.push(`Resultado no reconocido "${texto}" en el tablero ${celda(fila, iBrd)}.`);
      }
      partidas.push({
        tablero: entero(celda(fila, iBrd)),
        blancas,
        negras,
        resultado,
        textoResultado: texto,
      });
    } else {
      const tipo = interpretarSinRival(texto);
      sinRival.push({
        jugador: (blancas ?? negras)!,
        tipo: tipo === "pendiente" ? "otro" : tipo,
        textoResultado: texto,
      });
    }
  }

  let fecha: string | null = null;
  let hora: string | null = null;
  for (const linea of pagina.lineas) {
    const m = linea.match(/round\s+\d+\s*-\s*(\d{4}-\d{2}-\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/i);
    if (m) {
      fecha = fechaISO(m[1]);
      hora = m[2] ?? null;
      break;
    }
  }

  return { fuente: "info64", numero, fecha, hora, partidas, sinRival, avisos };
}
