import type { createClient } from "@/lib/supabase/client";
import { nivelDeXp } from "@/lib/niveles";

type Supabase = ReturnType<typeof createClient>;

// Foros por liga, reacciones y encuestas (ver 0112_foros.sql). Como el chat, todo pasa por
// funciones de la base de datos: el navegador nunca lee ni escribe las tablas.

export const EMOJIS_REACCION = ["👍", "🔥", "😂", "👏", "♟️"] as const;
export type EmojiReaccion = (typeof EMOJIS_REACCION)[number];

export const CATEGORIAS_FORO = ["mercado", "torneos", "estrategia", "propuestas", "otros"] as const;
export type CategoriaForo = (typeof CATEGORIAS_FORO)[number];

export type FiltroForo = "todos" | "mios" | "sin_leer" | "cerrados";
export type OrdenForo = "actividad" | "nuevos" | "respuestas" | "reacciones";

export interface EstadoForo {
  publica: boolean;
  miembro: boolean;
  moderador: "root" | "admin" | null;
  baneadoHasta: string | null;
  baneoMotivo: string | null;
  normasVistas: boolean;
  nivelOk: boolean;
  nivelMinimo: number;
  tituloMin: number;
  tituloMax: number;
  maxInicial: number;
  maxRespuesta: number;
  maxTemasDia: number;
  maxDenunciasDia: number;
  minutosEdicion: number;
}

export interface TemaForo {
  id: number;
  titulo: string | null; // null: tema del sistema o eliminado
  categoria: CategoriaForo;
  sistema: boolean;
  claveSistema: string | null;
  jornada: number | null; // en los hilos automáticos de jornada
  estado: "abierto" | "cerrado";
  fijado: boolean;
  eliminado: boolean;
  autorId: string | null;
  autorNombre: string | null;
  autorAvatar: string | null;
  autorNivel: number;
  respuestas: number;
  ultimaActividad: string;
  creado: string;
  tieneEncuesta: boolean;
  sigue: boolean;
  nuevos: number | null; // null: nunca lo has abierto
}

export interface OpcionEncuesta {
  id: number;
  texto: string;
  votos: number | null; // null mientras no se pueden ver los resultados
}

export interface EncuestaForo {
  cerrada: boolean;
  cierraEn: string | null;
  miVoto: number | null;
  visible: boolean;
  total: number | null;
  opciones: OpcionEncuesta[];
}

export interface DetalleTema {
  id: number;
  ligaId: string;
  titulo: string | null;
  categoria: CategoriaForo;
  sistema: boolean;
  jornada: number | null;
  estado: "abierto" | "cerrado";
  fijado: boolean;
  eliminado: boolean;
  cerradoPorMod: boolean;
  autorId: string | null;
  autorNombre: string | null;
  respuestas: number;
  creado: string;
  encuesta: EncuestaForo | null;
}

export interface MensajeForo {
  id: number;
  userId: string | null; // null: mensaje del sistema
  nombre: string;
  nivel: number;
  avatar: string | null;
  texto: string;
  menciones: string[];
  mencionesNombres: string[];
  creado: string;
  editado: string | null;
  inicial: boolean;
  citaId: number | null;
  citaNombre: string | null;
  citaTexto: string | null; // null si la citada ya no existe
  reacciones: Record<string, number>;
  mia: string | null;
}

export type CodigoErrorForo =
  | "sesion"
  | "no_miembro"
  | "no_existe"
  | "bloqueado"
  | "nivel"
  | "cerrado"
  | "permiso"
  | "vacia"
  | "larga"
  | "enlace"
  | "vetada"
  | "rapido"
  | "limite"
  | "limite_dia"
  | "repetido"
  | "menciones"
  | "cita"
  | "categoria"
  | "titulo_corto"
  | "titulo_largo"
  | "encuesta"
  | "max_fijados"
  | "plazo"
  | "denunciado"
  | "opcion"
  | "ya_votado"
  | "emoji"
  | "propio"
  | "repetida"
  | "red";

export type FalloForo = {
  ok: false;
  codigo: CodigoErrorForo;
  hasta?: string;
  maximo?: number;
  minimo?: number;
  minutos?: number;
  nivelMinimo?: number;
};

export type ResultadoForo<T = unknown> = ({ ok: true } & T) | FalloForo;

