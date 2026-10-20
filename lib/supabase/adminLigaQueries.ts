// Panel del administrador de una liga privada (0099): sanciones, advertencias,
// expulsiones y cuántas veces al día se resuelve el mercado. Todo lo comprueba y
// lo aplica la base de datos (admin_liga_*); aquí solo se llama y se traduce.
import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export type Resultado = { ok: true } | { ok: false; mensaje: string };

export type TipoSancion = "puntos" | "millones" | "advertencia";

export interface SancionLiga {
  id: string;
  equipoId: string;
  nombreEquipo: string;
  tipo: TipoSancion;
  cantidad: number | null;
  motivo: string;
  creada: string;
}

export interface ExpulsadoLiga {
  userId: string;
  nombreManager: string;
  nombreEquipo: string;
  motivo: string;
  creado: string;
}

export interface PanelAdminLiga {
  tandas: number;
  sanciones: SancionLiga[];
  expulsados: ExpulsadoLiga[];
}

function resultadoRpc(data: unknown, error: { message: string } | null): Resultado {
  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok?: boolean; mensaje?: string } | null;
  if (r?.ok) return { ok: true };
  return { ok: false, mensaje: r?.mensaje ?? "No se ha podido hacer." };
}

// null si no eres el administrador (o la migración 0099 no está aplicada).
export async function fetchPanelAdminLiga(
  supabase: Supabase,
  ligaId: string
): Promise<PanelAdminLiga | null> {
  const { data, error } = await supabase.rpc("admin_liga_panel", { p_league_id: ligaId });
  if (error || !data) return null;
  // Viene como jsonb ya construido por la base de datos (ver 0099).
  const d = data as {
    tandas?: number;
    sanciones?: Record<string, unknown>[];
    expulsados?: Record<string, unknown>[];
  };
  return {
    tandas: Number(d.tandas ?? 3),
    sanciones: (d.sanciones ?? []).map((s) => ({
      id: String(s.id),
      equipoId: String(s.equipo_id),
      nombreEquipo: String(s.nombre_equipo ?? ""),
      tipo: s.tipo as TipoSancion,
      cantidad: s.cantidad == null ? null : Number(s.cantidad),
      motivo: String(s.motivo ?? ""),
      creada: String(s.creada),
    })),
    expulsados: (d.expulsados ?? []).map((e) => ({
      userId: String(e.user_id),
      nombreManager: String(e.nombre_manager ?? ""),
      nombreEquipo: String(e.nombre_equipo ?? ""),
      motivo: String(e.motivo ?? ""),
      creado: String(e.creado),
    })),
  };
}

// Equipo del administrador de una liga privada (el de quien la creó), para
// marcarlo en la clasificación. null en la liga pública o si no se encuentra.
// No hace falta función SQL: los miembros ya pueden leer leagues.creado_por
// (política de 0015) y fantasy_teams es de lectura pública.
export async function fetchEquipoAdminLiga(supabase: Supabase, ligaId: string): Promise<string | null> {
  const { data: liga } = await supabase
    .from("leagues")
    .select("creado_por, tipo")
    .eq("id", ligaId)
    .maybeSingle();
  if (!liga || liga.tipo !== "privada" || !liga.creado_por) return null;

  const { data: equipo } = await supabase
    .from("fantasy_teams")
    .select("id")
    .eq("league_id", ligaId)
    .eq("owner_id", liga.creado_por)
    .maybeSingle();
  return (equipo?.id as string | undefined) ?? null;
}

export async function sancionarDB(
  supabase: Supabase,
  ligaId: string,
  equipoId: string,
  tipo: TipoSancion,
  cantidad: number | null,
  motivo: string
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("admin_liga_sancionar", {
    p_league_id: ligaId,
    p_equipo_id: equipoId,
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_motivo: motivo,
  });
  return resultadoRpc(data, error);
}

export async function anularSancionDB(supabase: Supabase, sancionId: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("admin_liga_anular_sancion", { p_sancion_id: sancionId });
  return resultadoRpc(data, error);
}

export async function expulsarDB(
  supabase: Supabase,
  ligaId: string,
  equipoId: string,
  motivo: string
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("admin_liga_expulsar", {
    p_league_id: ligaId,
    p_equipo_id: equipoId,
    p_motivo: motivo,
  });
  return resultadoRpc(data, error);
}

export async function readmitirDB(supabase: Supabase, ligaId: string, userId: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("admin_liga_readmitir", {
    p_league_id: ligaId,
    p_user_id: userId,
  });
  return resultadoRpc(data, error);
}

export async function cambiarTandasMercadoDB(
  supabase: Supabase,
  ligaId: string,
  tandas: number
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("admin_liga_tandas_mercado", {
    p_league_id: ligaId,
    p_tandas: tandas,
  });
  return resultadoRpc(data, error);
}
