"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BuscadorSelect from "@/components/BuscadorSelect";
import ImportarRondaPanel from "@/components/ImportarRondaPanel";
import {
  fetchTodosLosJugadores,
  fetchJornadas,
  crearJornadaDB,
  borrarJornadaDB,
  fetchPagoPorPunto,
  terminarJornadaDB,
  fetchResultadosDeJornada,
  fetchDescansosDeJornada,
  guardarResultadoDB,
  marcarDescansoDB,
  borrarResultadoDB,
  type JugadorAdmin,
  type JornadaAdmin,
  type ResultadoGuardado,
} from "@/lib/supabase/adminQueries";
import { fetchParticipantesPorTorneo, fetchTorneos } from "@/lib/supabase/torneosQueries";
import { ordenarTorneos, type Torneo } from "@/lib/torneos";
import type { Categoria } from "@/lib/types";

type Resultado = "victoria" | "tablas" | "derrota";

// Estado de edición de una fila, antes de guardar. "rivalModo" decide si
// el desplegable busca un rival dentro de players (y su Elo se toma
// siempre actualizado al guardar) o si se introduce un Elo a mano
// (para un rival que no está en nuestra tabla de jugadores).
// "descanso" deja al jugador sin emparejar en esta jornada (por ejemplo,
// el que sobra cuando hay un número impar de jugadores).
interface FilaEdicion {
  resultado: Resultado | "descanso" | "";
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

const FILA_DESCANSO: FilaEdicion = { ...FILA_VACIA, resultado: "descanso" };

function filaDesdeGuardado(r: ResultadoGuardado): FilaEdicion {
  return {
    resultado: r.resultado,
    rivalModo: r.rivalPlayerId ? "jugador" : "manual",
    rivalPlayerId: r.rivalPlayerId ?? "",
    rivalEloManual: r.rivalElo != null ? String(r.rivalElo) : "",
  };
}

// Valor del desplegable de torneos para las jornadas antiguas, de antes de
// existir los torneos.
const SIN_TORNEO = "__sin_torneo__";

function etiquetaJornada(j: JornadaAdmin): string {
  return j.torneoNombre
    ? `${j.torneoNombre} · Ronda ${j.numero}`
    : `Ronda ${j.numero} (sin torneo)`;
}

export default function AdminResultadosPage() {
  const supabase = createClient();

  const [jugadores, setJugadores] = useState<JugadorAdmin[]>([]);
  const [jornadas, setJornadas] = useState<JornadaAdmin[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [participantesPorTorneo, setParticipantesPorTorneo] = useState<
    Record<string, string[]>
  >({});
  // Torneo elegido en el primer desplegable; las jornadas que se ven (y la
  // que se crea con "+ Nueva jornada") son siempre de este torneo.
  const [torneoId, setTorneoId] = useState<string>("");
  const [errorJornada, setErrorJornada] = useState<string | null>(null);
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  const [resultadosGuardados, setResultadosGuardados] = useState<
    Record<string, ResultadoGuardado>
  >({});
  const [descansos, setDescansos] = useState<Set<string>>(new Set());
  const [filas, setFilas] = useState<Record<string, FilaEdicion>>({});

  const [cargando, setCargando] = useState(true);
  const [cargandoJornada, setCargandoJornada] = useState(false);
  const [creandoJornada, setCreandoJornada] = useState(false);
  const [borrandoJornada, setBorrandoJornada] = useState(false);
  const [terminando, setTerminando] = useState(false);
  const [pagoPorPunto, setPagoPorPunto] = useState(1);
  const [avisoTerminar, setAvisoTerminar] = useState<string | null>(null);
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
      const [listaJugadores, listaJornadas, listaTorneos, participantes, tarifa] =
        await Promise.all([
          fetchTodosLosJugadores(supabase),
          fetchJornadas(supabase),
          fetchTorneos(supabase),
          fetchParticipantesPorTorneo(supabase),
          fetchPagoPorPunto(supabase),
        ]);
      setPagoPorPunto(tarifa);
      setJugadores(listaJugadores);
      setJornadas(listaJornadas);
      setTorneos(listaTorneos);
      setParticipantesPorTorneo(participantes);
      // Se empieza sin nada elegido: primero el torneo, luego su ronda.
      setTorneoId("");
      setJornadaId(null);
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAvisoTerminar(null);
  }, [jornadaId]);