function fallo(d: Record<string, unknown> | null): FalloForo {
  if (!d) return { ok: false, codigo: "red" };
  return {
    ok: false,
    codigo: (d.codigo as CodigoErrorForo) ?? "red",
    hasta: (d.hasta as string | undefined) ?? undefined,
    maximo: d.maximo != null ? Number(d.maximo) : undefined,
    minimo: d.minimo != null ? Number(d.minimo) : undefined,
    minutos: d.minutos != null ? Number(d.minutos) : undefined,
    nivelMinimo: d.nivel_minimo != null ? Number(d.nivel_minimo) : undefined,
  };
}

type Dict = Record<string, unknown>;

// --- Estado y lista --------------------------------------------------------------------

export async function fetchEstadoForo(supabase: Supabase, ligaId: string): Promise<EstadoForo | null> {
  const { data, error } = await supabase.rpc("foro_estado", { p_liga: ligaId });
  const d = data as Dict | null;
  if (error || !d || d.ok !== true) return null;
  return {
    publica: Boolean(d.publica),
    miembro: Boolean(d.miembro),
    moderador: (d.moderador as "root" | "admin" | null) ?? null,
    baneadoHasta: (d.baneado_hasta as string | null) ?? null,
    baneoMotivo: (d.baneo_motivo as string | null) ?? null,
    normasVistas: Boolean(d.normas_vistas),
    nivelOk: d.nivel_ok !== false,
    nivelMinimo: Number(d.nivel_minimo ?? 1),
    tituloMin: Number(d.titulo_min ?? 5),
    tituloMax: Number(d.titulo_max ?? 80),
    maxInicial: Number(d.max_inicial ?? 600),
    maxRespuesta: Number(d.max_respuesta ?? 300),
    maxTemasDia: Number(d.max_temas_dia ?? 2),
    maxDenunciasDia: Number(d.max_denuncias_dia ?? 3),
    minutosEdicion: Number(d.minutos_edicion ?? 30),
  };
}

export async function marcarNormasForoVistasDB(supabase: Supabase): Promise<void> {
  await supabase.rpc("foro_marcar_normas_vistas");
}

export async function fetchTemasForo(
  supabase: Supabase,
  ligaId: string,
  filtro: FiltroForo,
  orden: OrdenForo,
  limite: number,
  desde: number
): Promise<TemaForo[] | null> {
  const { data, error } = await supabase.rpc("foro_temas", {
    p_liga: ligaId,
    p_filtro: filtro,
    p_orden: orden,
    p_limite: limite,
    p_desde: desde,
  });
  if (error || !data) return null;
  return (data as Dict[]).map((f) => {
    const datos = (f.datos as Dict | null) ?? {};
    return {
      id: Number(f.id),
      titulo: (f.titulo as string | null) ?? null,
      categoria: f.categoria as CategoriaForo,
      sistema: f.tipo === "sistema",
      claveSistema: (f.clave_sistema as string | null) ?? null,
      jornada: datos.jornada != null ? Number(datos.jornada) : null,
      estado: f.estado as "abierto" | "cerrado",
      fijado: Boolean(f.fijado),
      eliminado: Boolean(f.eliminado),
      autorId: (f.user_id as string | null) ?? null,
      autorNombre: (f.autor_nombre as string | null) ?? null,
      autorAvatar: (f.autor_avatar as string | null) ?? null,
      autorNivel: nivelDeXp(Number(f.autor_xp ?? 0)),
      respuestas: Number(f.n_respuestas ?? 0),
      ultimaActividad: f.ultima_actividad as string,
      creado: f.created_at as string,
      tieneEncuesta: Boolean(f.tiene_encuesta),
      sigue: Boolean(f.sigue),
      nuevos: f.nuevos == null ? null : Number(f.nuevos),
    };
  });
}

export async function fetchResumenForo(supabase: Supabase, ligaId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("foro_resumen", { p_liga: ligaId });
  const d = data as Dict | null;
  if (error || !d) return null;
  return Number(d.temas_con_novedades ?? 0);
}

// --- Un tema ---------------------------------------------------------------------------

