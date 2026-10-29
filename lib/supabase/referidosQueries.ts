import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Invita a un amigo (ver 0121).
export async function fetchMiCodigo(supabase: Supabase): Promise<string | null> {
  const { data, error } = await supabase.rpc("mi_codigo_referido");
  if (error || !data) return null;
  return String(data);
}

export async function fetchMisReferidosTotal(supabase: Supabase): Promise<number> {
  const { data, error } = await supabase.rpc("mis_referidos_total");
  if (error || data == null) return 0;
  return Number(data);
}

export async function canjearReferido(
  supabase: Supabase,
  codigo: string
): Promise<{ ok: boolean; mensaje?: string; recompensa?: number }> {
  const { data, error } = await supabase.rpc("canjear_referido", { p_codigo: codigo });
  if (error) return { ok: false, mensaje: error.message };
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(d.ok),
    mensaje: d.mensaje ? String(d.mensaje) : undefined,
    recompensa: d.recompensa != null ? Number(d.recompensa) : undefined,
  };
}
