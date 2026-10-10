"use client";

import { useIdioma } from "@/components/IdiomaProvider";
import { ETIQUETAS_COMUNICADO } from "@/lib/comunicados";
import type { EtiquetaComunicado } from "@/lib/types";

function hace(iso: string, locale: string, ahoraMismo: string): string {
  const segundos = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(segundos);
  if (abs < 60) return ahoraMismo;
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(segundos / 3600), "hour");
  return rtf.format(Math.round(segundos / 86400), "day");
}

// Tarjeta de un comunicado. Las etiquetas "destacadas" (Importante) usan el
// mismo diseño que el aviso de actualización de Elo.
export default function ComunicadoCard({
  titulo,
  cuerpo,
  etiqueta,
  creado,
  nuevo = false,
}: {
  titulo: string;
  cuerpo: string;
  etiqueta: EtiquetaComunicado;
  creado: string;
  nuevo?: boolean;
}) {
  const { t, locale } = useIdioma();
  const e = ETIQUETAS_COMUNICADO[etiqueta];
  return (
    <li
      className={`rounded-2xl p-4 ${
        e.destacada
          ? "border-2 border-accent bg-accent/10 shadow-sm"
          : `border ${
              nuevo ? "border-accent/60 bg-accent/5" : "border-neutral-200 dark:border-neutral-800"
            }`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${e.chip}`}
          >
            {t.avisos.etiquetas[etiqueta]}
          </span>
          <h3 className="mt-2 text-base font-bold">{titulo}</h3>
        </div>
        {nuevo && (
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label={t.avisos.nuevo} />
        )}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm">{cuerpo}</p>
      <p className="mt-2 text-xs text-neutral-500">{hace(creado, locale, t.avisos.ahoraMismo)}</p>
    </li>
  );
}
