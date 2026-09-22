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
  anioNacimiento: number | null;
  fideId: string | null;
  valorMercado: number;
  activo: boolean;
}

export async function fetchTodosLosJugadores(
  supabase: Supabase
): Promise<JugadorAdmin[]> {
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, nombre, club, categoria, elo, anio_nacimiento, fide_id, valor_mercado, activo"
    )
    .order("nombre");

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    club: p.club ?? "",
    categoria: Number(p.categoria) as Categoria,
    elo: p.elo,
    anioNacimiento: p.anio_nacimiento ?? null,
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
  if (cambios.anioNacimiento !== undefined)
    payload.anio_nacimiento = cambios.anioNacimiento;
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
    anioNacimiento: number | null;
  }
): Promise<ResultadoAccion> {
  // El valor inicial lo calcula la base de datos con la misma fórmula que
  // usa "Recalcular valores iniciales" (ver 0010_valor_inicial.sql).
  const { data: valor, error: errorValor } = await supabase.rpc(
    "calcular_valor_inicial",
    { p_elo: datos.elo, p_anio_nacimiento: datos.anioNacimiento }
  );

  if (errorValor) return { ok: false, mensaje: errorValor.message };

  const { error } = await supabase.from("players").insert({
    nombre: datos.nombre,
    club: datos.club,
    categoria: datos.categoria,
    elo: datos.elo,
    anio_nacimiento: datos.anioNacimiento,
    valor_mercado: Number(valor),
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

export async function recalcularValoresInicialesDB(
  supabase: Supabase
): Promise<{ ok: true; actualizados: number } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("recalcular_valores_iniciales");

  if (error) return { ok: false, mensaje: error.message };
  return data as
    | { ok: true; actualizados: number }
    | { ok: false; mensaje: string };
}

// ---------- Jornadas y resultados ----------

export interface JornadaAdmin {
  id: string;
  numero: number;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export async function fetchJornadas(supabase: Supabase): Promise<JornadaAdmin[]> {
  const { data, error } = await supabase
    .from("matchdays")
    .select("id, numero, fecha_inicio, fecha_fin")
    .order("numero", { ascending: false });

  if (error || !data) return [];

  return data.map((m: any) => ({
    id: m.id,
    numero: m.numero,
    fechaInicio: m.fecha_inicio,
    fechaFin: m.fecha_fin,
  }));
}

export async function crearJornadaDB(
  supabase: Supabase,
  numero: number
): Promise<{ ok: true; jornada: JornadaAdmin } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase
    .from("matchdays")
    .insert({ numero })
    .select("id, numero, fecha_inicio, fecha_fin")
    .single();

  if (error || !data) {
    return { ok: false, mensaje: error?.message ?? "No se pudo crear la jornada." };
  }

  return {
    ok: true,
    jornada: {
      id: data.id,
      numero: data.numero,
      fechaInicio: data.fecha_inicio,
      fechaFin: data.fecha_fin,
    },
  };
}

export interface ResultadoGuardado {
  playerId: string;
  resultado: "victoria" | "tablas" | "derrota";
  rivalPlayerId: string | null;
  rivalElo: number | null;
  puntosFantasy: number;
}

export async function fetchResultadosDeJornada(
  supabase: Supabase,
  matchdayId: string
): Promise<ResultadoGuardado[]> {
  const { data, error } = await supabase
    .from("results")
    .select("player_id, resultado, rival_player_id, rival_elo_en_el_momento, puntos_fantasy")
    .eq("matchday_id", matchdayId);

  if (error || !data) return [];

  return data.map((r: any) => ({
    playerId: r.player_id,
    resultado: r.resultado,
    rivalPlayerId: r.rival_player_id,
    rivalElo: r.rival_elo_en_el_momento,
    puntosFantasy: r.puntos_fantasy,
  }));
}

// puntos_fantasy NO se envía: lo calcula siempre el trigger de la base de
// datos (ver 0014_puntuacion_resultados.sql), a partir de resultado +
// diferencia de Elo. Así nunca puede quedar desincronizado con la regla.
export async function guardarResultadoDB(
  supabase: Supabase,
  input: {
    matchdayId: string;
    playerId: string;
    resultado: "victoria" | "tablas" | "derrota";
    rivalPlayerId: string | null;
    rivalElo: number | null;
  }
): Promise<{ ok: true; puntos: number } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase
    .from("results")
    .upsert(
      {
        matchday_id: input.matchdayId,
        player_id: input.playerId,
        resultado: input.resultado,
        rival_player_id: input.rivalPlayerId,
        rival_elo_en_el_momento: input.rivalElo,
      },
      { onConflict: "player_id,matchday_id" }
    )
    .select("puntos_fantasy")
    .single();

  if (error || !data) {
    return { ok: false, mensaje: error?.message ?? "No se pudo guardar el resultado." };
  }

  return { ok: true, puntos: data.puntos_fantasy };
}

export async function borrarResultadoDB(
  supabase: Supabase,
  matchdayId: string,
  playerId: string
): Promise<ResultadoAccion> {
  const { error } = await supabase
    .from("results")
    .delete()
    .eq("matchday_id", matchdayId)
    .eq("player_id", playerId);

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}
