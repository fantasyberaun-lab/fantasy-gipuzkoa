import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Racha diaria (ver 0075_racha_diaria.sql). Importes en M, como el saldo.
export interface EstadoRacha {
  racha: number; // racha viva (0 si se rompió)
  mejorRacha: number;
  reclamadaHoy: boolean;
  diasCofre: number; // cada cuántos días hay cofre (7)
  diasParaCofre: number; // reclamaciones que faltan para el próximo cofre
  recompensaDiaria: number;
}

export type ResultadoReclamar =
  | {
      ok: true;
      racha: number;
      importeDiario: number;
      importeCofre: number; // 0 si no tocaba cofre
      equipos: number;
      diasParaCofre: number;
    }
  | { ok: false; mensaje: string };

export async function fetchEstadoRacha(supabase: Supabase): Promise<EstadoRacha | null> {
  const { data, error } = await supabase.rpc("estado_racha");
  if (error || !data) return null;
  const d = data as Record<string, number | boolean>;
  return {
    racha: Number(d.racha),
    mejorRacha: Number(d.mejor_racha),
    reclamadaHoy: Boolean(d.reclamada_hoy),
    diasCofre: Number(d.dias_cofre),
    diasParaCofre: Number(d.dias_para_cofre),
    recompensaDiaria: Number(d.recompensa_diaria),
  };
}

export async function reclamarRecompensaDB(supabase: Supabase): Promise<ResultadoReclamar> {
  const { data, error } = await supabase.rpc("reclamar_recompensa_diaria");
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Record<string, unknown>;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido reclamar.") };
  return {
    ok: true,
    racha: Number(d.racha),
    importeDiario: Number(d.importe_diario),
    importeCofre: Number(d.importe_cofre),
    equipos: Number(d.equipos),
    diasParaCofre: Number(d.dias_para_cofre),
  };
}
