// Perfil de un jugador: datos básicos y, por cada torneo en el que juega,
// sus partidas, sus puntos de torneo y su performance Elo. Todo son
// lecturas públicas.

import type { createClient } from "@/lib/supabase/client";
import type { Categoria, ResultadoPartida } from "@/lib/types";
import { calcularEstadisticas, type EstadisticasJugador } from "@/lib/torneos";

type Supabase = ReturnType<typeof createClient>;

export interface PartidaPerfil {
  jornada: number; // número dentro de su torneo
  resultado: ResultadoPartida;
  rivalId: string | null; // null si el rival no está en la base de jugadores
  rivalNombre: string | null;
  rivalElo: number | null;
  puntosFantasy: number;
}

export interface TorneoPerfil {
  id: string;
  nombre: string;
  categoria: Categoria | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  partidas: PartidaPerfil[]; // por orden de jornada
  descansos: number[]; // jornadas en las que quedó sin emparejar
  estadisticas: EstadisticasJugador;
  puntosFantasy: number;
}

export interface PerfilJugador {
  id: string;
  nombre: string;
  club: string;
  categoria: Categoria;
  elo: number;
  anioNacimiento: number | null;
  fideId: string | null;
  valorMercado: number;
  activo: boolean;
  torneos: TorneoPerfil[];
}

export async function fetchPerfilJugador(
  supabase: Supabase,
  playerId: string
): Promise<PerfilJugador | null> {
  const { data: p, error } = await supabase
    .from("players")
    .select("id, nombre, club, categoria, elo, anio_nacimiento, fide_id, valor_mercado, activo")
    .eq("id", playerId)
    .maybeSingle();

  if (error || !p) return null;

  const [{ data: inscripciones }, { data: resultados }, { data: descansos }] =
    await Promise.all([
      supabase
        .from("tournament_players")
        .select("tournament_id")
        .eq("player_id", playerId),
      supabase
        .from("results")
        .select(
          "resultado, rival_player_id, rival_elo_en_el_momento, puntos_fantasy, matchdays (numero, tournament_id)"
        )
        .eq("player_id", playerId),
      supabase
        .from("matchday_byes")
        .select("matchdays (numero, tournament_id)")
        .eq("player_id", playerId),
    ]);

  // Torneos en los que está inscrito, más cualquiera donde tenga partidas
  // aunque se le quitara de la lista después.
  const idsTorneos = new Set<string>();
  for (const i of (inscripciones ?? []) as any[]) idsTorneos.add(i.tournament_id);
  for (const r of (resultados ?? []) as any[]) {
    if (r.matchdays?.tournament_id) idsTorneos.add(r.matchdays.tournament_id);
  }
  for (const d of (descansos ?? []) as any[]) {
    if (d.matchdays?.tournament_id) idsTorneos.add(d.matchdays.tournament_id);
  }

  let filasTorneos: any[] = [];
  if (idsTorneos.size > 0) {
    const { data } = await supabase
      .from("tournaments")
      .select("id, nombre, categoria, fecha_inicio, fecha_fin")
      .in("id", [...idsTorneos]);
    filasTorneos = data ?? [];
  }

  const idsRivales = [
    ...new Set(
      ((resultados ?? []) as any[])
        .map((r) => r.rival_player_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const nombresRivales = new Map<string, string>();
  if (idsRivales.length > 0) {
    const { data } = await supabase.from("players").select("id, nombre").in("id", idsRivales);
    for (const r of (data ?? []) as any[]) nombresRivales.set(r.id, r.nombre);
  }

  const torneos: TorneoPerfil[] = filasTorneos.map((t) => {
    const partidas: PartidaPerfil[] = ((resultados ?? []) as any[])
      .filter((r) => r.matchdays?.tournament_id === t.id)
      .map((r) => ({
        jornada: r.matchdays.numero as number,
        resultado: r.resultado as ResultadoPartida,
        rivalId: r.rival_player_id ?? null,
        rivalNombre: r.rival_player_id ? nombresRivales.get(r.rival_player_id) ?? null : null,
        rivalElo: r.rival_elo_en_el_momento ?? null,
        puntosFantasy: r.puntos_fantasy ?? 0,
      }))
      .sort((a, b) => a.jornada - b.jornada);

    return {
      id: t.id,
      nombre: t.nombre,
      categoria: t.categoria ? (Number(t.categoria) as Categoria) : null,
      fechaInicio: t.fecha_inicio,
      fechaFin: t.fecha_fin,
      partidas,
      descansos: ((descansos ?? []) as any[])
        .filter((d) => d.matchdays?.tournament_id === t.id)
        .map((d) => d.matchdays.numero as number)
        .sort((a, b) => a - b),
      estadisticas: calcularEstadisticas(
        partidas.map((x) => ({ resultado: x.resultado, rivalElo: x.rivalElo }))
      ),
      puntosFantasy: partidas.reduce((total, x) => total + x.puntosFantasy, 0),
    };
  });

  return {
    id: p.id,
    nombre: p.nombre,
    club: p.club ?? "",
    categoria: Number(p.categoria) as Categoria,
    elo: p.elo,
    anioNacimiento: p.anio_nacimiento ?? null,
    fideId: p.fide_id ?? null,
    valorMercado: Number(p.valor_mercado),
    activo: p.activo,
    torneos,
  };
}
