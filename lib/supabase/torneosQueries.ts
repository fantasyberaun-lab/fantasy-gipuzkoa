// Lectura de torneos, sus jugadores y sus resultados. La leen tanto el
// panel de admin como las pantallas de los managers: las políticas de
// lectura de tournaments, tournament_players, matchdays y results son
// públicas (ver 0001, 0019 y 0020).

import type { createClient } from "@/lib/supabase/client";
import type { Categoria, ResultadoPartida } from "@/lib/types";
import type { Torneo } from "@/lib/torneos";

type Supabase = ReturnType<typeof createClient>;

function filaATorneo(t: any): Torneo {
  return {
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
    participantes: t.tournament_players?.[0]?.count ?? 0,
  };
}

const COLUMNAS_TORNEO = "*, matchdays (count), tournament_players (count)";

export async function fetchTorneos(supabase: Supabase): Promise<Torneo[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(COLUMNAS_TORNEO)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(filaATorneo);
}

export async function fetchTorneo(
  supabase: Supabase,
  id: string
): Promise<Torneo | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(COLUMNAS_TORNEO)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return filaATorneo(data);
}

export async function fetchParticipantesIds(
  supabase: Supabase,
  torneoId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("tournament_players")
    .select("player_id")
    .eq("tournament_id", torneoId);

  if (error || !data) return [];
  return data.map((r: any) => r.player_id as string);
}

// Inscritos de todos los torneos de una vez: torneoId -> ids de jugador.
export async function fetchParticipantesPorTorneo(
  supabase: Supabase
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("tournament_players")
    .select("tournament_id, player_id");

  const porTorneo: Record<string, string[]> = {};
  if (error || !data) return porTorneo;

  for (const r of data as any[]) {
    (porTorneo[r.tournament_id] ??= []).push(r.player_id);
  }
  return porTorneo;
}

// ---------- Detalle de un torneo (pantalla de los managers) ----------

export interface JugadorTorneo {
  id: string;
  nombre: string;
  club: string;
  categoria: Categoria;
  elo: number;
  puntos: number; // suma de puntos Fantasy en este torneo
  partidas: number; // partidas con resultado en este torneo
}

export interface ResultadoTorneo {
  playerId: string;
  jugadorNombre: string;
  resultado: ResultadoPartida;
  rivalNombre: string | null; // null si el rival no está en la base de jugadores
  rivalElo: number | null;
  puntos: number;
}

export interface JornadaTorneo {
  id: string;
  numero: number;
  resultados: ResultadoTorneo[];
}

export interface DetalleTorneo {
  participantes: JugadorTorneo[];
  jornadas: JornadaTorneo[];
}

export async function fetchDetalleTorneo(
  supabase: Supabase,
  torneoId: string
): Promise<DetalleTorneo> {
  const [{ data: inscritos }, { data: jornadasDb }] = await Promise.all([
    supabase
      .from("tournament_players")
      .select("players (id, nombre, club, categoria, elo)")
      .eq("tournament_id", torneoId),
    supabase
      .from("matchdays")
      .select("id, numero")
      .eq("tournament_id", torneoId)
      .order("numero"),
  ]);

  const jugadores = new Map<
    string,
    { nombre: string; club: string; categoria: Categoria; elo: number }
  >();
  for (const fila of (inscritos ?? []) as any[]) {
    const p = fila.players;
    if (!p) continue;
    jugadores.set(p.id, {
      nombre: p.nombre,
      club: p.club ?? "",
      categoria: Number(p.categoria) as Categoria,
      elo: p.elo,
    });
  }
  const inscritosIds = new Set(jugadores.keys());

  const idsJornadas = (jornadasDb ?? []).map((j: any) => j.id as string);
  let filasResultados: any[] = [];
  if (idsJornadas.length > 0) {
    const { data } = await supabase
      .from("results")
      .select(
        "matchday_id, player_id, resultado, rival_player_id, rival_elo_en_el_momento, puntos_fantasy"
      )
      .in("matchday_id", idsJornadas);
    filasResultados = data ?? [];
  }

  // Nombres de quienes aparecen en resultados sin estar inscritos (por
  // ejemplo, un jugador que se quitó del torneo después, o un rival que
  // no es participante).
  const faltan = new Set<string>();
  for (const r of filasResultados) {
    if (!jugadores.has(r.player_id)) faltan.add(r.player_id);
    if (r.rival_player_id && !jugadores.has(r.rival_player_id)) {
      faltan.add(r.rival_player_id);
    }
  }
  const otros = new Map<string, { nombre: string; elo: number }>();
  if (faltan.size > 0) {
    const { data } = await supabase
      .from("players")
      .select("id, nombre, elo")
      .in("id", [...faltan]);
    for (const p of (data ?? []) as any[]) {
      otros.set(p.id, { nombre: p.nombre, elo: p.elo });
    }
  }

  const nombreDe = (id: string) =>
    jugadores.get(id)?.nombre ?? otros.get(id)?.nombre ?? "Jugador desconocido";

  const jornadas: JornadaTorneo[] = (jornadasDb ?? []).map((j: any) => ({
    id: j.id,
    numero: j.numero,
    resultados: filasResultados
      .filter((r) => r.matchday_id === j.id)
      .map((r) => ({
        playerId: r.player_id,
        jugadorNombre: nombreDe(r.player_id),
        resultado: r.resultado as ResultadoPartida,
        rivalNombre: r.rival_player_id ? nombreDe(r.rival_player_id) : null,
        rivalElo: r.rival_elo_en_el_momento ?? null,
        puntos: r.puntos_fantasy,
      }))
      .sort((a, b) => a.jugadorNombre.localeCompare(b.jugadorNombre)),
  }));

  const participantes: JugadorTorneo[] = [...inscritosIds].map((id) => {
    const info = jugadores.get(id)!;
    const suyos = filasResultados.filter((r) => r.player_id === id);
    return {
      id,
      ...info,
      puntos: suyos.reduce((total, r) => total + (r.puntos_fantasy ?? 0), 0),
      partidas: suyos.length,
    };
  });

  participantes.sort(
    (a, b) => b.puntos - a.puntos || b.elo - a.elo || a.nombre.localeCompare(b.nombre)
  );

  return { participantes, jornadas };
}
