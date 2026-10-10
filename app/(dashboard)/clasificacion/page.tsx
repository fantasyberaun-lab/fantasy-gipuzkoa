"use client";

import Link from "next/link";
import { redondear2 } from "@/lib/saldo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import ProximoRivalLinea from "@/components/ProximoRival";
import { createClient } from "@/lib/supabase/client";
import {
  fetchJornadasSemanales,
  fetchPlantillaEquipoPublicaDB,
  type JornadaFinde,
  type JugadorPlantillaAjena,
} from "@/lib/supabase/queries";

// Estado de la pantalla que se guarda al ir al perfil de un jugador para
// recuperarlo al volver (se consume una sola vez).
const CLAVE_ESTADO = "clasificacion:estado-al-volver";

interface EstadoGuardado {
  jornada: string;
  busqueda: string;
  visibles: number;
  equipoAbierto: string | null;
  equipoPublicoAbierto: { id: string; nombre: string } | null;
  puntosAbiertoId: string | null;
  seleccionadoId: string | null;
  scrollY: number;
}

// Cuántos equipos se pintan de golpe (con cientos de managers, la lista entera es inmanejable).
const TAMANO_PAGINA = 50;

// Una jornada del desplegable: el fin de semana entero (todas las rondas de
// todos los torneos que se juegan ese sábado/domingo).
interface JornadaOpcion {
  semana: string; // el sábado, "YYYY-MM-DD"
  numero: number;
}

