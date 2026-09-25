"use client";

import { useState } from "react";
import type { PlantillaSlot } from "@/lib/types";
import { gameConfig } from "@/lib/gameConfig";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const puntoColor: Record<string, string> = {
  victoria: "bg-positive",
  tablas: "bg-neutral-400",
  derrota: "bg-negative",
};

type Props = PlantillaSlot & {
  esTitular: boolean;
  onToggleTitular: () => void;
  onVender: () => void;
  onSubirClausula: (importe: number) => Promise<{ ok: boolean; mensaje?: string }>;
};

export default function PlayerCard({
  jugador,
  puntosJornada,
  valorMercadoDelta,
  clausula,
  resultadosRecientes,
  historialPuntos,
  esTitular,
  onToggleTitular,
  onVender,
  onSubirClausula,
}: Props) {
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarSubirClausula, setMostrarSubirClausula] = useState(false);
  const [importeClausula, setImporteClausula] = useState("");
  const [enviandoClausula, setEnviandoClausula] = useState(false);
  const [errorClausula, setErrorClausula] = useState<string | null>(null);

  const deltaColor =
    valorMercadoDelta > 0
      ? "text-positive"
      : valorMercadoDelta < 0
        ? "text-negative"
        : "text-neutral-500";

  const confirmarVenta = () => {
    setMostrarConfirmacion(false);
    onVender();
  };

  const importeNumerico = Number(importeClausula) || 0;
  const nuevaClausula = clausula + importeNumerico * gameConfig.subidaClausula.multiplicador;

  const confirmarSubirClausula = async () => {
    if (!importeNumerico || importeNumerico <= 0) {
      setErrorClausula("Introduce un importe válido.");
      return;
    }
    setEnviandoClausula(true);
    setErrorClausula(null);
    const resultado = await onSubirClausula(importeNumerico);
    setEnviandoClausula(false);
    if (resultado.ok) {
      setMostrarSubirClausula(false);
      setImporteClausula("");
    } else {
      setErrorClausula(resultado.mensaje ?? "No se ha podido subir la cláusula.");
    }
  };

  return (
    <>
      <div
        className={`rounded-2xl border-l-4 border-y border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${
          esTitular ? "border-l-green-500" : "border-l-red-400"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800">
            {iniciales(jugador.nombre)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{jugador.nombre}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  esTitular
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {esTitular ? "Titular" : "Suplente"}
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex gap-1">
            {resultadosRecientes.map((r, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${puntoColor[r]}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span>{puntosJornada} pts</span>
            <span className="font-medium">{jugador.valorMercado} M</span>
            <span className={deltaColor}>
              {valorMercadoDelta > 0 ? `+${valorMercadoDelta}` : valorMercadoDelta}
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onToggleTitular}
            className={`flex-1 rounded-lg border bg-white py-2 text-sm font-medium dark:bg-neutral-900 ${
              esTitular
                ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                : "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300"
            }`}
          >
            {esTitular ? "Suplente" : "Titular"}
          </button>
          <button
            onClick={() => setMostrarConfirmacion(true)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            Vender
          </button>
        </div>

        <button
          onClick={() => setMostrarSubirClausula(true)}
          className="mt-2 w-full rounded-lg border border-sky-300 bg-white py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-neutral-900 dark:text-sky-300"
        >
          Subir cláusula ({clausula} M)
        </button>

        <button
          onClick={() => setMostrarHistorial((prev) => !prev)}
          className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
        >
          {mostrarHistorial ? "Ocultar" : "Puntos por jornada"}
          <svg
            className={`h-3 w-3 transition-transform ${mostrarHistorial ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {mostrarHistorial && (
          <div className="mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <HistorialPuntosChart historial={historialPuntos} />
          </div>
        )}
      </div>

      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMostrarConfirmacion(false)}
          />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <p className="text-base font-semibold">Vender a {jugador.nombre}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Recibirás {jugador.valorMercado} M en tu saldo. Esta acción no se puede deshacer.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVenta}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Sí, vender
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarSubirClausula && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setMostrarSubirClausula(false);
              setErrorClausula(null);
            }}
          />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <p className="text-base font-semibold">Subir cláusula de {jugador.nombre}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cláusula actual: {clausula} M. Cada M que pagues la sube{" "}
              {gameConfig.subidaClausula.multiplicador} M.
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-neutral-500">Importe a pagar (M)</label>
              <input
                type="number"
                value={importeClausula}
                onChange={(e) => setImporteClausula(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            {importeNumerico > 0 && (
              <p className="mt-2 text-sm text-neutral-500">
                Nueva cláusula: <span className="font-medium">{nuevaClausula} M</span>
              </p>
            )}

            {errorClausula && <p className="mt-2 text-xs text-negative">{errorClausula}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setMostrarSubirClausula(false);
                  setErrorClausula(null);
                }}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSubirClausula}
                disabled={enviandoClausula || !importeClausula}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                {enviandoClausula ? "Pagando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}