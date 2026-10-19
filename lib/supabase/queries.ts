import type { createClient } from "@/lib/supabase/client";
import { gameConfig } from "@/lib/gameConfig";
import { esperarReglasJuego, reglasJuegoActuales } from "@/lib/reglasJuego";
import type {
  Categoria,
  ClasificacionEntry,
  JugadorLiga,
  LigaResumen,
  MercadoDelDia,
  Notificacion,
  TipoNotificacion,
  OfertaPendiente,
  OfertaRecibida,
  PerfilManager,
  PlantillaSlot,
  ProximoRival,
  PujaMercado,
  PuntoValorPlantilla,
  PuntosJornada,
  ResultadoPartida,
  TipoLiga,
} from "@/lib/types";

type Supabase = ReturnType<typeof createClient>;
type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

// ---------- Lecturas ----------

export async function fetchMisLigas(supabase: Supabase): Promise<LigaResumen[]> {
  return (await fetchMisLigasOError(supabase)) ?? [];
}

// Como fetchMisLigas, pero devuelve null si la consulta falla (tras reintentar), para
// no confundir un error con "no estás en ninguna liga".
export async function fetchMisLigasOError(supabase: Supabase): Promise<LigaResumen[] | null> {
  let data: unknown = null;
  let fallo = true;
  for (let intento = 0; intento < 3 && fallo; intento++) {
    if (intento > 0) await new Promise((r) => setTimeout(r, 600 * intento));
    const r = await supabase.rpc("mis_ligas");
    fallo = Boolean(r.error) || !r.data;
    data = r.data;
  }
  if (fallo) return null;

  return (data as any[]).map((l) => ({
    ligaId: l.liga_id,
    tipo: (l.tipo === "publica" ? "publica" : "privada") as TipoLiga,
    nombre: l.nombre,
    codigo: l.codigo,
    miembros: l.miembros,
    maxMiembros: l.max_miembros,
    equipoId: l.equipo_id,
    nombreEquipo: l.nombre_equipo,
    saldo: Number(l.saldo),
  }));
}

// Lee todas las filas de una consulta paginando (Supabase corta en 1000).
async function leerTodo(construir: (desde: number, hasta: number) => PromiseLike<{ data: any[] | null }>) {
  const TAM = 1000;
  const filas: any[] = [];
  for (let desde = 0; ; desde += TAM) {
    const { data } = await construir(desde, desde + TAM - 1);
    const lote = data ?? [];
    filas.push(...lote);
    if (lote.length < TAM) break;
  }
  return filas;
}

// Próximo rival de cada jugador, a partir de los emparejamientos publicados
// (matchday_pairings, ver 0053). En cada torneo solo cuenta su última jornada
// con emparejamientos; si el jugador ya tiene resultado guardado en ella, la
// partida ya está jugada y no se muestra. Quien queda sin emparejar (fila
// "descansa" o descanso guardado) sale con descansa=true. Devuelve un mapa
// id de jugador -> próximos rivales (uno por torneo).
//
// El cálculo lo hace la función proximos_rivales (0080) en la base de datos:
// una sola consulta que devuelve solo las filas útiles.
export async function fetchProximosRivales(
  supabase: Supabase
): Promise<Record<string, ProximoRival[]>> {
  // Normalmente es una sola página (una fila por jugador con ronda vigente),
  // pero se pagina por si algún día pasa de las 1000 filas que corta Supabase.
  const TAM = 1000;
  const filas: any[] = [];
  for (let desde = 0; ; desde += TAM) {
    const { data, error } = await supabase
      .rpc("proximos_rivales")
      .order("player_id")
      .order("orden")
      .range(desde, desde + TAM - 1);
    // Si la función aún no existe (migración sin aplicar) o falla, se calcula
    // como antes, en el navegador.
    if (error || !data) return calcularProximosRivalesEnNavegador(supabase);
    filas.push(...(data as any[]));
    if (data.length < TAM) break;
  }

  const resultado: Record<string, ProximoRival[]> = {};
  for (const f of filas) {
    (resultado[f.player_id] ??= []).push({
      jornada: f.jornada,
      torneo: f.torneo ?? null,
      tablero: f.tablero ?? null,
      descansa: Boolean(f.descansa),
      rivalId: f.rival_id ?? null,
      rivalNombre: f.rival_nombre ?? "",
      rivalElo: f.rival_elo ?? null,
      color: (f.color ?? null) as ProximoRival["color"],
    });
  }

  if (COMPROBAR_RIVALES) compararConCalculoAntiguo(supabase, resultado);
  return resultado;
}

