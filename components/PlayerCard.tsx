"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlantillaSlot } from "@/lib/types";
import { useReglasJuego } from "@/lib/reglasJuego";
import { ordenarPorCategoria, resumenTorneos } from "@/lib/torneos";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import ProximoRivalLinea from "@/components/ProximoRival";
import { useIdioma } from "@/components/IdiomaProvider";
import InsigniaEstadoClausula, { estadoClausula } from "@/components/InsigniaEstadoClausula";
import { proximaTandaMercado } from "@/lib/mercadoCountdown";

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
  // Ya has blindado a otro jugador esta semana (solo se permite uno).
  blindajeAgotado?: boolean;
  // Liga pública: no hay clausulazos, candados ni blindajes, así que se
  // ocultan esas opciones.
  ligaPublica?: boolean;
  onToggleTitular: () => void;
  onToggleCapitan: () => Promise<{ ok: boolean; mensaje?: string }>;
  onBlindar: () => Promise<{ ok: boolean; mensaje?: string }>;
  // Liga pública: venta instantánea al valor de mercado.
  onVender: () => void;
  onSubirClausula: (importe: number) => Promise<{ ok: boolean; mensaje?: string }>;
  // Ligas privadas (0101): se vende a la máquina, que hace su oferta en cada tanda.
  onPonerALaVenta?: () => Promise<{ ok: boolean; mensaje?: string }>;
  onQuitarDeLaVenta?: () => Promise<{ ok: boolean; mensaje?: string }>;
  onAceptarOferta?: () => Promise<{ ok: boolean; mensaje?: string }>;
  onRechazarOferta?: () => Promise<{ ok: boolean; mensaje?: string }>;
  // Ofertas directas de otros managers (ligas privadas): se deciden aquí, por oferta.
  onAceptarOfertaManager?: (ofertaId: string) => Promise<{ ok: boolean; mensaje?: string }>;
  onRechazarOfertaManager?: (ofertaId: string) => Promise<{ ok: boolean; mensaje?: string }>;
};

// Oferta por el jugador, venga de la máquina o de otro manager.
type OfertaFicha = { clave: string; importe: number; ofertaId?: string; equipo?: string };

