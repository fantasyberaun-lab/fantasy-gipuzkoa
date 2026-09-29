"use client";

import { useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import LigaForm from "@/components/LigaForm";
import CopiarCodigoButton from "@/components/CopiarCodigoButton";

export default function CambiarLigaModal({ onCerrar }: { onCerrar: () => void }) {
  const { misLigas, equipo, cambiarLigaActiva } = useGameState();
  const [mostrarForm, setMostrarForm] = useState(false);

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
      <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

        {mostrarForm ? (
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
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    liga.ligaId === equipo.leagueId
                      ? "border-accent bg-accent/10"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
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