// Comprobación temporal: en las previews de Vercel (y en local) se calcula
// también a la antigua y se avisa en la consola del navegador si no coinciden.
// Se quitará, junto con el cálculo antiguo, cuando se haya visto que coinciden.
const COMPROBAR_RIVALES =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";

function normalizarRivales(mapa: Record<string, ProximoRival[]>) {
  return JSON.stringify(
    Object.keys(mapa)
      .sort()
      .map((id) => [
        id,
        mapa[id]
          .map((r) => JSON.stringify(r, Object.keys(r).sort()))
          .sort(),
      ])
  );
}

async function compararConCalculoAntiguo(
  supabase: Supabase,
  nuevo: Record<string, ProximoRival[]>
) {
  try {
    const antiguo = await calcularProximosRivalesEnNavegador(supabase);
    if (normalizarRivales(antiguo) === normalizarRivales(nuevo)) {
      console.info(
        `[Próximos rivales] OK: la base de datos y el cálculo antiguo coinciden (${Object.keys(nuevo).length} jugadores).`
      );
      return;
    }
    const distintos = [...new Set([...Object.keys(antiguo), ...Object.keys(nuevo)])].filter(
      (id) => normalizarRivales({ x: antiguo[id] ?? [] }) !== normalizarRivales({ x: nuevo[id] ?? [] })
    );
    console.warn(
      `[Próximos rivales] DIFERENCIAS en ${distintos.length} jugadores.`,
      distintos.map((id) => ({ jugador: id, antiguo: antiguo[id] ?? [], nuevo: nuevo[id] ?? [] }))
    );
  } catch {
    // Es solo una comprobación: si falla no afecta a la app.
  }
}

