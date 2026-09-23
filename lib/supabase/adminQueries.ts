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
  // Torneo y ronda a los que pertenece (null en jornadas antiguas, de
  // antes de existir los torneos — ver 0019_torneos.sql).
  torneoId: string | null;
  torneoNombre: string | null;
  ronda: number | null;
}

const COLUMNAS_JORNADA =
  "id, numero, fecha_inicio, fecha_fin, tournament_id, ronda, tournaments (nombre)";

function mapearJornada(m: any): JornadaAdmin {
  return {
    id: m.id,
    numero: m.numero,
    fechaInicio: m.fecha_inicio,
    fechaFin: m.fecha_fin,
    torneoId: m.tournament_id ?? null,
    torneoNombre: m.tournaments?.nombre ?? null,
    ronda: m.ronda ?? null,
  };
}

export async function fetchJornadas(supabase: Supabase): Promise<JornadaAdmin[]> {
  const { data, error } = await supabase
    .from("matchdays")
    .select(COLUMNAS_JORNADA)
    .order("numero", { ascending: false });

  if (error || !data) return [];

  return data.map(mapearJornada);
}

// Crea la siguiente ronda de un torneo. La ronda se calcula sola (la
// última del torneo + 1) y no deja pasar del número de rondas previsto.
// "numero" es el número de jornada global del Fantasy.
export async function crearJornadaDB(
  supabase: Supabase,
  numero: number,
  torneoId: string
): Promise<{ ok: true; jornada: JornadaAdmin } | { ok: false; mensaje: string }> {
  const { data: torneo, error: errorTorneo } = await supabase
    .from("tournaments")
    .select("nombre, numero_rondas")
    .eq("id", torneoId)
    .single();

  if (errorTorneo || !torneo) {
    return { ok: false, mensaje: errorTorneo?.message ?? "No se encontró el torneo." };
  }

  const { data: ultima, error: errorUltima } = await supabase
    .from("matchdays")
    .select("ronda")
    .eq("tournament_id", torneoId)
    .order("ronda", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorUltima) return { ok: false, mensaje: errorUltima.message };

  const ronda = (ultima?.ronda ?? 0) + 1;
  if (ronda > torneo.numero_rondas) {
    return {
      ok: false,
      mensaje: `"${torneo.nombre}" ya tiene sus ${torneo.numero_rondas} rondas creadas.`,
    };
  }

  const { data, error } = await supabase
    .from("matchdays")
    .insert({ numero, tournament_id: torneoId, ronda })
    .select(COLUMNAS_JORNADA)
    .single();

  if (error || !data) {
    return { ok: false, mensaje: error?.message ?? "No se pudo crear la jornada." };
  }

  return { ok: true, jornada: mapearJornada(data) };
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

// ---------- Torneos ----------
// Ficha de torneo con la información habitual de chess-results. Ver
// 0019_torneos.sql. Todos los textos opcionales se guardan como null
// cuando se dejan vacíos.

export type SistemaTorneo = "suizo" | "round_robin" | "eliminatoria" | "otro";

export interface DatosTorneo {
  // General
  nombre: string;
  categoria: Categoria | null;
  observaciones: string | null;
  // Organización
  organizador: string | null;
  federacion: string | null;
  director: string | null;
  arbitroPrincipal: string | null;
  arbitrosAdjuntos: string | null;
  // Lugar de juego
  lugar: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  // Calendario
  fechaInicio: string | null;
  fechaFin: string | null;
  numeroRondas: number;
  // Sistema de juego
  sistema: SistemaTorneo;
  ritmoJuego: string | null;
  computoElo: string | null;
  desempates: string | null;
  // Enlaces y contacto
  webUrl: string | null;
  emailContacto: string | null;
}

export interface TorneoAdmin extends DatosTorneo {
  id: string;
  rondasCreadas: number;
}

function torneoAFila(t: DatosTorneo) {
  return {
    nombre: t.nombre,
    categoria: t.categoria,
    observaciones: t.observaciones,
    organizador: t.organizador,
    federacion: t.federacion,
    director: t.director,
    arbitro_principal: t.arbitroPrincipal,
    arbitros_adjuntos: t.arbitrosAdjuntos,
    lugar: t.lugar,
    direccion: t.direccion,
    ciudad: t.ciudad,
    provincia: t.provincia,
    pais: t.pais,
    fecha_inicio: t.fechaInicio,
    fecha_fin: t.fechaFin,
    numero_rondas: t.numeroRondas,
    sistema: t.sistema,
    ritmo_juego: t.ritmoJuego,
    computo_elo: t.computoElo,
    desempates: t.desempates,
    web_url: t.webUrl,
    email_contacto: t.emailContacto,
  };
}

export async function fetchTorneos(supabase: Supabase): Promise<TorneoAdmin[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*, matchdays (count)")
    .order("fecha_inicio", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((t: any) => ({
    id: t.id,
    nombre: t.nombre,
    categoria: t.categoria ? (Number(t.categoria) as Categoria) : null,
    observaciones: t.observaciones,
    organizador: t.organizador,
    federacion: t.federacion,
    director: t.director,
    arbitroPrincipal: t.arbitro_principal,
    arbitrosAdjuntos: t.arbitros_adjuntos,
    lugar: t.lugar,
    direccion: t.direccion,
    ciudad: t.ciudad,
    provincia: t.provincia,
    pais: t.pais,
    fechaInicio: t.fecha_inicio,
    fechaFin: t.fecha_fin,
    numeroRondas: t.numero_rondas,
    sistema: t.sistema,
    ritmoJuego: t.ritmo_juego,
    computoElo: t.computo_elo,
    desempates: t.desempates,
    webUrl: t.web_url,
    emailContacto: t.email_contacto,
    rondasCreadas: t.matchdays?.[0]?.count ?? 0,
  }));
}

export async function crearTorneoDB(
  supabase: Supabase,
  datos: DatosTorneo
): Promise<ResultadoAccion> {
  const { error } = await supabase.from("tournaments").insert(torneoAFila(datos));

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

export async function actualizarTorneoDB(
  supabase: Supabase,
  id: string,
  datos: DatosTorneo
): Promise<ResultadoAccion> {
  const { error } = await supabase
    .from("tournaments")
    .update(torneoAFila(datos))
    .eq("id", id);

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

// La base de datos no deja borrar un torneo que ya tiene jornadas
// (on delete restrict en matchdays.tournament_id), para no arrastrar
// resultados por accidente.
export async function eliminarTorneoDB(
  supabase: Supabase,
  id: string
): Promise<ResultadoAccion> {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);

  if (error) {
    const tieneJornadas = error.code === "23503";
    return {
      ok: false,
      mensaje: tieneJornadas
        ? "Este torneo ya tiene jornadas creadas, así que no se puede borrar."
        : error.message,
    };
  }
  return { ok: true };
}
