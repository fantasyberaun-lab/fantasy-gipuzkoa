// Lector de Chess-Results (chess-results.com).
//
// Verificado contra el Campeonato Absoluto de Gipuzkoa 2026 (tnr1497509):
// la ficha del torneo (organizador, lugar, rondas, fechas...) y el ranking
// inicial (con ID FIDE y Elo) llegan en el HTML. Las páginas de rondas
// (art=2&rd=N) siguen el patrón estándar de Chess-Results pero NO se han
// podido probar con datos reales (el torneo aún no había empezado), por eso
// su lector es tolerante con las columnas y, si no las reconoce, falla con un
// mensaje que lista las cabeceras vistas.
//
// Funciones puras: reciben una Pagina ya leída (ver html.ts).

import type { JugadorOrigen, Pagina, RondaOrigen, TorneoOrigen } from "./tipos";
import {
  ErrorImportador,
  celda,
  entero,
  fechaISO,
  limpiarFideId,
  limpiarNombre,
  localizarTabla,
  normalizarCabecera,
  sinTildes,
  textoONulo,
} from "./texto";
import { interpretarResultadoPartida, interpretarSinRival } from "./resultados";

export function idTorneoChessResults(url: URL): string | null {
  const m = url.pathname.match(/tnr(\d+)\.aspx/i);
  return m ? m[1] : null;
}

// Con zeilen=0 Chess-Results enseña todas las filas (sin paginar).
export function urlChessResults(
  origen: string,
  tnr: string,
  parametros: Record<string, string | number> = {}
): string {
  const q = new URLSearchParams({ lan: "2", turdet: "YES", zeilen: "0" });
  for (const [k, v] of Object.entries(parametros)) q.set(k, String(v));
  return `${origen}/tnr${tnr}.aspx?${q.toString()}`;
}

