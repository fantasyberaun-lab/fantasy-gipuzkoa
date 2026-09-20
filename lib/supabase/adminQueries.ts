// Todo lo que solo puede hacer el rol "root": dar de alta, editar y
// borrar jugadores. La base de datos ya rechaza estas escrituras si
// quien las hace no es root (ver migración 0004_admin_root.sql,
// política "root gestiona jugadores"), así que esto es la comodidad de
// la interfaz, no la barrera de seguridad real.

import type { createClient } from "@/lib/supabase/client";
import type { Categoria } from "@/lib/types";

type Supabase = ReturnType<typeof createClient>;
type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

export interface JugadorAdmin {
  id: string;
  nombre: string;
  club: string;
  categoria: Categoria;
  elo: number;
  fideId: string | null;
  valorMercado: number;
  activo: boolean;
}

export async function fetchTodosLosJugadores(
  supabase: Supabase
): Promise<JugadorAdmin[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, nombre, club, categoria, elo, fide_id, valor_mercado, activo")
    .order("nombre");

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    club: p.club ?? "",
    categoria: Number(p.categoria) as Categoria,
    elo: p.elo,
    fideId: p.fide_id,
    valorMercado: Number(p.valor_mercado),
    activo: p.activo,
  }));
}

export async function actualizarJugadorDB(
  supabase: Supabase,
  id: string,
  cambios: Partial<Omit<JugadorAdmin, "id">>
): Promise<ResultadoAccion> {
  const payload: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) payload.nombre = cambios.nombre;
  if (cambios.club !== undefined) payload.club = cambios.club;
  if (cambios.categoria !== undefined) payload.categoria = cambios.categoria;
  if (cambios.elo !== undefined) payload.elo = cambios.elo;
  if (cambios.fideId !== undefined) payload.fide_id = cambios.fideId;
  if (cambios.valorMercado !== undefined)
    payload.valor_mercado = cambios.valorMercado;
  if (cambios.activo !== undefined) payload.activo = cambios.activo;

  const { error } = await supabase.from("players").update(payload).eq("id", id);

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

export async function crearJugadorDB(
  supabase: Supabase,
  datos: {
    nombre: string;
    club: string;
    categoria: Categoria;
    elo: number;
    valorMercado: number;
  }
): Promise<ResultadoAccion> {
  const { error } = await supabase.from("players").insert({
    nombre: datos.nombre,
    club: datos.club,
    categoria: datos.categoria,
    elo: datos.elo,
    valor_mercado: datos.valorMercado,
    activo: true,
  });

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

export async function eliminarJugadorDB(
  supabase: Supabase,
  id: string
): Promise<ResultadoAccion> {
  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}