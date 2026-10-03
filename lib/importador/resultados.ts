// Interpretación de los textos de resultado de Chess-Results e Info64.

import type { ResultadoOrigen, TipoSinRival } from "./tipos";

function compactar(texto: string): string {
  return texto
    .replace(/\u00bd/g, "0.5")
    .replace(/1\/2/g, "0.5")
    .replace(/,/g, ".")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// Resultado de una partida con los dos rivales presentes, visto desde blancas.
export function interpretarResultadoPartida(texto: string): ResultadoOrigen {
  const t = compactar(texto);
  if (t === "" || t === "*" || t === "-" || t === "?") return "pendiente";
  if (t === "1-0") return "blancas";
  if (t === "0-1") return "negras";
  if (t === "0.5-0.5") return "tablas";
  // +, -, +-, -+, +:-, -:+, -:-, 1-0f ... : no presentación
  if (/[+:]/.test(t) || /^-\+?$/.test(t) || /f$/.test(t)) return "incomparecencia";
  return "desconocido";
}

// Jugador que aparece sin rival. Bye de punto completo ("+", "1", "bye") y bye
// pedido por el jugador (medio punto, "0.5" / "½") puntúan igual: descanso.
export function interpretarSinRival(texto: string): TipoSinRival | "pendiente" {
  const t = compactar(texto);
  if (t === "*" || t === "?") return "pendiente";
  if (t === "+" || t === "1" || t === "1.0" || t.includes("bye")) return "descanso";
  if (t === "0.5") return "descanso";
  if (t === "0" || t === "0.0" || t === "-") return "ausente";
  return "otro";
}