export function aEncuesta(d: Dict | null | undefined): EncuestaForo | null {
  if (!d) return null;
  return {
    cerrada: Boolean(d.cerrada),
    cierraEn: (d.cierra_en as string | null) ?? null,
    miVoto: d.mi_voto != null ? Number(d.mi_voto) : null,
    visible: Boolean(d.visible),
    total: d.total != null ? Number(d.total) : null,
    opciones: ((d.opciones as Dict[] | null) ?? []).map((o) => ({
      id: Number(o.id),
      texto: o.texto as string,
      votos: o.votos != null ? Number(o.votos) : null,
    })),
  };
}

export async function fetchTemaForo(supabase: Supabase, temaId: number): Promise<DetalleTema | null> {
  const { data, error } = await supabase.rpc("foro_tema", { p_tema: temaId });
  const d = data as Dict | null;
  if (error || !d || d.ok !== true) return null;
  const datos = (d.datos as Dict | null) ?? {};
  return {
    id: Number(d.id),
    ligaId: d.liga_id as string,
    titulo: (d.titulo as string | null) ?? null,
    categoria: d.categoria as CategoriaForo,
    sistema: d.tipo === "sistema",
    jornada: datos.jornada != null ? Number(datos.jornada) : null,
    estado: d.estado as "abierto" | "cerrado",
    fijado: Boolean(d.fijado),
    eliminado: Boolean(d.eliminado),
    cerradoPorMod: datos.cerrado_por_mod === "true",
    autorId: (d.autor_id as string | null) ?? null,
    autorNombre: (d.autor_nombre as string | null) ?? null,
    respuestas: Number(d.n_respuestas ?? 0),
    creado: d.created_at as string,
    encuesta: aEncuesta(d.encuesta as Dict | null),
  };
}

function aMensaje(f: Dict): MensajeForo {
  return {
    id: Number(f.id),
    userId: (f.user_id as string | null) ?? null,
    nombre: (f.nombre as string | null) ?? "—",
    nivel: nivelDeXp(Number(f.xp ?? 0)),
    avatar: (f.avatar as string | null) ?? null,
    texto: (f.texto as string) ?? "",
    menciones: (f.menciones as string[] | null) ?? [],
    mencionesNombres: (f.menciones_nombres as string[] | null) ?? [],
    creado: f.created_at as string,
    editado: (f.editado_en as string | null) ?? null,
    inicial: Boolean(f.es_inicial),
    citaId: f.cita_id != null ? Number(f.cita_id) : null,
    citaNombre: (f.cita_nombre as string | null) ?? null,
    citaTexto: (f.cita_texto as string | null) ?? null,
    reacciones: (f.reacciones as Record<string, number> | null) ?? {},
    mia: (f.mia as string | null) ?? null,
  };
}

// El mensaje inicial del tema (null si no existe).
export async function fetchInicialForo(supabase: Supabase, temaId: number): Promise<MensajeForo | null> {
  const { data, error } = await supabase.rpc("foro_leer", {
    p_tema: temaId,
    p_antes: null,
    p_limite: 1,
    p_solo_inicial: true,
  });
  if (error || !data) return null;
  const filas = data as Dict[];
  return filas.length ? aMensaje(filas[0]) : null;
}

// Respuestas más recientes (o anteriores a `antes`), de más viejas a más nuevas.
export async function fetchRespuestasForo(
  supabase: Supabase,
  temaId: number,
  antes: number | null,
  limite: number
): Promise<MensajeForo[] | null> {
  const { data, error } = await supabase.rpc("foro_leer", {
    p_tema: temaId,
    p_antes: antes,
    p_limite: limite,
    p_solo_inicial: false,
  });
  if (error || !data) return null;
  return (data as Dict[]).map(aMensaje).reverse();
}

export async function fetchRespuestasNuevasForo(
  supabase: Supabase,
  temaId: number,
  desde: number
): Promise<MensajeForo[] | null> {
  const { data, error } = await supabase.rpc("foro_nuevos", { p_tema: temaId, p_desde: desde });
  if (error || !data) return null;
  return (data as Dict[]).map(aMensaje);
}

export async function marcarTemaLeidoDB(supabase: Supabase, temaId: number, id: number): Promise<void> {
  await supabase.rpc("foro_marcar_leido", { p_tema: temaId, p_id: id });
}

// --- Escribir --------------------------------------------------------------------------

export interface NuevaEncuesta {
  opciones: string[];
  dias: 1 | 3 | 7 | null;
}