// Fila compacta de un jugador de la plantilla. Al tocarla se abre una hoja
// inferior con todas las acciones (capitán, blindar, cláusula, vender…).
export default function PlayerCard({
  jugador,
  puntosJornada,
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
  candadoHasta,
  blindadoHasta,
  proximosRivales: rivalesSinOrdenar,
  torneos,
  onToggleTitular,
  onToggleCapitan,
  onBlindar,
  onVender,
  onSubirClausula,
  enVenta = false,
  ofertaMaquina = null,
  onPonerALaVenta,
  onQuitarDeLaVenta,
  onAceptarOferta,
  onRechazarOferta,
  ofertasManagers = [],
  onAceptarOfertaManager,
  onRechazarOfertaManager,
}: Props) {
  const { t, idioma } = useIdioma();
  // Mismo orden que la etiqueta de torneos (primero Segunda, luego Cadete…).
  const proximosRivales = rivalesSinOrdenar
    ? ordenarPorCategoria(rivalesSinOrdenar, (r) => r.torneo)
    : undefined;
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
  const [enviandoVenta, setEnviandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const reglasJ = useReglasJuego();

  // Ligas privadas: hora de la próxima tanda, que es cuando llega la oferta de la máquina.
  const proximaTanda = proximaTandaMercado(new Date(), reglasJ.horasMercado).toLocaleTimeString(
    "es-ES",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }
  );
  const diferenciaOferta =
    ofertaMaquina !== null && jugador.valorMercado > 0
      ? Math.round(((ofertaMaquina - jugador.valorMercado) / jugador.valorMercado) * 100)
      : 0;

  // Todas las ofertas por el jugador, de mayor a menor. En la fila solo sale la más alta.
  const ofertas: OfertaFicha[] = [
    ...(ofertaMaquina !== null ? [{ clave: "maquina", importe: ofertaMaquina }] : []),
    ...ofertasManagers.map((o) => ({
      clave: o.id,
      importe: o.importe,
      ofertaId: o.id,
      equipo: o.equipoOferenteNombre,
    })),
  ].sort((a, b) => b.importe - a.importe);
  const mejorOferta = ofertas[0]?.importe ?? null;

  // Poner/quitar de la venta, aceptar o rechazar: si falla, el aviso sale en la hoja.
  const accionVenta = async (accion?: () => Promise<{ ok: boolean; mensaje?: string }>) => {
    if (!accion) return;
    setEnviandoVenta(true);
    setErrorVenta(null);
    const resultado = await accion();
    setEnviandoVenta(false);
    if (!resultado.ok) {
      setErrorVenta(resultado.mensaje ?? t.ficha.errorVenta);
      setMostrarAcciones(true);
    }
  };

  const precioBlindaje = Math.ceil(jugador.valorMercado * reglasJ.blindajePorcentaje);

  // Torneos de la fila: los inscritos y los de sus próximos rivales (un
  // jugador puede tener partida en un torneo en el que no figura inscrito).
  const nombresTorneo = [
    ...(torneos ?? []).map((tn) => tn.nombre),
    ...(proximosRivales ?? []).flatMap((r) => (r.torneo ? [r.torneo] : [])),
  ].map((nombre) => ({ nombre }));

  const estado = estadoClausula({ blindado, candado });
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
    if (ligaPublica) onVender();
    else accionVenta(onPonerALaVenta);
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
  const nuevaClausula = clausula + importeNumerico * reglasJ.multiplicadorSubida;

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

  // En la fila, el estado de la cláusula va siempre en la esquina del avatar
  // (misma posición en todos los jugadores). En la hoja se muestra con texto.
  const avatar = (conEstado: boolean) => (
    <div className="relative shrink-0">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800">
        {iniciales(jugador.nombre)}
      </div>
      {conEstado && !ligaPublica && (
        <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-white dark:ring-neutral-900">
          <InsigniaEstadoClausula estado={estado} title={estadoTexto.title} />
        </span>
      )}
    </div>
  );

  return (
    <>
      <div
        className={`flex items-center gap-3 rounded-xl border-l-4 border-y border-r border-neutral-200 bg-white py-3 pl-3 pr-3 dark:border-neutral-800 dark:bg-neutral-900 ${
          esTitular ? "border-l-green-500" : "border-l-red-400"
        }`}
      >
        <button
          onClick={() => setMostrarAcciones(true)}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          {avatar(true)}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="break-words font-medium leading-tight">{jugador.nombre}</p>
            {nombresTorneo.length > 0 && (
              <p className="break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-500 dark:text-neutral-400">
                {resumenTorneos(nombresTorneo, idioma)}
              </p>
            )}
            <p className="flex flex-wrap gap-x-1.5 text-xs text-neutral-500">
              <span>Elo {jugador.elo}</span>
              <span>· {t.ficha.pts(puntosJornada)}</span>
              <span>· {jugador.valorMercado} M</span>
            </p>
            {!ligaPublica && (enVenta || mejorOferta !== null) && (
              <p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    mejorOferta !== null
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {mejorOferta !== null
                    ? `${t.ficha.ofertaMaquinaCorta(mejorOferta)}${ofertas.length > 1 ? ` (+${ofertas.length - 1})` : ""}`
                    : t.ficha.enVenta}
                </span>
              </p>
            )}
            {proximosRivales && proximosRivales.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] text-neutral-400">{t.graficas.proxRival}</p>
                {proximosRivales.map((r, i) => (
                  <p
                    key={i}
                    className="break-words text-xs font-medium leading-snug text-neutral-600 dark:text-neutral-300"
                  >
                    {r.descansa
                      ? t.graficas.sinEmparejar
                      : `${r.rivalNombre}${r.rivalElo != null ? ` (${r.rivalElo})` : ""}`}
                  </p>
                ))}
              </div>
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
                : t.ficha.capitanPuntua(reglasJ.capitanMultiplicador)
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
              {avatar(false)}
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
                  title={t.ficha.capitanTitle(reglasJ.capitanMultiplicador)}
                  className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                >
                  C · x{reglasJ.capitanMultiplicador}
                </span>
              )}
              {!ligaPublica && (
                <InsigniaEstadoClausula
                  estado={estado}
                  texto={estadoTexto.corto}
                  title={estadoTexto.title}
                  hasta={estado === "blindado" ? blindadoHasta : candadoHasta}
                />
              )}
            </div>

            {nombresTorneo.length > 0 && (
              <p className="mt-2 text-xs text-neutral-500">
                <span className="font-medium text-neutral-600 dark:text-neutral-400">
                  {t.ficha.torneos}
                </span>{" "}
                {resumenTorneos(nombresTorneo, idioma)}
              </p>
            )}
            <ProximoRivalLinea rivales={proximosRivales} className="mt-1" torneoResumido />

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex gap-1">
                {resultadosRecientes.map((r, i) => (
                  <span key={i} className={`h-2 w-2 rounded-full ${puntoColor[r]}`} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span>{t.ficha.pts(puntosJornada)}</span>
                <span className="font-medium">{jugador.valorMercado} M</span>
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
                    t.ficha.topeTitulares(reglasJ.maxTitularesPorTorneo)}
                </p>
              )}
              <p className="text-xs text-neutral-500">
                {!esTitular
                  ? t.ficha.capitanSoloTitular
                  : esCapitan
                    ? t.ficha.quitarCapitania
                    : t.ficha.capitanPuntua(reglasJ.capitanMultiplicador)}
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

              {ligaPublica || !enVenta ? (
                <button
                  onClick={() => abrirModal(() => setMostrarConfirmacion(true))}
                  disabled={enviandoVenta}
                  className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {ligaPublica ? t.ficha.vender : t.ficha.ponerALaVenta}
                </button>
              ) : null}
              {!ligaPublica && (enVenta || ofertas.length > 0) && (
                // Ofertas por el jugador (máquina y managers, de mayor a menor) o espera de la próxima tanda.
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  {ofertas.length > 0 ? (
                    <>
                      {ofertas.length > 1 && (
                        <p className="mb-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                          {t.ficha.ofertasPorJugador(ofertas.length)}
                        </p>
                      )}
                      <div className="flex flex-col gap-3">
                        {ofertas.map((o, i) => {
                          const esMaquina = o.ofertaId === undefined;
                          const aceptar = esMaquina
                            ? onAceptarOferta
                            : onAceptarOfertaManager && (() => onAceptarOfertaManager(o.ofertaId!));
                          const rechazar = esMaquina
                            ? onRechazarOferta
                            : onRechazarOfertaManager && (() => onRechazarOfertaManager(o.ofertaId!));
                          return (
                            <div key={o.clave}>
                              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                {esMaquina
                                  ? t.ficha.ofertaMaquina(o.importe)
                                  : t.ficha.ofertaDeEquipo(o.equipo ?? "", o.importe)}
                                {i === 0 && ofertas.length > 1 && (
                                  <span className="ml-2 rounded-full bg-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100">
                                    {t.ficha.ofertaMejor}
                                  </span>
                                )}
                              </p>
                              {esMaquina && (
                                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                                  {t.ficha.diferenciaValor(diferenciaOferta)}
                                </p>
                              )}
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => accionVenta(rechazar)}
                                  disabled={enviandoVenta}
                                  className="flex-1 rounded-lg border border-neutral-300 bg-white py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"
                                >
                                  {t.ficha.rechazarOferta}
                                </button>
                                <button
                                  onClick={() => accionVenta(aceptar)}
                                  disabled={enviandoVenta}
                                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
                                >
                                  {t.ficha.aceptarOferta(o.importe)}
                                </button>
                              </div>
                              {esMaquina && (
                                <p className="mt-1.5 text-[11px] text-neutral-500">{t.ficha.rechazadaTexto}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-900 dark:text-emerald-200">
                      {t.ficha.esperandoOferta(proximaTanda)}
                    </p>
                  )}
                  {enVenta && (
                    <button
                      onClick={() => accionVenta(onQuitarDeLaVenta)}
                      disabled={enviandoVenta}
                      className="mt-3 text-xs font-medium text-neutral-600 underline underline-offset-2 disabled:opacity-40 dark:text-neutral-300"
                    >
                      {t.ficha.quitarDeLaVenta}
                    </button>
                  )}
                </div>
              )}
              {errorVenta && <p className="text-xs text-negative">{errorVenta}</p>}
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

            <p className="text-base font-semibold">
              {ligaPublica ? t.ficha.venderA(jugador.nombre) : t.ficha.ponerALaVentaA(jugador.nombre)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {ligaPublica
                ? t.ficha.recibiras(jugador.valorMercado)
                : t.ficha.ponerALaVentaTexto(proximaTanda)}
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
                {ligaPublica ? t.ficha.siVender : t.ficha.siPonerALaVenta}
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
              {t.ficha.pagarasBlindaje(precioBlindaje, Math.round(reglasJ.blindajePorcentaje * 100))}
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
              {t.ficha.clausulaActual(clausula, reglasJ.multiplicadorSubida)}
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