// "YYYY-MM-DD" como fecha local (con new Date("YYYY-MM-DD") sería UTC y
// podría pintarse el día anterior).
function fechaLocal(semana: string): Date {
  const [anio, mes, dia] = semana.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export default function ClasificacionPage() {
  const { t, locale } = useIdioma();
  const c = t.clasificacion;
  const {
    clasificacion,
    jugadoresLiga,
    equipo,
    esLigaPublica,
    misLigas,
    hacerOferta,
    cancelarOferta,
    ofertas,
    pagarClausula,
    cargando,
  } = useGameState();

  // Nº de managers de la liga (lo cuenta la base de datos en mis_ligas()).
  const totalManagers =
    misLigas.find((l) => l.ligaId === equipo.leagueId)?.miembros ?? clasificacion.length;

  // Desplegable: "" = puntos totales, o el sábado de una jornada (fin de semana).
  const [jornadaSel, setJornadaSel] = useState<string>("");
  // A qué jornada (fin de semana) pertenece cada ronda, por id de ronda.
  const [finde, setFinde] = useState<Record<string, JornadaFinde>>({});
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(TAMANO_PAGINA);
  // Liga pública: plantilla del equipo abierto (se pide a la base de datos al abrirlo).
  const [equipoPublicoAbierto, setEquipoPublicoAbierto] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [plantillaPublica, setPlantillaPublica] = useState<JugadorPlantillaAjena[] | null>(null);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [puntosAbiertoId, setPuntosAbiertoId] = useState<string | null>(null);
  const [equipoAbierto, setEquipoAbierto] = useState<string | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [montoOferta, setMontoOferta] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const estadoRef = useRef<EstadoGuardado | null>(null);
  estadoRef.current = {
    jornada: jornadaSel,
    busqueda,
    visibles,
    equipoAbierto,
    equipoPublicoAbierto,
    puntosAbiertoId,
    seleccionadoId,
    scrollY: 0,
  };

  // Guarda el estado justo antes de navegar al perfil de un jugador.
  const guardarEstado = () => {
    try {
      if (!estadoRef.current) return;
      sessionStorage.setItem(
        CLAVE_ESTADO,
        JSON.stringify({ ...estadoRef.current, scrollY: window.scrollY })
      );
    } catch {
      // sin sessionStorage simplemente no se restaura
    }
  };

  // Al montar: si venimos de volver desde un perfil, recupera el estado.
  useEffect(() => {
    let guardado: EstadoGuardado | null = null;
    try {
      const raw = sessionStorage.getItem(CLAVE_ESTADO);
      if (raw) {
        guardado = JSON.parse(raw) as EstadoGuardado;
        sessionStorage.removeItem(CLAVE_ESTADO);
      }
    } catch {
      return;
    }
    if (!guardado) return;
    setJornadaSel(guardado.jornada ?? "");
    setBusqueda(guardado.busqueda);
    setVisibles(guardado.visibles);
    setEquipoAbierto(guardado.equipoAbierto);
    setSeleccionadoId(guardado.seleccionadoId);
    if (guardado.equipoPublicoAbierto) {
      const { id, nombre } = guardado.equipoPublicoAbierto;
      setEquipoPublicoAbierto({ id, nombre });
      setCargandoPlantilla(true);
      fetchPlantillaEquipoPublicaDB(createClient(), id).then((plantilla) => {
        setPlantillaPublica(plantilla);
        setPuntosAbiertoId(guardado?.puntosAbiertoId ?? null);
        setCargandoPlantilla(false);
      });
    }
    const y = guardado.scrollY;
    setTimeout(() => window.scrollTo(0, y), 100);
  }, []);

  // Jornada (fin de semana) de cada ronda. Se vuelve a pedir si cambia la
  // clasificación, por si se ha creado una ronda nueva.
  useEffect(() => {
    let vigente = true;
    fetchJornadasSemanales(createClient()).then((porRonda) => {
      if (vigente) setFinde(porRonda);
    });
    return () => {
      vigente = false;
    };
  }, [clasificacion]);

  // Jornadas con puntos en el historial de algún equipo de la liga, por orden.
  const jornadasDisponibles = useMemo(() => {
    const porSemana = new Map<string, JornadaOpcion>();
    for (const entry of clasificacion) {
      for (const h of entry.historialPuntos) {
        const j = h.id ? finde[h.id] : undefined;
        if (j && !porSemana.has(j.semana)) {
          porSemana.set(j.semana, { semana: j.semana, numero: j.numero });
        }
      }
    }
    return [...porSemana.values()].sort((a, b) => a.semana.localeCompare(b.semana));
  }, [clasificacion, finde]);

  // Si la jornada guardada ya no existe (o aún no han llegado las jornadas), puntos totales.
  const jornadaActual = jornadasDisponibles.find((j) => j.semana === jornadaSel) ?? null;

  const formatoFecha = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  const fechaJornada = (j: JornadaOpcion) => formatoFecha.format(fechaLocal(j.semana));

  // Texto que acompaña a los puntos de cada fila.
  const etiquetaOrden = jornadaActual ? c.enJornada(jornadaActual.numero) : c.esteAno;

  const puntosParaOrden = (entry: (typeof clasificacion)[number]) => {
    if (!jornadaActual) return entry.puntos;
    // Suma de todas las rondas de ese fin de semana (de todos los torneos).
    return entry.historialPuntos
      .filter((h) => h.id && finde[h.id]?.semana === jornadaActual.semana)
      .reduce((total, h) => total + h.puntos, 0);
  };

  const clasificacionOrdenada = useMemo(() => {
    return [...clasificacion].sort((a, b) => puntosParaOrden(b) - puntosParaOrden(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaActual, clasificacion]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">{c.cargando}</p>;
  }

  // La posición se calcula sobre la lista COMPLETA (no la filtrada) para que
  // al buscar un equipo siga viéndose su puesto real.
  const conPosicion = clasificacionOrdenada.map((entry, i) => ({ entry, posicion: i + 1 }));
  const miPosicion = conPosicion.find((x) => x.entry.esMiEquipo)?.posicion ?? null;
  const textoBusqueda = busqueda.trim().toLowerCase();
  const coincidencias = textoBusqueda
    ? conPosicion.filter((x) => x.entry.nombreEquipo.toLowerCase().includes(textoBusqueda))
    : conPosicion;
  const listaVisible = coincidencias.slice(0, visibles);

  const irAMiEquipo = () => {
    if (miPosicion === null) return;
    setBusqueda("");
    setVisibles((v) => Math.max(v, miPosicion));
    // Espera a que se pinte la fila antes de desplazarse hasta ella.
    setTimeout(() => {
      document.getElementById("mi-equipo-fila")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  const abrirPlantillaPublica = async (equipoId: string, nombre: string) => {
    setEquipoPublicoAbierto({ id: equipoId, nombre });
    setPlantillaPublica(null);
    setPuntosAbiertoId(null);
    setCargandoPlantilla(true);
    const plantilla = await fetchPlantillaEquipoPublicaDB(createClient(), equipoId);
    setPlantillaPublica(plantilla);
    setCargandoPlantilla(false);
  };

  const cerrarPlantillaPublica = () => {
    setEquipoPublicoAbierto(null);
    setPlantillaPublica(null);
    setPuntosAbiertoId(null);
  };

  const cerrarPanel = () => {
    setEquipoAbierto(null);
    setSeleccionadoId(null);
    setMontoOferta("");
    setMensaje(null);
  };

  const toggleJugador = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
    setMontoOferta("");
    setMensaje(null);
  };

  const plantillaAbierta = equipoAbierto
    ? jugadoresLiga.filter((j) => j.propietario === equipoAbierto)
    : [];

  const enviarOferta = async (jugadorId: string) => {
    const importe = Number(montoOferta);
    setEnviando(true);
    const resultado = await hacerOferta(jugadorId, importe);
    setEnviando(false);
    setMensaje(resultado.ok ? c.ofertaEnviada : resultado.mensaje);
  };

  const quitarOferta = async (ofertaId: string) => {
    setEnviando(true);
    const resultado = await cancelarOferta(ofertaId);
    setEnviando(false);
    setMensaje(
      resultado.ok
        ? c.ofertaCancelada
        : resultado.mensaje
    );
  };

  const ejecutarClausula = async (jugadorId: string) => {
    setEnviando(true);
    const resultado = await pagarClausula(jugadorId);
    setEnviando(false);
    setMensaje(resultado.ok ? c.clausulaPagada : resultado.mensaje);
  };

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{c.titulo}</h2>
          {esLigaPublica && (
            <p className="text-xs text-neutral-500">
              {c.managersPublica(totalManagers)}
            </p>
          )}
        </div>
        {jornadasDisponibles.length > 0 && (
          <select
            aria-label={c.jornadaAria}
            value={jornadaActual?.semana ?? ""}
            onChange={(e) => setJornadaSel(e.target.value)}
            className="min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-xs"
          >
            <option value="">{c.puntosTotales}</option>
            {jornadasDisponibles.map((j) => (
              <option key={j.semana} value={j.semana}>
                {c.jornadaFecha(j.numero, fechaJornada(j))}
              </option>
            ))}
          </select>
        )}
      </div>

      {esLigaPublica && clasificacion.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {miPosicion !== null && (
            <div className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm">
              <span>
                {c.tuPosicion} <strong>{c.posicionDe(miPosicion, totalManagers)[0]}</strong>
                {c.posicionDe(miPosicion, totalManagers)[1]}
              </span>
              <button
                onClick={irAMiEquipo}
                className="text-xs font-medium text-accent underline underline-offset-2"
              >
                {c.irAMiEquipo}
              </button>
            </div>
          )}
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setVisibles(TAMANO_PAGINA);
            }}
            placeholder={c.buscar}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      )}

      <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {clasificacionOrdenada.length === 0 && (
          <li className="py-6 text-center text-sm text-neutral-500">
            {c.vacia}
          </li>
        )}
        {clasificacionOrdenada.length > 0 && coincidencias.length === 0 && (
          <li className="py-6 text-center text-sm text-neutral-500">
            {c.sinCoincidencias(busqueda)}
          </li>
        )}
        {listaVisible.map(({ entry, posicion }) => (
          <li
            key={entry.equipoId ?? entry.nombreEquipo}
            id={entry.esMiEquipo ? "mi-equipo-fila" : undefined}
            className={`flex items-center justify-between py-3 ${
              entry.esMiEquipo ? "rounded-lg bg-accent/10 px-3" : "px-3"
            }`}
          >
            <span className="min-w-0">
              {posicion}.{" "}
              {entry.equipoId ? (
                <>
                  <Link
                    href={`/managers/${entry.equipoId}`}
                    className="hover:underline"
                    title={c.verPerfil}
                  >
                    {entry.nombreEquipo}
                  </Link>
                </>
              ) : (
                entry.nombreEquipo
              )}
              {entry.nombreManager && (
                <span className="block truncate pl-5 text-xs text-neutral-500">
                  {entry.nombreManager}
                </span>
              )}
              {entry.equipoId && (
                <Link
                  href={`/managers/${entry.equipoId}?tab=jornadas`}
                  className="ml-5 mt-1 inline-block rounded-full border border-accent px-2.5 py-0.5 text-[11px] font-medium text-accent"
                  title={c.verJornadasTitle}
                >
                  {c.jornadas}
                </Link>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-3 pl-2">
              <span className="whitespace-nowrap font-medium">
                {c.pts(puntosParaOrden(entry))}{" "}
                <span className="text-neutral-500">
                  {etiquetaOrden}
                </span>
              </span>
              {!entry.esMiEquipo && !esLigaPublica && (
                <button
                  onClick={() => setEquipoAbierto(entry.nombreEquipo)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                >
                  {c.plantilla}
                </button>
              )}
              {!entry.esMiEquipo && esLigaPublica && entry.equipoId && (
                <button
                  onClick={() => abrirPlantillaPublica(entry.equipoId as string, entry.nombreEquipo)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                >
                  {c.plantilla}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {coincidencias.length > listaVisible.length && (
        <button
          onClick={() => setVisibles((v) => v + TAMANO_PAGINA)}
          className="mt-3 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
        >
          {c.mostrarMas(coincidencias.length - listaVisible.length)}
        </button>
      )}

      {equipoPublicoAbierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={cerrarPlantillaPublica} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">{equipoPublicoAbierto.nombre}</p>
              <button
                onClick={cerrarPlantillaPublica}
                className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              >
                {c.cerrar}
              </button>
            </div>

            <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto">
              {cargandoPlantilla && (
                <p className="py-4 text-center text-sm text-neutral-500">{c.cargandoPlantilla}</p>
              )}
              {!cargandoPlantilla && plantillaPublica === null && (
                <p className="py-4 text-center text-sm text-negative">
                  {c.errorPlantilla}
                </p>
              )}
              {!cargandoPlantilla && plantillaPublica !== null && plantillaPublica.length === 0 && (
                <p className="py-4 text-center text-sm text-neutral-500">
                  {c.sinFichajes}
                </p>
              )}
              {plantillaPublica?.map((jugador) => (
                <div
                  key={jugador.id}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">
                        <Link
                          href={`/jugadores/${jugador.id}`}
                          onClick={guardarEstado}
                          className="hover:underline"
                        >
                          {jugador.nombre}
                        </Link>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {jugador.club} · {c.categoriaCorta(jugador.categoria)} · Elo {jugador.elo} ·{" "}
                        {c.pts(jugador.puntosTotales)}
                      </p>
                      <ProximoRivalLinea rivales={jugador.proximosRivales} className="mt-0.5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium">{jugador.valorMercado} M</span>
                      <button
                        onClick={() =>
                          setPuntosAbiertoId((prev) => (prev === jugador.id ? null : jugador.id))
                        }
                        className="text-xs font-medium text-accent underline underline-offset-2"
                      >
                        {puntosAbiertoId === jugador.id ? c.ocultarPuntos : c.verPuntos}
                      </button>
                    </div>
                  </div>
                  {puntosAbiertoId === jugador.id && (
                    <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
                      <HistorialPuntosChart historial={jugador.historialPuntos} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {equipoAbierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={cerrarPanel} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">{equipoAbierto}</p>
              <button
                onClick={cerrarPanel}
                className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              >
                {c.cerrar}
              </button>
            </div>

            <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto">
              {plantillaAbierta.map((jugador) => {
                const estaSeleccionado = seleccionadoId === jugador.id;

                return (
                  <div
                    key={jugador.id}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleJugador(jugador.id)}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          toggleJugador(jugador.id);
                        }
                      }}
                      className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          <Link
                            href={`/jugadores/${jugador.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              guardarEstado();
                            }}
                            className="hover:underline"
                          >
                            {jugador.nombre}
                          </Link>
                        </p>
                        <p className="text-xs text-neutral-500">
                          {jugador.club} · {c.categoriaCorta(jugador.categoria)} · Elo {jugador.elo}
                        </p>
                        <ProximoRivalLinea rivales={jugador.proximosRivales} className="mt-0.5" />
                      </div>
                      <span className="text-sm font-medium">{jugador.valorMercado} M</span>
                    </div>

                    {estaSeleccionado && (
                      <div className="flex flex-col gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                        <div>
                          <label className="text-xs font-medium text-neutral-500">
                            {c.importeOferta}
                          </label>
                          <input
                            type="number"
                            value={montoOferta}
                            onChange={(e) => setMontoOferta(e.target.value)}
                            placeholder={`${jugador.valorMercado}`}
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            disabled={!montoOferta || enviando}
                            onClick={() => enviarOferta(jugador.id)}
                            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                          >
                            {c.hacerOferta}
                          </button>
                          <button
                            disabled={enviando}
                            onClick={() => ejecutarClausula(jugador.id)}
                            className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                          >
                            {c.pagarClausula(jugador.clausula)}
                          </button>
                        </div>

                        {(() => {
                          const ofertaActual = ofertas.find((o) => o.jugadorId === jugador.id);
                          return ofertaActual ? (
                            <button
                              disabled={enviando}
                              onClick={() => quitarOferta(ofertaActual.id)}
                              className="rounded-lg border border-neutral-300 py-2 text-sm font-medium text-negative disabled:opacity-40 dark:border-neutral-700"
                            >
                              {c.cancelarOferta(ofertaActual.importe)}
                            </button>
                          ) : null;
                        })()}

                        {mensaje && (
                          <p className="text-xs text-neutral-500">{mensaje}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-neutral-400">
              {c.tuSaldo(redondear2(equipo.saldo))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}