export async function crearTemaForoDB(
  supabase: Supabase,
  ligaId: string,
  titulo: string,
  categoria: CategoriaForo,
  texto: string,
  menciones: string[],
  encuesta: NuevaEncuesta | null
): Promise<ResultadoForo<{ id: number; mencionesIgnoradas: number }>> {
  const { data, error } = await supabase.rpc("foro_crear_tema", {
    p_liga: ligaId,
    p_titulo: titulo,
    p_categoria: categoria,
    p_texto: texto,
    p_menciones: menciones,
    p_encuesta: encuesta,
  });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, id: Number(d.id), mencionesIgnoradas: Number(d.menciones_ignoradas ?? 0) };
  return fallo(d);
}

export async function responderForoDB(
  supabase: Supabase,
  temaId: number,
  texto: string,
  menciones: string[],
  cita: number | null
): Promise<ResultadoForo<{ id: number; mencionesIgnoradas: number }>> {
  const { data, error } = await supabase.rpc("foro_responder", {
    p_tema: temaId,
    p_texto: texto,
    p_menciones: menciones,
    p_cita: cita,
  });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, id: Number(d.id), mencionesIgnoradas: Number(d.menciones_ignoradas ?? 0) };
  return fallo(d);
}

export async function editarForoDB(
  supabase: Supabase,
  id: number,
  texto: string,
  menciones: string[]
): Promise<ResultadoForo<{ texto: string; editado: string | null; cambio: boolean }>> {
  const { data, error } = await supabase.rpc("foro_editar", { p_id: id, p_texto: texto, p_menciones: menciones });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) {
    return {
      ok: true,
      texto: String(d.texto ?? texto),
      editado: (d.editado_en as string | null) ?? null,
      cambio: d.cambio !== false,
    };
  }
  return fallo(d);
}

export async function borrarForoDB(
  supabase: Supabase,
  id: number
): Promise<ResultadoForo<{ temaBorrado: boolean }>> {
  const { data, error } = await supabase.rpc("foro_borrar", { p_id: id });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, temaBorrado: d.tema_borrado === true };
  return fallo(d);
}

export async function cerrarTemaForoDB(supabase: Supabase, temaId: number, cerrar: boolean): Promise<ResultadoForo> {
  const { data, error } = await supabase.rpc("foro_cerrar", { p_tema: temaId, p_cerrar: cerrar });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  return d.ok === true ? { ok: true } : fallo(d);
}

export async function fijarTemaForoDB(supabase: Supabase, temaId: number, fijar: boolean): Promise<ResultadoForo> {
  const { data, error } = await supabase.rpc("foro_fijar", { p_tema: temaId, p_fijar: fijar });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  return d.ok === true ? { ok: true } : fallo(d);
}

export async function denunciarForoDB(
  supabase: Supabase,
  id: number
): Promise<{ ok: true } | { ok: false; codigo: CodigoErrorForo; maximo?: number }> {
  const { data, error } = await supabase.rpc("foro_denunciar", { p_id: id });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true };
  return { ok: false, codigo: (d.codigo as CodigoErrorForo) ?? "red", maximo: d.maximo != null ? Number(d.maximo) : undefined };
}

// --- Encuestas ---------------------------------------------------------------------------

export async function votarForoDB(
  supabase: Supabase,
  temaId: number,
  opcionId: number
): Promise<ResultadoForo<{ encuesta: EncuestaForo | null }>> {
  const { data, error } = await supabase.rpc("foro_votar", { p_tema: temaId, p_opcion: opcionId });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, encuesta: aEncuesta(d.encuesta as Dict | null) };
  return fallo(d);
}

export async function cerrarEncuestaForoDB(
  supabase: Supabase,
  temaId: number
): Promise<ResultadoForo<{ encuesta: EncuestaForo | null }>> {
  const { data, error } = await supabase.rpc("foro_cerrar_encuesta", { p_tema: temaId });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, encuesta: aEncuesta(d.encuesta as Dict | null) };
  return fallo(d);
}

// --- Reacciones (foro y chat) ----------------------------------------------------------------

export async function reaccionarForoDB(
  supabase: Supabase,
  mensajeId: number,
  emoji: string | null
): Promise<ResultadoForo<{ mia: string | null }>> {
  const { data, error } = await supabase.rpc("foro_reaccionar", { p_mensaje: mensajeId, p_emoji: emoji });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, mia: (d.mia as string | null) ?? null };
  return fallo(d);
}

