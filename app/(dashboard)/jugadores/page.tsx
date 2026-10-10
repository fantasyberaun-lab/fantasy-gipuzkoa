"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import { useT } from "@/components/IdiomaProvider";

type Orden =
  | "puntos"
  | "nombre"
  | "categoria"
  | "valor-desc"
  | "valor-asc"
  | "elo-desc"
  | "elo-asc"
  | "club-asc"
  | "club-desc";

export default function JugadoresPage() {
  const {
    jugadoresLiga,
    ofertas,
    pagarClausula,
    hacerOferta,
    cancelarOferta,
    cargando,
    esLigaPublica,
  } =
    useGameState();
  const tj = useT().jugadores;

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [montoOferta, setMontoOferta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("puntos");
  const [enviando, setEnviando] = useState(false);
  const [puntosAbiertoId, setPuntosAbiertoId] = useState<string | null>(null);
  const [mensajePorJugador, setMensajePorJugador] = useState<
    Record<string, { tipo: "ok" | "error"; texto: string }>
  >({});

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const filtrados = texto
      ? jugadoresLiga.filter(
          (j) =>
            j.nombre.toLowerCase().includes(texto) ||
            j.club.toLowerCase().includes(texto)
        )
      : jugadoresLiga;

    const copia = [...filtrados];

    if (orden === "puntos") {
      copia.sort((a, b) => b.puntosTotales - a.puntosTotales);
    } else if (orden === "nombre") {
      copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === "categoria") {
      copia.sort((a, b) => a.categoria - b.categoria || a.nombre.localeCompare(b.nombre));
    } else if (orden === "valor-desc") {
      copia.sort((a, b) => b.valorMercado - a.valorMercado || a.nombre.localeCompare(b.nombre));
    } else if (orden === "valor-asc") {
      copia.sort((a, b) => a.valorMercado - b.valorMercado || a.nombre.localeCompare(b.nombre));
    } else if (orden === "elo-desc") {
      copia.sort((a, b) => b.elo - a.elo || a.nombre.localeCompare(b.nombre));
    } else if (orden === "elo-asc") {
      copia.sort((a, b) => a.elo - b.elo || a.nombre.localeCompare(b.nombre));
    } else if (orden === "club-asc") {
      copia.sort((a, b) => a.club.localeCompare(b.club) || a.nombre.localeCompare(b.nombre));
    } else if (orden === "club-desc") {
      copia.sort((a, b) => b.club.localeCompare(a.club) || a.nombre.localeCompare(b.nombre));
    }

    return copia;
  }, [busqueda, orden, jugadoresLiga]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">{tj.cargando}</p>;
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
    setMontoOferta("");
    setPuntosAbiertoId(null);
  };

  const mostrarMensaje = (
    jugadorId: string,
    tipo: "ok" | "error",
    texto: string
  ) => {
    setMensajePorJugador((prev) => ({ ...prev, [jugadorId]: { tipo, texto } }));
  };

  const onPagarClausula = async (jugadorId: string) => {
    setEnviando(true);
    const resultado = await pagarClausula(jugadorId);
    setEnviando(false);
    if (resultado.ok) {
      mostrarMensaje(jugadorId, "ok", tj.clausulaPagada);
      setSeleccionadoId(null);
    } else {
      mostrarMensaje(jugadorId, "error", resultado.mensaje);
    }
  };

  const onCancelarOferta = async (jugadorId: string, ofertaId: string) => {
    setEnviando(true);
    const resultado = await cancelarOferta(ofertaId);
    setEnviando(false);
    mostrarMensaje(
      jugadorId,
      resultado.ok ? "ok" : "error",
      resultado.ok
        ? tj.ofertaCancelada
        : resultado.mensaje
    );
  };

  const onHacerOferta = async (jugadorId: string) => {
    const importe = Number(montoOferta);
    setEnviando(true);
    const resultado = await hacerOferta(jugadorId, importe);
    setEnviando(false);
    if (resultado.ok) {
      mostrarMensaje(jugadorId, "ok", tj.ofertaEnviada(importe));
      setMontoOferta("");
    } else {
      mostrarMensaje(jugadorId, "error", resultado.mensaje);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={tj.buscar}
            className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="puntos">{tj.orden.puntos}</option>
          <option value="nombre">{tj.orden.nombre}</option>
          <option value="categoria">{tj.orden.categoria}</option>
          <option value="valor-desc">{tj.orden.valorDesc}</option>
          <option value="valor-asc">{tj.orden.valorAsc}</option>
          <option value="elo-desc">{tj.orden.eloDesc}</option>
          <option value="elo-asc">{tj.orden.eloAsc}</option>
          <option value="club-asc">{tj.orden.clubAsc}</option>
          <option value="club-desc">{tj.orden.clubDesc}</option>
        </select>
      </div>

      {jugadoresFiltrados.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">
          {jugadoresLiga.length === 0
            ? tj.sinJugadoresLiga
            : tj.sinCoincidencias(busqueda)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {jugadoresFiltrados.map((jugador) => {
          const estaSeleccionado = seleccionadoId === jugador.id;
          // En la liga pública no hay dueño único: ni ofertas ni cláusulas.
          const esFichable = !esLigaPublica && jugador.propietario !== null && !jugador.esMiEquipo;
          const ofertaActual = ofertas.find((o) => o.jugadorId === jugador.id);
          const mensaje = mensajePorJugador[jugador.id];

          return (
            <div
              key={jugador.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              {/* Es un div con role="button" (y no un <button>) porque dentro
                  va el enlace al perfil, y un enlace dentro de un botón no
                  funciona en todos los navegadores. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleSeleccion(jugador.id)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    toggleSeleccion(jugador.id);
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-3 p-3 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold dark:bg-neutral-800">
                  {jugador.nombre
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    <Link
                      href={`/jugadores/${jugador.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {jugador.nombre}
                    </Link>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {jugador.club} · {tj.categoriaCorta(jugador.categoria)} · Elo {jugador.elo} · {tj.valor(jugador.valorMercado)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                    <span>
                      {jugador.esMiEquipo
                        ? tj.enTuPlantilla
                        : jugador.propietario
                          ? tj.fichadoPor(jugador.propietario)
                          : esLigaPublica
                            ? tj.disponible
                            : tj.libre}
                      {ofertaActual && !jugador.esMiEquipo
                        ? tj.ofertaEnviadaLinea(ofertaActual.importe)
                        : ""}
                    </span>
                    {jugador.propietario !== null &&
                      (jugador.blindado ? (
                        <span
                          title={tj.blindadoTitulo}
                          className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
                        >
                          <svg
                            className="h-2.5 w-2.5"
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
                          {tj.blindado}
                        </span>
                      ) : jugador.candado ? (
                        <span
                          title={tj.candadoTitulo}
                          className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        >
                          <svg
                            className="h-2.5 w-2.5"
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
                          {tj.candado}
                        </span>
                      ) : (
                        <span
                          title={tj.clausulableTitulo}
                          className="flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                        >
                          <svg
                            className="h-2.5 w-2.5"
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
                          {tj.clausulable}
                        </span>
                      ))}
                  </p>
                </div>
                <span className="text-sm font-semibold">{tj.pts(jugador.puntosTotales)}</span>
              </div>

              {estaSeleccionado && (
                <div className="flex flex-col gap-4 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  <button
                    onClick={() =>
                      setPuntosAbiertoId((prev) => (prev === jugador.id ? null : jugador.id))
                    }
                    className="rounded-lg border border-neutral-300 py-2 text-sm font-medium dark:border-neutral-700"
                  >
                    {puntosAbiertoId === jugador.id ? tj.ocultarPuntos : tj.verPuntos}
                  </button>
                  {puntosAbiertoId === jugador.id && (
                    <HistorialPuntosChart historial={jugador.historialPuntos} />
                  )}

                  {jugador.esMiEquipo && (
                    <p className="text-sm text-neutral-500">
                      {tj.yaEnPlantilla}
                    </p>
                  )}

                  {!jugador.esMiEquipo && jugador.propietario === null && (
                    <p className="text-sm text-neutral-500">
                      {tj.libreFichalo}
                    </p>
                  )}

                  {esFichable && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-medium text-neutral-500">
                          {tj.importeOferta}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={montoOferta}
                          onChange={(e) => setMontoOferta(e.target.value)}
                          placeholder={`${jugador.valorMercado}`}
                          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onHacerOferta(jugador.id)}
                          disabled={!montoOferta || enviando}
                          className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                        >
                          {tj.hacerOferta}
                        </button>
                        <button
                          onClick={() => onPagarClausula(jugador.id)}
                          disabled={enviando || jugador.candado || jugador.blindado}
                          title={
                            jugador.blindado
                              ? tj.blindadoJornadaTitulo
                              : jugador.candado
                                ? tj.candadoTitulo
                                : undefined
                          }
                          className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                        >
                          {tj.pagarClausula(jugador.clausula)}
                        </button>
                      </div>

                      {ofertaActual && (
                        <button
                          onClick={() => onCancelarOferta(jugador.id, ofertaActual.id)}
                          disabled={enviando}
                          className="rounded-lg border border-neutral-300 py-2 text-sm font-medium text-negative disabled:opacity-40 dark:border-neutral-700"
                        >
                          {tj.cancelarMiOferta(ofertaActual.importe)}
                        </button>
                      )}

                      {jugador.blindado && (
                        <p className="text-xs text-violet-600 dark:text-violet-400">
                          {tj.notaBlindado}
                        </p>
                      )}

                      {jugador.candado && !jugador.blindado && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {tj.notaCandado}
                        </p>
                      )}

                      {mensaje && (
                        <p
                          className={`text-xs ${
                            mensaje.tipo === "ok" ? "text-positive" : "text-negative"
                          }`}
                        >
                          {mensaje.texto}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}