async function calcularProximosRivalesEnNavegador(
  supabase: Supabase
): Promise<Record<string, ProximoRival[]>> {
  const mesas = await leerTodo((d, h) =>
    supabase
      .from("matchday_pairings")
      .select(
        "matchday_id, tablero, blanco_player_id, blanco_elo, negro_player_id, negro_elo, descansa, matchdays (id, numero, created_at, tournament_id, tournaments (nombre))"
      )
      .order("id")
      .range(d, h)
  );
  if (mesas.length === 0) return {};

  // Última jornada con emparejamientos de cada torneo.
  const ultimaPorTorneo = new Map<string, { id: string; creada: string }>();
  for (const m of mesas) {
    const j = m.matchdays;
    if (!j) continue;
    const clave = j.tournament_id ?? j.id;
    const actual = ultimaPorTorneo.get(clave);
    if (!actual || (j.created_at ?? "") > actual.creada) {
      ultimaPorTorneo.set(clave, { id: j.id, creada: j.created_at ?? "" });
    }
  }
  const jornadasVigentes = new Set([...ultimaPorTorneo.values()].map((u) => u.id));
  const vigentes = mesas.filter((m) => m.matchdays && jornadasVigentes.has(m.matchday_id));
  if (vigentes.length === 0) return {};

  const idsJornadas = [...jornadasVigentes];
  const [resultados, descansos] = await Promise.all([
    leerTodo((d, h) =>
      supabase.from("results").select("matchday_id, player_id").in("matchday_id", idsJornadas).range(d, h)
    ),
    leerTodo((d, h) =>
      supabase.from("matchday_byes").select("matchday_id, player_id").in("matchday_id", idsJornadas).range(d, h)
    ),
  ]);
  // Solo los resultados cuentan como "ya jugado"; el descanso se sigue mostrando
  // como "Sin emparejar".
  const yaJugado = new Set<string>(
    resultados.map((r: any) => `${r.matchday_id}:${r.player_id}`)
  );
  // Info de cada jornada vigente, para los descansos que no tienen fila en matchday_pairings.
  const baseJornada = new Map<
    string,
    { jornada: number; torneo: string | null; torneoId: string | null }
  >();
  const emparejados = new Set<string>(); // `${jornada}:${jugador}` con mesa o descanso publicado
  for (const m of vigentes) {
    if (!baseJornada.has(m.matchday_id)) {
      baseJornada.set(m.matchday_id, {
        jornada: m.matchdays.numero as number,
        torneo: (m.matchdays.tournaments?.nombre ?? null) as string | null,
        torneoId: (m.matchdays.tournament_id ?? null) as string | null,
      });
    }
    if (m.blanco_player_id) emparejados.add(`${m.matchday_id}:${m.blanco_player_id}`);
    if (m.negro_player_id) emparejados.add(`${m.matchday_id}:${m.negro_player_id}`);
  }
  // Inscritos en los torneos con emparejamientos vigentes (para detectar a quien no sale en ellos).
  const idsTorneos = [
    ...new Set([...baseJornada.values()].map((b) => b.torneoId).filter((x): x is string => !!x)),
  ];
  const inscritos: any[] = idsTorneos.length
    ? await leerTodo((d, h) =>
        supabase
          .from("tournament_players")
          .select("tournament_id, player_id")
          .in("tournament_id", idsTorneos)
          .order("player_id")
          .range(d, h)
      ).catch(() => [])
    : [];
  const descansoAnadido = new Set<string>();

  const jugadores = await leerTodo((d, h) =>
    supabase.from("players").select("id, nombre, elo").order("id").range(d, h)
  );
  const infoJugador = new Map<string, { nombre: string; elo: number | null }>(
    jugadores.map((p: any): [string, { nombre: string; elo: number | null }] => [
      p.id,
      { nombre: p.nombre, elo: p.elo ?? null },
    ])
  );

  const resultado: Record<string, ProximoRival[]> = {};
  const anadir = (jugadorId: string, rival: ProximoRival) => {
    (resultado[jugadorId] ??= []).push(rival);
  };

  for (const m of vigentes) {
    const base = {
      jornada: m.matchdays.numero as number,
      torneo: (m.matchdays.tournaments?.nombre ?? null) as string | null,
      tablero: (m.tablero ?? null) as number | null,
    };

    if (m.descansa) {
      const id = m.blanco_player_id as string | null;
      if (!id || yaJugado.has(`${m.matchday_id}:${id}`)) continue;
      descansoAnadido.add(`${m.matchday_id}:${id}`);
      anadir(id, { ...base, descansa: true, rivalId: null, rivalNombre: "", rivalElo: null, color: null });
      continue;
    }

    const lados: { yo: string | null; rival: string | null; rivalElo: number | null; color: "blancas" | "negras" }[] = [
      { yo: m.blanco_player_id, rival: m.negro_player_id, rivalElo: m.negro_elo, color: "blancas" },
      { yo: m.negro_player_id, rival: m.blanco_player_id, rivalElo: m.blanco_elo, color: "negras" },
    ];
    for (const l of lados) {
      if (!l.yo || yaJugado.has(`${m.matchday_id}:${l.yo}`)) continue;
      const info = l.rival ? infoJugador.get(l.rival) : undefined;
      anadir(l.yo, {
        ...base,
        descansa: false,
        rivalId: l.rival,
        rivalNombre: l.rival ? (info?.nombre ?? "Rival desconocido") : "Rival externo",
        rivalElo: l.rival ? (info?.elo ?? null) : (l.rivalElo ?? null),
        color: l.color,
      });
    }
  }

  // Jugadores marcados sin emparejar que no tienen fila "descansa" en los emparejamientos.
  for (const d of descansos as any[]) {
    const clave = `${d.matchday_id}:${d.player_id}`;
    const jornada = baseJornada.get(d.matchday_id);
    if (!jornada || descansoAnadido.has(clave) || yaJugado.has(clave)) continue;
    descansoAnadido.add(clave);
    anadir(d.player_id, {
      jornada: jornada.jornada,
      torneo: jornada.torneo,
      tablero: null,
      descansa: true,
      rivalId: null,
      rivalNombre: "",
      rivalElo: null,
      color: null,
    });
  }

  // Inscritos en el torneo que no aparecen en los emparejamientos publicados de su
  // última jornada (ni con mesa ni con descanso) y sin resultado: sin emparejar.
  for (const [matchdayId, jornada] of baseJornada) {
    if (!jornada.torneoId) continue;
    for (const t of inscritos) {
      if (t.tournament_id !== jornada.torneoId) continue;
      const clave = `${matchdayId}:${t.player_id}`;
      if (emparejados.has(clave) || descansoAnadido.has(clave) || yaJugado.has(clave)) continue;
      descansoAnadido.add(clave);
      anadir(t.player_id, {
        jornada: jornada.jornada,
        torneo: jornada.torneo,
        tablero: null,
        descansa: true,
        rivalId: null,
        rivalNombre: "",
        rivalElo: null,
        color: null,
      });
    }
  }
  return resultado;
}

