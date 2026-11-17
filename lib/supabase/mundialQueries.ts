import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Evento "Campeonato del Mundo: Gukesh vs Sindarov" (ver 0141_evento_mundial.sql).
// Todo pasa por funciones del servidor: el cierre de los pronósticos, los puntos y los
// permisos de administración los valida la base de datos, no la pantalla.

export type ResultadoPartida = "tablas" | "gukesh" | "sindarov";
export type TipoEntrada = "partida" | "descanso" | "desempate";

export interface MundialConfig {
  activo: boolean;
  // Match en lugar de Plantilla y Mercado oculto.
  modoMatch: boolean;
}

export interface VotosPartida {
  tablas: number;
  gukesh: number;
  sindarov: number;
  total: number;
}

export interface EntradaCalendario {
  id: string;
  tipo: TipoEntrada;
  numero: number | null;
  fecha: string; // "YYYY-MM-DD"
  inicio: string | null; // ISO
  cierre: string | null; // ISO: hasta cuándo se puede pronosticar
  resultado: ResultadoPartida | null;
  cerrada: boolean;
  miPronostico: ResultadoPartida | null;
  acierto: boolean | null;
  votos: VotosPartida | null; // solo cuando ya está cerrada
}

export interface VotacionFinal {
  desempateActivo: boolean;
  inicio: string | null;
  cierre: string | null;
  cerrada: boolean;
  miVoto: "gukesh" | "sindarov" | null;
  resultado: "gukesh" | "sindarov" | null;
  acierto: boolean | null;
  votos: { gukesh: number; sindarov: number; total: number } | null;
}