export async function reaccionarChatDB(
  supabase: Supabase,
  mensajeId: number,
  emoji: string | null
): Promise<ResultadoForo<{ mia: string | null }>> {
  const { data, error } = await supabase.rpc("chat_reaccionar", { p_mensaje: mensajeId, p_emoji: emoji });
  const d = data as Dict | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true, mia: (d.mia as string | null) ?? null };
  return fallo(d);
}

export interface ReaccionesMensaje {
  conteos: Record<string, number>;
  mia: string | null;
}

// Reacciones de un grupo de mensajes del chat. Devuelve null si la migración 0112 aún no
// está aplicada (el chat sigue funcionando sin reacciones).
export async function fetchReaccionesChat(
  supabase: Supabase,
  ligaId: string,
  ids: number[]
): Promise<Map<number, ReaccionesMensaje> | null> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.rpc("chat_reacciones_de", { p_liga: ligaId, p_ids: ids.slice(-100) });
  if (error || !data) return null;
  const mapa = new Map<number, ReaccionesMensaje>();
  for (const f of data as { mensaje_id: number; emoji: string; total: number; mia: boolean }[]) {
    const id = Number(f.mensaje_id);
    const actual = mapa.get(id) ?? { conteos: {}, mia: null };
    actual.conteos[f.emoji] = Number(f.total);
    if (f.mia) actual.mia = f.emoji;
    mapa.set(id, actual);
  }
  return mapa;
}

// --- Panel de admin (solo root) ------------------------------------------------------------------

export interface DenunciaForoAdmin {
  id: number;
  mensajeId: number;
  temaId: number;
  tituloTema: string | null;
  ligaId: string;
  ligaNombre: string;
  ligaPublica: boolean;
  autorId: string;
  autorNombre: string | null;
  denuncianteId: string;
  denuncianteNombre: string | null;
  texto: string;
  creada: string;
  estado: "pendiente" | "aceptada" | "rechazada";
  resueltaEn: string | null;
  mensajeExiste: boolean;
  autorBaneadoHasta: string | null;
  rechazadasDenunciante: number;
}

export async function fetchDenunciasForoAdmin(
  supabase: Supabase
): Promise<{ ok: true; lista: DenunciaForoAdmin[] } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("foro_denuncias_admin");
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudieron cargar las denuncias de foros." };
  return {
    ok: true,
    lista: (data as Dict[]).map((d) => ({
      id: Number(d.id),
      mensajeId: Number(d.mensaje_id),
      temaId: Number(d.tema_id),
      tituloTema: (d.titulo_tema as string | null) ?? null,
      ligaId: d.league_id as string,
      ligaNombre: d.liga_nombre as string,
      ligaPublica: Boolean(d.liga_publica),
      autorId: d.autor_id as string,
      autorNombre: (d.autor_nombre as string | null) ?? null,
      denuncianteId: d.denunciante_id as string,
      denuncianteNombre: (d.denunciante_nombre as string | null) ?? null,
      texto: d.texto as string,
      creada: d.created_at as string,
      estado: d.estado as DenunciaForoAdmin["estado"],
      resueltaEn: (d.resuelta_en as string | null) ?? null,
      mensajeExiste: Boolean(d.mensaje_existe),
      autorBaneadoHasta: (d.autor_baneado_hasta as string | null) ?? null,
      rechazadasDenunciante: Number(d.rechazadas_denunciante ?? 0),
    })),
  };
}

export async function contarDenunciasForoPendientes(supabase: Supabase): Promise<number> {
  const { data, error } = await supabase.rpc("foro_denuncias_pendientes");
  return error ? 0 : Number(data ?? 0);
}

export async function resolverDenunciaForoDB(
  supabase: Supabase,
  id: number,
  aceptar: boolean,
  banHoras: number | null,
  motivo: string | null
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("foro_resolver_denuncia", {
    p_id: id,
    p_aceptar: aceptar,
    p_ban_horas: banHoras,
    p_motivo: motivo,
  });
  if (error) return { ok: false, mensaje: error.message };
  return (data as { ok?: boolean } | null)?.ok ? { ok: true } : { ok: false, mensaje: "No se ha podido resolver." };
}
