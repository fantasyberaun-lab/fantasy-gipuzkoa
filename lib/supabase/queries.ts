import type { createClient } from "@/lib/supabase/client";
import type {
  Categoria,
  ClasificacionEntry,
  EquipoManager,
  JugadorLiga,
  MercadoDelDia,
  OfertaPendiente,
  PlantillaSlot,
  PuntosJornada,
  ResultadoPartida,
} from "@/lib/types";

type Supabase = ReturnType<typeof createClient>;
type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

// ---------- Lecturas ----------

export async function fetchMiEquipo(
  supabase: Supabase,
  userId: string
): Promise<EquipoManager | null> {
  const { data, error } = await supabase
    .from("fantasy_teams")
    .select("id, league_id, nombre, presupuesto")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    leagueId: data.league_id,
    nombreEquipo: data.nombre,
    saldo: Number(data.presupuesto),
  };
}

export async function fetchMiPlantilla(
  supabase: Supabase,
  equipoId: string
): Promise<(PlantillaSlot & { titular: boolean })[]> {
  const { data: slots, error } = await supabase
    .from("squad_slots")
    .select(
      "titular, players (id, nombre, club, categoria, elo, valor_mercado, activo)"
    )
    .eq("fantasy_team_id", equipoId)
    .is("fecha_salida", null);

  if (error || !slots || slots.length === 0) return [];

  const playerIds = slots
    .map((s: any) => s.players?.id)
    .filter((id: unknown): id is string => Boolean(id));

  const { data: resultados } = await supabase
    .from("results")
    .select("player_id, resultado, puntos_fantasy, matchdays (numero)")
    .in("player_id", playerIds);

  const resultadosAscendentes = (resultados ?? []).slice().sort((a: any, b: any) => {
    const numA = a.matchdays?.numero ?? 0;
    const numB = b.matchdays?.numero ?? 0;
    return numA - numB;
  });

  return slots
    .filter((s: any) => s.players)
    .map((s: any) => {
      const resultadosJugador = resultadosAscendentes.filter(
        (r: any) => r.player_id === s.players.id
      );
      const masReciente = resultadosJugador[resultadosJugador.length - 1];

      const historialPuntos: PuntosJornada[] = resultadosJugador.map(
        (r: any) => ({
          jornada: r.matchdays?.numero ?? 0,
          puntos: r.puntos_fantasy,
        })
      );

      return {
        jugador: {
          id: s.players.id,
          nombre: s.players.nombre,
          club: s.players.club ?? "",
          categoria: Number(s.players.categoria) as Categoria,
          elo: s.players.elo,
          valorMercado: Number(s.players.valor_mercado),
          activo: s.players.activo,
        },
        puntosJornada: masReciente ? masReciente.puntos_fantasy : 0,
        valorMercadoDelta: 0,
        resultadosRecientes: resultadosJugador
          .slice(-4)
          .map((r: any) => r.resultado as ResultadoPartida),
        historialPuntos,
        titular: Boolean(s.titular),
      };
    });
}

export async function fetchJugadoresLiga(
  supabase: Supabase,
  leagueId: string,
  miEquipoId: string | null
): Promise<JugadorLiga[]> {
  const { data, error } = await supabase
    .rpc("player_status", { p_league_id: leagueId })
    .order("puntos_totales", { ascending: false });

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    club: p.club ?? "",
    categoria: Number(p.categoria) as Categoria,
    elo: p.elo,
    valorMercado: Number(p.valor_mercado),
    activo: p.activo,
    puntosTotales: p.puntos_totales,
    propietario: p.propietario_nombre,
    esMiEquipo: miEquipoId ? p.propietario_team_id === miEquipoId : false,
    historialPuntos: (p.historial_puntos ?? []) as PuntosJornada[],
  }));
}

export async function fetchMercado(
  supabase: Supabase,
  leagueId: string
): Promise<MercadoDelDia[]> {
  const { data: listings, error } = await supabase
    .from("market_listings")
    .select(
      "id, player_id, players (id, nombre, club, categoria, elo, valor_mercado, activo)"
    )
    .eq("league_id", leagueId)
    .eq("disponible", true);

  if (error || !listings || listings.length === 0) return [];

  const playerIds = listings
    .map((l: any) => l.players?.id)
    .filter((id: unknown): id is string => Boolean(id));
  const listingIds = listings.map((l: any) => l.id);

  const [{ data: estadosLiga }, { data: conteos }] = await Promise.all([
    supabase.rpc("player_status", { p_league_id: leagueId }),
    supabase
      .from("market_bid_counts")
      .select("market_listing_id, numero_pujas")
      .in("market_listing_id", listingIds),
  ]);

  const estadoPorJugador = new Map<string, any>(
    ((estadosLiga ?? []) as any[])
      .filter((e) => playerIds.includes(e.id))
      .map((e): [string, any] => [e.id, e])
  );
  const pujasPorListing = new Map<string, number>(
    ((conteos ?? []) as any[]).map((c): [string, number] => [
      c.market_listing_id,
      c.numero_pujas,
    ])
  );

  return listings
    .filter((l: any) => l.players)
    .map((l: any) => {
      const estado = estadoPorJugador.get(l.players.id);

      return {
        id: l.players.id,
        listingId: l.id,
        nombre: l.players.nombre,
        club: l.players.club ?? "",
        categoria: Number(l.players.categoria) as Categoria,
        elo: l.players.elo,
        valorMercado: Number(l.players.valor_mercado),
        activo: l.players.activo,
        puntosTotales: estado?.puntos_totales ?? 0,
        historialPuntos: (estado?.historial_puntos ?? []) as PuntosJornada[],
        numeroPujas: pujasPorListing.get(l.id) ?? 0,
      };
    });
}

