import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Minijuegos (ver 0098_minijuegos.sql). Todo pasa por funciones del servidor: la
// web nunca ve las respuestas y la puntuación (acierto y velocidad) la calcula la
// base de datos con su propio reloj.
export type JuegoId =
  | "hol"
  | "elo"
  | "orden"
  | "adivina"
  | "acierta"
  | "precio"
  | "impostor"
  | "parejas";
export type TipoPartida = "diaria" | "libre";
export type ModoJuego = "estandar" | "leyenda";
export type PeriodoRanking = "dia" | "general";
export type JuegoRanking = JuegoId | "total";

// Aviso a la cabecera y al panel de que algo ha cambiado (puntos, cofre...).
export const EVENTO_MINIJUEGOS = "fantasy:minijuegos";

export interface EstadoJuego {
  id: JuegoId;
  jugada: boolean; // la partida del día ya terminó
  enCurso: boolean; // hay una partida del día a medias
  intento: number;
  puntos: number; // mejor puntuación de hoy
  recompensa: { monedas: number; xp: number } | null;
}

export interface RachaReparable {
  racha: number; // racha anterior
  rachaNueva: number;
}

export interface EstadoMinijuegos {
  activo: boolean;
  juegos: EstadoJuego[];
  completados: number;
  totalJuegos: number;
  monedasHoy: number;
  topeMonedas: number;
  xpHoy: number;
  topeXp: number;
  monedasPorJuego: number;
  monedasPorJuegoPublica: number;
  xpPorJuego: number;
  cofreDisponible: boolean;
  cofreAbierto: boolean;
  cofrePremio: { tipo: PremioCofre; monedas: number; xp: number } | null;
  reparadores: number;
  reintentos: number;
  rachaReparable: RachaReparable | null;
  eloRondas: number;
  eloSegundos: number;
  ordenRondas: number;
  ordenSegundos: number;
  holCadena: number;
  posGeneral: number | null;
  puntosGeneral: number;
  participantes: number;
}

export type PremioCofre = "monedas" | "reparador" | "reintento";

export interface PreguntaHol {
  tipo: "hol";
  indice: number;
  total: number;
  aciertos: number;
  actual: { nombre: string; elo: number };
  siguiente: { nombre: string };
}

export interface PreguntaElo {
  tipo: "elo";
  indice: number;
  total: number;
  nombre: string;
  segundos: number;
  restante: number;
}

export interface PreguntaOrden {
  tipo: "orden";
  indice: number;
  total: number;
  jugadores: string[]; // en el orden en que se enseñan (al azar)
  segundos: number;
  restante: number;
}

// Ficha de un jugador en los juegos de cartas (el valor solo sale cuando no es la respuesta).
export interface CartaJugador {
  nombre: string;
  elo: number;
  club: string | null;
  categoria: string | null;
  valor?: number | null;
  anio?: number | null; // solo mayores de 20
}

interface PreguntaConTiempo {
  indice: number;
  total: number;
  segundos: number; // límite, o tiempo de referencia si no hay cronómetro
  restante: number | null; // null: sin cronómetro
  sinLimite: boolean;
}

export interface PreguntaAdivina extends PreguntaConTiempo {
  tipo: "adivina";
  pista: { elo: number; club: string | null; categoria: string | null; valor: number | null };
  opciones: string[];
}

export interface PreguntaAcierta extends PreguntaConTiempo {
  tipo: "acierta";
  descripcion: string;
  opciones: string[];
}

export interface PreguntaPrecio extends PreguntaConTiempo {
  tipo: "precio";
  jugadores: CartaJugador[];
}

export interface PreguntaImpostor extends PreguntaConTiempo {
  tipo: "impostor";
  jugadores: CartaJugador[];
}

export interface PreguntaParejas extends PreguntaConTiempo {
  tipo: "parejas";
  cartas: CartaJugador[];
}

export type Pregunta =
  | PreguntaHol
  | PreguntaElo
  | PreguntaOrden
  | PreguntaAdivina
  | PreguntaAcierta
  | PreguntaPrecio
  | PreguntaImpostor
  | PreguntaParejas;

export type RelacionPareja = "club" | "categoria" | "elo" | "valor" | "anio";

