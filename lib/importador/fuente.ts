// Descarga y orquestación: detecta si un enlace es de Chess-Results o de
// Info64, lo descarga de forma segura y lo pasa por el lector adecuado.
//
// Solo se ejecuta en el servidor (la ruta app/api/importador). Principios:
//   - Solo se descargan páginas de chess-results.com e info64.org.
//   - Pocas peticiones, siempre una detrás de otra y solo cuando el admin
//     lo pide con un botón (nada de rastreos automáticos).
//   - Sin saltarse bloqueos: si la web responde con error, se cuenta tal cual.

import type { FuenteTorneo, RondaOrigen, TorneoOrigen } from "./tipos";
import { ErrorImportador } from "./texto";
import { leerHtml } from "./html";
import {
  idTorneoChessResults,
  parsearRankingChessResults,
  parsearRondaChessResults,
  parsearTorneoChessResults,
  urlChessResults,
} from "./chessResults";
import {
  parsearRankingInfo64,
  parsearRondaInfo64,
  parsearTorneoInfo64,
  slugInfo64,
  urlInfo64,
} from "./info64";

const HOST_CHESS_RESULTS = /^([a-z0-9-]+\.)?chess-results\.com$/i;
const HOST_INFO64 = /^(www\.)?info64\.org$/i;

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 3_000_000;
const USER_AGENT = "FantasyGipuzkoa/1.0 (importacion manual desde el panel de administracion)";

export interface FuenteDetectada {
  fuente: FuenteTorneo;
  url: URL;
}

export function detectarFuente(texto: string): FuenteDetectada {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    throw new ErrorImportador("Eso no parece un enlace. Pega la URL completa del torneo.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ErrorImportador("El enlace tiene que empezar por https://");
  }
  if (HOST_CHESS_RESULTS.test(url.hostname)) {
    if (!idTorneoChessResults(url)) {
      throw new ErrorImportador(
        "El enlace de Chess-Results tiene que ser el de un torneo (algo como chess-results.com/tnr123456.aspx)."
      );
    }
    return { fuente: "chess-results", url };
  }
  if (HOST_INFO64.test(url.hostname)) {
    if (!slugInfo64(url)) {
      throw new ErrorImportador("El enlace de Info64 tiene que ser el de un torneo concreto.");
    }
    return { fuente: "info64", url };
  }
  throw new ErrorImportador("Solo se pueden importar torneos de chess-results.com o info64.org.");
}

async function descargar(texto: string, saltos = 0): Promise<string> {
  const url = new URL(texto);
  if (!HOST_CHESS_RESULTS.test(url.hostname) && !HOST_INFO64.test(url.hostname)) {
    throw new ErrorImportador("Redirección a una web no permitida.");
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: control.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es,en;q=0.8",
      },
    });

    if (respuesta.status >= 300 && respuesta.status < 400) {
      const destino = respuesta.headers.get("location");
      if (!destino || saltos >= 3) throw new ErrorImportador("Demasiadas redirecciones.");
      return descargar(new URL(destino, url).toString(), saltos + 1);
    }
    if (!respuesta.ok) {
      throw new ErrorImportador(`${url.hostname} ha respondido con el error ${respuesta.status}.`);
    }

    const html = await respuesta.text();
    if (html.length > MAX_BYTES) throw new ErrorImportador("La página es demasiado grande.");
    return html;
  } catch (e) {
    if (e instanceof ErrorImportador) throw e;
    if ((e as { name?: string })?.name === "AbortError") {
      throw new ErrorImportador(`${url.hostname} ha tardado demasiado en responder.`);
    }
    throw new ErrorImportador(`No he podido conectar con ${url.hostname}.`);
  } finally {
    clearTimeout(temporizador);
  }
}

// ---------- API pública del importador ----------

export async function leerTorneo(enlace: string): Promise<TorneoOrigen> {
  const { fuente, url } = detectarFuente(enlace);

  if (fuente === "chess-results") {
    const tnr = idTorneoChessResults(url)!;
    const pagina = leerHtml(await descargar(urlChessResults(url.origin, tnr, { art: 0 })));
    return parsearTorneoChessResults(pagina, `https://chess-results.com/tnr${tnr}.aspx?lan=2`);
  }

  const slug = slugInfo64(url)!;
  const pagina = leerHtml(await descargar(urlInfo64(url.origin, slug)));
  return parsearTorneoInfo64(pagina, `https://info64.org/${slug}`, slug);
}

export async function leerRonda(enlace: string, ronda: number): Promise<RondaOrigen> {
  if (!Number.isInteger(ronda) || ronda < 1 || ronda > 60) {
    throw new ErrorImportador("Número de ronda no válido.");
  }
  const { fuente, url } = detectarFuente(enlace);

  if (fuente === "chess-results") {
    const tnr = idTorneoChessResults(url)!;
    // El ranking inicial enlaza los números de los emparejamientos con los ID FIDE.
    const ranking = parsearRankingChessResults(
      leerHtml(await descargar(urlChessResults(url.origin, tnr, { art: 0 })))
    );
    const pagina = leerHtml(await descargar(urlChessResults(url.origin, tnr, { art: 2, rd: ronda })));
    return parsearRondaChessResults(pagina, ronda, ranking);
  }

  const slug = slugInfo64(url)!;
  const ranking = parsearRankingInfo64(leerHtml(await descargar(urlInfo64(url.origin, slug))));
  const pagina = leerHtml(await descargar(urlInfo64(url.origin, slug, ronda)));
  return parsearRondaInfo64(pagina, ronda, ranking);
}
