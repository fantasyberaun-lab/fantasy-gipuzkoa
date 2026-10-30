import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export interface RecordSalon {
  equipo: string;
  manager: string;
  valor: number;
  jornada?: number;
}

export interface SalonFama {
  ok: boolean;
  lider: RecordSalon | null;
  mejorJornada: RecordSalon | null;
  reyDuelos: RecordSalon | null;
}

function aRecord(v: unknown): RecordSalon | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  return {
    equipo: String(r.equipo ?? ""),
    manager: String(r.manager ?? ""),
    valor: Number(r.valor ?? 0),
    jornada: r.jornada != null ? Number(r.jornada) : undefined,
  };
}

export async function fetchSalonFama(supabase: Supabase, leagueId: string): Promise<SalonFama> {
  const { data, error } = await supabase.rpc("salon_fama", { p_league_id: leagueId });
  const d = (data ?? {}) as Record<string, unknown>;
  if (error || !d.ok) {
    return { ok: false, lider: null, mejorJornada: null, reyDuelos: null };
  }
  return {
    ok: true,
    lider: aRecord(d.lider),
    mejorJornada: aRecord(d.mejor_jornada),
    reyDuelos: aRecord(d.rey_duelos),
  };
}
