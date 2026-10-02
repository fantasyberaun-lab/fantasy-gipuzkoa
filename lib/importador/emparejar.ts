// Enlaza los jugadores que vienen de Chess-Results/Info64 con los de la
// tabla players de la app. Primero por ID FIDE (fiable); si no hay ID, por
// nombre, y solo cuando el nombre es único en la base.

import { sinTildes } from "./texto";
import type { JugadorOrigen } from "./tipos";

export interface JugadorBase {
  id: string;
  nombre: string;
  fideId: string | null;
}

export interface Indice {
  porFide: Map<string, JugadorBase>;
  // null = el nombre está repetido en la base (no se usa para enlazar)
  porNombre: Map<string, JugadorBase | null>;
}

// "Muñoz Ferreira, Ibon" y "IBON MUNOZ FERREIRA" dan la misma clave.
export function claveNombre(nombre: string): string {
  return sinTildes(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

const soloDigitos = (t: string | null | undefined) =>
  (t ?? "").replace(/\D/g, "").replace(/^0+/, "");

export function crearIndice(jugadores: JugadorBase[]): Indice {
  const porFide = new Map<string, JugadorBase>();
  const porNombre = new Map<string, JugadorBase | null>();
  for (const j of jugadores) {
    const fide = soloDigitos(j.fideId);
    if (fide) porFide.set(fide, j);
    const clave = claveNombre(j.nombre);
    porNombre.set(clave, porNombre.has(clave) ? null : j);
  }
  return { porFide, porNombre };
}

export type Enlace = { id: string; por: "fide" | "nombre" };

export function buscarJugador(
  indice: Indice,
  origen: Pick<JugadorOrigen, "fideId" | "nombre">
): Enlace | null {
  const fide = soloDigitos(origen.fideId);
  if (fide) {
    const j = indice.porFide.get(fide);
    if (j) return { id: j.id, por: "fide" };
  }
  const j = indice.porNombre.get(claveNombre(origen.nombre));
  return j ? { id: j.id, por: "nombre" } : null;
}
