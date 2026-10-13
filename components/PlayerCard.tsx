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

const iconoBlindado =
  "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z";
const iconoCandado =
  "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z";
const iconoClausulable =
  "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z";

type EstadoClausula = "blindado" | "candado" | "clausulable";

const estadoEstilo: Record<EstadoClausula, { icono: string; clases: string }> = {
  blindado: {
    icono: iconoBlindado,
    clases: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  },
  candado: {
    icono: iconoCandado,
    clases: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  clausulable: {
    icono: iconoClausulable,
    clases: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
};

// Icono (fila) o icono + texto (hoja) del estado de la cláusula del jugador.
function InsigniaEstado({
  estado,
  texto,
  title,
}: {
  estado: EstadoClausula;
  texto?: string;
  title: string;
}) {
  const { icono, clases } = estadoEstilo[estado];
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${clases}`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icono} />
      </svg>
      {texto}
    </span>
  );
}

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

// Fila compacta de un jugador de la plantilla. Al tocarla se abre una hoja
// inferior con todas las acciones (capitán, blindar, cláusula, vender…).
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
  torneos,
  onToggleTitular,
  onToggleCapitan,
  onBlindar,
  onVender,
  onSubirClausula,
}: Props) {
  const t = useT();
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
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
  const deltaTexto = valorMercadoDelta > 0 ? `+${valorMercadoDelta}` : `${valorMercadoDelta}`;

  const estado: EstadoClausula = blindado ? "blindado" : candado ? "candado" : "clausulable";
  const estadoTexto = {
    blindado: { corto: t.ficha.blindado, title: t.ficha.blindadoTitle },
    candado: { corto: t.ficha.candado, title: t.ficha.candadoTitle },
    clausulable: { corto: t.ficha.clausulable, title: t.ficha.clausulableTitle },
  }[estado];

  const abrirModal = (abrir: () => void) => {
    setMostrarAcciones(false);
    abrir();
  };

  const confirmarVenta = () => {
    setMostrarConfirmacion(false);
    onVender();
  };

  const cambiarTitular = () => {
    setMostrarAcciones(false);
    onToggleTitular();
  };

  const cambiarCapitan = async () => {
    setErrorCapitan(null);
    const resultado = await onToggleCapitan();
    if (!resultado.ok) {
      setErrorCapitan(resultado.mensaje ?? t.ficha.errorCapitan);
      setMostrarAcciones(true);
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

  const avatar = (
    <div className="relative shrink-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800">
        {iniciales(jugador.nombre)}
      </div>
      {esCapitan && (
        <span
          title={t.ficha.capitanTitle(gameConfig.capitan.multiplicador)}
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-yellow-950"
        >
          C
        </span>
      )}
    </div>
  );

  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-xl border-l-4 border-y border-r border-neutral-200 bg-white py-2 pl-3 pr-2 dark:border-neutral-800 dark:bg-neutral-900 ${
          esTitular ? "border-l-green-500" : "border-l-red-400"
        }`}
      >
        <button
          onClick={() => setMostrarAcciones(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {avatar}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <p className="break-words font-medium leading-tight">{jugador.nombre}</p>
              {!ligaPublica && (
                <InsigniaEstado estado={estado} title={estadoTexto.title} />
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-neutral-500">
              <span>Elo {jugador.elo}</span>
              <span>· {t.ficha.pts(puntosJornada)}</span>
              <span>
                · {jugador.valorMercado} M <span className={deltaColor}>{deltaTexto}</span>
              </span>
            </p>
            {proximosRivales && proximosRivales.length > 0 ? (
              proximosRivales.map((r, i) => (
                <p key={i} className="break-words text-xs leading-snug text-neutral-400">
                  <span className="font-medium text-neutral-500">{r.torneo}</span> ·{" "}
                  {r.descansa
                    ? t.graficas.sinEmparejar
                    : `${r.rivalNombre}${r.rivalElo != null ? ` (${r.rivalElo})` : ""}`}
                </p>
              ))
            ) : (
              torneos &&
              torneos.length > 0 && (
                <p className="break-words text-xs leading-snug text-neutral-400">
                  {torneos.map((tn) => tn.nombre).join(" · ")}
                </p>
              )
            )}
          </div>
        </button>

        <button
          onClick={cambiarCapitan}
          disabled={!esTitular}
          aria-pressed={esCapitan}
          aria-label={esCapitan ? t.ficha.quitarCapitan : t.ficha.capitan}
          title={
            !esTitular
              ? t.ficha.capitanSoloTitular
              : esCapitan
                ? t.ficha.quitarCapitania
                : t.ficha.capitanPuntua(gameConfig.capitan.multiplicador)
          }
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30 ${
            esCapitan
              ? "border-yellow-400 bg-yellow-400 text-yellow-950"
              : "border-yellow-300 bg-white text-yellow-700 dark:border-yellow-800 dark:bg-neutral-900 dark:text-yellow-300"
          }`}
        >
          C
        </button>

        <button
          role="switch"
          aria-checked={esTitular}
          aria-label={esTitular ? t.ficha.titular : t.ficha.suplente}
          onClick={onToggleTitular}
          disabled={bloqueadoPorTope}
          className="flex shrink-0 flex-col items-center gap-0.5 px-1 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span
            className={`relative h-6 w-11 rounded-full transition-colors ${
              esTitular ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                esTitular ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
          <span className="text-[10px] font-medium text-neutral-500">
            {esTitular ? t.ficha.titular : t.ficha.suplente}
          </span>
        </button>
      </div>

      {mostrarAcciones && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMostrarAcciones(false)} />
          <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <div className="flex items-start gap-3">
              {avatar}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{jugador.nombre}</p>
                <p className="text-sm text-neutral-500">
                  {jugador.club} · {t.ficha.categoria(jugador.categoria)} · Elo {jugador.elo}
                </p>
              </div>
              <button
                onClick={() => setMostrarAcciones(false)}
                aria-label={t.ficha.cerrar}
                className="-mr-1 -mt-1 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
              {!ligaPublica && (
                <InsigniaEstado estado={estado} texto={estadoTexto.corto} title={estadoTexto.title} />
              )}
            </div>

            <ProximoRivalLinea rivales={proximosRivales} className="mt-2" />

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex gap-1">
                {resultadosRecientes.map((r, i) => (
                  <span key={i} className={`h-2 w-2 rounded-full ${puntoColor[r]}`} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span>{t.ficha.pts(puntosJornada)}</span>
                <span className="font-medium">{jugador.valorMercado} M</span>
                <span className={deltaColor}>{deltaTexto}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={cambiarTitular}
                  disabled={bloqueadoPorTope}
                  className={`flex-1 rounded-lg border bg-white py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-900 ${
                    esTitular
                      ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300"
                      : "border-green-300 text-green-700 dark:border-green-800 dark:text-green-300"
                  }`}
                >
                  {esTitular ? t.ficha.pasarASuplente : t.ficha.pasarATitular}
                </button>
                <button
                  onClick={cambiarCapitan}
                  disabled={!esTitular}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                    esCapitan
                      ? "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                      : "border-yellow-300 bg-white text-yellow-700 dark:border-yellow-800 dark:bg-neutral-900 dark:text-yellow-300"
                  }`}
                >
                  {esCapitan ? t.ficha.quitarCapitan : t.ficha.capitan}
                </button>
              </div>
              {bloqueadoPorTope && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {motivoBloqueo ??
                    t.ficha.topeTitulares(gameConfig.plantilla.maximoTitularesPorTorneo)}
                </p>
              )}
              <p className="text-xs text-neutral-500">
                {!esTitular
                  ? t.ficha.capitanSoloTitular
                  : esCapitan
                    ? t.ficha.quitarCapitania
                    : t.ficha.capitanPuntua(gameConfig.capitan.multiplicador)}
              </p>
              {errorCapitan && <p className="text-xs text-negative">{errorCapitan}</p>}

              {!ligaPublica && (
                <>
                  <button
                    onClick={() =>
                      abrirModal(() => {
                        setErrorBlindaje(null);
                        setMostrarBlindaje(true);
                      })
                    }
                    disabled={!!blindado || blindajeAgotado}
                    className="w-full rounded-lg border border-violet-300 bg-white py-2.5 text-sm font-medium text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-800 dark:bg-neutral-900 dark:text-violet-300"
                  >
                    {blindado ? t.ficha.blindado : t.ficha.blindar(precioBlindaje)}
                  </button>
                  <p className="text-xs text-neutral-500">
                    {blindado
                      ? t.ficha.yaBlindado
                      : blindajeAgotado
                        ? t.ficha.blindajeAgotado
                        : t.ficha.blindarTitle}
                  </p>

                  <button
                    onClick={() => abrirModal(() => setMostrarSubirClausula(true))}
                    className="w-full rounded-lg border border-sky-300 bg-white py-2.5 text-sm font-medium text-sky-700 dark:border-sky-800 dark:bg-neutral-900 dark:text-sky-300"
                  >
                    {t.ficha.subirClausula(clausula)}
                  </button>
                </>
              )}

              <button
                onClick={() => abrirModal(() => setMostrarConfirmacion(true))}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                {t.ficha.vender}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Link
                href={`/jugadores/${jugador.id}`}
                className="text-sm font-medium text-neutral-700 hover:underline dark:text-neutral-300"
              >
                {t.ficha.verFicha}
              </Link>
              <button
                onClick={() => setMostrarHistorial((prev) => !prev)}
                className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
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
            </div>

            {mostrarHistorial && (
              <div className="mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                <HistorialPuntosChart historial={historialPuntos} />
              </div>
            )}
          </div>
        </div>
      )}

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
