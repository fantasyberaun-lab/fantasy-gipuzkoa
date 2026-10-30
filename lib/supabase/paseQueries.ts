import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export type TipoEscalon = "saldo" | "xp" | "proteccion" | "insignia";

export interface EscalonPase {
  nivel: number;
  umbral: number;
  tipo: TipoEscalon;
  cantidad: number;
  etiqueta: string;
  alcanzado: boolean;
  reclamado: boolean;
}

export interface EstadoPase {
  hay: boolean;
  temporada?: string;
  puntos?: number;
  escalones: EscalonPase[];
}

export async function fetchEstadoPase(supabase: Supabase): Promise<EstadoPase> {
  const { data, error } = await supabase.rpc("estado_pase");
  if (error || !data) return { hay: false, escalones: [] };
  const d = data as Record<string, unknown>;
  if (!d.hay) return { hay: false, escalones: [] };
  const escalones = Array.isArray(d.escalones)
    ? (d.escalones as Record<string, unknown>[]).map((e) => ({
        nivel: Number(e.nivel),
        umbral: Number(e.umbral),
        tipo: e.tipo as TipoEscalon,
        cantidad: Number(e.cantidad ?? 0),
        etiqueta: String(e.etiqueta ?? ""),
        alcanzado: Boolean(e.alcanzado),
        reclamado: Boolean(e.reclamado),
      }))
    : [];
  return {
    hay: true,
    temporada: typeof d.temporada === "string" ? d.temporada : undefined,
    puntos: Number(d.puntos ?? 0),
    escalones,
  };
}

export async function reclamarEscalonPase(
  supabase: Supabase,
  nivel: number
): Promise<{ ok: boolean; mensaje?: string; etiqueta?: string }> {
  const { data, error } = await supabase.rpc("reclamar_escalon_pase", { p_nivel: nivel });
  if (error) return { ok: false, mensaje: error.message };
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(d.ok),
    mensaje: d.mensaje ? String(d.mensaje) : undefined,
    etiqueta: d.etiqueta ? String(d.etiqueta) : undefined,
  };
}
