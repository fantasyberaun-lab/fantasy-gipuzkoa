import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Resumen semanal (ver 0117): se enseña una vez, al volver tras cerrarse la jornada.
export interface ResumenSemanal {
  semana: string;
  equipo: string;
  liga: string | null;
  puntos: number;
  posicion: number | null;
  variacion: number | null; // puestos ganados (+) o perdidos (-)
}

export async function fetchResumenPendiente(supabase: Supabase): Promise<ResumenSemanal | null> {
  const { data, error } = await supabase.rpc("resumen_pendiente");
  const d = (data ?? {}) as Record<string, unknown>;
  if (error || !d.hay) return null;
  return {
    semana: String(d.semana),
    equipo: String(d.equipo ?? ""),
    liga: d.liga != null ? String(d.liga) : null,
    puntos: Number(d.puntos ?? 0),
    posicion: d.posicion != null ? Number(d.posicion) : null,
    variacion: d.variacion != null ? Number(d.variacion) : null,
  };
}

export async function marcarResumenVisto(supabase: Supabase, semana: string): Promise<void> {
  await supabase.rpc("marcar_resumen_visto", { p_semana: semana });
}
