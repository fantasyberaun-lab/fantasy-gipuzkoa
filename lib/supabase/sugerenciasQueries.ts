import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Buzón de sugerencias (ver 0076_sugerencias.sql).
export type TipoSugerencia = "sugerencia" | "error" | "otro";
export const TIPOS_SUGERENCIA: TipoSugerencia[] = ["sugerencia", "error", "otro"];
export const MAX_SUGERENCIA = 2000;
export const MAX_RESPUESTA = 1000;

export interface Sugerencia {
  id: string;
  tipo: TipoSugerencia;
  texto: string;
  creada: string; // ISO
  leidaEn: string | null; // ISO; null = pendiente
  respuesta: string | null;
  avisoVisto: boolean;
}

export interface SugerenciaAdmin extends Omit<Sugerencia, "avisoVisto"> {
  userId: string;
  nombre: string | null;
}

// Códigos que devuelve enviar_sugerencia; la app los traduce.
export type CodigoErrorSugerencia = "sesion" | "vacia" | "larga" | "tipo" | "limite" | "red";

type Resultado = { ok: true } | { ok: false; mensaje: string };

// Las del usuario actual. Se filtra por user_id aunque la RLS ya lo haga,
// porque un root las vería todas.
export async function fetchMisSugerencias(supabase: Supabase): Promise<Sugerencia[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("sugerencias")
    .select("id, tipo, texto, created_at, leida_en, respuesta, aviso_visto")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((s) => ({
    id: s.id as string,
    tipo: s.tipo as TipoSugerencia,
    texto: s.texto as string,
    creada: s.created_at as string,
    leidaEn: (s.leida_en as string | null) ?? null,
    respuesta: (s.respuesta as string | null) ?? null,
    avisoVisto: Boolean(s.aviso_visto),
  }));
}

export async function enviarSugerenciaDB(
  supabase: Supabase,
  tipo: TipoSugerencia,
  texto: string
): Promise<{ ok: true } | { ok: false; codigo: CodigoErrorSugerencia }> {
  const { data, error } = await supabase.rpc("enviar_sugerencia", {
    p_tipo: tipo,
    p_texto: texto,
  });
  if (error || !data) return { ok: false, codigo: "red" };
  const d = data as { ok: boolean; codigo?: CodigoErrorSugerencia };
  return d.ok ? { ok: true } : { ok: false, codigo: d.codigo ?? "red" };
}

export async function marcarAvisosSugerenciasVistosDB(supabase: Supabase): Promise<void> {
  await supabase.rpc("marcar_avisos_sugerencias_vistos");
}

// --- Panel de admin -------------------------------------------------------------

export async function fetchSugerenciasAdmin(
  supabase: Supabase
): Promise<{ ok: true; lista: SugerenciaAdmin[] } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("admin_sugerencias");
  if (error || !data) {
    return { ok: false, mensaje: error?.message ?? "No se pudieron cargar las sugerencias." };
  }
  const filas = data as Record<string, unknown>[];
  return {
    ok: true,
    lista: filas.map((s) => ({
      id: s.id as string,
      userId: s.user_id as string,
      nombre: (s.nombre as string | null) ?? null,
      tipo: s.tipo as TipoSugerencia,
      texto: s.texto as string,
      creada: s.created_at as string,
      leidaEn: (s.leida_en as string | null) ?? null,
      respuesta: (s.respuesta as string | null) ?? null,
    })),
  };
}

export async function contarSugerenciasPendientes(supabase: Supabase): Promise<number> {
  const { count, error } = await supabase
    .from("sugerencias")
    .select("id", { count: "exact", head: true })
    .is("leida_en", null);
  return error ? 0 : count ?? 0;
}

export async function marcarSugerenciaLeidaDB(
  supabase: Supabase,
  id: string,
  leida: boolean,
  respuesta: string | null = null
): Promise<Resultado> {
  const { error } = await supabase.rpc("marcar_sugerencia_leida", {
    p_id: id,
    p_leida: leida,
    p_respuesta: respuesta,
  });
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

export async function borrarSugerenciaDB(supabase: Supabase, id: string): Promise<Resultado> {
  const { error } = await supabase.from("sugerencias").delete().eq("id", id);
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}
