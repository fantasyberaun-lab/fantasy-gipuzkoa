import { Fragment, type ReactNode } from "react";

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pinta el texto resaltando "@alias" de quienes están mencionados en el mensaje.
export function resaltarMenciones(texto: string, nombres: string[]): ReactNode {
  const lista = Array.from(new Set(nombres.filter(Boolean))).sort((a, b) => b.length - a.length);
  if (lista.length === 0) return texto;
  const re = new RegExp(`(@(?:${lista.map(escaparRegex).join("|")}))(?![\\p{L}\\p{N}_])`, "giu");
  return texto.split(re).map((trozo, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded bg-gold/35 px-0.5 font-semibold text-neutral-900 dark:text-white">
        {trozo}
      </span>
    ) : (
      <Fragment key={i}>{trozo}</Fragment>
    )
  );
}
