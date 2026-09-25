"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";

type Orden = "puntos" | "nombre" | "categoria";

export default function JugadoresPage() {
  const { jugadoresLiga, ofertas, pagarClausula, hacerOferta, cargando } =
    useGameState();

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [montoOferta, setMontoOferta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("puntos");
  const [enviando, setEnviando] = useState(false);
  const [mensajePorJugador, setMensajePorJugador] = useState<
    Record<string, { tipo: "ok" | "error"; texto: string }>
  >({});

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const filtrados = texto
      ? jugadoresLiga.filter((j) => j.nombre.toLowerCase().includes(texto))
      : jugadoresLiga;

    const copia = [...filtrados];

    if (orden === "puntos") {
      copia.sort((a, b) => b.puntosTotales - a.puntosTotales);
    } else if (orden === "nombre") {
      copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === "categoria") {
      copia.sort((a, b) => a.categoria - b.categoria || a.nombre.localeCompare(b.nombre));
    }

    return copia;
  }, [busqueda, orden, jugadoresLiga]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando jugadores…</p>;
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
    setMontoOferta("");
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
      mostrarMensaje(jugadorId, "ok", "Cláusula pagada. El jugador ya está en tu plantilla.");
      setSeleccionadoId(null);
    } else {
      mostrarMensaje(jugadorId, "error", resultado.mensaje);
    }
  };

  const onHacerOferta = async (jugadorId: string) => {
    const importe = Number(montoOferta);
    setEnviando(true);
    const resultado = await hacerOferta(jugadorId, importe);
    setEnviando(false);
    if (resultado.ok) {
      mostrarMensaje(jugadorId, "ok", `Oferta de ${importe} M enviada al manager.`);
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
            placeholder="Buscar jugador por nombre..."
            className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="puntos">Ordenar por puntos</option>
          <option value="nombre">Ordenar por nombre</option>
          <option value="categoria">Ordenar por categoría</option>
        </select>
      </div>

      {jugadoresFiltrados.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">
          {jugadoresLiga.length === 0
            ? "Todavía no hay jugadores cargados en la liga."
            : `No hay jugadores que coincidan con "${busqueda}".`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {jugadoresFiltrados.map((jugador) => {
          const estaSeleccionado = seleccionadoId === jugador.id;
          const esFichable = jugador.propietario !== null && !jugador.esMiEquipo;
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
                    {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {jugador.esMiEquipo
                      ? "En tu plantilla"
                      : jugador.propietario
                        ? `Fichado por ${jugador.propietario}`
                        : "Libre"}
                    {ofertaActual && !jugador.esMiEquipo
                      ? ` · Oferta enviada: ${ofertaActual.importe} M`
                      : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold">{jugador.puntosTotales} pts</span>
              </div>

              {estaSeleccionado && (
                <div className="flex flex-col gap-4 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  <HistorialPuntosChart historial={jugador.historialPuntos} />

                  {jugador.esMiEquipo && (
                    <p className="text-sm text-neutral-500">
                      Ya lo tienes en tu plantilla.
                    </p>
                  )}

                  {!jugador.esMiEquipo && jugador.propietario === null && (
                    <p className="text-sm text-neutral-500">
                      Está libre — fíchalo desde la pestaña Mercado.
                    </p>
                  )}

                  {esFichable && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-medium text-neutral-500">
                          Importe de la oferta (M)
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
                          onClick={() => onHacerOferta(jugador.id)}
                          disabled={!montoOferta || enviando}
                          className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                        >
                          Hacer oferta
                        </button>
                        <button
                          onClick={() => onPagarClausula(jugador.id)}
                          disabled={enviando}
                          className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                        >
                          Pagar cláusula ({jugador.clausula} M)
                        </button>
                      </div>

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