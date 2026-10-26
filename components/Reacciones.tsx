"use client";

import { useEffect, useState } from "react";
import { useIdioma } from "@/components/IdiomaProvider";
import { EMOJIS_REACCION } from "@/lib/supabase/foroQueries";

const D_CARITA =
  "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z";

// Reacciones de un mensaje: chips con el recuento y un botón para añadir la tuya.
// Una reacción por persona: pulsar la tuya la quita, pulsar otra la cambia.
export default function Reacciones({
  conteos,
  mia,
  puedeReaccionar,
  onReaccionar,
  sinBoton = false,
  className = "",
}: {
  conteos: Record<string, number>;
  mia: string | null;
  puedeReaccionar: boolean;
  onReaccionar: (emoji: string | null) => void;
  // Sin el botón de añadir (en el chat va junto al menú del mensaje: BotonReaccion).
  sinBoton?: boolean;
  className?: string;
}) {
  const tf = useIdioma().t.foros;
  const [selector, setSelector] = useState(false);
  const presentes = EMOJIS_REACCION.filter((e) => (conteos[e] ?? 0) > 0);
  if (presentes.length === 0 && (!puedeReaccionar || sinBoton)) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {presentes.map((e) => {
        const mio = mia === e;
        return (
          <button
            key={e}
            type="button"
            disabled={!puedeReaccionar}
            aria-pressed={mio}
            aria-label={mio ? tf.quitarReaccion : tf.reaccionNombre(e)}
            onClick={() => onReaccionar(mio ? null : e)}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              mio
                ? "border-accent bg-accent/10 font-semibold text-accent"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            } disabled:cursor-default disabled:hover:border-neutral-200`}
          >
            <span aria-hidden="true">{e}</span>
            <span className="tabular-nums">{conteos[e]}</span>
          </button>
        );
      })}
      {puedeReaccionar && !sinBoton && (
        <>
          <button
            type="button"
            aria-label={tf.reaccionar}
            aria-expanded={selector}
            onClick={() => setSelector((v) => !v)}
            className={`flex h-6 w-7 items-center justify-center rounded-full border text-neutral-500 transition-colors hover:border-accent hover:text-accent ${
              selector ? "border-accent text-accent" : "border-neutral-200 dark:border-neutral-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={D_CARITA} />
            </svg>
          </button>
          {selector &&
            EMOJIS_REACCION.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={tf.reaccionNombre(e)}
                onClick={() => {
                  setSelector(false);
                  onReaccionar(mia === e ? null : e);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  mia === e ? "bg-accent/10 ring-1 ring-accent" : ""
                }`}
              >
                {e}
              </button>
            ))}
        </>
      )}
    </div>
  );
}

// Botón suelto para reaccionar, con un selector flotante (position:fixed, para que no lo
// recorte una lista con scroll). Se usa en el chat, junto al menú del mensaje.
export function BotonReaccion({
  mia,
  onReaccionar,
}: {
  mia: string | null;
  onReaccionar: (emoji: string | null) => void;
}) {
  const tf = useIdioma().t.foros;
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const cerrar = (e: Event) => {
      if (e.type === "mousedown" && (e.target as HTMLElement).closest("[data-selector-reaccion]")) return;
      setPos(null);
    };
    document.addEventListener("mousedown", cerrar);
    window.addEventListener("resize", cerrar);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      window.removeEventListener("resize", cerrar);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [pos]);

  function abrir(boton: HTMLElement) {
    const r = boton.getBoundingClientRect();
    const ancho = 5 * 32 + 16;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - ancho / 2, window.innerWidth - ancho - 8));
    const cabeArriba = r.top - 44 >= 8;
    setPos(cabeArriba ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 });
  }

  return (
    <div className="relative shrink-0" data-selector-reaccion>
      <button
        type="button"
        aria-label={tf.reaccionar}
        aria-expanded={pos !== null}
        onClick={(e) => (pos ? setPos(null) : abrir(e.currentTarget))}
        className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-60 hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={D_CARITA} />
        </svg>
      </button>
      {pos && (
        <div
          role="menu"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}
          className="fixed z-50 flex gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {EMOJIS_REACCION.map((e) => (
            <button
              key={e}
              type="button"
              role="menuitem"
              aria-label={tf.reaccionNombre(e)}
              onClick={() => {
                setPos(null);
                onReaccionar(mia === e ? null : e);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                mia === e ? "bg-accent/10 ring-1 ring-accent" : ""
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
