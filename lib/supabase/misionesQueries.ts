import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Misiones (ver 0103_misiones_v2.sql). Cada serie es una cadena de escalones: solo se
// ve el siguiente por reclamar. El catálogo (objetivos y XP) vive en la base de datos.
export type AmbitoMision = "pub" | "pri" | "gen" | "mj";
export type GrupoMision =
  | "partidas"
  | "clasificacion"
  | "economia"
  | "mercado"
  | "progresion"
  | "minijuegos";

// Aviso a otros componentes (tarjeta de misiones) de que ha cambiado el estado.
export const EVENTO_MISIONES = "fantasy:misiones";

export interface Mision {
  serie: string; // p. ej. "caz100_pub": familia + ámbito
  base: string; // familia sin ámbito, para los textos
  ambito: AmbitoMision;
  grupo: GrupoMision;
  sentido: "max" | "min"; // min: se cumple al bajar hasta el puesto (ranking)
  nivel: number; // escalón actual (1…niveles)
  niveles: number; // cuántos escalones tiene la serie
  objetivo: number;
  xp: number; // XP que da este escalón
  progreso: number | null; // null: todavía sin puesto (solo en sentido min)
  lista: boolean; // se puede reclamar ya
  terminada: boolean; // todos los escalones reclamados (nivel/objetivo/xp son los del último)
}

export interface EstadoMisiones {
  misiones: Mision[];
  pendientes: number; // misiones listas para reclamar
}

export type ResultadoReclamar =
  | { ok: true; serie: string; nivel: number; xp: number }
  | { ok: false; mensaje: string };

export async function fetchEstadoMisiones(supabase: Supabase): Promise<EstadoMisiones | null> {
  const { data, error } = await supabase.rpc("estado_misiones");
  if (error || !data) return null;
  const d = data as { misiones: Record<string, unknown>[]; pendientes: number };
  return {
    pendientes: Number(d.pendientes ?? 0),
    misiones: (d.misiones ?? []).map((m) => ({
      serie: String(m.serie),
      base: String(m.base),
      ambito: m.ambito as AmbitoMision,
      grupo: m.grupo as GrupoMision,
      sentido: m.sentido === "min" ? "min" : "max",
      nivel: Number(m.nivel),
      niveles: Number(m.niveles),
      objetivo: Number(m.objetivo),
      xp: Number(m.xp),
      progreso: m.progreso === null || m.progreso === undefined ? null : Number(m.progreso),
      lista: Boolean(m.lista),
      terminada: Boolean(m.terminada),
    })),
  };
}

// Guía de estreno (ver 0108_tutorial_misiones.sql). Ante un error se da por vista
// para no molestar con una guía que no se podría marcar.
export async function fetchTutorialMisionesVisto(supabase: Supabase): Promise<boolean> {
  const { data, error } = await supabase.rpc("tutorial_misiones_visto");
  if (error) return true;
  return data !== false;
}

export async function marcarTutorialMisionesDB(supabase: Supabase): Promise<void> {
  await supabase.rpc("marcar_tutorial_misiones");
}

export async function reclamarMisionDB(
  supabase: Supabase,
  serie: string
): Promise<ResultadoReclamar> {
  const { data, error } = await supabase.rpc("reclamar_mision", { p_serie: serie });
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Record<string, unknown>;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "") };
  return { ok: true, serie, nivel: Number(d.nivel), xp: Number(d.xp) };
}