export async function fetchMisOfertas(
  supabase: Supabase,
  equipoId: string
): Promise<OfertaPendiente[]> {
  const { data, error } = await supabase
    .from("player_offers")
    .select("player_id, importe")
    .eq("equipo_oferente_id", equipoId)
    .eq("estado", "pendiente");

  if (error || !data) return [];

  return data.map((o: any) => ({
    jugadorId: o.player_id,
    importe: Number(o.importe),
  }));
}

export async function fetchMiRol(
  supabase: Supabase,
  userId: string
): Promise<"root" | "manager" | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.rol as "root" | "manager";
}

// ---------- Escrituras ----------

export async function toggleTitularDB(
  supabase: Supabase,
  equipoId: string,
  playerId: string,
  nuevoValor: boolean
): Promise<ResultadoAccion> {
  const { error } = await supabase
    .from("squad_slots")
    .update({ titular: nuevoValor })
    .eq("fantasy_team_id", equipoId)
    .eq("player_id", playerId)
    .is("fecha_salida", null);

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

export async function venderJugadorDB(
  supabase: Supabase,
  equipoId: string,
  playerId: string,
  valorMercado: number
): Promise<ResultadoAccion> {
  const { error: errorBaja } = await supabase
    .from("squad_slots")
    .update({ fecha_salida: new Date().toISOString() })
    .eq("fantasy_team_id", equipoId)
    .eq("player_id", playerId)
    .is("fecha_salida", null);

  if (errorBaja) return { ok: false, mensaje: errorBaja.message };

  const { data: equipoActual, error: errorLectura } = await supabase
    .from("fantasy_teams")
    .select("presupuesto")
    .eq("id", equipoId)
    .single();

  if (errorLectura || !equipoActual) {
    return { ok: false, mensaje: "No se pudo leer el saldo actual." };
  }

  const { error: errorSaldo } = await supabase
    .from("fantasy_teams")
    .update({ presupuesto: Number(equipoActual.presupuesto) + valorMercado })
    .eq("id", equipoId);

  if (errorSaldo) return { ok: false, mensaje: errorSaldo.message };

  await supabase.from("operations_log").insert({
    fantasy_team_id: equipoId,
    tipo: "venta",
    player_id: playerId,
    importe: valorMercado,
  });

  return { ok: true };
}

export async function pagarClausulaDB(
  supabase: Supabase,
  playerId: string,
  leagueId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("pagar_clausula", {
    p_player_id: playerId,
    p_league_id: leagueId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function ficharJugadorDB(
  supabase: Supabase,
  playerId: string,
  leagueId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("fichar_jugador", {
    p_player_id: playerId,
    p_league_id: leagueId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function pujarMercadoDB(
  supabase: Supabase,
  listingId: string,
  importe: number,
  leagueId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("pujar_mercado", {
    p_listing_id: listingId,
    p_importe: importe,
    p_league_id: leagueId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function hacerOfertaDB(
  supabase: Supabase,
  equipoId: string,
  playerId: string,
  importe: number
): Promise<ResultadoAccion> {
  const { error } = await supabase.from("player_offers").upsert(
    {
      player_id: playerId,
      equipo_oferente_id: equipoId,
      importe,
      estado: "pendiente",
    },
    { onConflict: "player_id,equipo_oferente_id" }
  );

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

export async function eliminarMiCuentaDB(
  supabase: Supabase
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("eliminar_mi_cuenta");

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function fetchClasificacion(
  supabase: Supabase,
  leagueId: string,
  miEquipoId: string | null
): Promise<ClasificacionEntry[]> {
  const { data, error } = await supabase
    .rpc("clasificacion", { p_league_id: leagueId })
    .order("puntos_totales", { ascending: false });

  if (error || !data) return [];

  return (data as any[]).map((e, indice: number) => ({
    posicion: indice + 1,
    nombreEquipo: e.nombre_equipo,
    puntos: e.puntos_totales,
    esMiEquipo: miEquipoId ? e.equipo_id === miEquipoId : false,
    historialPuntos: (e.historial_puntos ?? []) as PuntosJornada[],
  }));
}
