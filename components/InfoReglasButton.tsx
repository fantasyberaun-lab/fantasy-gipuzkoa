"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gameConfig } from "@/lib/gameConfig";
import { useT } from "@/components/IdiomaProvider";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="font-display text-base font-semibold">{titulo}</h3>
      <div className="mt-1.5 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
        {children}
      </div>
    </section>
  );
}

// Pinta en negrita lo que va entre **dobles asteriscos**.
function negritas(texto: string): ReactNode {
  return texto.split("**").map((trozo, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-medium">
        {trozo}
      </span>
    ) : (
      trozo
    )
  );
}

function Fila({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-neutral-200 py-1 last:border-0 dark:border-neutral-800">
      <span>{a}</span>
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{b}</span>
    </div>
  );
}

// Botón "i" de la cabecera + ventana con las reglas del juego.
export default function InfoReglasButton({ onDark = false }: { onDark?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const t = useT();
  const r = t.reglas;

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const estilo = onDark
    ? "border-white/25 text-white/80 hover:border-gold hover:text-gold"
    : "border-neutral-300 text-neutral-600 hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-300";

  const mult = gameConfig.capitan.multiplicador;
  const pctBlindaje = Math.round(gameConfig.blindaje.porcentaje * 100);
  const pctClausula = Math.round(gameConfig.clausula.porcentaje * 100);
  const multClausula = gameConfig.subidaClausula.multiplicador;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label={r.titulo}
        title={r.titulo}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${estilo}`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={r.titulo}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-2xl sm:pb-5"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">{r.titulo}</h2>
                <button
                  onClick={() => setAbierto(false)}
                  aria-label={t.comun.cerrar}
                  className="-mr-1 -mt-1 rounded-full p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <Seccion titulo={r.puntosTitulo}>
                <p>{r.puntosIntro}</p>
                <div className="rounded-lg bg-neutral-50 px-3 py-1 dark:bg-neutral-800/60">
                  <div className="flex justify-between gap-3 border-b border-neutral-200 py-1 text-xs text-neutral-500 dark:border-neutral-700">
                    <span>{r.tablaDiferencia}</span>
                    <span>{r.tablaResultados}</span>
                  </div>
                  <Fila a={r.tramo1} b="3 · 1 · 0" />
                  <Fila a={r.tramo2} b="4 · 2 · 0" />
                  <Fila a={r.tramo3} b="5 · 3 · 0" />
                  <Fila a={r.tramo4} b="7 · 4 · 0" />
                  <Fila a={r.tramo5} b="9 · 5 · 0" />
                </div>
                <p>{negritas(r.bonus)}</p>
                <p>{negritas(r.descanso(gameConfig.puntosPorDescanso))}</p>
                <p>{negritas(r.finDeSemana)}</p>
                <p>{negritas(r.unTorneo)}</p>
                <p>{r.limite(gameConfig.plantilla.maximoTitularesPorTorneo)}</p>
                <p>{negritas(r.automatico(gameConfig.plantilla.maximoTitulares))}</p>
              </Seccion>

              <Seccion titulo={r.mercadoTitulo}>
                <p>{r.mercado}</p>
                <p>{negritas(r.pujasOcultas)}</p>
              </Seccion>

              <Seccion titulo={r.capitanTitulo}>
                <p>{negritas(r.capitan(mult))}</p>
                <p>{r.capitanUnico}</p>
              </Seccion>

              <Seccion titulo={r.clausulazosTitulo}>
                <p>{r.clausula(pctClausula)}</p>
                <p>{negritas(r.subirClausula(multClausula))}</p>
                <p>{negritas(r.candado)}</p>
                <p>{negritas(r.cierre)}</p>
                <p>{r.sinClausulazosPublica}</p>
              </Seccion>

              <Seccion titulo={r.blindajeTitulo}>
                <p>{r.blindaje(pctBlindaje)}</p>
                <p>{r.blindajeUno}</p>
              </Seccion>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
