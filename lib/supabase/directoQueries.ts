import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Jornada en directo (ver 0117): puntos por equipo de la última jornada,
// que suben a medida que el admin mete los resultados.
export interface FilaDirecto {
  equipoId: string;
  nombreEquipo: string;
  nombreManager: string;
  puntos: number;
}

export interface JornadaDirecto {
  jornada: number | null;
  semana: string | null;
  terminada: boolean;
  filas: FilaDirecto[];
}

export async function fetchJornadaEnDirecto(
  supabase: Supabase,
  leagueId: string
): Promise<JornadaDirecto> {
  const { data, error } = await supabase.rpc("jornada_en_directo", {
    p_league_id: leagueId,
  });
  if (error || !data) {
    return { jornada: null, semana: null, terminada: false, filas: [] };
  }
  const filas: FilaDirecto[] = (data as Record<string, unknown>[]).map((r) => ({
    equipoId: String(r.equipo_id),
    nombreEquipo: String(r.nombre_equipo),
    nombreManager: String(r.nombre_manager ?? ""),
    puntos: Number(r.puntos ?? 0),
  }));
  const primera = (data as Record<string, unknown>[])[0];
  return {
    jornada: primera?.jornada != null ? Number(primera.jornada) : null,
    semana: primera?.semana != null ? String(primera.semana) : null,
    terminada: Boolean(primera?.terminada),
    filas,
  };
}
