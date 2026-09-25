"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchClasificacion,
  fetchJugadoresLiga,
  fetchMercado,
  fetchMiEquipo,
  fetchMiPlantilla,
  fetchMiRol,
  fetchMisOfertas,
  fetchNotificaciones,
  ficharJugadorDB,
  hacerOfertaDB,
  marcarNotificacionesVistasDB,
  pagarClausulaDB,
  pujarMercadoDB,
  subirClausulaDB,
  toggleTitularDB,
  venderJugadorDB,
} from "@/lib/supabase/queries";
import type {
  ClasificacionEntry,
  EquipoManager,
  JugadorLiga,
  MercadoDelDia,
  Notificacion,
  OfertaPendiente,
  PlantillaSlot,
} from "@/lib/types";

const EQUIPO_VACIO: EquipoManager = { id: "", leagueId: "", nombreEquipo: "", saldo: 0 };

export function calcularClausula(valorMercado: number) {
  return Math.ceil(valorMercado * 1.5);
}

type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

interface GameState {
  cargando: boolean;
  tieneEquipo: boolean;
  esRoot: boolean;
  equipo: EquipoManager;
  squad: PlantillaSlot[];
  titulares: Record<string, boolean>;
  jugadoresLiga: JugadorLiga[];
  mercado: MercadoDelDia[];
  ofertas: OfertaPendiente[];
  clasificacion: ClasificacionEntry[];
  notificaciones: Notificacion[];
  // Instante (ms) de la última vez que abriste el panel de notificaciones.
  notificacionesVistasEn: number;
  // Avisos nuevos desde entonces, sin contar los de tus propias acciones.
  notificacionesNoLeidas: number;
  marcarNotificacionesVistas: () => Promise<void>;
  toggleTitular: (id: string) => Promise<void>;
  venderJugador: (id: string, valorMercado: number) => Promise<ResultadoAccion>;
  pagarClausula: (jugadorId: string) => Promise<ResultadoAccion>;
  subirClausula: (jugadorId: string, importe: number) => Promise<ResultadoAccion>;
  hacerOferta: (jugadorId: string, importe: number) => Promise<ResultadoAccion>;
  ficharJugador: (jugadorId: string) => Promise<ResultadoAccion>;
  pujarMercado: (listingId: string, importe: number) => Promise<ResultadoAccion>;
}

