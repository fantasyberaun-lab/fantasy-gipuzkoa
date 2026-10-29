import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export type Pronostico = "blancas" | "tablas" | "negras";

// Quiniela de emparejamientos (ver 0119).
export interface MesaQuiniela {
  pairingId: string;
  tablero: number | null;
  blancoNombre: string;
  blancoElo: number | null;
  negroNombre: string;
  negroElo: number | null;
  miPronostico: Pronostico | null;
  resultado: Pronostico | null; // null si la mesa aún no tiene resultado
  acertada: boolean | null;
  jornada: number | null;
  torneo: string | null;
}

export async function fetchQuinielaActual(supabase: Supabase): Promise<MesaQuiniela[]> {
  const { data, error } = await supabase.rpc("quiniela_actual");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    pairingId: String(r.pairing_id),
    tablero: r.tablero != null ? Number(r.tablero) : null,
    blancoNombre: String(r.blanco_nombre),
    blancoElo: r.blanco_elo != null ? Number(r.blanco_elo) : null,
    negroNombre: String(r.negro_nombre),
    negroElo: r.negro_elo != null ? Number(r.negro_elo) : null,
    miPronostico: (r.mi_pronostico as Pronostico) ?? null,
    resultado: (r.resultado as Pronostico) ?? null,
    acertada: r.acertada == null ? null : Boolean(r.acertada),
    jornada: r.jornada != null ? Number(r.jornada) : null,
    torneo: r.torneo != null ? String(r.torneo) : null,
  }));
}

export async function guardarPrediccion(
  supabase: Supabase,
  pairingId: string,
  pronostico: Pronostico
): Promise<{ ok: boolean; mensaje?: string }> {
  const { data, error } = await supabase.rpc("guardar_prediccion", {
    p_pairing_id: pairingId,
    p_pronostico: pronostico,
  });
  if (error) return { ok: false, mensaje: error.message };
  const d = (data ?? {}) as Record<string, unknown>;
  return { ok: Boolean(d.ok), mensaje: d.mensaje ? String(d.mensaje) : undefined };
}
