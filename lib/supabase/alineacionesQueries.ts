import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export interface JugadorAlineacion {
  id: string;
  nombre: string;
  categoria: number;
  capitan: boolean;
  resultado: "victoria" | "tablas" | "derrota" | null;
  descanso: boolean;
  base: number; // puntos del jugador sin multiplicar
  puntos: number; // puntos que suma al equipo (capitán x2)
}

export interface AlineacionJornada {
  jornadaId: string | null;
  jornada: number | null;
  torneo: string | null;
  creada: string;
  puntos: number;
  pendiente: boolean; // foto del sábado a la espera de que se cree la jornada
  jugadores: JugadorAlineacion[];
}

// Alineación de un equipo en cada jornada (ver alineaciones_equipo en 0051).
// Lista vacía si no existe, no compartes liga o aún no hay ninguna foto.
export async function fetchAlineacionesEquipo(
  supabase: Supabase,
  equipoId: string
): Promise<AlineacionJornada[]> {
  const { data, error } = await supabase.rpc("alineaciones_equipo", {
    p_equipo_id: equipoId,
  });
  if (error || !data) return [];

  return (data as any[])
    .map((f) => ({
      jornadaId: (f.jornada_id ?? null) as string | null,
      jornada: f.jornada == null ? null : Number(f.jornada),
      torneo: (f.torneo ?? null) as string | null,
      creada: f.creada as string,
      puntos: Number(f.puntos_equipo ?? 0),
      pendiente: Boolean(f.pendiente),
      jugadores: ((f.jugadores ?? []) as any[]).map((j) => ({
        id: j.id as string,
        nombre: j.nombre as string,
        categoria: Number(j.categoria),
        capitan: Boolean(j.capitan),
        resultado: (j.resultado ?? null) as JugadorAlineacion["resultado"],
        descanso: Boolean(j.descanso),
        base: Number(j.base ?? 0),
        puntos: Number(j.puntos ?? 0),
      })),
    }))
    .sort((a, b) => a.creada.localeCompare(b.creada));
}