export async function fetchMiPlantilla(
  supabase: Supabase,
  equipoId: string
): Promise<(PlantillaSlot & { titular: boolean; capitan: boolean })[]> {
  const { data: slots, error } = await supabase
    .from("squad_slots")
    .select(
      "titular, capitan, clausula_extra, candado, blindado, players (id, nombre, club, categoria, elo, valor_mercado, activo)"
    )
    .eq("fantasy_team_id", equipoId)
    .is("fecha_salida", null);

  if (error || !slots || slots.length === 0) return [];

  const playerIds = slots
    .map((s: any) => s.players?.id)
    .filter((id: unknown): id is string => Boolean(id));

  // Resultados, descansos (puntúan 1 punto) e inscripciones (límite de
  // titulares por torneo): no dependen entre sí, van en paralelo.
  const [{ data: resultados }, { data: descansos }, { data: inscripciones }] = await Promise.all([
    supabase
      .from("results")
      .select(
        "player_id, resultado, puntos_fantasy, matchdays (id, numero, created_at, tournaments (nombre))"
      )
      .in("player_id", playerIds),
    supabase
      .from("matchday_byes")
      .select("player_id, matchdays (id, numero, created_at, tournaments (nombre))")
      .in("player_id", playerIds),
    supabase
      .from("tournament_players")
      .select("player_id, tournaments (id, nombre)")
      .in("player_id", playerIds),
  ]);

  const resultadosAscendentes = (resultados ?? []).slice().sort((a: any, b: any) => {
    // Por orden de creación de la jornada: el número solo es único dentro
    // de cada torneo.
    return (a.matchdays?.created_at ?? "").localeCompare(b.matchdays?.created_at ?? "");
  });

  // La cláusula depende de una variable del panel (0096): se espera a que lleguen las
  // reglas de la liga, que se piden a la vez que esto y casi nunca tardan más.
  await esperarReglasJuego();
  const porcentajeClausula = reglasJuegoActuales().clausulaPorcentaje;

  return slots
    .filter((s: any) => s.players)
    .map((s: any) => {
      const resultadosJugador = resultadosAscendentes.filter(
        (r: any) => r.player_id === s.players.id
      );

      const puntosPartidas: PuntosJornada[] = resultadosJugador.map(
        (r: any) => ({
          jornada: r.matchdays?.numero ?? 0,
          puntos: r.puntos_fantasy,
          id: r.matchdays?.id,
          torneo: r.matchdays?.tournaments?.nombre ?? null,
          creada: r.matchdays?.created_at,
        })
      );
      const puntosDescansos: PuntosJornada[] = ((descansos ?? []) as any[])
        .filter((d) => d.player_id === s.players.id)
        .map((d) => ({
          jornada: d.matchdays?.numero ?? 0,
          puntos: gameConfig.puntosPorDescanso,
          id: d.matchdays?.id,
          torneo: d.matchdays?.tournaments?.nombre ?? null,
          creada: d.matchdays?.created_at,
          descanso: true,
        }));
      const historialPuntos: PuntosJornada[] = [...puntosPartidas, ...puntosDescansos].sort(
        (a, b) => (a.creada ?? "").localeCompare(b.creada ?? "")
      );
      const masReciente = historialPuntos[historialPuntos.length - 1];

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
        puntosJornada: masReciente ? masReciente.puntos : 0,
        valorMercadoDelta: 0,
        clausula:
          Math.ceil(Number(s.players.valor_mercado) * porcentajeClausula) +
          Number(s.clausula_extra ?? 0),
        resultadosRecientes: resultadosJugador
          .slice(-4)
          .map((r: any) => r.resultado as ResultadoPartida),
        historialPuntos,
        titular: Boolean(s.titular),
        capitan: Boolean(s.capitan),
        candado: Boolean(s.candado),
        blindado: Boolean(s.blindado),
        torneos: ((inscripciones ?? []) as any[])
          .filter((i) => i.player_id === s.players.id && i.tournaments)
          .map((i) => ({ id: i.tournaments.id as string, nombre: i.tournaments.nombre as string })),
      };
    });
}

// Filas de tournament_players con su torneo -> torneos de cada jugador.
function agruparTorneosPorJugador(
  inscripciones: unknown[] | null
): Map<string, { id: string; nombre: string }[]> {
  const porJugador = new Map<string, { id: string; nombre: string }[]>();
  for (const i of (inscripciones ?? []) as any[]) {
    const lista = porJugador.get(i.player_id) ?? [];
    if (i.tournaments) lista.push({ id: i.tournaments.id, nombre: i.tournaments.nombre });
    porJugador.set(i.player_id, lista);
  }
  return porJugador;
}

// Estado de todos los jugadores en la liga (RPC player_status). Es la consulta
// más pesada de la carga: GameStateProvider la pide una vez y se la pasa a
// fetchJugadoresLiga y a fetchMercado.
export async function fetchEstadoJugadores(
  supabase: Supabase,
  leagueId: string
): Promise<any[] | null> {
  const { data, error } = await supabase.rpc("player_status", { p_league_id: leagueId });
  if (error || !data) return null;
  return data as any[];
}