// Lo que el servidor revela tras cada respuesta (según el juego).
export interface Revelado {
  nombre?: string;
  elo?: number;
  respuesta?: number | null; // elo exacto y precio
  jugadores?: { nombre: string; elo?: number; valor?: number }[]; // orden (menor a mayor Elo) y precio
  orden?: number[]; // ordena por Elo: lo que enviaste (posiciones de menor a mayor)
  correcta?: number; // adivina y acierta: opción correcta
  elegida?: number | null; // adivina, acierta e impostor: opción que enviaste
  total?: number; // precio: suma real
  impostor?: number; // impostor: posición del impostor
  regla?: "club" | "categoria" | "elo"; // impostor
  clave?: string; // impostor: club o categoría que comparten los otros tres
  validas?: number; // parejas: parejas bien unidas
  soluciones?: { a: number; b: number; regla: RelacionPareja }[]; // parejas
  enviadas?: number[][]; // parejas: lo que enviaste
  cartas?: { nombre: string }[]; // parejas: nombres en el orden del tablero
}

export interface FinalPartida {
  puntos: number;
  ranked: boolean;
  mejora: boolean;
  recompensa: { monedas: number; xp: number; topeMonedas: boolean; topeXp: boolean } | null;
  cofreDisponible: boolean;
}

export type ResultadoInicio =
  | {
      ok: true;
      partida: string;
      juego: JuegoId;
      modo: ModoJuego;
      ranked: boolean;
      intento: number;
      reanudada: boolean;
      puntos: number;
      pregunta: Pregunta;
    }
  | { ok: false; mensaje: string };

export type ResultadoRespuesta =
  | {
      ok: true;
      correcta: boolean;
      puntosRonda: number;
      puntos: number;
      aciertos: number;
      revelado: Revelado;
      terminada: boolean;
      final: FinalPartida | null;
      pregunta: Pregunta | null;
    }
  | { ok: false; mensaje: string };

export interface FilaRanking {
  pos: number;
  nombre: string;
  avatar: string | null;
  nivel: number;
  puntos: number;
  yo: boolean;
}

