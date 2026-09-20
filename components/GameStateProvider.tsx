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
  fetchJugadoresLiga,
  fetchMercado,
  fetchMiEquipo,
  fetchMiPlantilla,
  fetchMiRol,
  fetchMisOfertas,
  ficharJugadorDB,
  hacerOfertaDB,
  pagarClausulaDB,
  pujarMercadoDB,
  toggleTitularDB,
  venderJugadorDB,
} from "@/lib/supabase/queries";
import type {
  EquipoManager,
  JugadorLiga,
  MercadoDelDia,
  OfertaPendiente,
  PlantillaSlot,
} from "@/lib/types";

const EQUIPO_VACIO: EquipoManager = { id: "", nombreEquipo: "", saldo: 0 };

export function calcularClausula(valorMercado: number) {
  return Math.ceil(valorMercado * 1.5); // ver lib/gameConfig.ts -> clausula.porcentaje
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
  toggleTitular: (id: string) => Promise<void>;
  venderJugador: (id: string, valorMercado: number) => Promise<ResultadoAccion>;
  pagarClausula: (jugadorId: string) => Promise<ResultadoAccion>;
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
      setTieneEquipo(false);
      setCargando(false);
      return;
    }

    setTieneEquipo(true);
    setEquipo(miEquipo);

    const [plantilla, ligaJugadores, misOfertas, jugadoresMercado] = await Promise.all([
      fetchMiPlantilla(supabase, miEquipo.id),
      fetchJugadoresLiga(supabase, miEquipo.id),
      fetchMisOfertas(supabase, miEquipo.id),
      fetchMercado(supabase),
    ]);

    setSquad(plantilla.map(({ titular: _titular, ...resto }) => resto));
    setTitulares(
      Object.fromEntries(plantilla.map((s) => [s.jugador.id, s.titular]))
    );
    setJugadoresLiga(ligaJugadores);
    setOfertas(misOfertas);
    setMercado(jugadoresMercado);
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const resultado = await pagarClausulaDB(supabase, jugadorId);
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
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
    const resultado = await ficharJugadorDB(supabase, jugadorId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function pujarMercado(
    listingId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    if (importe > equipo.saldo) {
      return {
        ok: false,
        mensaje: `No puedes pujar más de tu saldo disponible (${equipo.saldo} M).`,
      };
    }
    const resultado = await pujarMercadoDB(supabase, listingId, importe);
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
        toggleTitular,
        venderJugador,
        pagarClausula,
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