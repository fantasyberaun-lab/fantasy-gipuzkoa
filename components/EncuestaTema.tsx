"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma } from "@/components/IdiomaProvider";
import { textoError } from "@/lib/foroUi";
import { cerrarEncuestaForoDB, votarForoDB, type EncuestaForo, type EstadoForo } from "@/lib/supabase/foroQueries";

// Encuesta de un tema: 2-5 opciones, voto único y secreto. Los resultados se ven tras
// votar o cuando la encuesta se cierra (a mano o por fecha). El servidor nunca manda los
// recuentos mientras no se pueden ver.
export default function EncuestaTema({
  temaId,
  encuesta,
  estado,
  puedeVotar,
  puedeCerrar,
  onCambio,
}: {
  temaId: number;
  encuesta: EncuestaForo;
  estado: EstadoForo | null;
  puedeVotar: boolean;
  puedeCerrar: boolean;
  onCambio: (e: EncuestaForo | null) => void;
}) {
  const { t, locale } = useIdioma();
  const tf = t.foros;
  const te = tf.encuesta;
  const supabase = createClient();
  const [elegida, setElegida] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const puedeElegir = puedeVotar && !encuesta.cerrada && encuesta.miVoto === null;
  const total = encuesta.total ?? 0;

  async function votar() {
    if (elegida === null || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await votarForoDB(supabase, temaId, elegida);
    setEnviando(false);
    if (r.ok) {
      onCambio(r.encuesta);
      return;
    }
    setError(textoError(tf, r, estado));
  }

  async function cerrar() {
    setConfirmando(false);
    const r = await cerrarEncuestaForoDB(supabase, temaId);
    if (r.ok) onCambio(r.encuesta);
    else setError(textoError(tf, r, estado));
  }

  return (
    <section
      aria-label={te.titulo}
      className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span aria-hidden="true">📊</span> {te.titulo}
        </h3>
        {encuesta.cerrada ? (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {te.cerrada}
          </span>
        ) : encuesta.cierraEn ? (
          <span className="text-[11px] text-neutral-500">
            {te.cierra(new Date(encuesta.cierraEn).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }))}
          </span>
        ) : null}
      </div>

      <ul className="flex flex-col gap-1.5">
        {encuesta.opciones.map((o) => {
          const votos = o.votos ?? 0;
          const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
          const mia = encuesta.miVoto === o.id;
          if (encuesta.visible) {
            return (
              <li key={o.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={`min-w-0 break-words ${mia ? "font-semibold text-accent" : ""}`}>
                    {o.texto}
                    {mia && <span className="ml-1.5 text-[10px] font-semibold uppercase">{te.tuVoto}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-neutral-500">
                    {pct}% · {votos}
                  </span>
                </div>
                <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full ${mia ? "bg-accent" : "bg-accent/50"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          }
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!puedeElegir}
                aria-pressed={elegida === o.id}
                onClick={() => setElegida(o.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  elegida === o.id
                    ? "border-accent bg-accent/10 font-semibold text-accent"
                    : "border-neutral-200 bg-white hover:border-accent dark:border-neutral-700 dark:bg-neutral-900"
                } disabled:cursor-default disabled:opacity-70`}
              >
                {o.texto}
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="status" className="mt-2 text-xs text-negative">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <span>
          {encuesta.visible ? te.total(total) : puedeElegir ? te.votaParaVer : null}
          {" · "}
          {te.votoSecreto}
        </span>
        <span className="flex items-center gap-2">
          {puedeElegir && (
            <button
              type="button"
              onClick={votar}
              disabled={elegida === null || enviando}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
            >
              {te.votar}
            </button>
          )}
          {puedeCerrar && !encuesta.cerrada &&
            (confirmando ? (
              <span className="flex items-center gap-1.5">
                <span>{te.confirmarCerrar}</span>
                <button type="button" onClick={cerrar} className="font-semibold text-accent">
                  {t.comun.aceptar}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} className="font-medium">
                  {t.comun.cancelar}
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} className="font-medium hover:text-accent">
                {te.cerrar}
              </button>
            ))}
        </span>
      </div>
    </section>
  );
}
