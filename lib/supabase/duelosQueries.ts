import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Duelos cara a cara (ver 0118). Todo se deriva en el momento.
export interface Duelo {
  equipoA: string;
  nombreA: string;
  managerA: string;
  puntosA: number;
  equipoB: string;
  nombreB: string;
  managerB: string;
  puntosB: number;
}

export interface DuelosJornada {
  jornada: number | null;
  semana: string | null;
  terminada: boolean;
  duelos: Duelo[];
}

export interface FilaClasifDuelos {
  equipoId: string;
  nombreEquipo: string;
  nombreManager: string;
  ganados: number;
  empatados: number;
  perdidos: number;
  puntosLiguilla: number;
}

export async function fetchDuelosJornada(
  supabase: Supabase,
  leagueId: string
): Promise<DuelosJornada> {
  const { data, error } = await supabase.rpc("duelos_jornada", {
    p_league_id: leagueId,
  });
  if (error || !data) {
    return { jornada: null, semana: null, terminada: false, duelos: [] };
  }
  const filas = data as Record<string, unknown>[];
  const duelos: Duelo[] = filas.map((r) => ({
    equipoA: String(r.equipo_a),
    nombreA: String(r.nombre_a),
    managerA: String(r.manager_a ?? ""),
    puntosA: Number(r.puntos_a ?? 0),
    equipoB: String(r.equipo_b),
    nombreB: String(r.nombre_b),
    managerB: String(r.manager_b ?? ""),
    puntosB: Number(r.puntos_b ?? 0),
  }));
  const primera = filas[0];
  return {
    jornada: primera?.jornada != null ? Number(primera.jornada) : null,
    semana: primera?.semana != null ? String(primera.semana) : null,
    terminada: Boolean(primera?.terminada),
    duelos,
  };
}

export async function fetchClasificacionDuelos(
  supabase: Supabase,
  leagueId: string
): Promise<FilaClasifDuelos[]> {
  const { data, error } = await supabase.rpc("clasificacion_duelos", {
    p_league_id: leagueId,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    equipoId: String(r.equipo_id),
    nombreEquipo: String(r.nombre_equipo),
    nombreManager: String(r.nombre_manager ?? ""),
    ganados: Number(r.ganados ?? 0),
    empatados: Number(r.empatados ?? 0),
    perdidos: Number(r.perdidos ?? 0),
    puntosLiguilla: Number(r.puntos_liguilla ?? 0),
  }));
}
