// Única parte del importador que depende de Cheerio: convierte el HTML en
// una estructura simple (Pagina) que los lectores de chessResults.ts e
// info64.ts interpretan. Se mantiene corta a propósito.

import * as cheerio from "cheerio";
import type { FilaTabla, Pagina, Tabla } from "./tipos";

const limpiar = (t: string) => t.replace(/\s+/g, " ").trim();

export function leerHtml(html: string): Pagina {
  const $ = cheerio.load(html);

  const tablas: Tabla[] = [];
  $("table").each((_, tabla) => {
    const filas: FilaTabla[] = [];
    $(tabla)
      .find("tr")
      .each((_, tr) => {
        // Solo las filas de ESTA tabla (no las de tablas anidadas dentro).
        if ($(tr).closest("table").get(0) !== tabla) return;
        const celdas = $(tr)
          .children("th,td")
          .map((_, c) => ({
            texto: limpiar($(c).text()),
            href: $(c).find("a").first().attr("href") ?? null,
          }))
          .get();
        if (celdas.length === 0) return;
        const cabecera = $(tr).children("th").length > 0 && $(tr).children("td").length === 0;
        filas.push({ celdas, cabecera });
      });
    if (filas.length > 0) tablas.push({ filas });
  });

  // Texto en líneas: los <br> y el cierre de bloques cuentan como salto.
  $("script,style,noscript").remove();
  const conSaltos = ($("body").html() ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|td|th|table|ul|span)>/gi, "\n");
  const lineas = cheerio
    .load(`<div>${conSaltos}</div>`)("div")
    .text()
    .split("\n")
    .map(limpiar)
    .filter(Boolean);

  const enlaces = $("a[href]")
    .map((_, a) => $(a).attr("href") ?? "")
    .get()
    .filter(Boolean);

  return { titulo: limpiar($("title").first().text()), tablas, lineas, enlaces };
}
