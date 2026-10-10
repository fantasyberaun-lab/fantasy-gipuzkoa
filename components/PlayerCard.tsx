"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlantillaSlot } from "@/lib/types";
import { gameConfig } from "@/lib/gameConfig";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import ProximoRivalLinea from "@/components/ProximoRival";
import { useT } from "@/components/IdiomaProvider";

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
  esCapitan?: boolean;
  bloqueadoPorTope?: boolean;
  // Texto que explica por qué no se puede poner de titular (tope de titulares por torneo).
  motivoBloqueo?: string;
  // Ya has blindado a otro jugador esta jornada (solo se permite uno).
  blindajeAgotado?: boolean;
  // Liga pública: no hay clausulazos, candados ni blindajes, así que se
  // ocultan esas opciones.
  ligaPublica?: boolean;
  onToggleTitular: () => void;
  onToggleCapitan: () => Promise<{ ok: boolean; mensaje?: string }>;
  onBlindar: () => Promise<{ ok: boolean; mensaje?: string }>;
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
  esCapitan = false,
  bloqueadoPorTope = false,
  motivoBloqueo,
  blindajeAgotado = false,
  ligaPublica = false,
  candado,
  blindado,
  proximosRivales,
  onToggleTitular,
  onToggleCapitan,
  onBlindar,
  onVender,
  onSubirClausula,
}: Props) {
  const t = useT();
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarSubirClausula, setMostrarSubirClausula] = useState(false);
  const [importeClausula, setImporteClausula] = useState("");
  const [enviandoClausula, setEnviandoClausula] = useState(false);
  const [errorClausula, setErrorClausula] = useState<string | null>(null);
  const [mostrarBlindaje, setMostrarBlindaje] = useState(false);
  const [enviandoBlindaje, setEnviandoBlindaje] = useState(false);
  const [errorBlindaje, setErrorBlindaje] = useState<string | null>(null);
  const [errorCapitan, setErrorCapitan] = useState<string | null>(null);

  const precioBlindaje = Math.ceil(jugador.valorMercado * gameConfig.blindaje.porcentaje);

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

  const cambiarCapitan = async () => {
    setErrorCapitan(null);
    const resultado = await onToggleCapitan();
    if (!resultado.ok) {
      setErrorCapitan(resultado.mensaje ?? t.ficha.errorCapitan);
    }
  };

  const confirmarBlindaje = async () => {
    setEnviandoBlindaje(true);
    setErrorBlindaje(null);
    const resultado = await onBlindar();
    setEnviandoBlindaje(false);
    if (resultado.ok) {
      setMostrarBlindaje(false);
    } else {
      setErrorBlindaje(resultado.mensaje ?? t.ficha.errorBlindar);
    }
  };

  const importeNumerico = Number(importeClausula) || 0;
  const nuevaClausula = clausula + importeNumerico * gameConfig.subidaClausula.multiplicador;

  const confirmarSubirClausula = async () => {
    if (!importeNumerico || importeNumerico <= 0) {
      setErrorClausula(t.ficha.importeInvalido);
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
      setErrorClausula(resultado.mensaje ?? t.ficha.errorSubirClausula);
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
              <p className="font-medium">
                <Link href={`/jugadores/${jugador.id}`} className="hover:underline">
                  {jugador.nombre}
                </Link>
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  esTitular
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {esTitular ? t.ficha.titular : t.ficha.suplente}
              </span>
              {esCapitan && (
                <span
                  title={t.ficha.capitanTitle(gameConfig.capitan.multiplicador)}
                  className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                >
                  C · x{gameConfig.capitan.multiplicador}
                </span>
              )}
              {!ligaPublica &&
                (blindado ? (
                <span
                  title={t.ficha.blindadoTitle}
                  className="flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  {t.ficha.blindado}
                </span>
              ) : candado ? (
                <span
                  title={t.ficha.candadoTitle}
                  className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  {t.ficha.candado}
                </span>
              ) : (
                <span
                  title={t.ficha.clausulableTitle}
                  className="flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                  {t.ficha.clausulable}
                </span>
                ))}
            </div>
            <p className="text-sm text-neutral-500">
              {jugador.club} · {t.ficha.categoria(jugador.categoria)} · Elo {jugador.elo}
            </p>
            <ProximoRivalLinea rivales={proximosRivales} className="mt-0.5" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex gap-1">
            {resultadosRecientes.map((r, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${puntoColor[r]}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span>{t.ficha.pts(puntosJornada)}</span>
            <span className="font-medium">{jugador.valorMercado} M</span>
            <span className={deltaColor}>
              {valorMercadoDelta > 0 ? `+${valorMercadoDelta}` : valorMercadoDelta}
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onToggleTitular}
            disabled={bloqueadoPorTope}
            title={
              bloqueadoPorTope
                ? (motivoBloqueo ?? t.ficha.topeTitulares(gameConfig.plantilla.maximoTitularesPorTorneo))
                : undefined
            }
            className={`flex-1 rounded-lg border bg-white py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-900 ${
              esTitular
                ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                : "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300"
            }`}
          >
            {esTitular ? t.ficha.pasarASuplente : t.ficha.pasarATitular}
          </button>
          <button
            onClick={() => setMostrarConfirmacion(true)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            {t.ficha.vender}
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={cambiarCapitan}
            disabled={!esTitular}
            title={
              !esTitular
                ? t.ficha.capitanSoloTitular
                : esCapitan
                  ? t.ficha.quitarCapitania
                  : t.ficha.capitanPuntua(gameConfig.capitan.multiplicador)
            }
            className={`flex-1 rounded-lg border py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
              esCapitan
                ? "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                : "border-yellow-300 bg-white text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:bg-neutral-900 dark:text-yellow-300"
            }`}
          >
            {esCapitan ? t.ficha.quitarCapitan : t.ficha.capitan}
          </button>
          {!ligaPublica && (
            <button
              onClick={() => {
                setErrorBlindaje(null);
                setMostrarBlindaje(true);
              }}
              disabled={!!blindado || blindajeAgotado}
              title={
                blindado
                  ? t.ficha.yaBlindado
                  : blindajeAgotado
                    ? t.ficha.blindajeAgotado
                    : t.ficha.blindarTitle
              }
              className="flex-1 rounded-lg border border-violet-300 bg-white py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-800 dark:bg-neutral-900 dark:text-violet-300"
            >
              {blindado ? t.ficha.blindado : t.ficha.blindar(precioBlindaje)}
            </button>
          )}
        </div>
        {errorCapitan && <p className="mt-1 text-xs text-negative">{errorCapitan}</p>}

        {!ligaPublica && (
          <button
            onClick={() => setMostrarSubirClausula(true)}
            className="mt-2 w-full rounded-lg border border-sky-300 bg-white py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-neutral-900 dark:text-sky-300"
          >
            {t.ficha.subirClausula(clausula)}
          </button>
        )}

        <button
          onClick={() => setMostrarHistorial((prev) => !prev)}
          className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
        >
          {mostrarHistorial ? t.ficha.ocultar : t.ficha.puntosPorJornada}
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

            <p className="text-base font-semibold">{t.ficha.venderA(jugador.nombre)}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {t.ficha.recibiras(jugador.valorMercado)}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
              >
                {t.comun.cancelar}
              </button>
              <button
                onClick={confirmarVenta}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                {t.ficha.siVender}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarBlindaje && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMostrarBlindaje(false)}
          />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <p className="text-base font-semibold">{t.ficha.blindarA(jugador.nombre)}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {t.ficha.pagarasBlindaje(precioBlindaje, Math.round(gameConfig.blindaje.porcentaje * 100))}
            </p>
            <p className="mt-2 rounded-lg bg-violet-50 p-3 text-xs text-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
              {t.ficha.unoPorJornadaAntes}
              <span className="font-semibold">{t.ficha.unoPorJornadaNegrita}</span>
              {t.ficha.unoPorJornadaDespues}
            </p>

            {errorBlindaje && <p className="mt-2 text-xs text-negative">{errorBlindaje}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setMostrarBlindaje(false)}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
              >
                {t.comun.cancelar}
              </button>
              <button
                onClick={confirmarBlindaje}
                disabled={enviandoBlindaje}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                {enviandoBlindaje ? t.ficha.pagando : t.ficha.confirmar}
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

            <p className="text-base font-semibold">{t.ficha.subirClausulaDe(jugador.nombre)}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {t.ficha.clausulaActual(clausula, gameConfig.subidaClausula.multiplicador)}
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-neutral-500">{t.ficha.importeAPagar}</label>
              <input
                type="number"
                value={importeClausula}
                onChange={(e) => setImporteClausula(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            {importeNumerico > 0 && (
              <p className="mt-2 text-sm text-neutral-500">
                {t.ficha.nuevaClausula} <span className="font-medium">{nuevaClausula} M</span>
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
                {t.comun.cancelar}
              </button>
              <button
                onClick={confirmarSubirClausula}
                disabled={enviandoClausula || !importeClausula}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                {enviandoClausula ? t.ficha.pagando : t.ficha.confirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}