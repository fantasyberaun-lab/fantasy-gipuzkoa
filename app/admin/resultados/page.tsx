"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BuscadorSelect from "@/components/BuscadorSelect";
import {
  fetchTodosLosJugadores,
  fetchJornadas,
  fetchTorneos,
  crearJornadaDB,
  fetchResultadosDeJornada,
  guardarResultadoDB,
  borrarResultadoDB,
  type JugadorAdmin,
  type JornadaAdmin,
  type ResultadoGuardado,
  type TorneoAdmin,
} from "@/lib/supabase/adminQueries";
import type { Categoria } from "@/lib/types";

type Resultado = "victoria" | "tablas" | "derrota";

// Estado de edición de una fila, antes de guardar. "rivalModo" decide si
// el desplegable busca un rival dentro de players (y su Elo se toma
// siempre actualizado al guardar) o si se introduce un Elo a mano
// (para un rival que no está en nuestra tabla de jugadores).
interface FilaEdicion {
  resultado: Resultado | "";
  rivalModo: "jugador" | "manual";
  rivalPlayerId: string;
  rivalEloManual: string;
}

const FILA_VACIA: FilaEdicion = {
  resultado: "",
  rivalModo: "jugador",
  rivalPlayerId: "",
  rivalEloManual: "",
};

