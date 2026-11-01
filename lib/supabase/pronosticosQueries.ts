import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export type Pronostico = "blancas" | "tablas" | "negras";

// Pronósticos de partidas (ver 0118). Sin recompensas; datos privados.
export interface TorneoPronostico {
  tournamentId: string;
  torneo: string;
  jornada: number;
  fechaInicio: string | null;
  abierta: boolean;
  mesas: number;
  misPronosticos: number;
}

export interface MesaPronostico {
  pairingId: string;
  tablero: number | null;
  blancoNombre: string;
  blancoElo: number | null;
  negroNombre: string;
  negroElo: number | null;
  miPronostico: Pronostico | null;
  resultado: Pronostico | null; // null si la mesa aún no tiene resultado
  acertada: boolean | null;
  abierta: boolean;
}

export interface ResumenPronosticos {
  total: number;
  resueltos: number;
  aciertos: number;
}

export async function fetchTorneosPronostico(supabase: Supabase): Promise<TorneoPronostico[]> {
  const { data, error } = await supabase.rpc("pronosticos_torneos");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    tournamentId: String(r.tournament_id),
    torneo: String(r.torneo),
    jornada: Number(r.jornada),
    fechaInicio: r.fecha_inicio != null ? String(r.fecha_inicio) : null,
    abierta: Boolean(r.abierta),
    mesas: Number(r.mesas ?? 0),
    misPronosticos: Number(r.mis_pronosticos ?? 0),
  }));
}

export async function fetchMesasPronostico(
  supabase: Supabase,
  tournamentId: string
): Promise<MesaPronostico[]> {
  const { data, error } = await supabase.rpc("pronosticos_mesas", {
    p_tournament_id: tournamentId,
  });
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
    abierta: Boolean(r.abierta),
  }));
}

// pronostico = null quita el pronóstico de esa mesa.
export async function guardarPronostico(
  supabase: Supabase,
  pairingId: string,
  pronostico: Pronostico | null
): Promise<{ ok: boolean; mensaje?: string }> {
  const { data, error } = await supabase.rpc("guardar_pronostico", {
    p_pairing_id: pairingId,
    p_pronostico: pronostico,
  });
  if (error) return { ok: false, mensaje: error.message };
  const d = (data ?? {}) as Record<string, unknown>;
  return { ok: Boolean(d.ok), mensaje: d.mensaje ? String(d.mensaje) : undefined };
}

export async function fetchResumenPronosticos(supabase: Supabase): Promise<ResumenPronosticos> {
  const { data } = await supabase.rpc("mis_pronosticos_resumen");
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    total: Number(d.total ?? 0),
    resueltos: Number(d.resueltos ?? 0),
    aciertos: Number(d.aciertos ?? 0),
  };
}