  useEffect(() => {
    if (!jornadaId) {
      setResultadosGuardados({});
      setDescansos(new Set());
      setFilas({});
      return;
    }

    (async () => {
      setCargandoJornada(true);
      const [resultados, idsDescansos] = await Promise.all([
        fetchResultadosDeJornada(supabase, jornadaId),
        fetchDescansosDeJornada(supabase, jornadaId),
      ]);

      const porJugador: Record<string, ResultadoGuardado> = {};
      const filasIniciales: Record<string, FilaEdicion> = {};

      for (const r of resultados) {
        porJugador[r.playerId] = r;
        filasIniciales[r.playerId] = filaDesdeGuardado(r);
      }
      for (const id of idsDescansos) filasIniciales[id] = FILA_DESCANSO;

      setResultadosGuardados(porJugador);
      setDescansos(new Set(idsDescansos));
      setFilas(filasIniciales);
      setMensajePorJugador({});
      setCargandoJornada(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaId]);

  const jornadaActual = jornadas.find((j) => j.id === jornadaId) ?? null;

  // Jornadas del torneo elegido, de la primera a la última.
  const jornadasDelTorneo = useMemo(
    () =>
      jornadas
        .filter((j) => (j.torneoId ?? SIN_TORNEO) === torneoId)
        .sort((a, b) => a.numero - b.numero),
    [jornadas, torneoId]
  );
  const hayJornadasSinTorneo = jornadas.some((j) => !j.torneoId);
  const torneoElegido = torneos.find((t) => t.id === torneoId) ?? null;

  function onCambiarTorneo(nuevoId: string) {
    setTorneoId(nuevoId);
    setErrorJornada(null);
    setAvisoTerminar(null);
    // Al cambiar de torneo no se elige ninguna ronda: la eliges tú.
    setJornadaId(null);
  }
  // Enlace de chess-results / Info64 guardado en la ficha del torneo.
  const urlTorneoImportable = (() => {
    const url = torneos.find((t) => t.id === jornadaActual?.torneoId)?.webUrl?.trim() ?? "";
    return /chess-results\.com|info64\.org/i.test(url) ? url : null;
  })();

  // Jugadores de la jornada: los inscritos en su torneo (más cualquiera que
  // ya tenga resultado o descanso guardado, por si se le quitó del torneo
  // después). En jornadas antiguas sin torneo, o de un torneo sin jugadores
  // elegidos, salen todos los activos, como antes.
  const idsInscritos = useMemo(() => {
    const ids = jornadaActual?.torneoId
      ? participantesPorTorneo[jornadaActual.torneoId]
      : undefined;
    return ids && ids.length > 0 ? new Set(ids) : null;
  }, [jornadaActual, participantesPorTorneo]);

  const jugadoresDeLaJornada = useMemo(
    () =>
      idsInscritos
        ? jugadores.filter(
            (j) => idsInscritos.has(j.id) || resultadosGuardados[j.id] || descansos.has(j.id)
          )
        : jugadores,
    [jugadores, idsInscritos, resultadosGuardados, descansos]
  );

  // Pendiente = todavía sin resultado ni descanso guardado. Al guardar una
  // partida contra otro jugador de la lista, los dos dejan de ser pendientes.
  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return jugadoresDeLaJornada.filter((j) => {
      if (!j.activo) return false;
      if (filtroCategoria && j.categoria !== filtroCategoria) return false;
      if (texto && !j.nombre.toLowerCase().includes(texto)) return false;
      if (soloPendientes && (resultadosGuardados[j.id] || descansos.has(j.id))) return false;
      return true;
    });
  }, [
    jugadoresDeLaJornada,
    busqueda,
    filtroCategoria,
    soloPendientes,
    resultadosGuardados,
    descansos,
  ]);

  const totalActivos = jugadoresDeLaJornada.filter((j) => j.activo).length;
  const totalConResultado = Object.keys(resultadosGuardados).length;

  function filaDe(id: string): FilaEdicion {
    return filas[id] ?? FILA_VACIA;
  }

  function editarFila(id: string, cambios: Partial<FilaEdicion>) {
    setFilas((prev) => ({ ...prev, [id]: { ...filaDe(id), ...cambios } }));
  }

  function nombreDe(id: string): string {
    return jugadores.find((j) => j.id === id)?.nombre ?? "su rival";
  }

  // Vuelve a leer la jornada tras guardar o borrar. Guardar una partida
  // cambia también la fila del rival, así que se refrescan las filas cuyo
  // estado guardado ha cambiado; las demás conservan lo que estés
  // escribiendo sin guardar.
  async function refrescarJornada(id: string) {
    const [resultados, idsDescansos] = await Promise.all([
      fetchResultadosDeJornada(supabase, id),
      fetchDescansosDeJornada(supabase, id),
    ]);

    const nuevos: Record<string, ResultadoGuardado> = {};
    for (const r of resultados) nuevos[r.playerId] = r;
    const nuevosDescansos = new Set(idsDescansos);

    const afectados = new Set([
      ...Object.keys(resultadosGuardados),
      ...Object.keys(nuevos),
      ...descansos,
      ...nuevosDescansos,
    ]);

    setFilas((prev) => {
      const siguiente = { ...prev };
      for (const pid of afectados) {
        const cambio =
          JSON.stringify(resultadosGuardados[pid]) !== JSON.stringify(nuevos[pid]) ||
          descansos.has(pid) !== nuevosDescansos.has(pid);
        if (!cambio) continue;
        siguiente[pid] = nuevos[pid]
          ? filaDesdeGuardado(nuevos[pid])
          : nuevosDescansos.has(pid)
            ? FILA_DESCANSO
            : FILA_VACIA;
      }
      return siguiente;
    });
    setResultadosGuardados(nuevos);
    setDescansos(nuevosDescansos);
  }

  async function onCrearJornada() {
    if (!torneoElegido) return;
    setErrorJornada(null);
    setCreandoJornada(true);
    const resultado = await crearJornadaDB(supabase, torneoElegido.id);
    setCreandoJornada(false);

    if (!resultado.ok) {
      setErrorJornada(resultado.mensaje);
      return;
    }

    setJornadas((prev) => [resultado.jornada, ...prev]);
    setJornadaId(resultado.jornada.id);
    // Refresca el contador de rondas del torneo.
    setTorneos(await fetchTorneos(supabase));
  }

  async function onTerminarJornada() {
    if (!jornadaActual) return;
    const yaTerminada = Boolean(jornadaActual.terminadaEn);
    const pendientes = Math.max(totalActivos - totalConResultado - descansos.size, 0);
    const millonesPorPunto = `${pagoPorPunto} M por punto`;

    const pregunta = yaTerminada
      ? `Esta ronda ya está terminada. ¿Recalcular los pagos con los resultados actuales? ` +
        `Cada manager recibirá o devolverá solo la diferencia (${millonesPorPunto}).`
      : `¿Estás seguro de que has metido todos los resultados y quieres terminar la ronda? ` +
        `Se pagarán ${millonesPorPunto} a cada manager según los puntos que haya hecho en ` +
        `${etiquetaJornada(jornadaActual)}.` +
        (pendientes > 0
          ? `\n\nOJO: todavía hay ${pendientes} jugador${pendientes === 1 ? "" : "es"} sin resultado.`
          : "");
    if (!confirm(pregunta)) return;

    setErrorJornada(null);
    setAvisoTerminar(null);
    setTerminando(true);
    const resultado = await terminarJornadaDB(supabase, jornadaActual.id);
    setTerminando(false);

    if (!resultado.ok) {
      setErrorJornada(resultado.mensaje);
      return;
    }

    const r = resultado.resumen;
    setJornadas(await fetchJornadas(supabase));
    setAvisoTerminar(
      r.yaTerminada
        ? `Pagos recalculados: en total ${r.millones} M a ${r.equiposPagados} managers (${r.puntos} puntos).`
        : `Ronda terminada: ${r.millones} M pagados a ${r.equiposPagados} managers (${r.puntos} puntos).`
    );
  }

  async function onBorrarJornada() {
    if (!jornadaActual) return;
    const nombre = etiquetaJornada(jornadaActual);
    const aviso =
      totalConResultado > 0
        ? `Se borrarán también los ${totalConResultado} resultados de esta ronda y sus puntos. `
        : "";
    const avisoPago = jornadaActual.terminadaEn
      ? "Como la ronda estaba terminada, se devolverán los millones ya pagados a los managers. "
      : "";
    if (!confirm(`¿Borrar "${nombre}"? ${aviso}${avisoPago}Esto no se puede deshacer.`)) return;

    setErrorJornada(null);
    setBorrandoJornada(true);
    const resultado = await borrarJornadaDB(supabase, jornadaActual.id);
    setBorrandoJornada(false);

    if (!resultado.ok) {
      setErrorJornada(resultado.mensaje);
      return;
    }

    const restantes = jornadas.filter((j) => j.id !== jornadaActual.id);
    setJornadas(restantes);
    // Se queda en el mismo torneo, sin ronda elegida.
    setJornadaId(null);
    setTorneos(await fetchTorneos(supabase));
  }

  function avisar(playerId: string, tipo: "ok" | "error", texto: string) {
    setMensajePorJugador((prev) => ({ ...prev, [playerId]: { tipo, texto } }));
  }

  async function onGuardar(playerId: string) {
    if (!jornadaId) return;
    const fila = filaDe(playerId);
    if (!fila.resultado) return;

    if (fila.resultado === "descanso") {
      setGuardandoId(playerId);
      const resultado = await marcarDescansoDB(supabase, jornadaId, playerId);
      if (resultado.ok) await refrescarJornada(jornadaId);
      setGuardandoId(null);

      avisar(
        playerId,
        resultado.ok ? "ok" : "error",
        resultado.ok ? "Marcado como sin emparejar." : resultado.mensaje
      );
      return;
    }

    const rivalPlayerId = fila.rivalModo === "jugador" ? fila.rivalPlayerId || null : null;
    const rivalElo =
      fila.rivalModo === "manual" && fila.rivalEloManual
        ? Number(fila.rivalEloManual)
        : null;

    if (fila.rivalModo === "jugador" && !rivalPlayerId) {
      avisar(playerId, "error", "Elige un rival de la lista.");
      return;
    }
    if (fila.rivalModo === "manual" && !rivalElo) {
      avisar(playerId, "error", "Introduce el Elo del rival.");
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
    if (resultado.ok) await refrescarJornada(jornadaId);
    setGuardandoId(null);

    if (resultado.ok) {
      const conRival =
        rivalPlayerId && resultado.puntosRival != null
          ? ` · ${nombreDe(rivalPlayerId)}: ${resultado.puntosRival} pts`
          : "";
      avisar(playerId, "ok", `Guardado — ${resultado.puntos} pts${conRival}`);
    } else {
      avisar(playerId, "error", resultado.mensaje);
    }
  }

  async function onBorrar(playerId: string) {
    if (!jornadaId) return;

    // Borrar una partida entre dos jugadores de la lista también quita la
    // del rival: se avisa antes.
    const rivalId = resultadosGuardados[playerId]?.rivalPlayerId;
    if (
      rivalId &&
      resultadosGuardados[rivalId]?.rivalPlayerId === playerId &&
      !confirm(
        `Esto también quitará el resultado de ${nombreDe(rivalId)}, que jugaba contra este jugador. ¿Continuar?`
      )
    ) {
      return;
    }

    setGuardandoId(playerId);
    const resultado = await borrarResultadoDB(supabase, jornadaId, playerId);
    if (resultado.ok) await refrescarJornada(jornadaId);
    setGuardandoId(null);

    if (resultado.ok) {
      setFilas((prev) => ({ ...prev, [playerId]: FILA_VACIA }));
      setMensajePorJugador((prev) => {
        const { [playerId]: _fuera, ...resto } = prev;
        return resto;
      });
    } else {
      avisar(playerId, "error", resultado.mensaje);
    }
  }

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {torneos.length === 0 && !hayJornadasSinTorneo ? (
          <Link
            href="/admin/torneos"
            className="text-sm text-accent underline underline-offset-2"
          >
            Crea primero un torneo para poder añadir rondas
          </Link>
        ) : (
          <>
            <select
              aria-label="Torneo"
              value={torneoId}
              onChange={(e) => onCambiarTorneo(e.target.value)}
              className="min-w-0 max-w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Elige un torneo…</option>
              {ordenarTorneos(torneos).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
              {hayJornadasSinTorneo && (
                <option value={SIN_TORNEO}>Rondas antiguas (sin torneo)</option>
              )}
            </select>

            {torneoId && (
              <select
                aria-label="Ronda"
                value={jornadaId ?? ""}
                onChange={(e) => setJornadaId(e.target.value || null)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">
                  {jornadasDelTorneo.length === 0 ? "Sin rondas todavía" : "Elige una ronda…"}
                </option>
                {jornadasDelTorneo.map((j) => (
                  <option key={j.id} value={j.id}>
                    Ronda {j.numero}
                  </option>
                ))}
              </select>
            )}

            {torneoElegido && (
              <button
                onClick={onCrearJornada}
                disabled={creandoJornada}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
              >
                {creandoJornada
                  ? "Añadiendo…"
                  : `+ Añadir ronda ${(jornadasDelTorneo[jornadasDelTorneo.length - 1]?.numero ?? 0) + 1}`}
              </button>
            )}
          </>
        )}

        {jornadaActual && (
          <button
            onClick={onTerminarJornada}
            disabled={terminando || cargandoJornada}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 ${
              jornadaActual.terminadaEn
                ? "border border-neutral-300 dark:border-neutral-700"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {terminando
              ? "Procesando…"
              : jornadaActual.terminadaEn
                ? "Recalcular pagos"
                : "Terminar ronda"}
          </button>
        )}

        {jornadaActual && (
          <button
            onClick={onBorrarJornada}
            disabled={borrandoJornada}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-negative disabled:opacity-40 dark:border-neutral-700"
          >
            {borrandoJornada ? "Borrando…" : "Borrar ronda"}
          </button>
        )}

        {jornadaActual && (
          <span className="text-sm text-neutral-500">
            {totalConResultado} / {totalActivos} jugadores con resultado
            {descansos.size > 0
              ? ` · ${descansos.size} sin emparejar`
              : ""}
          </span>
        )}
      </div>

      {errorJornada && <p className="text-sm text-negative">{errorJornada}</p>}

      {jornadaActual?.terminadaEn && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm">
          <strong>Ronda terminada</strong> el{" "}
          {new Date(jornadaActual.terminadaEn).toLocaleString("es-ES", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
          . Si corriges algún resultado, pulsa «Recalcular pagos» para ajustar los millones.
        </p>
      )}
      {avisoTerminar && <p className="text-sm text-positive">{avisoTerminar}</p>}

      {!jornadaId && (
        <p className="py-6 text-center text-sm text-neutral-500">
          {!torneoId
            ? "Elige un torneo para ver sus rondas."
            : jornadasDelTorneo.length === 0
              ? "Este torneo todavía no tiene rondas. Crea la primera con «+ Añadir ronda 1»."
              : "Elige una ronda de este torneo para ver y subir sus resultados."}
        </p>
      )}

      {jornadaId && jornadaActual && urlTorneoImportable && (
        <ImportarRondaPanel
          urlTorneo={urlTorneoImportable}
          numeroRonda={jornadaActual.numero}
          matchdayId={jornadaId}
          jugadores={jugadores}
          alCambiar={() => refrescarJornada(jornadaId)}
        />
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
            <p className="text-sm text-neutral-500">Cargando resultados de la ronda…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {jugadoresFiltrados.map((jugador) => {
                const fila = filaDe(jugador.id);
                const guardado = resultadosGuardados[jugador.id];
                const descansa = descansos.has(jugador.id);
                const mensaje = mensajePorJugador[jugador.id];
                const esDescanso = fila.resultado === "descanso";

                // Rivales posibles: con jugadores inscritos, los inscritos;
                // si no (jornada sin torneo o sin lista), los de la misma
                // categoría. Se quitan los que ya juegan contra otro o
                // descansan: solo quedan libres (y su rival actual, si
                // este jugador ya estaba emparejado con él).
                const rivalesPosibles = (
                  idsInscritos
                    ? jugadores.filter((r) => idsInscritos.has(r.id))
                    : jugadores.filter((r) => r.categoria === jugador.categoria)
                ).filter((r) => {
                  if (r.id === jugador.id || !r.activo) return false;
                  if (descansos.has(r.id)) return false;
                  const suResultado = resultadosGuardados[r.id];
                  return !suResultado || suResultado.rivalPlayerId === jugador.id;
                });

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
                      {descansa && (
                        <span className="text-xs font-medium text-neutral-500">
                          Sin emparejar
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <select
                        value={fila.resultado}
                        onChange={(e) =>
                          editarFila(jugador.id, {
                            resultado: e.target.value as FilaEdicion["resultado"],
                          })
                        }
                        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      >
                        <option value="">Resultado…</option>
                        <option value="victoria">Victoria</option>
                        <option value="tablas">Tablas</option>
                        <option value="derrota">Derrota</option>
                        <option value="descanso">Sin emparejar (1 pt)</option>
                      </select>

                      {esDescanso ? (
                        <p className="col-span-2 flex items-center text-xs text-neutral-500 sm:col-span-2">
                          No juega en esta ronda: no cuenta como partida y suma 1 punto Fantasy.
                        </p>
                      ) : (
                        <>
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
                                opciones={rivalesPosibles.map((r) => ({
                                  id: r.id,
                                  etiqueta: `${r.nombre} (${r.elo})`,
                                }))}
                                valor={fila.rivalPlayerId}
                                onSeleccionar={(id) =>
                                  editarFila(jugador.id, { rivalPlayerId: id })
                                }
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
                        </>
                      )}

                      <div className="col-span-2 flex gap-2 sm:col-span-1">
                        <button
                          onClick={() => onGuardar(jugador.id)}
                          disabled={!fila.resultado || guardandoId === jugador.id}
                          className="flex-1 rounded-lg bg-accent py-1.5 text-sm font-medium text-white disabled:opacity-40"
                        >
                          Guardar
                        </button>
                        {(guardado || descansa) && (
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
