"use client";

import { useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import LigaForm from "@/components/LigaForm";
import type { LigaResumen } from "@/lib/types";
import CopiarCodigoButton from "@/components/CopiarCodigoButton";

export default function CambiarLigaModal({ onCerrar }: { onCerrar: () => void }) {
  const { misLigas, equipo, cambiarLigaActiva, salirLiga } = useGameState();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ligaASalir, setLigaASalir] = useState<LigaResumen | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalir, setErrorSalir] = useState<string | null>(null);

  const cancelarSalir = () => {
    if (saliendo) return;
    setLigaASalir(null);
    setErrorSalir(null);
  };

  const confirmarSalir = async () => {
    if (!ligaASalir) return;
    setSaliendo(true);
    setErrorSalir(null);
    const resultado = await salirLiga(ligaASalir.ligaId);
    setSaliendo(false);
    if (!resultado.ok) {
      setErrorSalir(resultado.mensaje);
      return;
    }
    onCerrar();
  };

  const seleccionar = async (ligaId: string) => {
    if (ligaId === equipo.leagueId) {
      onCerrar();
      return;
    }
    await cambiarLigaActiva(ligaId);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

        {ligaASalir ? (
          <>
            <p className="text-base font-semibold">Salir de {ligaASalir.nombre}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Se borrarán tu equipo <span className="font-medium">{ligaASalir.nombreEquipo}</span>,
              su saldo, su plantilla y sus puntos en esta liga. Tus jugadores
              volverán al mercado. No se puede deshacer.
            </p>
            {ligaASalir.tipo === "publica" ? (
              <p className="mt-2 text-xs text-neutral-500">
                Podrás volver a entrar a la liga pública, pero empezarás de cero.
              </p>
            ) : (
              <p className="mt-2 text-xs text-neutral-500">
                {ligaASalir.miembros <= 1
                  ? "Eres el único miembro: la liga se eliminará también."
                  : "Para volver a entrar necesitarás el código de la liga y que haya hueco."}
              </p>
            )}

            {errorSalir && <p className="mt-2 text-xs text-negative">{errorSalir}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={cancelarSalir}
                disabled={saliendo}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSalir}
                disabled={saliendo}
                className="flex-1 rounded-lg bg-negative py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {saliendo ? "Saliendo…" : "Salir de la liga"}
              </button>
            </div>
          </>
        ) : mostrarForm ? (
          <>
            <p className="mb-3 text-base font-semibold">Unirme a otra liga</p>
            <LigaForm onExito={onCerrar} onCancelar={() => setMostrarForm(false)} />
          </>
        ) : (
          <>
            <p className="mb-3 text-base font-semibold">Tus ligas</p>
            <div className="flex flex-col gap-2">
              {misLigas.map((liga) => (
                <div
                  key={liga.ligaId}
                  className={`flex flex-col gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                    liga.ligaId === equipo.leagueId
                      ? "border-accent bg-accent/10"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => seleccionar(liga.ligaId)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium">
                      {liga.nombre}
                      {liga.ligaId === equipo.leagueId && (
                        <span className="ml-2 text-xs font-medium text-accent">Activa</span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {liga.tipo === "publica"
                        ? `${liga.nombreEquipo} · Todos contra todos · ${liga.miembros} managers · ${liga.saldo} M`
                        : `${liga.nombreEquipo} · ${liga.miembros}/${liga.maxMiembros} · código ${liga.codigo} · ${liga.saldo} M`}
                    </p>
                  </button>
                  {liga.tipo !== "publica" && <CopiarCodigoButton codigo={liga.codigo} />}
                  </div>
                  <button
                    onClick={() => setLigaASalir(liga)}
                    className="flex items-center gap-1 self-end rounded-md px-1.5 py-1 text-xs font-medium text-negative hover:bg-negative/10"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                      />
                    </svg>
                    Salir de la liga
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMostrarForm(true)}
              className="mt-4 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
            >
              Crear o unirme a otra liga
            </button>
            <button
              onClick={onCerrar}
              className="mt-2 w-full text-center text-xs text-neutral-500 underline underline-offset-2"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}