export default function AdminResultadosPage() {
  const supabase = createClient();

  const [jugadores, setJugadores] = useState<JugadorAdmin[]>([]);
  const [jornadas, setJornadas] = useState<JornadaAdmin[]>([]);
  const [torneos, setTorneos] = useState<TorneoAdmin[]>([]);
  const [torneoNuevaId, setTorneoNuevaId] = useState<string>("");
  const [errorJornada, setErrorJornada] = useState<string | null>(null);
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  const [resultadosGuardados, setResultadosGuardados] = useState<
    Record<string, ResultadoGuardado>
  >({});
  const [filas, setFilas] = useState<Record<string, FilaEdicion>>({});

  const [cargando, setCargando] = useState(true);
  const [cargandoJornada, setCargandoJornada] = useState(false);
  const [creandoJornada, setCreandoJornada] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [mensajePorJugador, setMensajePorJugador] = useState<
    Record<string, { tipo: "ok" | "error"; texto: string }>
  >({});

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | "">("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  useEffect(() => {
    (async () => {
      setCargando(true);
      const [listaJugadores, listaJornadas, listaTorneos] = await Promise.all([
        fetchTodosLosJugadores(supabase),
        fetchJornadas(supabase),
        fetchTorneos(supabase),
      ]);
      setJugadores(listaJugadores);
      setJornadas(listaJornadas);
      setTorneos(listaTorneos);
      // Por defecto, el torneo de la última jornada; si no hay, el primero.
      setTorneoNuevaId(listaJornadas[0]?.torneoId ?? listaTorneos[0]?.id ?? "");
      setJornadaId(listaJornadas[0]?.id ?? null);
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jornadaId) {
      setResultadosGuardados({});
      setFilas({});
      return;
    }

    (async () => {
      setCargandoJornada(true);
      const resultados = await fetchResultadosDeJornada(supabase, jornadaId);

      const porJugador: Record<string, ResultadoGuardado> = {};
      const filasIniciales: Record<string, FilaEdicion> = {};

      for (const r of resultados) {
        porJugador[r.playerId] = r;
        filasIniciales[r.playerId] = {
          resultado: r.resultado,
          rivalModo: r.rivalPlayerId ? "jugador" : "manual",
          rivalPlayerId: r.rivalPlayerId ?? "",
          rivalEloManual: r.rivalElo != null ? String(r.rivalElo) : "",
        };
      }

      setResultadosGuardados(porJugador);
      setFilas(filasIniciales);
      setMensajePorJugador({});
      setCargandoJornada(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaId]);

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return jugadores.filter((j) => {
      if (!j.activo) return false;
      if (filtroCategoria && j.categoria !== filtroCategoria) return false;
      if (texto && !j.nombre.toLowerCase().includes(texto)) return false;
      if (soloPendientes && resultadosGuardados[j.id]) return false;
      return true;
    });
  }, [jugadores, busqueda, filtroCategoria, soloPendientes, resultadosGuardados]);

  const jornadaActual = jornadas.find((j) => j.id === jornadaId) ?? null;
  const totalActivos = jugadores.filter((j) => j.activo).length;
  const totalConResultado = Object.keys(resultadosGuardados).length;

  function filaDe(id: string): FilaEdicion {
    return filas[id] ?? FILA_VACIA;
  }

  function editarFila(id: string, cambios: Partial<FilaEdicion>) {
    setFilas((prev) => ({ ...prev, [id]: { ...filaDe(id), ...cambios } }));
  }

  async function onCrearJornada() {
    if (!torneoNuevaId) return;
    setErrorJornada(null);
    const siguienteNumero = (jornadas[0]?.numero ?? 0) + 1;
    setCreandoJornada(true);
    const resultado = await crearJornadaDB(supabase, siguienteNumero, torneoNuevaId);
    setCreandoJornada(false);

    if (!resultado.ok) {
      setErrorJornada(resultado.mensaje);
      return;
    }

    setJornadas((prev) => [resultado.jornada, ...prev]);
    setJornadaId(resultado.jornada.id);
    // Refresca el contador "X / N rondas" del torneo.
    setTorneos(await fetchTorneos(supabase));
  }

  async function onGuardar(playerId: string) {
    if (!jornadaId) return;
    const fila = filaDe(playerId);
    if (!fila.resultado) return;

    const rivalPlayerId = fila.rivalModo === "jugador" ? fila.rivalPlayerId || null : null;
    const rivalElo =
      fila.rivalModo === "manual" && fila.rivalEloManual
        ? Number(fila.rivalEloManual)
        : null;

    if (fila.rivalModo === "jugador" && !rivalPlayerId) {
      setMensajePorJugador((prev) => ({
        ...prev,
        [playerId]: { tipo: "error", texto: "Elige un rival de la lista." },
      }));
      return;
    }
    if (fila.rivalModo === "manual" && !rivalElo) {
      setMensajePorJugador((prev) => ({
        ...prev,
        [playerId]: { tipo: "error", texto: "Introduce el Elo del rival." },
      }));
      return;
    }

    setGuardandoId(playerId);
    const resultado = await guardarResultadoDB(supabase, {
      matchdayId: jornadaId,
      playerId,
      resultado: fila.resultado,
      rivalPlayerId,
      rivalElo,
    });
    setGuardandoId(null);

    if (resultado.ok) {
      setResultadosGuardados((prev) => ({
        ...prev,
        [playerId]: {
          playerId,
          resultado: fila.resultado as Resultado,
          rivalPlayerId,
          rivalElo,
          puntosFantasy: resultado.puntos,
        },
      }));
      setMensajePorJugador((prev) => ({
        ...prev,
        [playerId]: { tipo: "ok", texto: `Guardado — ${resultado.puntos} pts` },
      }));
    } else {
      setMensajePorJugador((prev) => ({
        ...prev,
        [playerId]: { tipo: "error", texto: resultado.mensaje },
      }));
    }
  }

  async function onBorrar(playerId: string) {
    if (!jornadaId) return;
    setGuardandoId(playerId);
    const resultado = await borrarResultadoDB(supabase, jornadaId, playerId);
    setGuardandoId(null);

    if (resultado.ok) {
      setResultadosGuardados((prev) => {
        const { [playerId]: _fuera, ...resto } = prev;
        return resto;
      });
      setFilas((prev) => ({ ...prev, [playerId]: FILA_VACIA }));
      setMensajePorJugador((prev) => {
        const { [playerId]: _fuera, ...resto } = prev;
        return resto;
      });
    } else {
      setMensajePorJugador((prev) => ({
        ...prev,
        [playerId]: { tipo: "error", texto: resultado.mensaje },
      }));
    }
  }

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={jornadaId ?? ""}
          onChange={(e) => setJornadaId(e.target.value || null)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {jornadas.length === 0 && <option value="">Sin jornadas todavía</option>}
          {jornadas.map((j) => (
            <option key={j.id} value={j.id}>
              Jornada {j.numero}
              {j.torneoNombre
                ? ` · ${j.torneoNombre}${j.ronda ? ` · Ronda ${j.ronda}` : ""}`
                : " · Sin torneo"}
            </option>
          ))}
        </select>

        {torneos.length > 0 ? (
          <>
            <select
              value={torneoNuevaId}
              onChange={(e) => setTorneoNuevaId(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {torneos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.rondasCreadas}/{t.numeroRondas})
                </option>
              ))}
            </select>
            <button
              onClick={onCrearJornada}
              disabled={creandoJornada || !torneoNuevaId}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
            >
              {creandoJornada ? "Creando…" : "+ Nueva jornada"}
            </button>
          </>
        ) : (
          <Link
            href="/admin/torneos"
            className="text-sm text-accent underline underline-offset-2"
          >
            Crea primero un torneo para poder añadir jornadas
          </Link>
        )}

        {jornadaActual && (
          <span className="text-sm text-neutral-500">
            {totalConResultado} / {totalActivos} jugadores con resultado
          </span>
        )}
      </div>

      {errorJornada && <p className="text-sm text-negative">{errorJornada}</p>}

      {!jornadaId && (
        <p className="py-6 text-center text-sm text-neutral-500">
          Crea la primera jornada para empezar a introducir resultados.
        </p>
      )}

      {jornadaId && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Buscar jugador…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <select
              value={filtroCategoria}
              onChange={(e) =>
                setFiltroCategoria(e.target.value ? (Number(e.target.value) as Categoria) : "")
              }
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Todas las categorías</option>
              <option value={1}>1ª</option>
              <option value={2}>2ª</option>
              <option value={3}>3ª</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => setSoloPendientes(e.target.checked)}
              />
              Solo pendientes
            </label>
          </div>

          {cargandoJornada ? (
            <p className="text-sm text-neutral-500">Cargando resultados de la jornada…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {jugadoresFiltrados.map((jugador) => {
                const fila = filaDe(jugador.id);
                const guardado = resultadosGuardados[jugador.id];
                const mensaje = mensajePorJugador[jugador.id];
                const rivalesMismaCategoria = jugadores.filter(
                  (r) => r.categoria === jugador.categoria && r.id !== jugador.id
                );

                return (
                  <div
                    key={jugador.id}
                    className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{jugador.nombre}</p>
                        <p className="text-xs text-neutral-500">
                          {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
                        </p>
                      </div>
                      {guardado && (
                        <span className="text-xs font-medium text-positive">
                          {guardado.puntosFantasy} pts
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <select
                        value={fila.resultado}
                        onChange={(e) =>
                          editarFila(jugador.id, { resultado: e.target.value as Resultado })
                        }
                        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      >
                        <option value="">Resultado…</option>
                        <option value="victoria">Victoria</option>
                        <option value="tablas">Tablas</option>
                        <option value="derrota">Derrota</option>
                      </select>

                      <select
                        value={fila.rivalModo}
                        onChange={(e) =>
                          editarFila(jugador.id, {
                            rivalModo: e.target.value as "jugador" | "manual",
                          })
                        }
                        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      >
                        <option value="jugador">Rival de la lista</option>
                        <option value="manual">Rival — Elo manual</option>
                      </select>

                      {fila.rivalModo === "jugador" ? (
                        <div className="col-span-2 sm:col-span-1">
                          <BuscadorSelect
                            opciones={rivalesMismaCategoria.map((r) => ({
                              id: r.id,
                              etiqueta: `${r.nombre} (${r.elo})`,
                            }))}
                            valor={fila.rivalPlayerId}
                            onSeleccionar={(id) => editarFila(jugador.id, { rivalPlayerId: id })}
                            placeholder="Buscar rival…"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          placeholder="Elo del rival"
                          value={fila.rivalEloManual}
                          onChange={(e) =>
                            editarFila(jugador.id, { rivalEloManual: e.target.value })
                          }
                          className="col-span-2 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-1"
                        />
                      )}

                      <div className="col-span-2 flex gap-2 sm:col-span-1">
                        <button
                          onClick={() => onGuardar(jugador.id)}
                          disabled={!fila.resultado || guardandoId === jugador.id}
                          className="flex-1 rounded-lg bg-accent py-1.5 text-sm font-medium text-white disabled:opacity-40"
                        >
                          Guardar
                        </button>
                        {guardado && (
                          <button
                            onClick={() => onBorrar(jugador.id)}
                            disabled={guardandoId === jugador.id}
                            className="rounded-lg border border-neutral-300 px-2 text-sm text-negative disabled:opacity-40 dark:border-neutral-700"
                          >
                            Borrar
                          </button>
                        )}
                      </div>
                    </div>

                    {mensaje && (
                      <p
                        className={`mt-1 text-xs ${
                          mensaje.tipo === "ok" ? "text-positive" : "text-negative"
                        }`}
                      >
                        {mensaje.texto}
                      </p>
                    )}
                  </div>
                );
              })}

              {jugadoresFiltrados.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-500">
                  No hay jugadores que coincidan con el filtro.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