const RE_RANK = /^(no|n|nr|snr|sno|#)$/;
const RE_NOMBRE = /^(nombre|name|blancas|white|negras|black)/;
const RE_ELO = /^(fide|elo|rtg|rating)/;
const RE_ID = /^(fide-?\s?id|id\s?fide)$/;

const num = (t: string): number | null => {
  const n = entero(t);
  return n != null && n > 0 ? n : null;
};

export function parsearRankingChessResults(pagina: Pagina): JugadorOrigen[] {
  const tabla =
    localizarTabla(
      pagina,
      (h) => h.some((x) => /^(nombre|name)/.test(x)) && h.some((x) => RE_ID.test(x))
    ) ??
    localizarTabla(
      pagina,
      (h) => h.some((x) => /^(nombre|name)/.test(x)) && h.some((x) => RE_RANK.test(x))
    );
  if (!tabla) return [];

  const h = tabla.cabeceras;
  const iRank = h.findIndex((x) => RE_RANK.test(x));
  const iNombre = h.findIndex((x) => /^(nombre|name)/.test(x));
  const iId = h.findIndex((x) => RE_ID.test(x));
  const iElo = h.findIndex((x, i) => i !== iId && RE_ELO.test(x));
  const iClub = h.findIndex((x) => /^(club|ciudad|city)/.test(x));

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

// Etiqueta -> valor de la ficha del torneo (filas de 2 celdas: etiqueta, valor).
function leerFicha(pagina: Pagina): Map<string, string> {
  const ficha = new Map<string, string>();
  for (const tabla of pagina.tablas) {
    for (const fila of tabla.filas) {
      const n = fila.celdas.length;
      if (n < 2 || n > 6 || n % 2 !== 0) continue;
      for (let k = 0; k < n; k += 2) {
        const clave = normalizarCabecera(fila.celdas[k].texto);
        const valor = fila.celdas[k + 1].texto.trim();
        if (clave && valor && !ficha.has(clave)) ficha.set(clave, valor);
      }
    }
  }
  return ficha;
}

export function parsearTorneoChessResults(pagina: Pagina, urlCanonica: string): TorneoOrigen {
  const ficha = leerFicha(pagina);
  const valor = (...claves: string[]): string | null => {
    for (const c of claves) {
      const v = ficha.get(c);
      if (v) return v;
    }
    return null;
  };

  const nombre =
    textoONulo(pagina.titulo.match(/chess-results\.com\s*-\s*(.+)$/i)?.[1]) ??
    textoONulo(pagina.titulo) ??
    "Torneo sin nombre";

  const fechas = (valor("fecha", "date") ?? "").match(/\d{4}[/-]\d{2}[/-]\d{2}/g) ?? [];

  let ultimaActualizacion: string | null = null;
  for (const linea of pagina.lineas) {
    const m = sinTildes(linea).match(
      /(?:ultima actualizacion|last update)\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
    );
    if (m) {
      ultimaActualizacion = m[1];
      break;
    }
  }

  const jugadores = parsearRankingChessResults(pagina);
  const avisos: string[] = [];
  if (jugadores.length === 0) {
    avisos.push("No he encontrado la lista de jugadores (puede que aún no esté publicada).");
  } else if (jugadores.every((j) => !j.fideId)) {
    avisos.push("La lista no trae ID FIDE: los jugadores se buscarán por nombre.");
  }

  return {
    fuente: "chess-results",
    url: urlCanonica,
    nombre,
    organizador: valor("organizador", "organizer", "organizers"),
    federacion: valor("federacion", "federation"),
    director: valor("director del torneo", "tournament director"),
    arbitroPrincipal: textoONulo(
      (valor("arbitro principal", "chief arbiter") ?? "").replace(/\s+\d{5,}$/, "")
    ),
    lugar: valor("lugar", "location", "venue"),
    fechaInicio: fechaISO(fechas[0]),
    fechaFin: fechaISO(fechas[fechas.length - 1]),
    numeroRondas: entero(valor("numero de rondas", "number of rounds")),
    sistema: valor("tipo de torneo", "tournament type"),
    ritmoJuego: valor("control de tiempo", "time control"),
    computoElo: valor("calculo de elo", "rating calculation"),
    ultimaActualizacion,
    jugadores,
    rondasPublicadas: [],
    avisos,
  };
}

const RE_BYE = /^(bye|libre|descansa|sin emparejar|no emparejado|not paired|spielfrei)/i;

export function parsearRondaChessResults(
  pagina: Pagina,
  numero: number,
  ranking: JugadorOrigen[]
): RondaOrigen {
  const porRank = new Map<number, JugadorOrigen>();
  const porNombre = new Map<string, JugadorOrigen>();
  for (const j of ranking) {
    if (j.rank != null) porRank.set(j.rank, j);
    porNombre.set(sinTildes(j.nombre).toLowerCase(), j);
  }

  const tabla = localizarTabla(pagina, (h) => {
    const iRes = h.findIndex((x) => /^(resultado|result)/.test(x));
    if (iRes < 0) return false;
    const nombres = h.map((x, i) => (RE_NOMBRE.test(x) ? i : -1)).filter((i) => i >= 0);
    return nombres.some((i) => i < iRes) && nombres.some((i) => i > iRes);
  });

  if (!tabla) {
    const vistas = pagina.tablas
      .slice(0, 4)
      .map((t) => (t.filas[0]?.celdas ?? []).map((c) => c.texto.trim()).join(" | "))
      .filter(Boolean);
    throw new ErrorImportador(
      `Chess-Results no muestra todavía emparejamientos de la ronda ${numero}, o el formato es distinto del esperado. ` +
        `Cabeceras vistas: ${vistas.join(" // ") || "ninguna"}.`
    );
  }

  const h = tabla.cabeceras;
  const iRes = h.findIndex((x) => /^(resultado|result)/.test(x));
  const iBrd = h.findIndex((x) => /^(bo|brd|tab|mesa|board)/.test(x));
  const primero = (re: RegExp, desde: number, hasta: number) => {
    for (let i = desde; i < hasta; i++) if (re.test(h[i])) return i;
    return -1;
  };
  // Mitad izquierda (antes del resultado) y derecha (después).
  const mitades = [
    { desde: 0, hasta: iRes },
    { desde: iRes + 1, hasta: h.length },
  ].map(({ desde, hasta }) => ({
    nombre: primero(RE_NOMBRE, desde, hasta),
    rank: primero(RE_RANK, desde, hasta),
    elo: primero(RE_ELO, desde, hasta),
  }));

  const lado = (fila: (typeof tabla.datos)[number], m: (typeof mitades)[number]) => {
    const textoNombre = celda(fila, m.nombre);
    if (!textoNombre) return { jugador: null as JugadorOrigen | null, texto: "" };
    const rank = entero(celda(fila, m.rank));
    const nombre = limpiarNombre(textoNombre);
    const base =
      (rank != null ? porRank.get(rank) : undefined) ??
      porNombre.get(sinTildes(nombre).toLowerCase());
    const elo = entero(celda(fila, m.elo));
    return {
      jugador: {
        rank: rank ?? base?.rank ?? null,
        nombre,
        fideId: base?.fideId ?? null,
        elo: elo && elo > 0 ? elo : (base?.elo ?? null),
        club: base?.club ?? null,
      },
      texto: textoNombre,
    };
  };

  const partidas: RondaOrigen["partidas"] = [];
  const sinRival: RondaOrigen["sinRival"] = [];
  const avisos: string[] = [];

  for (const fila of tabla.datos) {
    if (fila.celdas.length <= iRes) continue;
    const izq = lado(fila, mitades[0]);
    const der = lado(fila, mitades[1]);
    const texto = celda(fila, iRes);
    if (!izq.jugador && !der.jugador) continue;

    const derEsBye = der.jugador != null && RE_BYE.test(der.texto.trim());
    if (izq.jugador && der.jugador && !derEsBye) {
      const resultado = interpretarResultadoPartida(texto);
      if (resultado === "desconocido") {
        avisos.push(`Resultado no reconocido "${texto}" en el tablero ${celda(fila, iBrd)}.`);
      }
      partidas.push({
        tablero: entero(celda(fila, iBrd)),
        blancas: izq.jugador,
        negras: der.jugador,
        resultado,
        textoResultado: texto,
      });
    } else {
      const tipo = interpretarSinRival(texto || der.texto);
      sinRival.push({
        jugador: (izq.jugador ?? der.jugador)!,
        tipo: tipo === "pendiente" ? "otro" : tipo,
        textoResultado: texto || der.texto,
      });
    }
  }

  let fecha: string | null = null;
  let hora: string | null = null;
  for (const linea of pagina.lineas) {
    const m = linea.match(
      /(?:ronda|round|rd\.?)\s*(\d+)\D{0,12}(\d{4}[/-]\d{2}[/-]\d{2})(?:\D{0,12}(\d{1,2}:\d{2}))?/i
    );
    if (m && Number(m[1]) === numero) {
      fecha = fechaISO(m[2]);
      hora = m[3] ?? null;
      break;
    }
  }

  return { fuente: "chess-results", numero, fecha, hora, partidas, sinRival, avisos };
}
