"use client";

import Link from "next/link";
import ProximoRivalLinea from "@/components/ProximoRival";
import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import MercadoPublico from "@/components/MercadoPublico";
import SaldoConPujas from "@/components/SaldoConPujas";
import {
  proximaTandaMercado,
  formatearCuentaAtrasConSegundos,
  pujasOcultas,
  msHastaOcultarPujas,
} from "@/lib/mercadoCountdown";

type Orden = "valor" | "elo" | "puntos" | "pujas" | "nombre" | "categoria";
type MensajePuja = { tipo: "ok" | "error"; texto: string };

// Liga pública: mercado siempre abierto con compra/venta instantánea.
// Ligas privadas: mercado por tandas con pujas.
export default function MercadoPage() {
  const { esLigaPublica, cargando } = useGameState();

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando el mercado…</p>;
  }

  return esLigaPublica ? <MercadoPublico /> : <MercadoConPujas />;
}

function MercadoConPujas() {
  const {
    mercado,
    pujasMercado,
    pujarMercado,
    cancelarPuja,
    equipo,
    cargando,
    comprometidoEnPujas,
  } = useGameState();

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("valor");
  const [montoPuja, setMontoPuja] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [puntosAbiertoId, setPuntosAbiertoId] = useState<string | null>(null);
  const [mensajePorJugador, setMensajePorJugador] = useState<Record<string, MensajePuja>>({});
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cuentaAtras = useMemo(() => {
    const proxima = proximaTandaMercado(ahora);
    return formatearCuentaAtrasConSegundos(proxima.getTime() - ahora.getTime());
  }, [ahora]);

  // Las últimas 2 h antes de la tanda las pujas de los demás no se ven: solo
  // el número de pujas. La base de datos ya no las envía, pero aquí también se
  // filtran por si la pantalla llevaba abierta desde antes de que empezara.
  const ocultas = pujasOcultas(ahora);
  const cuentaAtrasOcultar = useMemo(
    () => formatearCuentaAtrasConSegundos(msHastaOcultarPujas(ahora)),
    [ahora]
  );

  // Pujas por listing, ya ordenadas de mayor a menor importe.
  const pujasPorListing = useMemo(() => {
    const mapa = new Map<string, typeof pujasMercado>();
    for (const p of pujasMercado) {
      mapa.set(p.listingId, [...(mapa.get(p.listingId) ?? []), p]);
    }
    return mapa;
  }, [pujasMercado]);

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrados = texto
      ? mercado.filter((j) => j.nombre.toLowerCase().includes(texto))
      : mercado;

    const copia = [...filtrados];

    if (orden === "valor") {
      copia.sort((a, b) => b.valorMercado - a.valorMercado);
    } else if (orden === "elo") {
      copia.sort((a, b) => b.elo - a.elo || a.nombre.localeCompare(b.nombre));
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
    setPuntosAbiertoId(null);
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

  const quitarPuja = async (listingId: string, jugadorId: string) => {
    setEnviando(true);
    const resultado = await cancelarPuja(listingId);
    setEnviando(false);

    setMensajePorJugador((prev) => ({
      ...prev,
      [jugadorId]: resultado.ok
        ? { tipo: "ok", texto: "Puja cancelada. Tu saldo no se ha visto afectado." }
        : { tipo: "error", texto: resultado.mensaje },
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mercado</h2>
        <span className="text-sm text-neutral-500">
          Tu saldo: <SaldoConPujas saldo={equipo.saldo} comprometido={comprometidoEnPujas} />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded-xl border p-3 ${
            ocultas
              ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
              : "border-neutral-200 dark:border-neutral-800"
          }`}
        >
          <p className="text-xs text-neutral-500">
            {ocultas ? "Pujas ocultas" : "Las pujas se ocultan en"}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">
            {ocultas ? "Ocultas" : cuentaAtrasOcultar}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">El mercado se actualiza en</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{cuentaAtras}</p>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        {mercado.length} jugadores en la tanda de hoy.{" "}
        {ocultas
          ? "En las últimas 2 horas solo ves cuánta gente ha pujado, no los importes."
          : "2 horas antes de que se actualice el mercado dejarán de verse las pujas de los demás: solo verás cuánta gente ha pujado, no el precio."}
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
          <option value="elo">Ordenar por Elo</option>
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
          const pujas = pujasPorListing.get(jugador.listingId) ?? [];
          const miPuja = pujas.find((p) => p.esMia) ?? null;
          const pujasOtros = ocultas ? [] : pujas.filter((p) => !p.esMia);
          const pujaMasAlta = ocultas ? null : pujas[0] ?? null;
          const otrasPujas = Math.max(0, jugador.numeroPujas - (miPuja ? 1 : 0));
          // Tu puja se mantiene aunque el valor haya subido por encima de ella,
          // pero para mejorarla tienes que llegar al valor actual.
          const miPujaPorDebajo = !!miPuja && miPuja.importe < jugador.valorMercado;

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
                  <ProximoRivalLinea rivales={jugador.proximosRivales} className="mt-0.5" />
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {jugador.puntosTotales} pts esta temporada
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{jugador.valorMercado} M</p>
                  <p className="text-xs text-neutral-500">{jugador.numeroPujas} pujas</p>
                  {miPuja && (
                    <p className="text-xs font-medium text-accent">
                      Tu puja: {miPuja.importe} M
                    </p>
                  )}
                </div>
              </div>

              {estaSeleccionado && (
                <div className="flex flex-col gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  <button
                    onClick={() =>
                      setPuntosAbiertoId((prev) => (prev === jugador.id ? null : jugador.id))
                    }
                    className="rounded-lg border border-neutral-300 py-2 text-sm font-medium dark:border-neutral-700"
                  >
                    {puntosAbiertoId === jugador.id ? "Ocultar puntos" : "Ver puntos por jornada"}
                  </button>
                  {puntosAbiertoId === jugador.id && (
                    <HistorialPuntosChart historial={jugador.historialPuntos} />
                  )}

                  <div className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                    <p className="mb-2 text-xs font-medium text-neutral-500">
                      Pujas por este jugador
                    </p>

                    {ocultas && (
                      <p className="mb-2 text-xs text-neutral-500">
                        {jugador.numeroPujas === 0
                          ? "Nadie ha pujado por ahora."
                          : `${jugador.numeroPujas} ${
                              jugador.numeroPujas === 1 ? "puja" : "pujas"
                            } en total${
                              miPuja
                                ? ` (${otrasPujas === 0 ? "solo la tuya" : `la tuya y ${otrasPujas} más`})`
                                : ""
                            }. Los importes están ocultos hasta que se actualice el mercado.`}
                      </p>
                    )}

                    {pujas.length === 0 ? (
                      !ocultas || jugador.numeroPujas === 0 ? (
                        <p className="text-xs text-neutral-500">
                          Nadie ha pujado todavía. Con la puja mínima ({jugador.valorMercado} M) te
                          lo llevarías si nadie puja más.
                        </p>
                      ) : null
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {miPuja && (
                          <li className="flex items-center justify-between gap-2 font-medium">
                            <span>
                              Tu puja
                              {pujaMasAlta?.esMia && (
                                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                                  la más alta
                                </span>
                              )}
                            </span>
                            <span>{miPuja.importe} M</span>
                          </li>
                        )}
                        {pujasOtros.map((p) => (
                          <li
                            key={p.equipoId}
                            className="flex items-center justify-between gap-2 text-neutral-600 dark:text-neutral-300"
                          >
                            <span className="truncate">
                              {p.nombreEquipo}
                              {pujaMasAlta?.equipoId === p.equipoId && (
                                <span className="ml-2 rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-500 dark:border-neutral-700">
                                  la más alta
                                </span>
                              )}
                            </span>
                            <span>{p.importe} M</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {miPujaPorDebajo && (
                      <p className="mt-2 text-xs text-neutral-500">
                        El valor del jugador ha subido a {jugador.valorMercado} M, pero tu puja de{" "}
                        {miPuja!.importe} M se mantiene. Compite con su importe: si alguien puja
                        ahora, tendrá que llegar al valor actual.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-500">
                      {miPuja ? "Mejorar tu puja" : "Importe de la puja"} (M) — mínimo{" "}
                      {jugador.valorMercado} M
                    </label>
                    <input
                      type="number"
                      step="0.01"
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

                  {miPuja && (
                    <button
                      onClick={() => quitarPuja(jugador.listingId, jugador.id)}
                      disabled={enviando}
                      className="rounded-lg border border-neutral-300 py-2 text-sm font-medium text-negative disabled:opacity-40 dark:border-neutral-700"
                    >
                      Cancelar mi puja ({miPuja.importe} M)
                    </button>
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
          );
        })}
      </div>
    </div>
  );
}