export async function fetchJugadoresLiga(
  supabase: Supabase,
  leagueId: string,
  miEquipoId: string | null,
  estados: Promise<any[] | null> = fetchEstadoJugadores(supabase, leagueId)
): Promise<JugadorLiga[]> {
  // Jugadores inscritos en algún torneo (el mercado solo muestra a estos) y
  // en cuáles (para filtrar el mercado por torneo). Paginado: Supabase corta
  // en 1000 filas y hay más inscripciones que eso a lo largo de la temporada.
  const [estado, inscripciones] = await Promise.all([
    estados,
    leerTodo((d, h) =>
      supabase
        .from("tournament_players")
        .select("player_id, tournaments (id, nombre)")
        .order("tournament_id")
        .order("player_id")
        .range(d, h)
    ),
  ]);

  if (!estado) return [];
  const torneosPorJugador = agruparTorneosPorJugador(inscripciones);
  const data = estado
    .slice()
    .sort((a: any, b: any) => (b.puntos_totales ?? 0) - (a.puntos_totales ?? 0));

  return data.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    club: p.club ?? "",
    categoria: Number(p.categoria) as Categoria,
    elo: p.elo,
    valorMercado: Number(p.valor_mercado),
    activo: p.activo,
    inscrito: torneosPorJugador.has(p.id),
    torneos: torneosPorJugador.get(p.id) ?? [],
    puntosTotales: p.puntos_totales,
    propietario: p.propietario_nombre,
    esMiEquipo: miEquipoId ? p.propietario_team_id === miEquipoId : false,
    clausula: Number(p.clausula),
    candado: Boolean(p.candado),
    blindado: Boolean(p.blindado),
    historialPuntos: (p.historial_puntos ?? []) as PuntosJornada[],
  }));
}

export async function fetchMercado(
  supabase: Supabase,
  leagueId: string,
  estados: Promise<any[] | null> = fetchEstadoJugadores(supabase, leagueId)
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

  const [estadosLiga, { data: conteos }, { data: inscripciones }] = await Promise.all([
    estados,
    supabase
      .from("market_bid_counts")
      .select("market_listing_id, numero_pujas")
      .in("market_listing_id", listingIds),
    supabase
      .from("tournament_players")
      .select("player_id, tournaments (id, nombre)")
      .in("player_id", playerIds),
  ]);
  const torneosPorJugador = agruparTorneosPorJugador(inscripciones);

  const idsEnMercado = new Set(playerIds);
  const estadoPorJugador = new Map<string, any>(
    (estadosLiga ?? [])
      .filter((e) => idsEnMercado.has(e.id))
      .map((e): [string, any] => [e.id, e])
  );
  const pujasPorListing = new Map<string, number>(
    ((conteos ?? []) as any[]).map((c): [string, number] => [
      c.market_listing_id,
      c.numero_pujas,
    ])
  );

  return listings
    // Un jugador con dueño en esta liga nunca debe salir en el mercado.
    .filter((l: any) => l.players && !estadoPorJugador.get(l.players.id)?.propietario_team_id)
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
        torneos: torneosPorJugador.get(l.players.id) ?? [],
      };
    });
}

// Pujas de todos los equipos de la liga por los jugadores de la tanda actual,
// de mayor a menor importe. Solo devuelve algo a los miembros de la liga.
export async function fetchPujasMercado(
  supabase: Supabase,
  leagueId: string
): Promise<PujaMercado[]> {
  const { data, error } = await supabase.rpc("pujas_del_mercado", {
    p_league_id: leagueId,
  });

  if (error || !data) return [];

  return (data as any[]).map((b) => ({
    listingId: b.market_listing_id,
    equipoId: b.fantasy_team_id,
    nombreEquipo: b.nombre_equipo,
    importe: Number(b.importe),
    esMia: Boolean(b.es_mia),
  }));
}

export async function fetchMisOfertas(
  supabase: Supabase,
  equipoId: string
): Promise<OfertaPendiente[]> {
  const { data, error } = await supabase
    .from("player_offers")
    .select("id, player_id, importe")
    .eq("equipo_oferente_id", equipoId)
    .eq("estado", "pendiente");

  if (error || !data) return [];

  return data.map((o: any) => ({
    id: o.id,
    jugadorId: o.player_id,
    importe: Number(o.importe),
  }));
}

