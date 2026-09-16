"use client";

// Estado compartido entre las pestañas del dashboard (plantilla, mercado,
// jugadores...). Antes, cada pestaña tenía su propio useState, así que
// "pagar cláusula" en Jugadores no podía tocar el saldo ni la plantilla
// que vivían solo en la pestaña de Mi plantilla, y al cambiar de pestaña
// el componente se desmontaba y perdía todo.
//
// Este Provider vive en app/(dashboard)/layout.tsx, que Next.js mantiene
// montado mientras navegas entre pestañas — así que el estado ya
// sobrevive a los cambios de pestaña dentro de la misma sesión.
//
// OJO: esto sigue sin ser persistencia real. Si recargas la página o
// cierras el navegador, se pierde igual, porque sigue viviendo solo en
// memoria del navegador. El siguiente paso (pendiente) es sustituir estos
// useState por lecturas/escrituras a Supabase, manteniendo la misma
// forma de las funciones (toggleTitular, venderJugador, pagarClausula,
// hacerOferta) para no tener que rehacer los componentes que las usan.

import { createContext, useContext, useState, type ReactNode } from "react";
import { mockEquipo, mockPlantilla, mockJugadoresLiga } from "@/lib/mockData";
import type {
  EquipoManager,
  JugadorLiga,
  OfertaPendiente,
  PlantillaSlot,
} from "@/lib/types";

const MAX_PLANTILLA = 10;
const PORCENTAJE_CLAUSULA = 1.5; // ver lib/gameConfig.ts -> clausula.porcentaje

export function calcularClausula(valorMercado: number) {
  return Math.ceil(valorMercado * PORCENTAJE_CLAUSULA);
}

type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

interface GameState {
  equipo: EquipoManager;
  squad: PlantillaSlot[];
  titulares: Record<string, boolean>;
  jugadoresLiga: JugadorLiga[];
  ofertas: OfertaPendiente[];
  toggleTitular: (id: string) => void;
  venderJugador: (id: string, valorMercado: number) => void;
  pagarClausula: (jugadorId: string) => ResultadoAccion;
  hacerOferta: (jugadorId: string, importe: number) => ResultadoAccion;
}

const GameStateContext = createContext<GameState | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [equipo, setEquipo] = useState<EquipoManager>(mockEquipo);
  const [squad, setSquad] = useState<PlantillaSlot[]>(mockPlantilla);
  const [titulares, setTitulares] = useState<Record<string, boolean>>({});
  const [jugadoresLiga, setJugadoresLiga] =
    useState<JugadorLiga[]>(mockJugadoresLiga);
  const [ofertas, setOfertas] = useState<OfertaPendiente[]>([]);

  function toggleTitular(id: string) {
    setTitulares((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function venderJugador(id: string, valorMercado: number) {
    setSquad((prev) => prev.filter((slot) => slot.jugador.id !== id));
    setEquipo((prev) => ({ ...prev, saldo: prev.saldo + valorMercado }));
    setTitulares((prev) => {
      const { [id]: _eliminado, ...resto } = prev;
      return resto;
    });
    setJugadoresLiga((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, propietario: null, esMiEquipo: false } : j
      )
    );
  }

  function pagarClausula(jugadorId: string): ResultadoAccion {
    const jugador = jugadoresLiga.find((j) => j.id === jugadorId);
    if (!jugador) return { ok: false, mensaje: "Jugador no encontrado." };
    if (jugador.esMiEquipo)
      return { ok: false, mensaje: "Ya tienes a este jugador en tu plantilla." };

    const clausula = calcularClausula(jugador.valorMercado);

    if (equipo.saldo < clausula) {
      return {
        ok: false,
        mensaje: `Saldo insuficiente: necesitas ${clausula} M y tienes ${equipo.saldo} M.`,
      };
    }
    if (squad.length >= MAX_PLANTILLA) {
      return { ok: false, mensaje: "Tu plantilla ya está completa (10 jugadores)." };
    }

    setEquipo((prev) => ({ ...prev, saldo: prev.saldo - clausula }));
    setSquad((prev) => [
      ...prev,
      {
        jugador: {
          id: jugador.id,
          nombre: jugador.nombre,
          club: jugador.club,
          categoria: jugador.categoria,
          elo: jugador.elo,
          valorMercado: jugador.valorMercado,
          activo: jugador.activo,
        },
        puntosJornada: 0,
        valorMercadoDelta: 0,
        resultadosRecientes: [],
      },
    ]);
    setJugadoresLiga((prev) =>
      prev.map((j) =>
        j.id === jugadorId
          ? { ...j, propietario: equipo.nombreEquipo, esMiEquipo: true }
          : j
      )
    );
    setOfertas((prev) => prev.filter((o) => o.jugadorId !== jugadorId));

    return { ok: true };
  }

  function hacerOferta(jugadorId: string, importe: number): ResultadoAccion {
    const jugador = jugadoresLiga.find((j) => j.id === jugadorId);
    if (!jugador) return { ok: false, mensaje: "Jugador no encontrado." };
    if (jugador.esMiEquipo)
      return { ok: false, mensaje: "Ya tienes a este jugador en tu plantilla." };
    if (!Number.isFinite(importe) || importe <= 0)
      return { ok: false, mensaje: "Introduce un importe válido." };
    if (importe > equipo.saldo)
      return {
        ok: false,
        mensaje: `No puedes ofertar más de tu saldo disponible (${equipo.saldo} M).`,
      };

    setOfertas((prev) => [
      ...prev.filter((o) => o.jugadorId !== jugadorId),
      { jugadorId, importe },
    ]);

    return { ok: true };
  }

  return (
    <GameStateContext.Provider
      value={{
        equipo,
        squad,
        titulares,
        jugadoresLiga,
        ofertas,
        toggleTitular,
        venderJugador,
        pagarClausula,
        hacerOferta,
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
