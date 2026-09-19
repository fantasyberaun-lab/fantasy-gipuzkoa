"use client";

// Estado compartido entre las pestañas del dashboard (plantilla, mercado,
// jugadores...), respaldado por Supabase de verdad en vez de datos de
// ejemplo. Vive en app/(dashboard)/layout.tsx, que Next.js mantiene
// montado al navegar entre pestañas, así que no hace falta recargar nada
// al cambiar de pestaña.
//
// Cómo está organizado:
//   - Toda la comunicación con Supabase vive en lib/supabase/queries.ts.
//   - Este archivo solo mantiene el estado en React y decide cuándo volver
//     a pedir los datos (después de cada acción, recarga todo con
//     cargarTodo() — más simple que ir parcheando el estado a mano, a
//     costa de un pequeño parpadeo tras cada acción).

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
  fetchMisOfertas,
  ficharJugadorDB,
  hacerOfertaDB,
  pagarClausulaDB,
  toggleTitularDB,
  venderJugadorDB,
} from "@/lib/supabase/queries";
import type {
  EquipoManager,
  JugadorLiga,
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
  equipo: EquipoManager;
  squad: PlantillaSlot[];
  titulares: Record<string, boolean>;
  jugadoresLiga: JugadorLiga[];
  mercado: JugadorLiga[];
  ofertas: OfertaPendiente[];
  toggleTitular: (id: string) => Promise<void>;
  venderJugador: (id: string, valorMercado: number) => Promise<ResultadoAccion>;
  pagarClausula: (jugadorId: string) => Promise<ResultadoAccion>;
  hacerOferta: (jugadorId: string, importe: number) => Promise<ResultadoAccion>;
  ficharJugador: (jugadorId: string) => Promise<ResultadoAccion>;
}

const GameStateContext = createContext<GameState | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [tieneEquipo, setTieneEquipo] = useState(false);
  const [equipo, setEquipo] = useState<EquipoManager>(EQUIPO_VACIO);
  const [squad, setSquad] = useState<PlantillaSlot[]>([]);
  const [titulares, setTitulares] = useState<Record<string, boolean>>({});
  const [jugadoresLiga, setJugadoresLiga] = useState<JugadorLiga[]>([]);
  const [mercado, setMercado] = useState<JugadorLiga[]>([]);
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

    if (!miEquipo) {
      // No debería pasar (el trigger de registro crea el equipo a la vez
      // que el usuario), pero por si acaso: mostramos "sin equipo" en vez
      // de romper la página.
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
    // Solo al montar: cargarTodo() se vuelve a llamar explícitamente
    // después de cada acción, no hace falta re-suscribirse a nada más.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTitular(id: string) {
    const nuevoValor = !titulares[id];
    setTitulares((prev) => ({ ...prev, [id]: nuevoValor })); // optimista
    if (!equipo.id) return;
    const resultado = await toggleTitularDB(supabase, equipo.id, id, nuevoValor);
    if (!resultado.ok) {
      // Si falla el guardado, deshacemos el cambio optimista.
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

  return (
    <GameStateContext.Provider
      value={{
        cargando,
        tieneEquipo,
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
