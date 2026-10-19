// Reglas de titulares en el cliente. Son las mismas que aplica la base de datos
// (validar_max_titulares y validar_titulares_por_torneo, que leen la variable de la liga desde 0094): aquí
// sirven para bloquear el botón y avisar sin esperar a la base de datos, pero
// la garantía real está en los triggers.

import { gameConfig } from "@/lib/gameConfig";
import type { PlantillaSlot } from "@/lib/types";
import { TEXTOS, type Textos } from "@/lib/i18n/textos";

// Límites de titulares de una liga. Por defecto los del reglamento; la liga puede
// tener otros (panel Variables, 0092-0094) y GameStateProvider los trae de la base
// de datos con reglas_liga().
export interface ReglasTitulares {
  maxTitulares: number;
  maxTitularesPorTorneo: number;
}

export const REGLAS_TITULARES_POR_DEFECTO: ReglasTitulares = {
  maxTitulares: gameConfig.plantilla.maximoTitulares,
  maxTitularesPorTorneo: gameConfig.plantilla.maximoTitularesPorTorneo,
};

// Titulares que tienes en cada torneo (un jugador que juega varios torneos
// cuenta en cada uno).
export function titularesPorTorneo(
  squad: PlantillaSlot[],
  titulares: Record<string, boolean>
): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const slot of squad) {
    if (!titulares[slot.jugador.id]) continue;
    for (const t of slot.torneos ?? []) {
      cuenta.set(t.id, (cuenta.get(t.id) ?? 0) + 1);
    }
  }
  return cuenta;
}

// Motivo por el que NO se puede poner de titular a este jugador, o null si se
// puede. Pasar a suplente nunca está bloqueado. `textos` es la sección
// plantilla del idioma actual (por defecto, castellano).
export function motivoBloqueoTitular(
  squad: PlantillaSlot[],
  titulares: Record<string, boolean>,
  jugadorId: string,
  textos: Textos["plantilla"] = TEXTOS.es.plantilla,
  reglas: ReglasTitulares = REGLAS_TITULARES_POR_DEFECTO
): string | null {
  if (titulares[jugadorId]) return null;
  const MAX_TITULARES = reglas.maxTitulares;
  const MAX_POR_TORNEO = reglas.maxTitularesPorTorneo;

  const total = squad.filter((s) => titulares[s.jugador.id]).length;
  if (total >= MAX_TITULARES) {
    return textos.bloqueoMaxTitulares(MAX_TITULARES);
  }

  const slot = squad.find((s) => s.jugador.id === jugadorId);
  if (!slot) return null;

  const porTorneo = titularesPorTorneo(squad, titulares);
  const llenos = (slot.torneos ?? [])
    .filter((t) => (porTorneo.get(t.id) ?? 0) >= MAX_POR_TORNEO)
    .map((t) => t.nombre);

  if (llenos.length > 0) {
    return textos.bloqueoMaxPorTorneo(MAX_POR_TORNEO, llenos.join(", "));
  }
  return null;
}