// Ofertas directas que han recibido TUS jugadores (de otros equipos),
// todavía pendientes de que decidas. Distinto de fetchMisOfertas, que
// es al revés (lo que tú has ofertado por jugadores ajenos).
export async function fetchOfertasRecibidas(
  supabase: Supabase,
  equipoId: string
): Promise<OfertaRecibida[]> {
  const { data: misSlots } = await supabase
    .from("squad_slots")
    .select("player_id")
    .eq("fantasy_team_id", equipoId)
    .is("fecha_salida", null);

  const playerIds = (misSlots ?? []).map((s: any) => s.player_id);
  if (playerIds.length === 0) return [];

  const { data, error } = await supabase
    .from("player_offers")
    .select(
      "id, importe, created_at, player_id, equipo_oferente_id, players (nombre), fantasy_teams!equipo_oferente_id (nombre)"
    )
    .in("player_id", playerIds)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as any[])
    .filter((o) => o.players && o.fantasy_teams)
    .map((o) => ({
      id: o.id,
      jugadorId: o.player_id,
      jugadorNombre: o.players.nombre,
      equipoOferenteId: o.equipo_oferente_id,
      equipoOferenteNombre: o.fantasy_teams.nombre,
      importe: Number(o.importe),
      creada: o.created_at,
    }));
}