export interface Ranking {
  filas: FilaRanking[];
  mi: { pos: number; puntos: number } | null;
  participantes: number;
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function final(d: Json | null): FinalPartida | null {
  if (!d) return null;
  const r = d.recompensa as Json | null;
  return {
    puntos: Number(d.puntos),
    ranked: Boolean(d.ranked),
    mejora: Boolean(d.mejora),
    recompensa: r
      ? {
          monedas: Number(r.monedas),
          xp: Number(r.xp),
          topeMonedas: Boolean(r.tope_monedas),
          topeXp: Boolean(r.tope_xp),
        }
      : null,
    cofreDisponible: Boolean(d.cofre_disponible),
  };
}

// Las preguntas de los juegos nuevos traen "sin_limite"; el resto llega tal cual.
function pregunta(d: Json): Pregunta {
  if ("sin_limite" in d) {
    const { sin_limite, ...resto } = d;
    return { ...resto, sinLimite: Boolean(sin_limite) } as Pregunta;
  }
  return d as Pregunta;
}

export async function fetchEstadoMinijuegos(supabase: Supabase): Promise<EstadoMinijuegos | null> {
  const { data, error } = await supabase.rpc("mj_estado");
  if (error || !data) return null;
  const d = data as Json;
  const objetos = (d.objetos ?? {}) as Json;
  const rep = d.racha_reparable as Json | null;
  const premio = d.cofre_premio as Json | null;
  return {
    activo: Boolean(d.activo),
    juegos: ((d.juegos ?? []) as Json[]).map((j) => ({
      id: j.id as JuegoId,
      jugada: Boolean(j.jugada),
      enCurso: Boolean(j.en_curso),
      intento: Number(j.intento),
      puntos: Number(j.puntos),
      recompensa: j.recompensa
        ? { monedas: Number(j.recompensa.monedas), xp: Number(j.recompensa.xp) }
        : null,
    })),
    completados: Number(d.completados),
    totalJuegos: Number(d.total_juegos),
    monedasHoy: Number(d.monedas_hoy),
    topeMonedas: Number(d.tope_monedas),
    xpHoy: Number(d.xp_hoy),
    topeXp: Number(d.tope_xp),
    monedasPorJuego: Number(d.monedas_por_juego),
    monedasPorJuegoPublica: Number(d.monedas_por_juego_publica),
    xpPorJuego: Number(d.xp_por_juego),
    cofreDisponible: Boolean(d.cofre_disponible),
    cofreAbierto: Boolean(d.cofre_abierto),
    cofrePremio: premio
      ? { tipo: premio.tipo as PremioCofre, monedas: Number(premio.monedas), xp: Number(premio.xp) }
      : null,
    reparadores: Number(objetos.reparador ?? 0),
    reintentos: Number(objetos.reintento ?? 0),
    rachaReparable: rep
      ? { racha: Number(rep.racha_anterior), rachaNueva: Number(rep.racha_nueva) }
      : null,
    eloRondas: Number(d.elo_rondas),
    eloSegundos: Number(d.elo_segundos),
    ordenRondas: Number(d.orden_rondas),
    ordenSegundos: Number(d.orden_segundos),
    holCadena: Number(d.hol_cadena),
    posGeneral: d.general?.pos == null ? null : Number(d.general.pos),
    puntosGeneral: Number(d.general?.puntos ?? 0),
    participantes: Number(d.general?.participantes ?? 0),
  };
}

export async function iniciarPartidaDB(
  supabase: Supabase,
  juego: JuegoId,
  tipo: TipoPartida,
  modo: ModoJuego,
  reintento = false,
  idioma = "es"
): Promise<ResultadoInicio> {
  const { data, error } = await supabase.rpc("mj_iniciar", {
    p_juego: juego,
    p_tipo: tipo,
    p_modo: modo,
    p_reintento: reintento,
    p_idioma: idioma,
  });
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Json;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido iniciar la partida.") };
  return {
    ok: true,
    partida: String(d.partida),
    juego: d.juego as JuegoId,
    modo: d.modo as ModoJuego,
    ranked: Boolean(d.ranked),
    intento: Number(d.intento),
    reanudada: Boolean(d.reanudada),
    puntos: Number(d.puntos),
    pregunta: pregunta(d.pregunta as Json),
  };
}

export async function responderPartidaDB(
  supabase: Supabase,
  partida: string,
  respuesta: Record<string, unknown>
): Promise<ResultadoRespuesta> {
  const { data, error } = await supabase.rpc("mj_responder", {
    p_partida: partida,
    p_respuesta: respuesta,
  });
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Json;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido enviar la respuesta.") };
  return {
    ok: true,
    correcta: Boolean(d.correcta),
    puntosRonda: Number(d.puntos_ronda),
    puntos: Number(d.puntos),
    aciertos: Number(d.aciertos),
    revelado: d.revelado as Revelado,
    terminada: Boolean(d.terminada),
    final: final(d.final as Json | null),
    pregunta: d.pregunta ? pregunta(d.pregunta as Json) : null,
  };
}

export type ResultadoCofreMj =
  | { ok: true; premio: PremioCofre; monedas: number; xp: number }
  | { ok: false; mensaje: string };

export async function abrirCofreMinijuegosDB(supabase: Supabase): Promise<ResultadoCofreMj> {
  const { data, error } = await supabase.rpc("mj_abrir_cofre");
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Json;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido abrir el cofre.") };
  return { ok: true, premio: d.premio as PremioCofre, monedas: Number(d.monedas), xp: Number(d.xp) };
}

export async function repararRachaDB(
  supabase: Supabase
): Promise<{ ok: true; racha: number } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("mj_usar_reparador_racha");
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Json;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido reparar la racha.") };
  return { ok: true, racha: Number(d.racha) };
}

export async function fetchRankingMinijuegos(
  supabase: Supabase,
  juego: JuegoRanking,
  periodo: PeriodoRanking
): Promise<Ranking | null> {
  const { data, error } = await supabase.rpc("mj_ranking", { p_juego: juego, p_periodo: periodo });
  if (error || !data) return null;
  const d = data as Json;
  return {
    filas: ((d.filas ?? []) as Json[]).map((f) => ({
      pos: Number(f.pos),
      nombre: String(f.nombre),
      avatar: (f.avatar as string | null) ?? null,
      nivel: Number(f.nivel),
      puntos: Number(f.puntos),
      yo: Boolean(f.yo),
    })),
    mi: d.mi ? { pos: Number(d.mi.pos), puntos: Number(d.mi.puntos) } : null,
    participantes: Number(d.participantes ?? 0),
  };
}
