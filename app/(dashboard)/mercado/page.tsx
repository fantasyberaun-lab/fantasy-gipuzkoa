"use client";

import { useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";

// v1: fichaje instantáneo al valor de mercado actual (ver
// supabase/migrations/0004_mercado.sql). No hay pujas todavía ni tanda
// con cierre programado — cuando eso exista (tabla bids + un campo de
// cierre en matchdays o game_config), esta pantalla es el sitio donde
// habría que añadir el contador y el formulario de puja.

type Orden = "valor" | "puntos" | "nombre" | "categoria";

export default function MercadoPage() {
  const { mercado, ficharJugador, equipo, cargando } = useGameState();

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("valor");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajePorJugador, setMensajePorJugador] = useState<
    Record<string, { tipo: "ok" | "error"; texto: string }>
  >({});

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrados = texto
      ? mercado.filter((j) => j.nombre.toLowerCase().includes(texto))
      : mercado;

    const copia = [...filtrados];

    if (orden === "valor") {
      copia.sort((a, b) => b.valorMercado - a.valorMercado);
    } else if (orden === "puntos") {
      copia.sort((a, b) => b.puntosTotales - a.puntosTotales);
    } else if (orden === "nombre") {
      copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === "categoria") {
      copia.sort((a, b) => a.categoria - b.categoria || a.nombre.localeCompare(b.nombre));
    }

    return copia;
  }, [busqueda, orden, mercado]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando el mercado…</p>;
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
  };

  const confirmarFichaje = async (jugadorId: string) => {
    setConfirmandoId(null);
    setEnviando(true);
    const resultado = await ficharJugador(jugadorId);
    setEnviando(false);

    setMensajePorJugador((prev) => ({
      ...prev,
      [jugadorId]: resultado.ok
        ? { tipo: "ok", texto: "Fichado. Ya está en tu plantilla." }
        : { tipo: "error", texto: resultado.mensaje },
    }));

    if (resultado.ok) setSeleccionadoId(null);
  };

  const jugadorConfirmando = mercado.find((j) => j.id === confirmandoId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mercado</h2>
        <span className="text-sm text-neutral-500">Tu saldo: {equipo.saldo} M</span>
      </div>

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
            placeholder="Buscar jugador por nombre..."
            className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="valor">Ordenar por valor</option>
          <option value="puntos">Ordenar por puntos</option>
          <option value="nombre">Ordenar por nombre</option>
          <option value="categoria">Ordenar por categoría</option>
        </select>
      </div>

      {jugadoresFiltrados.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">
          {mercado.length === 0
            ? "No hay jugadores libres en el mercado ahora mismo."
            : `No hay jugadores libres que coincidan con "${busqueda}".`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {jugadoresFiltrados.map((jugador) => {
          const estaSeleccionado = seleccionadoId === jugador.id;
          const mensaje = mensajePorJugador[jugador.id];

          return (
            <div
              key={jugador.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              <button
                onClick={() => toggleSeleccion(jugador.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
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
                  <p className="text-sm font-medium">{jugador.nombre}</p>
                  <p className="text-xs text-neutral-500">
                    {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {jugador.puntosTotales} pts esta temporada
                  </p>
                </div>
                <span className="text-sm font-semibold">{jugador.valorMercado} M</span>
              </button>

              {estaSeleccionado && (
                <div className="flex flex-col gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  <HistorialPuntosChart historial={jugador.historialPuntos} />

                  <button
                    onClick={() => setConfirmandoId(jugador.id)}
                    disabled={enviando}
                    className="rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                  >
                    Fichar por {jugador.valorMercado} M
                  </button>

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
          );
        })}
      </div>

      {jugadorConfirmando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmandoId(null)}
          />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <p className="text-base font-semibold">Fichar a {jugadorConfirmando.nombre}</p>
            <p className="mt-1 text-sm text-neutral-500">
              Se descontarán {jugadorConfirmando.valorMercado} M de tu saldo.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmandoId(null)}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmarFichaje(jugadorConfirmando.id)}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Sí, fichar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
