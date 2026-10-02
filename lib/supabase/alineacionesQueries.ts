import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export interface JugadorSemana {
  id: string;
  nombre: string;
  categoria: number;
  capitan: boolean;
  resultado: "victoria" | "tablas" | "derrota" | null;
  descanso: boolean;
  base: number; // puntos del jugador sin multiplicar
  puntos: number; // puntos que suma al equipo (capitán x2)
  torneo: string | null; // torneo donde jugó ese fin de semana (null si no jugó)
  jornada: number | null; // ronda de ese torneo
}

export interface AlineacionSemana {
  clave: string;
  fecha: string; // sábado de la foto, formato AAAA-MM-DD
  puntos: number; // total del equipo ese fin de semana
  pendiente: boolean; // foto del sábado a la espera de que se cree la jornada
  jugadores: JugadorSemana[];
}

// Alineación de un equipo en cada fin de semana, con todos los torneos juntos
// (ver alineaciones_equipo_semanas en 0058). Lista vacía si no existe, no
// compartes liga o aún no hay ninguna foto.
export async function fetchAlineacionesSemanas(
  supabase: Supabase,
  equipoId: string
): Promise<AlineacionSemana[]> {
  const { data, error } = await supabase.rpc("alineaciones_equipo_semanas", {
    p_equipo_id: equipoId,
  });
  if (error || !data) return [];

  return (data as any[])
    .map((f) => ({
      clave: String(f.clave),
      fecha: String(f.fecha),
      puntos: Number(f.puntos_equipo ?? 0),
      pendiente: Boolean(f.pendiente),
      jugadores: ((f.jugadores ?? []) as any[]).map((j) => ({
        id: j.id as string,
        nombre: j.nombre as string,
        categoria: Number(j.categoria),
        capitan: Boolean(j.capitan),
        resultado: (j.resultado ?? null) as JugadorSemana["resultado"],
        descanso: Boolean(j.descanso),
        base: Number(j.base ?? 0),
        puntos: Number(j.puntos ?? 0),
        torneo: (j.torneo ?? null) as string | null,
        jornada: j.jornada == null ? null : Number(j.jornada),
      })),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.clave.localeCompare(b.clave));
}