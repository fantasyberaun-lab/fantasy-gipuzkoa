// Capa de datos: todo lo que antes vivía como arrays fijos en mockData.ts
// ahora se lee y se escribe aquí contra Supabase. GameStateProvider llama
// a estas funciones y no habla con Supabase directamente en ningún otro
// sitio, para que quede todo en un solo lugar si el esquema cambia.

import type { createClient } from "@/lib/supabase/client";
import type {
  Categoria,
  EquipoManager,
  JugadorLiga,
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
    .select("id, nombre, presupuesto")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
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

  // Todos los resultados de esos jugadores, con el número de jornada, para
  // poder sacar tanto "puntos de esta jornada" y las bolitas de forma
  // reciente como el historial completo para el gráfico. Si aún no hay
  // jornadas jugadas, esto simplemente vuelve vacío y todos aparecen a 0.
  const { data: resultados } = await supabase
    .from("results")
    .select("player_id, resultado, puntos_fantasy, matchdays (numero)")
    .in("player_id", playerIds);

  const resultadosAscendentes = (resultados ?? []).slice().sort((a: any, b: any) => {
    const numA = a.matchdays?.numero ?? 0;
    const numB = b.matchdays?.numero ?? 0;
    return numA - numB; // jornada 1 primero, para el gráfico e histórico
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
          // players.categoria es un enum de texto ('1'/'2'/'3') en Postgres;
          // PostgREST lo devuelve como string. Lo convertimos a número aquí
          // para que coincida con el tipo Categoria en toda la app (por
          // ejemplo, plantilla/page.tsx compara "categoria === 3").
          categoria: Number(s.players.categoria) as Categoria,
          elo: s.players.elo,
          valorMercado: Number(s.players.valor_mercado),
          activo: s.players.activo,
        },
        puntosJornada: masReciente ? masReciente.puntos_fantasy : 0,
        // TODO: no hay histórico de valor de mercado guardado todavía;
        // en cuanto exista una tabla que registre la evolución jornada a
        // jornada, sustituir este 0 por la variación real.
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
  miEquipoId: string | null
): Promise<JugadorLiga[]> {
  const { data, error } = await supabase
    .from("player_status")
    .select("*")
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

export async function fetchMercado(supabase: Supabase): Promise<JugadorLiga[]> {
  // Jugadores libres = misma vista player_status que usa la pestaña
  // Jugadores, filtrada a los que no tienen equipo. No hace falta una
  // tabla de listings poblada a mano: en cuanto un jugador se queda sin
  // propietario (porque nadie lo ha fichado o alguien lo ha vendido),
  // aparece aquí automáticamente.
  const { data, error } = await supabase
    .from("player_status")
    .select("*")
    .is("propietario_team_id", null)
    .order("valor_mercado", { ascending: false });

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
    propietario: null,
    esMiEquipo: false,
    historialPuntos: (p.historial_puntos ?? []) as PuntosJornada[],
  }));
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
  playerId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("pagar_clausula", {
    p_player_id: playerId,
  });

  if (error) return { ok: false, mensaje: error.message };
  return data as ResultadoAccion;
}

export async function ficharJugadorDB(
  supabase: Supabase,
  playerId: string
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("fichar_jugador", {
    p_player_id: playerId,
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
