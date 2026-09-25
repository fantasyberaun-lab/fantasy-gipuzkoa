"use client";

import { useState } from "react";
import { useGameState } from "@/components/GameStateProvider";

type Modo = "elegir" | "crear" | "unirse";

export default function LigaForm({
  onExito,
  onCancelar,
}: {
  onExito?: () => void;
  onCancelar?: () => void;
}) {
  const { crearLiga, unirseLiga } = useGameState();

  const [modo, setModo] = useState<Modo>("elegir");
  const [nombreLiga, setNombreLiga] = useState("");
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);

  async function handleCrear() {
    setEnviando(true);
    setError(null);
    const resultado = await crearLiga(nombreLiga, nombreEquipo);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    if (resultado.codigo) setCodigoCreado(resultado.codigo);
  }

  async function handleUnirse() {
    setEnviando(true);
    setError(null);
    const resultado = await unirseLiga(codigo, nombreEquipo);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    onExito?.();
  }

  if (codigoCreado) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">¡Liga creada!</p>
        <p className="mt-2 text-sm text-neutral-500">
          Comparte este código con tus amigos para que se unan (máximo 9 por liga):
        </p>
        <p className="mt-4 rounded-xl border border-neutral-200 py-4 text-3xl font-bold tracking-widest dark:border-neutral-800">
          {codigoCreado}
        </p>
        <button
          onClick={() => onExito?.()}
          className="mt-6 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Entrar a mi liga
        </button>
      </div>
    );
  }

  return (
    <div>
      {modo === "elegir" && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setModo("crear")}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Crear una liga nueva
          </button>
          <button
            onClick={() => setModo("unirse")}
            className="rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
          >
            Unirme a una liga con un código
          </button>
          {onCancelar && (
            <button
              onClick={onCancelar}
              className="text-xs text-neutral-500 underline underline-offset-2"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {modo === "crear" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">Nombre de la liga</label>
            <input
              type="text"
              value={nombreLiga}
              onChange={(e) => setNombreLiga(e.target.value)}
              placeholder="Fantasy con los amigos"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Nombre de tu equipo</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ostadar taldea"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            onClick={handleCrear}
            disabled={!nombreLiga || !nombreEquipo || enviando}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Crear liga
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            Volver
          </button>
        </div>
      )}

      {modo === "unirse" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">Código de la liga</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Nombre de tu equipo</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ostadar taldea"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            onClick={handleUnirse}
            disabled={!codigo || !nombreEquipo || enviando}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Unirme
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  );
}