// Lectura de torneos, sus jugadores y sus resultados. La leen tanto el
// panel de admin como las pantallas de los managers: las políticas de
// lectura de tournaments, tournament_players, matchdays, results y
// matchday_byes son públicas (ver 0001, 0019, 0020 y 0021).

import type { createClient } from "@/lib/supabase/client";
import type { Categoria, ResultadoPartida } from "@/lib/types";
import { calcularEstadisticas, type Torneo } from "@/lib/torneos";

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
  partidas: number; // partidas jugadas en este torneo
  puntos: number; // puntos de torneo: 1 por victoria, ½ por tablas
  rendimiento: number | null; // performance Elo
  puntosFantasy: number; // suma de puntos Fantasy en este torneo
}

// Un lado de una partida (un jugador, o un rival externo sin perfil).
export interface LadoPartida {
  id: string | null; // null si no está en la base de jugadores
  nombre: string;
  elo: number | null;
  puntosFantasy: number | null;
}

// Una partida, con los dos jugadores al mismo nivel. "resultadoA" es el
// resultado visto desde el lado A.
export interface PartidaTorneo {
  clave: string;
  a: LadoPartida;
  b: LadoPartida;
  resultadoA: ResultadoPartida;
}

export interface JornadaTorneo {
  id: string;
  numero: number;
  partidas: PartidaTorneo[];
  descansan: { id: string; nombre: string }[]; // sin emparejar en esta jornada
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

  const idsJornadas = (jornadasDb ?? []).map((j: any) => j.id as string);
  let filasResultados: any[] = [];
  let filasDescansos: any[] = [];
  if (idsJornadas.length > 0) {
    const [{ data: resultados }, { data: descansos }] = await Promise.all([
      supabase
        .from("results")
        .select(
          "matchday_id, player_id, resultado, rival_player_id, rival_elo_en_el_momento, puntos_fantasy"
        )
        .in("matchday_id", idsJornadas),
      supabase
        .from("matchday_byes")
        .select("matchday_id, player_id")
        .in("matchday_id", idsJornadas),
    ]);
    filasResultados = resultados ?? [];
    filasDescansos = descansos ?? [];
  }

  // Nombre y Elo de quienes aparecen sin estar inscritos (por ejemplo, un
  // jugador que se quitó del torneo después).
  const faltan = new Set<string>();
  for (const r of filasResultados) {
    if (!jugadores.has(r.player_id)) faltan.add(r.player_id);
    if (r.rival_player_id && !jugadores.has(r.rival_player_id)) {
      faltan.add(r.rival_player_id);
    }
  }
  for (const d of filasDescansos) {
    if (!jugadores.has(d.player_id)) faltan.add(d.player_id);
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
  const eloDe = (id: string): number | null =>
    jugadores.get(id)?.elo ?? otros.get(id)?.elo ?? null;

  const lado = (fila: any): LadoPartida => ({
    id: fila.player_id,
    nombre: nombreDe(fila.player_id),
    elo: eloDe(fila.player_id),
    puntosFantasy: fila.puntos_fantasy ?? null,
  });

  const jornadas: JornadaTorneo[] = (jornadasDb ?? []).map((j: any) => {
    const filas = filasResultados.filter((r) => r.matchday_id === j.id);
    const porJugador = new Map<string, any>(filas.map((r) => [r.player_id, r]));
    const usados = new Set<string>();
    const partidas: PartidaTorneo[] = [];

    for (const r of filas) {
      if (usados.has(r.player_id)) continue;
      usados.add(r.player_id);

      // La partida entre dos jugadores de la lista tiene una fila por
      // cada lado: se junta en una sola, con el de más Elo a la izquierda.
      const espejo = r.rival_player_id ? porJugador.get(r.rival_player_id) : undefined;

      if (espejo && espejo.rival_player_id === r.player_id) {
        usados.add(espejo.player_id);
        const eloR = eloDe(r.player_id) ?? 0;
        const eloE = eloDe(espejo.player_id) ?? 0;
        const primeroEsR =
          eloR !== eloE
            ? eloR > eloE
            : nombreDe(r.player_id).localeCompare(nombreDe(espejo.player_id)) <= 0;
        const [primera, segunda] = primeroEsR ? [r, espejo] : [espejo, r];

        partidas.push({
          clave: `${primera.player_id}-${segunda.player_id}`,
          a: lado(primera),
          b: lado(segunda),
          resultadoA: primera.resultado as ResultadoPartida,
        });
      } else {
        // Rival externo, o partida guardada solo por un lado.
        partidas.push({
          clave: `${r.player_id}-${r.rival_player_id ?? "externo"}`,
          a: lado(r),
          b: r.rival_player_id
            ? {
                id: r.rival_player_id,
                nombre: nombreDe(r.rival_player_id),
                elo: eloDe(r.rival_player_id),
                puntosFantasy: null,
              }
            : {
                id: null,
                nombre: "Rival externo",
                elo: r.rival_elo_en_el_momento ?? null,
                puntosFantasy: null,
              },
          resultadoA: r.resultado as ResultadoPartida,
        });
      }
    }

    // Mesas de arriba abajo por el Elo más alto de cada partida.
    const eloMaximo = (p: PartidaTorneo) => Math.max(p.a.elo ?? 0, p.b.elo ?? 0);
    partidas.sort((x, y) => eloMaximo(y) - eloMaximo(x));

    const descansan = filasDescansos
      .filter((d) => d.matchday_id === j.id)
      .map((d) => ({ id: d.player_id as string, nombre: nombreDe(d.player_id) }))
      .sort((x, y) => x.nombre.localeCompare(y.nombre));

    return { id: j.id, numero: j.numero, partidas, descansan };
  });

  const participantes: JugadorTorneo[] = [...jugadores.entries()].map(([id, info]) => {
    const suyas = filasResultados.filter((r) => r.player_id === id);
    const estadisticas = calcularEstadisticas(
      suyas.map((r) => ({
        resultado: r.resultado as ResultadoPartida,
        rivalElo: r.rival_elo_en_el_momento ?? null,
      }))
    );
    return {
      id,
      ...info,
      partidas: estadisticas.partidas,
      puntos: estadisticas.puntos,
      rendimiento: estadisticas.rendimiento,
      puntosFantasy: suyas.reduce((total, r) => total + (r.puntos_fantasy ?? 0), 0),
    };
  });

  // Como en chess-results: por puntos de torneo, después por performance.
  participantes.sort(
    (a, b) =>
      b.puntos - a.puntos ||
      (b.rendimiento ?? -1) - (a.rendimiento ?? -1) ||
      b.elo - a.elo ||
      a.nombre.localeCompare(b.nombre)
  );

  return { participantes, jornadas };
}
