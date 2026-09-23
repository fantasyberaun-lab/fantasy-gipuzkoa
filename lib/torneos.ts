// Tipos y utilidades de torneos compartidas entre el panel de admin y las
// pantallas de los managers. Ver 0019_torneos.sql y 0020_*.sql.
//
// Todos los textos son libres y opcionales (salvo el nombre): nada valida
// el formato porque solo los administradores crean torneos.

import type { Categoria } from "@/lib/types";

export interface DatosTorneo {
  // General
  nombre: string;
  categoria: Categoria | null;
  observaciones: string | null;
  // Organización
  organizador: string | null;
  federacion: string | null;
  director: string | null;
  arbitroPrincipal: string | null;
  arbitrosAdjuntos: string | null;
  // Lugar de juego
  lugar: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  // Calendario
  fechaInicio: string | null; // YYYY-MM-DD
  fechaFin: string | null;
  numeroRondas: number | null;
  // Sistema de juego
  sistema: string | null;
  ritmoJuego: string | null;
  computoElo: string | null;
  desempates: string | null;
  // Enlaces y contacto
  webUrl: string | null;
  emailContacto: string | null;
}

export interface Torneo extends DatosTorneo {
  id: string;
  rondasCreadas: number; // jornadas ya creadas en este torneo
  participantes: number; // jugadores inscritos
}

export type EstadoTorneo = "En curso" | "Próximo" | "Finalizado";

// El estado se deduce de las fechas (no se guarda), así nunca queda
// desfasado. Sin fechas no se puede saber y devuelve null.
export function estadoTorneo(
  t: Pick<DatosTorneo, "fechaInicio" | "fechaFin">
): EstadoTorneo | null {
  const hoy = new Date().toISOString().slice(0, 10);
  if (t.fechaInicio && hoy < t.fechaInicio) return "Próximo";
  if (t.fechaFin && hoy > t.fechaFin) return "Finalizado";
  if (t.fechaInicio || t.fechaFin) return "En curso";
  return null;
}

const ORDEN_ESTADO: Record<string, number> = {
  "En curso": 0,
  Próximo: 1,
  sin: 2,
  Finalizado: 3,
};

// En curso primero, luego próximos, luego los que no tienen fechas y por
// último los finalizados; dentro de cada grupo, el más reciente antes.
export function ordenarTorneos<T extends Torneo>(torneos: T[]): T[] {
  return [...torneos].sort((a, b) => {
    const ea = ORDEN_ESTADO[estadoTorneo(a) ?? "sin"];
    const eb = ORDEN_ESTADO[estadoTorneo(b) ?? "sin"];
    if (ea !== eb) return ea - eb;
    const fa = a.fechaInicio ?? "";
    const fb = b.fechaInicio ?? "";
    if (fa !== fb) return fb.localeCompare(fa);
    return a.nombre.localeCompare(b.nombre);
  });
}

export function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function rangoFechas(
  t: Pick<DatosTorneo, "fechaInicio" | "fechaFin">
): string | null {
  const inicio = formatearFecha(t.fechaInicio);
  const fin = formatearFecha(t.fechaFin);
  if (inicio && fin) return inicio === fin ? inicio : `${inicio} – ${fin}`;
  return inicio ?? fin;
}