export async function fetchNotificaciones(
  supabase: Supabase,
  leagueId: string,
  equipoId: string,
  // Si se indica, solo estos tipos (la liga pública solo enseña los ingresos por ronda).
  soloTipos?: TipoNotificacion[]
): Promise<{ notificaciones: Notificacion[]; vistasEn: number }> {
  let consulta = supabase
    .from("notificaciones")
    .select(
      "id, tipo, actor_team_id, objetivo_team_id, player_id, importe, datos, created_at, players (nombre), actor:fantasy_teams!actor_team_id (nombre), objetivo:fantasy_teams!objetivo_team_id (nombre)"
    )
    .eq("league_id", leagueId);
  if (soloTipos) consulta = consulta.in("tipo", soloTipos);

  const [{ data, error }, { data: equipo }] = await Promise.all([
    consulta.order("created_at", { ascending: false }).limit(50),
    supabase
      .from("fantasy_teams")
      .select("notificaciones_vistas_en")
      .eq("id", equipoId)
      .maybeSingle(),
  ]);

  const vistasEn = equipo?.notificaciones_vistas_en
    ? Date.parse(equipo.notificaciones_vistas_en)
    : Date.now();

  if (error || !data) return { notificaciones: [], vistasEn };

  return {
    vistasEn,
    notificaciones: (data as any[]).map((n) => ({
      id: n.id,
      tipo: n.tipo,
      actorId: n.actor_team_id,
      actorNombre: n.actor?.nombre ?? "Un equipo",
      objetivoId: n.objetivo_team_id,
      objetivoNombre: n.objetivo?.nombre ?? null,
      jugadorId: n.player_id,
      jugadorNombre: n.players?.nombre ?? "un jugador",
      importe: n.importe === null ? null : Number(n.importe),
      creada: n.created_at,
      datosElo:
        n.tipo === "actualizacion_elo" && n.datos
          ? {
              periodo: n.datos.periodo,
              valorAntes: Number(n.datos.valor_antes ?? 0),
              valorDespues: Number(n.datos.valor_despues ?? 0),
              jugadoresConCambio: Number(n.datos.jugadores_con_cambio ?? 0),
              mejor: n.datos.mejor ?? null,
              peor: n.datos.peor ?? null,
              jugadoresActualizados: Number(n.datos.jugadores_actualizados ?? 0),
            }
          : null,
      datosPago:
        n.tipo === "pago_jornada" && n.datos
          ? {
              jornada: n.datos.jornada != null ? Number(n.datos.jornada) : null,
              puntos: Number(n.datos.puntos ?? 0),
              correccion: Boolean(n.datos.correccion),
            }
          : null,
    })),
  };
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

// Avatar de perfil elegido (id de lib/avatares.ts) o null. Ver 0077.
export async function fetchMiAvatar(
  supabase: Supabase,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return (data.avatar as string | null) ?? null;
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

// Nombra (o quita) al capitán. La base de datos se encarga de que solo haya
// uno por equipo y de que sea titular (ver validar_capitan en 0033).
export async function toggleCapitanDB(
  supabase: Supabase,
  equipoId: string,
  playerId: string,
  nuevoValor: boolean
): Promise<ResultadoAccion> {
  const { error } = await supabase
    .from("squad_slots")
    .update({ capitan: nuevoValor })
    .eq("fantasy_team_id", equipoId)
    .eq("player_id", playerId)
    .is("fecha_salida", null);

  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}

export async function blindarJugadorDB(
  supabase: Supabase,
  playerId: string,
  leagueId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("blindar_jugador", {
    p_player_id: playerId,
    p_league_id: leagueId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

// Vende al valor de mercado, al instante y de forma atómica, en cualquier tipo de
// liga (ver vender_jugador en 0036 y 0083). El importe lo calcula el servidor.
export async function venderJugadorDB(
  supabase: Supabase,
  playerId: string,
  leagueId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("vender_jugador", {
    p_player_id: playerId,
    p_league_id: leagueId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
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

export async function subirClausulaDB(
  supabase: Supabase,
  playerId: string,
  leagueId: string,
  importe: number
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("subir_clausula", {
    p_player_id: playerId,
    p_league_id: leagueId,
    p_importe: importe,
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

export async function cancelarPujaMercadoDB(
  supabase: Supabase,
  listingId: string,
  leagueId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("cancelar_puja_mercado", {
    p_listing_id: listingId,
    p_league_id: leagueId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function cancelarOfertaDB(
  supabase: Supabase,
  ofertaId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("cancelar_oferta", {
    p_offer_id: ofertaId,
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

export async function aceptarOfertaDB(
  supabase: Supabase,
  ofertaId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("aceptar_oferta", {
    p_offer_id: ofertaId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function rechazarOfertaDB(
  supabase: Supabase,
  ofertaId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("rechazar_oferta", {
    p_offer_id: ofertaId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

// Devuelve el instante (ms) que ha guardado el servidor como "visto".
export async function marcarNotificacionesVistasDB(
  supabase: Supabase,
  leagueId: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc("marcar_notificaciones_vistas", {
    p_league_id: leagueId,
  });

  if (error || !data) return null;
  return Date.parse(data as string);
}

export async function eliminarMiCuentaDB(
  supabase: Supabase
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("eliminar_mi_cuenta");

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

// La JORNADA es el fin de semana completo (todos sus torneos); la RONDA es
// una fila de matchdays. Esto dice a qué jornada pertenece cada ronda.
export interface JornadaFinde {
  semana: string; // el sábado, "YYYY-MM-DD"
  numero: number; // jornada 1, 2, 3...
  cerradaEn: string | null;
}

export async function fetchJornadasSemanales(
  supabase: Supabase
): Promise<Record<string, JornadaFinde>> {
  const { data, error } = await supabase.rpc("jornadas_semanales");
  const porRonda: Record<string, JornadaFinde> = {};
  if (error || !data) return porRonda;
  for (const r of data as any[]) {
    porRonda[r.matchday_id] = {
      semana: r.semana,
      numero: Number(r.numero),
      cerradaEn: r.terminada_en ?? null,
    };
  }
  return porRonda;
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
    equipoId: e.equipo_id as string,
    nombreEquipo: e.nombre_equipo,
    nombreManager: (e.nombre_manager ?? undefined) as string | undefined,
    puntos: e.puntos_totales,
    esMiEquipo: miEquipoId ? e.equipo_id === miEquipoId : false,
    historialPuntos: (e.historial_puntos ?? []) as PuntosJornada[],
  }));
}

export interface JugadorPlantillaAjena {
  id: string;
  nombre: string;
  club: string;
  categoria: Categoria;
  elo: number;
  valorMercado: number;
  puntosTotales: number;
  historialPuntos: PuntosJornada[];
  proximosRivales?: ProximoRival[];
}

// Liga pública: plantilla de otro manager (ver plantilla_equipo_publica en
// 0037). No incluye titulares ni capitán.
export async function fetchPlantillaEquipoPublicaDB(
  supabase: Supabase,
  equipoId: string
): Promise<JugadorPlantillaAjena[] | null> {
  const { data, error } = await supabase.rpc("plantilla_equipo_publica", {
    p_equipo_id: equipoId,
  });
  if (error || !data) return null;

  // Si falla, simplemente no se muestran rivales.
  const rivales = await fetchProximosRivales(supabase).catch(
    () => ({} as Record<string, ProximoRival[]>)
  );

  return (data as any[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    club: p.club ?? "",
    categoria: Number(p.categoria) as Categoria,
    elo: p.elo,
    valorMercado: Number(p.valor_mercado),
    puntosTotales: p.puntos_totales,
    historialPuntos: (p.historial_puntos ?? []) as PuntosJornada[],
    proximosRivales: rivales[p.id] ?? [],
  }));
}

export async function crearLigaDB(
  supabase: Supabase,
  nombreLiga: string,
  nombreEquipo: string,
  // Solo root: liga privada de prueba en otro territorio (parámetros opcionales de crear_liga, 0095).
  territorio?: { ambito: "provincia" | "comunidad"; region: string }
): Promise<ResultadoAccion & { codigo?: string; liga_id?: string }> {
  const { data, error } = await supabase.rpc(
    "crear_liga",
    territorio
      ? {
          p_nombre_liga: nombreLiga,
          p_nombre_equipo: nombreEquipo,
          p_ambito: territorio.ambito,
          p_region: territorio.region,
        }
      : { p_nombre_liga: nombreLiga, p_nombre_equipo: nombreEquipo }
  );

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion & { codigo?: string; liga_id?: string };
}

export async function unirseLigaDB(
  supabase: Supabase,
  codigo: string,
  nombreEquipo: string
): Promise<ResultadoAccion & { liga_id?: string }> {
  const { data, error } = await supabase.rpc("unirse_liga", {
    p_codigo: codigo,
    p_nombre_equipo: nombreEquipo,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion & { liga_id?: string };
}

// Entra en la liga pública "todos contra todos": mismo presupuesto para todos
// y sin plantilla inicial.
export async function unirseLigaPublicaDB(
  supabase: Supabase,
  nombreEquipo: string
): Promise<ResultadoAccion & { liga_id?: string }> {
  const { data, error } = await supabase.rpc("unirse_liga_publica", {
    p_nombre_equipo: nombreEquipo,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion & { liga_id?: string };
}

export async function salirLigaDB(
  supabase: Supabase,
  ligaId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("salir_liga", {
    p_league_id: ligaId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}


// Perfil de un manager (ver perfil_manager en 0043). null si no existe o si no
// compartes liga con él.
export async function fetchPerfilManager(
  supabase: Supabase,
  equipoId: string
): Promise<PerfilManager | null> {
  const { data, error } = await supabase.rpc("perfil_manager", { p_equipo_id: equipoId });
  const fila = (data as any[] | null)?.[0];
  if (error || !fila) return null;

  return {
    equipoId: fila.equipo_id,
    nombreEquipo: fila.nombre_equipo,
    nombreManager: fila.nombre_manager,
    ligaNombre: fila.liga_nombre,
    ligaPublica: Boolean(fila.liga_publica),
    miembroDesde: fila.miembro_desde,
    ligasGanadas: Number(fila.ligas_ganadas ?? 0),
    ligasJugadas: Number(fila.ligas_jugadas ?? 0),
    puntosTotales: Number(fila.puntos_totales ?? 0),
    mejorJornada: Number(fila.mejor_jornada ?? 0),
    esMio: Boolean(fila.es_mio),
  };
}

// Valor de la plantilla día a día (ver evolucion_valor_plantilla en 0043).
export async function fetchEvolucionValorPlantilla(
  supabase: Supabase,
  equipoId: string
): Promise<PuntoValorPlantilla[]> {
  const { data, error } = await supabase.rpc("evolucion_valor_plantilla", {
    p_equipo_id: equipoId,
  });
  if (error || !data) return [];

  return (data as any[]).map((d) => ({
    dia: d.dia as string,
    valor: Number(d.valor),
    jugadores: Number(d.jugadores),
  }));
}


// ---------- Cuenta: nombre de usuario y contraseña ----------

// Cuándo podrá volver a cambiar su nombre el usuario (null = ya puede).
// Ver proximo_cambio_nombre_usuario en 0050.
export async function fetchProximoCambioNombre(supabase: Supabase): Promise<Date | null> {
  const { data, error } = await supabase.rpc("proximo_cambio_nombre_usuario");
  if (error || !data) return null;
  return new Date(data as string);
}

// Cambia el nombre de usuario. La base de datos valida formato, unicidad (sin
// distinguir mayúsculas) y el máximo de un cambio por semana (0050).
export async function cambiarNombreUsuarioDB(
  supabase: Supabase,
  nombre: string
): Promise<(ResultadoAccion & { nombre?: string; puede_cambiar_desde?: string })> {
  const { data, error } = await supabase.rpc("cambiar_nombre_usuario", { p_nombre: nombre });
  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion & { nombre?: string; puede_cambiar_desde?: string };
}

// Elige (o quita, con null) el avatar de perfil. De momento solo root (0077).
export async function cambiarAvatarDB(
  supabase: Supabase,
  avatar: string | null
): Promise<ResultadoAccion & { avatar?: string | null }> {
  const { data, error } = await supabase.rpc("cambiar_avatar", { p_avatar: avatar });
  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion & { avatar?: string | null };
}

// Cambia la contraseña tras comprobar la actual (así una sesión abierta y
// olvidada en otro dispositivo no basta para quedarse con la cuenta).
export async function cambiarPasswordDB(
  supabase: Supabase,
  actual: string,
  nueva: string
): Promise<ResultadoAccion> {
  const { data: usuario } = await supabase.auth.getUser();
  const email = usuario.user?.email;
  if (!email) return { ok: false, mensaje: "No has iniciado sesión." };

  const { error: errorActual } = await supabase.auth.signInWithPassword({
    email,
    password: actual,
  });
  if (errorActual) return { ok: false, mensaje: "La contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { ok: false, mensaje: error.message };
  return { ok: true };
}