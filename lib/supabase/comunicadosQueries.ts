import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comunicado, EtiquetaComunicado } from "@/lib/types";

type Supabase = SupabaseClient;

const COLUMNAS = "id, titulo, cuerpo, etiqueta, fijado, created_at, caduca_en";

function mapear(c: any): Comunicado {
  return {
    id: c.id,
    titulo: c.titulo,
    cuerpo: c.cuerpo,
    etiqueta: c.etiqueta,
    fijado: c.fijado,
    creado: c.created_at,
    caduca: c.caduca_en ?? null,
  };
}

// Comunicados vigentes (la RLS ya oculta los caducados a los no-admin; el
// filtro explícito es para que el admin tampoco los vea en la app normal).
export async function fetchComunicados(supabase: Supabase): Promise<Comunicado[]> {
  const { data, error } = await supabase
    .from("comunicados")
    .select(COLUMNAS)
    .or(`caduca_en.is.null,caduca_en.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !data) return [];
  return (data as any[]).map(mapear);
}

// Panel de admin: todos, también los caducados.
export async function fetchTodosComunicados(supabase: Supabase): Promise<Comunicado[]> {
  const { data, error } = await supabase
    .from("comunicados")
    .select(COLUMNAS)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map(mapear);
}

export interface DatosComunicado {
  titulo: string;
  cuerpo: string;
  etiqueta: EtiquetaComunicado;
  fijado: boolean;
  caduca: string | null;
}

type Resultado = { ok: true } | { ok: false; mensaje: string };

export async function crearComunicadoDB(
  supabase: Supabase,
  d: DatosComunicado
): Promise<Resultado> {
  const { error } = await supabase.from("comunicados").insert({
    titulo: d.titulo,
    cuerpo: d.cuerpo,
    etiqueta: d.etiqueta,
    fijado: d.fijado,
    caduca_en: d.caduca,
  });
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

export async function actualizarComunicadoDB(
  supabase: Supabase,
  id: string,
  d: DatosComunicado
): Promise<Resultado> {
  const { error } = await supabase
    .from("comunicados")
    .update({
      titulo: d.titulo,
      cuerpo: d.cuerpo,
      etiqueta: d.etiqueta,
      fijado: d.fijado,
      caduca_en: d.caduca,
    })
    .eq("id", id);
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

export async function borrarComunicadoDB(supabase: Supabase, id: string): Promise<Resultado> {
  const { error } = await supabase.from("comunicados").delete().eq("id", id);
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}