export interface EstadoMatch {
  activo: boolean;
  nombre: string;
  ahora: string; // reloj del servidor (ISO), para la cuenta atrás
  cierreMinutos: number;
  calendario: EntradaCalendario[];
  marcador: { gukesh: number; sindarov: number; jugadas: number };
  misPuntos: number;
  misAciertos: number;
  misResueltas: number;
  racha: number;
  mejorRacha: number;
  final: VotacionFinal;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas jsonb de la base de datos */
function leerEntrada(e: any): EntradaCalendario {
  return {
    id: e.id,
    tipo: e.tipo,
    numero: e.numero ?? null,
    fecha: e.fecha,
    inicio: e.inicio ?? null,
    cierre: e.cierre ?? null,
    resultado: e.resultado ?? null,
    cerrada: !!e.cerrada,
    miPronostico: e.mi_pronostico ?? null,
    acierto: e.acierto ?? null,
    votos: e.votos ?? null,
  };
}

export async function fetchMundialConfig(supabase: Supabase): Promise<MundialConfig> {
  const { data, error } = await supabase.rpc("mundial_config");
  if (error || !data) return { activo: false, modoMatch: false };
  return { activo: !!(data as any).activo, modoMatch: !!(data as any).modo_match };
}

export async function fetchMatch(supabase: Supabase): Promise<EstadoMatch | null> {
  const { data, error } = await supabase.rpc("mundial_match");
  if (error || !data) return null;
  const d = data as any;
  if (!d.activo) return null;
  return {
    activo: true,
    nombre: d.nombre,
    ahora: d.ahora,
    cierreMinutos: d.cierre_minutos,
    calendario: (d.partidas ?? []).map(leerEntrada),
    marcador: d.marcador,
    misPuntos: d.mis_puntos,
    misAciertos: d.mis_aciertos,
    misResueltas: d.mis_resueltas,
    racha: d.racha,
    mejorRacha: d.mejor_racha,
    final: {
      desempateActivo: !!d.final.desempate_activo,
      inicio: d.final.inicio ?? null,
      cierre: d.final.cierre ?? null,
      cerrada: !!d.final.cerrada,
      miVoto: d.final.mi_voto ?? null,
      resultado: d.final.resultado ?? null,
      acierto: d.final.acierto ?? null,
      votos: d.final.votos ?? null,
    },
  };
}

export type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

function aResultado(error: unknown, data: any): ResultadoAccion {
  if (error || !data) return { ok: false, mensaje: "No se pudo completar la acción." };
  return data.ok ? { ok: true } : { ok: false, mensaje: data.mensaje ?? "No se pudo completar la acción." };
}

export async function guardarPronosticoMundial(
  supabase: Supabase,
  partidaId: string,
  pronostico: ResultadoPartida | null
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("guardar_pronostico_mundial", {
    p_partida: partidaId,
    p_pronostico: pronostico,
  });
  return aResultado(error, data);
}

export async function guardarVotoFinalMundial(
  supabase: Supabase,
  voto: "gukesh" | "sindarov" | null
): Promise<ResultadoAccion> {
  const { data, error } = await supabase.rpc("guardar_voto_final_mundial", { p_voto: voto });
  return aResultado(error, data);
}

// Histórico de clasificaciones ------------------------------------------------------------

export interface ItemHistorico {
  id: string; // uuid del archivo, o "mundial"
  nombre: string;
  tipo: "liga" | "mundial";
  fecha: string;
}

export interface FilaHistorico {
  posicion: number;
  nombreEquipo: string | null;
  nombreManager: string | null;
  puntos: number;
  aciertos: number | null;
  jugadas: number | null;
  esYo: boolean;
}

export async function fetchHistoricoLista(supabase: Supabase): Promise<ItemHistorico[]> {
  const { data, error } = await supabase.rpc("historico_clasificaciones");
  if (error || !data) return [];
  return (data as any[]).map((f) => ({
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    fecha: f.fecha,
  }));
}

export async function fetchHistoricoClasificacion(
  supabase: Supabase,
  id: string
): Promise<FilaHistorico[]> {
  const { data, error } = await supabase.rpc("historico_clasificacion", { p_id: id });
  if (error || !data) return [];
  return (data as any[]).map((f) => ({
    posicion: f.posicion,
    nombreEquipo: f.nombre_equipo ?? null,
    nombreManager: f.nombre_manager ?? null,
    puntos: f.puntos,
    aciertos: f.aciertos ?? null,
    jugadas: f.jugadas ?? null,
    esYo: !!f.es_yo,
  }));
}

// Administración (todas comprueban es_root() en la base de datos) ---------------------------

export interface AdminPartida {
  id: string;
  tipo: TipoEntrada;
  numero: number | null;
  fecha: string;
  inicio: string | null;
  resultado: ResultadoPartida | null;
  pronosticos: number;
  votos: { tablas: number; gukesh: number; sindarov: number };
}

export interface AdminMundial {
  evento: {
    nombre: string;
    activo: boolean;
    modoMatch: boolean;
    cierreMinutos: number;
    desempateActivo: boolean;
    resultadoFinal: "gukesh" | "sindarov" | null;
    saldoEvento: number;
    iniciadoEn: string | null;
    cerradoEn: string | null;
    saldosAplicadosEn: string | null;
    saldosRestauradosEn: string | null;
    iconoConcedidoEn: string | null;
  };
  partidas: AdminPartida[];
  participantes: number;
  votosFinal: { gukesh: number; sindarov: number };
  saldosRespaldados: number;
  saldosPendientesRestaurar: number;
  iconosConcedidos: number;
  jugadores: { id: string; nombre: string; elo: number; valorMercado: number; activo: boolean }[];
}

export async function fetchAdminMundial(supabase: Supabase): Promise<AdminMundial | null> {
  const { data, error } = await supabase.rpc("admin_mundial_estado");
  const d = data as any;
  if (error || !d || !d.ok) return null;
  const e = d.evento;
  return {
    evento: {
      nombre: e.nombre,
      activo: e.activo,
      modoMatch: e.modo_match,
      cierreMinutos: e.cierre_minutos,
      desempateActivo: e.desempate_activo,
      resultadoFinal: e.resultado_final ?? null,
      saldoEvento: Number(e.saldo_evento),
      iniciadoEn: e.iniciado_en ?? null,
      cerradoEn: e.cerrado_en ?? null,
      saldosAplicadosEn: e.saldos_aplicados_en ?? null,
      saldosRestauradosEn: e.saldos_restaurados_en ?? null,
      iconoConcedidoEn: e.icono_concedido_en ?? null,
    },
    partidas: (d.partidas ?? []).map((p: any) => ({
      id: p.id,
      tipo: p.tipo,
      numero: p.numero ?? null,
      fecha: p.fecha,
      inicio: p.inicio ?? null,
      resultado: p.resultado ?? null,
      pronosticos: Number(p.pronosticos ?? 0),
      votos: p.votos ?? { tablas: 0, gukesh: 0, sindarov: 0 },
    })),
    participantes: Number(d.participantes ?? 0),
    votosFinal: d.votos_final ?? { gukesh: 0, sindarov: 0 },
    saldosRespaldados: Number(d.saldos_respaldados ?? 0),
    saldosPendientesRestaurar: Number(d.saldos_pendientes_restaurar ?? 0),
    iconosConcedidos: Number(d.iconos_concedidos ?? 0),
    jugadores: (d.jugadores ?? []).map((j: any) => ({
      id: j.id,
      nombre: j.nombre,
      elo: j.elo,
      valorMercado: Number(j.valor_mercado),
      activo: j.activo,
    })),
  };
}

export interface ParticipanteAdmin {
  userId: string;
  nombre: string;
  pronosticos: number;
  aciertos: number;
  puntos: number;
  votoFinal: string | null;
  icono: boolean;
}

export async function fetchAdminParticipantes(supabase: Supabase): Promise<ParticipanteAdmin[]> {
  const { data, error } = await supabase.rpc("admin_mundial_participantes");
  if (error || !data) return [];
  return (data as any[]).map((f) => ({
    userId: f.user_id,
    nombre: f.nombre,
    pronosticos: f.pronosticos,
    aciertos: f.aciertos,
    puntos: f.puntos,
    votoFinal: f.voto_final ?? null,
    icono: !!f.icono,
  }));
}

export type RespuestaAdmin = { ok: true; datos: Record<string, any> } | { ok: false; mensaje: string };

function aRespuesta(error: unknown, data: any): RespuestaAdmin {
  if (error || !data) return { ok: false, mensaje: "No se pudo completar la acción." };
  return data.ok ? { ok: true, datos: data } : { ok: false, mensaje: data.mensaje ?? "No se pudo completar la acción." };
}

export async function adminMundialAjustes(
  supabase: Supabase,
  a: { cierreMinutos?: number; modoMatch?: boolean; desempateActivo?: boolean; saldoEvento?: number }
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_ajustes", {
    p_cierre_minutos: a.cierreMinutos ?? null,
    p_modo_match: a.modoMatch ?? null,
    p_desempate_activo: a.desempateActivo ?? null,
    p_saldo_evento: a.saldoEvento ?? null,
  });
  return aRespuesta(error, data);
}

