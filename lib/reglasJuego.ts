// Reglas del juego que el panel de admin puede cambiar (variables, 0092-0096) y
// que el cliente necesita para enseñar importes y textos. La base de datos es la
// que las aplica; aquí solo se guarda lo que devuelve reglas_liga() para la liga
// activa. Si algo falla o aún no ha llegado, valen los de siempre (gameConfig).
//
// Es un almacén de módulo (no un contexto) porque lo leen tanto componentes como
// funciones de consulta (lib/supabase/queries.ts).

import { useSyncExternalStore } from "react";
import { gameConfig } from "@/lib/gameConfig";
import { HORAS_TANDA_MADRID } from "@/lib/mercadoCountdown";

export interface ReglasJuego {
  maxTitulares: number;
  maxTitularesPorTorneo: number;
  maxPlantilla: number;
  clausulaPorcentaje: number;
  multiplicadorSubida: number;
  blindajePorcentaje: number;
  capitanMultiplicador: number;
  // Horas (Madrid) a las que se resuelve el mercado de la liga (0099).
  horasMercado: number[];
}

export const REGLAS_JUEGO_POR_DEFECTO: ReglasJuego = {
  maxTitulares: gameConfig.plantilla.maximoTitulares,
  maxTitularesPorTorneo: gameConfig.plantilla.maximoTitularesPorTorneo,
  maxPlantilla: gameConfig.plantilla.tamanoPlantilla,
  clausulaPorcentaje: gameConfig.clausula.porcentaje,
  multiplicadorSubida: gameConfig.subidaClausula.multiplicador,
  blindajePorcentaje: gameConfig.blindaje.porcentaje,
  capitanMultiplicador: gameConfig.capitan.multiplicador,
  horasMercado: HORAS_TANDA_MADRID,
};

let actuales: ReglasJuego = REGLAS_JUEGO_POR_DEFECTO;
let pendiente: Promise<unknown> = Promise.resolve();
const oyentes = new Set<() => void>();

export function reglasJuegoActuales(): ReglasJuego {
  return actuales;
}

export function fijarReglasJuego(nuevas: ReglasJuego | null) {
  actuales = nuevas ?? REGLAS_JUEGO_POR_DEFECTO;
  oyentes.forEach((o) => o());
}

// Anota la carga en curso para que las consultas que dependen de las reglas (la
// cláusula de tu plantilla) puedan esperarla sin añadir una petición más.
export function registrarCargaReglas(carga: Promise<unknown>) {
  pendiente = carga.catch(() => undefined);
}

export function esperarReglasJuego(): Promise<unknown> {
  return pendiente;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function useReglasJuego(): ReglasJuego {
  return useSyncExternalStore(suscribir, reglasJuegoActuales, reglasJuegoActuales);
}
