"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import { gameConfig } from "@/lib/gameConfig";
import { redondear2 } from "@/lib/saldo";

// Mercado de la liga pública "todos contra todos": todos los jugadores están
// siempre disponibles, cualquiera puede tener al mismo jugador, y comprar o
// vender es instantáneo al valor de mercado.

type Orden = "valor-desc" | "valor-asc" | "elo-desc" | "elo-asc" | "puntos" | "nombre" | "categoria";
type Vista = "todos" | "mios";
type MensajeAccion = { tipo: "ok" | "error"; texto: string };

const POR_PAGINA = 50;

export default function MercadoPublico() {
  const { jugadoresLiga, squad, saldoFuturo, ficharJugador, venderJugador } = useGameState();

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<"todas" | "1" | "2" | "3">("todas");
  const [vista, setVista] = useState<Vista>("todos");
  const [orden, setOrden] = useState<Orden>("valor-desc");
  const [soloAsequibles, setSoloAsequibles] = useState(false);
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [confirmandoVentaId, setConfirmandoVentaId] = useState<string | null>(null);
  const [puntosAbiertoId, setPuntosAbiertoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajePorJugador, setMensajePorJugador] = useState<Record<string, MensajeAccion>>({});

  const maxPlantilla = gameConfig.plantilla.tamanoPlantilla;
  const idsMiPlantilla = useMemo(
    () => new Set(squad.map((s) => s.jugador.id)),
    [squad]
  );
  const plantillaCompleta = squad.length >= maxPlantilla;

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const filtrados = jugadoresLiga.filter((j) => {
      if (!j.activo) return false;
      // Solo salen en el mercado los inscritos en algún torneo; los que ya
      // tienes en plantilla se quedan para poder venderlos.
      if (j.inscrito === false && !idsMiPlantilla.has(j.id)) return false;
      if (vista === "mios" && !idsMiPlantilla.has(j.id)) return false;
      if (categoria !== "todas" && String(j.categoria) !== categoria) return false;
      if (soloAsequibles && !idsMiPlantilla.has(j.id) && j.valorMercado > saldoFuturo) {
        return false;
      }
      if (texto) {
        return (
          j.nombre.toLowerCase().includes(texto) || j.club.toLowerCase().includes(texto)
        );
      }
      return true;
    });

    const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
      a.nombre.localeCompare(b.nombre);

    if (orden === "valor-desc") {
      filtrados.sort((a, b) => b.valorMercado - a.valorMercado || porNombre(a, b));
    } else if (orden === "valor-asc") {
      filtrados.sort((a, b) => a.valorMercado - b.valorMercado || porNombre(a, b));
    } else if (orden === "elo-desc") {
      filtrados.sort((a, b) => b.elo - a.elo || porNombre(a, b));
    } else if (orden === "elo-asc") {
      filtrados.sort((a, b) => a.elo - b.elo || porNombre(a, b));
    } else if (orden === "puntos") {
      filtrados.sort((a, b) => b.puntosTotales - a.puntosTotales || porNombre(a, b));
    } else if (orden === "nombre") {
      filtrados.sort(porNombre);
    } else if (orden === "categoria") {
      filtrados.sort((a, b) => a.categoria - b.categoria || porNombre(a, b));
    }

    return filtrados;
  }, [jugadoresLiga, busqueda, categoria, vista, orden, soloAsequibles, idsMiPlantilla, saldoFuturo]);

  const jugadoresMostrados = jugadoresFiltrados.slice(0, visibles);

  const cambiarFiltro = (accion: () => void) => {
    accion();
    setVisibles(POR_PAGINA);
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
    setConfirmandoVentaId(null);
    setPuntosAbiertoId(null);
  };

  const mostrarMensaje = (jugadorId: string, mensaje: MensajeAccion) => {
    setMensajePorJugador((prev) => ({ ...prev, [jugadorId]: mensaje }));
  };

  const onFichar = async (jugadorId: string, valor: number) => {
    setEnviando(true);
    const resultado = await ficharJugador(jugadorId);
    setEnviando(false);
    mostrarMensaje(
      jugadorId,
      resultado.ok
        ? { tipo: "ok", texto: `Fichado por ${valor} M.` }
        : { tipo: "error", texto: resultado.mensaje }
    );
  };

  const onVender = async (jugadorId: string, valor: number) => {
    setEnviando(true);
    const resultado = await venderJugador(jugadorId, valor);
    setEnviando(false);
    setConfirmandoVentaId(null);
    mostrarMensaje(
      jugadorId,
      resultado.ok
        ? { tipo: "ok", texto: `Vendido por ${valor} M.` }
        : { tipo: "error", texto: resultado.mensaje }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mercado</h2>
        <span className="text-sm text-neutral-500">
          Saldo: {redondear2(saldoFuturo)} M · Plantilla: {squad.length}/{maxPlantilla}
        </span>
      </div>

      <p className="text-xs text-neutral-500">
        Liga pública: todos los jugadores están siempre disponibles y cualquiera puede tener al
        mismo jugador. Comprar y vender es inmediato, al valor de mercado.
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
            onChange={(e) => cambiarFiltro(() => setBusqueda(e.target.value))}
            placeholder="Buscar jugador o club..."
            className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <select
          value={orden}
          onChange={(e) => cambiarFiltro(() => setOrden(e.target.value as Orden))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="valor-desc">Valor: de mayor a menor</option>
          <option value="valor-asc">Valor: de menor a mayor</option>
          <option value="elo-desc">Elo: de mayor a menor</option>
          <option value="elo-asc">Elo: de menor a mayor</option>
          <option value="puntos">Ordenar por puntos</option>
          <option value="nombre">Ordenar por nombre</option>
          <option value="categoria">Ordenar por categoría</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categoria}
          onChange={(e) =>
            cambiarFiltro(() => setCategoria(e.target.value as "todas" | "1" | "2" | "3"))
          }
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="todas">Todas las categorías</option>
          <option value="1">1ª categoría</option>
          <option value="2">2ª categoría</option>
          <option value="3">3ª categoría</option>
        </select>

        <select
          value={vista}
          onChange={(e) => cambiarFiltro(() => setVista(e.target.value as Vista))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="todos">Todos los jugadores</option>
          <option value="mios">Solo mi plantilla</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={soloAsequibles}
            onChange={(e) => cambiarFiltro(() => setSoloAsequibles(e.target.checked))}
          />
          Solo los que puedo pagar
        </label>
      </div>

      {jugadoresFiltrados.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">
          {jugadoresLiga.length === 0
            ? "Todavía no hay jugadores cargados en la liga."
            : "No hay jugadores que coincidan con los filtros."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {jugadoresMostrados.map((jugador) => {
          const estaSeleccionado = seleccionadoId === jugador.id;
          const enMiPlantilla = idsMiPlantilla.has(jugador.id);
          const mensaje = mensajePorJugador[jugador.id];
          const sinSaldo = !enMiPlantilla && jugador.valorMercado > saldoFuturo;
          const motivoBloqueo = enMiPlantilla
            ? null
            : plantillaCompleta
              ? `Tu plantilla ya tiene los ${maxPlantilla} jugadores permitidos: vende a alguno primero.`
              : sinSaldo
                ? `Te faltan ${redondear2(jugador.valorMercado - saldoFuturo)} M para poder ficharlo.`
                : null;

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
                    {jugador.puntosTotales} pts esta temporada
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{jugador.valorMercado} M</p>
                  {enMiPlantilla && (
                    <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                      En tu plantilla
                    </span>
                  )}
                </div>
              </div>

              {estaSeleccionado && (
                <div className="flex flex-col gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                  {enMiPlantilla ? (
                    confirmandoVentaId === jugador.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmandoVentaId(null)}
                          disabled={enviando}
                          className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => onVender(jugador.id, jugador.valorMercado)}
                          disabled={enviando}
                          className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                        >
                          {enviando ? "Vendiendo…" : `Sí, vender por ${jugador.valorMercado} M`}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoVentaId(jugador.id)}
                        disabled={enviando}
                        className="rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                      >
                        Vender por {jugador.valorMercado} M
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => onFichar(jugador.id, jugador.valorMercado)}
                      disabled={enviando || motivoBloqueo !== null}
                      className="rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                    >
                      {enviando ? "Fichando…" : `Fichar por ${jugador.valorMercado} M`}
                    </button>
                  )}

                  {motivoBloqueo && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{motivoBloqueo}</p>
                  )}

                  <button
                    onClick={() =>
                      setPuntosAbiertoId((prev) => (prev === jugador.id ? null : jugador.id))
                    }
                    className="rounded-lg border border-neutral-300 py-2 text-sm font-medium dark:border-neutral-700"
                  >
                    {puntosAbiertoId === jugador.id ? "Ocultar puntos" : "Ver puntos"}
                  </button>

                  {puntosAbiertoId === jugador.id && (
                    <HistorialPuntosChart historial={jugador.historialPuntos} />
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

      {jugadoresFiltrados.length > visibles && (
        <button
          onClick={() => setVisibles((v) => v + POR_PAGINA)}
          className="rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
        >
          Mostrar más ({jugadoresFiltrados.length - visibles} restantes)
        </button>
      )}
    </div>
  );
}