const GameStateContext = createContext<GameState | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [tieneEquipo, setTieneEquipo] = useState(false);
  const [esRoot, setEsRoot] = useState(false);
  const [equipo, setEquipo] = useState<EquipoManager>(EQUIPO_VACIO);
  const [squad, setSquad] = useState<PlantillaSlot[]>([]);
  const [titulares, setTitulares] = useState<Record<string, boolean>>({});
  const [jugadoresLiga, setJugadoresLiga] = useState<JugadorLiga[]>([]);
  const [mercado, setMercado] = useState<MercadoDelDia[]>([]);
  const [ofertas, setOfertas] = useState<OfertaPendiente[]>([]);
  const [clasificacion, setClasificacion] = useState<ClasificacionEntry[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesVistasEn, setNotificacionesVistasEn] = useState(() => Date.now());

  async function cargarTodo() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCargando(false);
      return;
    }

    const miEquipo = await fetchMiEquipo(supabase, user.id);
    const rol = await fetchMiRol(supabase, user.id);
    setEsRoot(rol === "root");

    if (!miEquipo) {
      // TODO: cuando existan varias ligas de verdad, esto pasa a
      // significar "no tienes ningún equipo en ninguna liga todavía" —
      // habrá que mandar a la pantalla de crear/unirse a liga en vez de
      // solo marcar tieneEquipo = false.
      setTieneEquipo(false);
      setCargando(false);
      return;
    }

    setTieneEquipo(true);
    setEquipo(miEquipo);

    const [plantilla, ligaJugadores, misOfertas, jugadoresMercado, tabla, avisos] = await Promise.all([
      fetchMiPlantilla(supabase, miEquipo.id),
      fetchJugadoresLiga(supabase, miEquipo.leagueId, miEquipo.id),
      fetchMisOfertas(supabase, miEquipo.id),
      fetchMercado(supabase, miEquipo.leagueId),
      fetchClasificacion(supabase, miEquipo.leagueId, miEquipo.id),
      fetchNotificaciones(supabase, miEquipo.leagueId, miEquipo.id),
    ]);

    setSquad(plantilla.map(({ titular: _titular, ...resto }) => resto));
    setTitulares(
      Object.fromEntries(plantilla.map((s) => [s.jugador.id, s.titular]))
    );
    setJugadoresLiga(ligaJugadores);
    setOfertas(misOfertas);
    setMercado(jugadoresMercado);
    setClasificacion(tabla);
    setNotificaciones(avisos.notificaciones);
    setNotificacionesVistasEn(avisos.vistasEn);
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recargarNotificaciones() {
    if (!equipo.id || !equipo.leagueId) return;
    const avisos = await fetchNotificaciones(supabase, equipo.leagueId, equipo.id);
    setNotificaciones(avisos.notificaciones);
    setNotificacionesVistasEn(avisos.vistasEn);
  }

  // Los avisos nuevos llegan por Supabase Realtime (la RLS de la tabla
  // hace que cada manager solo reciba los suyos). Como red de seguridad,
  // también se recargan al volver a la pestaña del navegador.
  useEffect(() => {
    if (!equipo.id || !equipo.leagueId) return;

    const canal = supabase
      .channel(`notificaciones-${equipo.leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `league_id=eq.${equipo.leagueId}`,
        },
        () => {
          recargarNotificaciones();
        }
      )
      .subscribe();

    const alVolver = () => {
      if (document.visibilityState === "visible") recargarNotificaciones();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id, equipo.leagueId]);

  async function marcarNotificacionesVistas() {
    if (!equipo.leagueId) return;
    const vistasEn = await marcarNotificacionesVistasDB(supabase, equipo.leagueId);
    if (vistasEn !== null) setNotificacionesVistasEn(vistasEn);
  }

  const notificacionesNoLeidas = notificaciones.filter(
    (n) => n.actorId !== equipo.id && Date.parse(n.creada) > notificacionesVistasEn
  ).length;

  async function toggleTitular(id: string) {
    const nuevoValor = !titulares[id];
    setTitulares((prev) => ({ ...prev, [id]: nuevoValor }));
    if (!equipo.id) return;
    const resultado = await toggleTitularDB(supabase, equipo.id, id, nuevoValor);
    if (!resultado.ok) {
      setTitulares((prev) => ({ ...prev, [id]: !nuevoValor }));
    }
  }

  async function venderJugador(
    id: string,
    valorMercado: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
    const resultado = await venderJugadorDB(supabase, equipo.id, id, valorMercado);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function pagarClausula(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    const resultado = await pagarClausulaDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function subirClausula(
    jugadorId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    if (importe > equipo.saldo) {
      return {
        ok: false,
        mensaje: `No puedes pagar más de tu saldo disponible (${equipo.saldo} M).`,
      };
    }
    const resultado = await subirClausulaDB(supabase, jugadorId, equipo.leagueId, importe);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function hacerOferta(
    jugadorId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    if (importe > equipo.saldo) {
      return {
        ok: false,
        mensaje: `No puedes ofertar más de tu saldo disponible (${equipo.saldo} M).`,
      };
    }
    const resultado = await hacerOfertaDB(supabase, equipo.id, jugadorId, importe);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function ficharJugador(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    const resultado = await ficharJugadorDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function pujarMercado(
    listingId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    if (importe > equipo.saldo) {
      return {
        ok: false,
        mensaje: `No puedes pujar más de tu saldo disponible (${equipo.saldo} M).`,
      };
    }
    const resultado = await pujarMercadoDB(supabase, listingId, importe, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  return (
    <GameStateContext.Provider
      value={{
        cargando,
        tieneEquipo,
        esRoot,
        equipo,
        squad,
        titulares,
        jugadoresLiga,
        mercado,
        ofertas,
        clasificacion,
        notificaciones,
        notificacionesVistasEn,
        notificacionesNoLeidas,
        marcarNotificacionesVistas,
        toggleTitular,
        venderJugador,
        pagarClausula,
        subirClausula,
        hacerOferta,
        ficharJugador,
        pujarMercado,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) {
    throw new Error("useGameState debe usarse dentro de <GameStateProvider>");
  }
  return ctx;
}