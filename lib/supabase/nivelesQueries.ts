import type { createClient } from "@/lib/supabase/client";
import { nivelDeXp } from "@/lib/niveles";

type Supabase = ReturnType<typeof createClient>;

// Nivel y experiencia del usuario (ver 0086_niveles.sql).
export interface EstadoNivel {
  xp: number; // XP total acumulada
  nivel: number;
  xpNivelActual: number; // XP total a la que empezó este nivel
  xpNivelSiguiente: number; // XP total a la que se alcanza el siguiente
  tutorialVisto: boolean; // ya ha visto la guía de niveles (se enseña una sola vez)
}

export async function fetchEstadoNivel(supabase: Supabase): Promise<EstadoNivel | null> {
  const { data, error } = await supabase.rpc("estado_nivel");
  if (error || !data) return null;
  const d = data as Record<string, number | boolean>;
  return {
    tutorialVisto: d.tutorial_visto !== false,
    xp: Number(d.xp),
    nivel: Number(d.nivel),
    xpNivelActual: Number(d.xp_nivel_actual),
    xpNivelSiguiente: Number(d.xp_nivel_siguiente),
  };
}

// Marca la guía de niveles como vista (no se vuelve a enseñar).
export async function marcarTutorialNivelesDB(supabase: Supabase): Promise<void> {
  await supabase.rpc("marcar_tutorial_niveles");
}

// Nivel e icono de otros managers de tu liga (ver 0088_niveles_publicos.sql). El
// nivel se calcula aquí con la misma curva que la base de datos.
export interface NivelPublico {
  xp: number;
  nivel: number;
  avatar: string | null;
}

function aNivelPublico(f: { xp: number; avatar: string | null }): NivelPublico {
  return { xp: Number(f.xp), nivel: nivelDeXp(Number(f.xp)), avatar: f.avatar ?? null };
}

// Por id de equipo, de todos los equipos de la liga.
export async function fetchNivelesLiga(
  supabase: Supabase,
  ligaId: string
): Promise<Record<string, NivelPublico>> {
  const { data, error } = await supabase.rpc("niveles_de_liga", { p_liga: ligaId });
  if (error || !data) return {};
  const salida: Record<string, NivelPublico> = {};
  for (const f of data as { equipo_id: string; xp: number; avatar: string | null }[]) {
    salida[f.equipo_id] = aNivelPublico(f);
  }
  return salida;
}

export async function fetchNivelEquipo(
  supabase: Supabase,
  equipoId: string
): Promise<NivelPublico | null> {
  const { data, error } = await supabase.rpc("nivel_equipo", { p_equipo: equipoId });
  const fila = (data as { xp: number; avatar: string | null }[] | null)?.[0];
  if (error || !fila) return null;
  return aNivelPublico(fila);
}
