// Reglas de titulares en el cliente. Son las mismas que aplica la base de datos
// (validar_max_titulares en 0050 y validar_titulares_por_torneo en 0048): aquí
// sirven para bloquear el botón y avisar sin esperar a la base de datos, pero
// la garantía real está en los triggers.

import { gameConfig } from "@/lib/gameConfig";
import type { PlantillaSlot } from "@/lib/types";

const MAX_TITULARES = gameConfig.plantilla.maximoTitulares;
const MAX_POR_TORNEO = gameConfig.plantilla.maximoTitularesPorTorneo;

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
// puede. Pasar a suplente nunca está bloqueado.
export function motivoBloqueoTitular(
  squad: PlantillaSlot[],
  titulares: Record<string, boolean>,
  jugadorId: string
): string | null {
  if (titulares[jugadorId]) return null;

  const total = squad.filter((s) => titulares[s.jugador.id]).length;
  if (total >= MAX_TITULARES) {
    return `Ya tienes ${MAX_TITULARES} titulares — pasa a suplente a otro primero.`;
  }

  const slot = squad.find((s) => s.jugador.id === jugadorId);
  if (!slot) return null;

  const porTorneo = titularesPorTorneo(squad, titulares);
  const llenos = (slot.torneos ?? [])
    .filter((t) => (porTorneo.get(t.id) ?? 0) >= MAX_POR_TORNEO)
    .map((t) => t.nombre);

  if (llenos.length > 0) {
    return `Ya tienes ${MAX_POR_TORNEO} titulares en ${llenos.join(", ")} — pasa a suplente a otro primero.`;
  }
  return null;
}
