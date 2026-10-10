"use client";

import { useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import CopiarCodigoButton from "@/components/CopiarCodigoButton";
import { useT } from "@/components/IdiomaProvider";

type Modo = "elegir" | "crear" | "unirse" | "publica";

export default function LigaForm({
  onExito,
  onCancelar,
}: {
  onExito?: () => void;
  onCancelar?: () => void;
}) {
  const t = useT();
  const { crearLiga, unirseLiga, unirseLigaPublica, misLigas } = useGameState();
  const yaEnLigaPublica = misLigas.some((l) => l.tipo === "publica");

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

  async function handleUnirsePublica() {
    setEnviando(true);
    setError(null);
    const resultado = await unirseLigaPublica(nombreEquipo);
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
        <p className="text-lg font-semibold">{t.liga.ligaCreada}</p>
        <p className="mt-2 text-sm text-neutral-500">
          {t.liga.compartirCodigo}
        </p>
        <p className="mt-4 rounded-xl border border-neutral-200 py-4 text-3xl font-bold tracking-widest dark:border-neutral-800">
          {codigoCreado}
        </p>
        <CopiarCodigoButton codigo={codigoCreado} className="mt-3" />
        <button
          onClick={() => onExito?.()}
          className="mt-6 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {t.liga.entrarMiLiga}
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
            {t.liga.crearNueva}
          </button>
          <button
            onClick={() => setModo("unirse")}
            className="rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
          >
            {t.liga.unirmeCodigo}
          </button>
          {!yaEnLigaPublica && (
            <button
              onClick={() => setModo("publica")}
              className="rounded-lg border border-accent py-2.5 text-sm font-medium text-accent"
            >
              {t.liga.unirmePublica}
            </button>
          )}
          {onCancelar && (
            <button
              onClick={onCancelar}
              className="text-xs text-neutral-500 underline underline-offset-2"
            >
              {t.comun.cancelar}
            </button>
          )}
        </div>
      )}

      {modo === "crear" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreLiga}</label>
            <input
              type="text"
              value={nombreLiga}
              onChange={(e) => setNombreLiga(e.target.value)}
              placeholder={t.liga.placeholderLiga}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreEquipo}</label>
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
            {t.liga.crearLiga}
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            {t.comun.volver}
          </button>
        </div>
      )}

      {modo === "publica" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            {t.liga.publicaDescripcion}
          </p>
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreEquipo}</label>
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
            onClick={handleUnirsePublica}
            disabled={!nombreEquipo || enviando}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {enviando ? t.liga.entrando : t.liga.entrarPublica}
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            {t.comun.volver}
          </button>
        </div>
      )}

      {modo === "unirse" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.codigoLiga}</label>
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
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreEquipo}</label>
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
            {t.liga.unirme}
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            {t.comun.volver}
          </button>
        </div>
      )}
    </div>
  );
}