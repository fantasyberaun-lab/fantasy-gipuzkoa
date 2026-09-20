"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import { proximaTandaMercado, formatearCuentaAtras } from "@/lib/mercadoCountdown";

type Orden = "valor" | "puntos" | "pujas" | "nombre" | "categoria";
type MensajePuja = { tipo: "ok" | "error"; texto: string };

export default function MercadoPage() {
  const { mercado, pujarMercado, equipo, cargando } = useGameState();

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("valor");
  const [montoPuja, setMontoPuja] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajePorJugador, setMensajePorJugador] = useState<Record<string, MensajePuja>>({});
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cuentaAtras = useMemo(() => {
    const proxima = proximaTandaMercado(ahora);
    return formatearCuentaAtras(proxima.getTime() - ahora.getTime());
  }, [ahora]);

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
    } else if (orden === "pujas") {
      copia.sort((a, b) => b.numeroPujas - a.numeroPujas);
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
    setMontoPuja("");
  };

  const enviarPuja = async (listingId: string, jugadorId: string) => {
    const importe = Number(montoPuja);
    setEnviando(true);
    const resultado = await pujarMercado(listingId, importe);
    setEnviando(false);

    setMensajePorJugador((prev) => ({
      ...prev,
      [jugadorId]: resultado.ok
        ? { tipo: "ok", texto: "Puja registrada." }
        : { tipo: "error", texto: resultado.mensaje },
    }));

    if (resultado.ok) setMontoPuja("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mercado</h2>
        <span className="text-sm text-neutral-500">Tu saldo: {equipo.saldo} M</span>
      </div>

      <p className="text-xs text-neutral-500">
        {mercado.length} jugadores en la tanda de hoy — se resuelve en {cuentaAtras}.
      </p>

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
          <option value="pujas">Ordenar por número de pujas</option>
          <option value="nombre">Ordenar por nombre</option>
          <option value="categoria">Ordenar por categoría</option>
        </select>
      </div>

      {jugadoresFiltrados.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">
          {mercado.length === 0
            ? "No hay jugadores en el mercado ahora mismo."
            : `No hay jugadores que coincidan con "${busqueda}".`}
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
                <div className="text-right">
                  <p className="text-sm font-semibold">{jugador.valorMercado} M</p>
                  <p className="text-xs text-neutral-500">{jugador.numeroPujas} pujas</p>
                </div>
              </button>

              {estaSeleccionado && (
                <div className="flex flex-col gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  <HistorialPuntosChart historial={jugador.historialPuntos} />

                  <div>
                    <label className="text-xs font-medium text-neutral-500">
                      Importe de la puja (M) — mínimo {jugador.valorMercado} M
                    </label>
                    <input
                      type="number"
                      min={jugador.valorMercado}
                      value={montoPuja}
                      onChange={(e) => setMontoPuja(e.target.value)}
                      placeholder={`${jugador.valorMercado}`}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </div>

                  <button
                    onClick={() => enviarPuja(jugador.listingId, jugador.id)}
                    disabled={!montoPuja || Number(montoPuja) < jugador.valorMercado || enviando}
                    className="rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                  >
                    Pujar
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
    </div>
  );
}