export async function adminMundialPartidaGuardar(
  supabase: Supabase,
  partidaId: string,
  fecha: string,
  inicioIso: string | null
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_partida_guardar", {
    p_partida: partidaId,
    p_fecha: fecha,
    p_inicio: inicioIso,
  });
  return aRespuesta(error, data);
}

export async function adminMundialResultadoPartida(
  supabase: Supabase,
  partidaId: string,
  resultado: ResultadoPartida | null
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_resultado_partida", {
    p_partida: partidaId,
    p_resultado: resultado,
  });
  return aRespuesta(error, data);
}

export async function adminMundialResultadoFinal(
  supabase: Supabase,
  ganador: "gukesh" | "sindarov" | null
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_resultado_final", { p_ganador: ganador });
  return aRespuesta(error, data);
}

export async function adminMundialActivar(
  supabase: Supabase,
  aplicarSaldos: boolean,
  soloPublicas: boolean
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_activar", {
    p_aplicar_saldos: aplicarSaldos,
    p_solo_publicas: soloPublicas,
  });
  return aRespuesta(error, data);
}

export async function adminMundialCerrar(
  supabase: Supabase,
  restaurarSaldos: boolean,
  conservarVariaciones: boolean
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_cerrar", {
    p_restaurar_saldos: restaurarSaldos,
    p_conservar_variaciones: conservarVariaciones,
  });
  return aRespuesta(error, data);
}

export async function adminMundialConcederIcono(supabase: Supabase): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_mundial_conceder_icono");
  return aRespuesta(error, data);
}

export async function adminArchivarClasificacion(
  supabase: Supabase,
  ligaId: string,
  nombre: string
): Promise<RespuestaAdmin> {
  const { data, error } = await supabase.rpc("admin_archivar_clasificacion", {
    p_league_id: ligaId,
    p_nombre: nombre,
  });
  return aRespuesta(error, data);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
