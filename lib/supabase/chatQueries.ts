import type { createClient } from "@/lib/supabase/client";
import { nivelDeXp } from "@/lib/niveles";

type Supabase = ReturnType<typeof createClient>;

// Chat por liga (ver 0089_chat.sql). Todo pasa por funciones de la base de datos:
// el navegador nunca lee ni escribe las tablas directamente.

export interface MensajeChat {
  id: number;
  userId: string;
  nombre: string;
  nivel: number;
  avatar: string | null;
  texto: string;
  menciones: string[]; // ids de los mencionados
  mencionesNombres: string[]; // sus alias, para resaltar "@alias" en el texto
  creado: string; // ISO
  editado: string | null; // ISO, si se ha editado
}

export interface EstadoChat {
  publica: boolean;
  miembro: boolean; // root puede leer chats en los que no juega, pero no escribir
  moderador: "root" | "creador" | null;
  baneadoHasta: string | null; // ISO
  baneoMotivo: string | null;
  silenciadoPublico: boolean;
  normasVistas: boolean;
  nivelOk: boolean;
  nivelMinimo: number;
  maxCaracteres: number;
  maxDenunciasDia: number;
  minutosEdicion: number;
}

export interface ResumenChat {
  noLeidos: number; // tope 100
  menciones: number; // tope 100
  ultimoId: number;
}

export interface ManagerMencionable {
  userId: string;
  nombre: string;
  nivel: number;
  avatar: string | null;
}

// Códigos que devuelve chat_enviar; la web los traduce (t.chat.errores).
export type CodigoErrorChat =
  | "sesion"
  | "no_miembro"
  | "bloqueado"
  | "nivel"
  | "vacia"
  | "larga"
  | "enlace"
  | "vetada"
  | "rapido"
  | "limite"
  | "repetido"
  | "menciones"
  | "permiso"
  | "no_existe"
  | "plazo"
  | "denunciado"
  | "red";

export type ResultadoEnvio =
  | { ok: true; id: number; mencionesIgnoradas: number }
  | { ok: false; codigo: CodigoErrorChat; hasta?: string; maximo?: number; nivelMinimo?: number };

export type CodigoErrorDenuncia = "sesion" | "no_existe" | "no_miembro" | "propio" | "repetida" | "limite" | "red";

type FilaMensaje = {
  id: number;
  user_id: string;
  nombre: string | null;
  xp: number;
  avatar: string | null;
  texto: string;
  menciones: string[] | null;
  menciones_nombres: string[] | null;
  created_at: string;
  editado_en?: string | null;
};

function aMensaje(f: FilaMensaje): MensajeChat {
  return {
    id: Number(f.id),
    userId: f.user_id,
    nombre: f.nombre ?? "—",
    nivel: nivelDeXp(Number(f.xp)),
    avatar: f.avatar ?? null,
    texto: f.texto,
    menciones: f.menciones ?? [],
    mencionesNombres: f.menciones_nombres ?? [],
    creado: f.created_at,
    editado: f.editado_en ?? null,
  };
}

export async function fetchEstadoChat(supabase: Supabase, ligaId: string): Promise<EstadoChat | null> {
  const { data, error } = await supabase.rpc("chat_estado", { p_liga: ligaId });
  const d = data as Record<string, unknown> | null;
  if (error || !d || d.ok !== true) return null;
  return {
    publica: Boolean(d.publica),
    miembro: Boolean(d.miembro),
    moderador: (d.moderador as "root" | "creador" | null) ?? null,
    baneadoHasta: (d.baneado_hasta as string | null) ?? null,
    baneoMotivo: (d.baneo_motivo as string | null) ?? null,
    silenciadoPublico: Boolean(d.silenciado_publico),
    normasVistas: Boolean(d.normas_vistas),
    nivelOk: d.nivel_ok !== false,
    nivelMinimo: Number(d.nivel_minimo ?? 1),
    maxCaracteres: Number(d.max_caracteres ?? 300),
    maxDenunciasDia: Number(d.max_denuncias_dia ?? 3),
    minutosEdicion: Number(d.minutos_edicion ?? 0),
  };
}

// Los mensajes más recientes (o los anteriores a `antes`), de más viejo a más nuevo.
export async function fetchMensajesChat(
  supabase: Supabase,
  ligaId: string,
  antes: number | null = null,
  limite = 40
): Promise<MensajeChat[] | null> {
  const { data, error } = await supabase.rpc("chat_leer", {
    p_liga: ligaId,
    p_antes: antes,
    p_limite: limite,
  });
  if (error || !data) return null;
  return (data as FilaMensaje[]).map(aMensaje).reverse();
}

// Lo posterior a `desde`: la consulta barata del sondeo (casi siempre vacía).
export async function fetchMensajesNuevos(
  supabase: Supabase,
  ligaId: string,
  desde: number
): Promise<MensajeChat[] | null> {
  const { data, error } = await supabase.rpc("chat_nuevos", { p_liga: ligaId, p_desde: desde });
  if (error || !data) return null;
  return (data as FilaMensaje[]).map(aMensaje);
}

// Sondeo en una llamada (0090): mensajes nuevos + ids borrados desde el cursor `seq`.
// Con `seq` nulo (primera vez) solo se fija el cursor.
export async function fetchNovedadesChat(
  supabase: Supabase,
  ligaId: string,
  desde: number,
  seq: number | null
): Promise<{ nuevos: MensajeChat[]; borrados: number[]; editados: MensajeChat[]; seq: number } | null> {
  const { data, error } = await supabase.rpc("chat_novedades", { p_liga: ligaId, p_desde: desde, p_seq: seq });
  const d = data as {
    ok?: boolean;
    nuevos?: FilaMensaje[];
    borrados?: number[];
    editados?: FilaMensaje[];
    seq?: number;
  } | null;
  if (error || !d || d.ok !== true) return null;
  return {
    nuevos: (d.nuevos ?? []).map(aMensaje),
    borrados: (d.borrados ?? []).map(Number),
    editados: (d.editados ?? []).map(aMensaje),
    seq: Number(d.seq ?? seq ?? 0),
  };
}

export async function enviarMensajeChat(
  supabase: Supabase,
  ligaId: string,
  texto: string,
  menciones: string[]
): Promise<ResultadoEnvio> {
  const { data, error } = await supabase.rpc("chat_enviar", {
    p_liga: ligaId,
    p_texto: texto,
    p_menciones: menciones,
  });
  const d = data as Record<string, unknown> | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) {
    return { ok: true, id: Number(d.id), mencionesIgnoradas: Number(d.menciones_ignoradas ?? 0) };
  }
  return {
    ok: false,
    codigo: (d.codigo as CodigoErrorChat) ?? "red",
    hasta: (d.hasta as string | undefined) ?? undefined,
    maximo: d.maximo != null ? Number(d.maximo) : undefined,
    nivelMinimo: d.nivel_minimo != null ? Number(d.nivel_minimo) : undefined,
  };
}

// Editar un mensaje propio (0091). Devuelve el texto ya limpio por el servidor.
export type ResultadoEdicion =
  | { ok: true; texto: string; editado: string | null; cambio: boolean; mencionesIgnoradas: number }
  | { ok: false; codigo: CodigoErrorChat; hasta?: string; maximo?: number; minutos?: number };

export async function editarMensajeChat(
  supabase: Supabase,
  id: number,
  texto: string,
  menciones: string[]
): Promise<ResultadoEdicion> {
  const { data, error } = await supabase.rpc("chat_editar", { p_id: id, p_texto: texto, p_menciones: menciones });
  const d = data as Record<string, unknown> | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) {
    return {
      ok: true,
      texto: String(d.texto ?? texto),
      editado: (d.editado_en as string | null) ?? null,
      cambio: d.cambio !== false,
      mencionesIgnoradas: Number(d.menciones_ignoradas ?? 0),
    };
  }
  return {
    ok: false,
    codigo: (d.codigo as CodigoErrorChat) ?? "red",
    hasta: (d.hasta as string | undefined) ?? undefined,
    maximo: d.maximo != null ? Number(d.maximo) : undefined,
    minutos: d.minutos != null ? Number(d.minutos) : undefined,
  };
}

export async function fetchResumenChat(supabase: Supabase, ligaId: string): Promise<ResumenChat | null> {
  const { data, error } = await supabase.rpc("chat_resumen", { p_liga: ligaId });
  const d = data as Record<string, unknown> | null;
  if (error || !d) return null;
  return {
    noLeidos: Number(d.no_leidos ?? 0),
    menciones: Number(d.menciones ?? 0),
    ultimoId: Number(d.ultimo_id ?? 0),
  };
}

export async function marcarChatLeidoDB(supabase: Supabase, ligaId: string, id: number): Promise<void> {
  await supabase.rpc("chat_marcar_leido", { p_liga: ligaId, p_id: id });
}

export async function silenciarChatPublicoDB(supabase: Supabase, silenciar: boolean): Promise<boolean> {
  const { error } = await supabase.rpc("chat_silenciar_publico", { p_silenciar: silenciar });
  return !error;
}

export async function marcarNormasChatVistasDB(supabase: Supabase): Promise<void> {
  await supabase.rpc("chat_marcar_normas_vistas");
}

export async function buscarManagersChat(
  supabase: Supabase,
  ligaId: string,
  prefijo: string
): Promise<ManagerMencionable[]> {
  const { data, error } = await supabase.rpc("chat_buscar_managers", { p_liga: ligaId, p_prefijo: prefijo });
  if (error || !data) return [];
  return (data as { user_id: string; nombre: string; xp: number; avatar: string | null }[]).map((f) => ({
    userId: f.user_id,
    nombre: f.nombre,
    nivel: nivelDeXp(Number(f.xp)),
    avatar: f.avatar ?? null,
  }));
}

export async function borrarMensajeChatDB(supabase: Supabase, id: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("chat_borrar", { p_id: id });
  return !error && (data as { ok?: boolean } | null)?.ok === true;
}

export async function denunciarMensajeChatDB(
  supabase: Supabase,
  id: number
): Promise<{ ok: true } | { ok: false; codigo: CodigoErrorDenuncia; maximo?: number }> {
  const { data, error } = await supabase.rpc("chat_denunciar", { p_id: id });
  const d = data as Record<string, unknown> | null;
  if (error || !d) return { ok: false, codigo: "red" };
  if (d.ok === true) return { ok: true };
  return {
    ok: false,
    codigo: (d.codigo as CodigoErrorDenuncia) ?? "red",
    maximo: d.maximo != null ? Number(d.maximo) : undefined,
  };
}

// --- Panel de admin (solo root) -------------------------------------------------------

export interface DenunciaAdmin {
  id: number;
  mensajeId: number;
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
  rechazadasDenunciante: number; // en los últimos 30 días
}

export interface BloqueoAdmin {
  userId: string;
  nombre: string | null;
  ligaId: string;
  ligaNombre: string;
  hasta: string;
  motivo: string | null;
}

type Resultado = { ok: true } | { ok: false; mensaje: string };

export async function fetchDenunciasAdmin(
  supabase: Supabase
): Promise<{ ok: true; lista: DenunciaAdmin[] } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("chat_denuncias_admin");
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudieron cargar las denuncias." };
  return {
    ok: true,
    lista: (data as Record<string, unknown>[]).map((d) => ({
      id: Number(d.id),
      mensajeId: Number(d.mensaje_id),
      ligaId: d.league_id as string,
      ligaNombre: d.liga_nombre as string,
      ligaPublica: Boolean(d.liga_publica),
      autorId: d.autor_id as string,
      autorNombre: (d.autor_nombre as string | null) ?? null,
      denuncianteId: d.denunciante_id as string,
      denuncianteNombre: (d.denunciante_nombre as string | null) ?? null,
      texto: d.texto as string,
      creada: d.created_at as string,
      estado: d.estado as DenunciaAdmin["estado"],
      resueltaEn: (d.resuelta_en as string | null) ?? null,
      mensajeExiste: Boolean(d.mensaje_existe),
      autorBaneadoHasta: (d.autor_baneado_hasta as string | null) ?? null,
      rechazadasDenunciante: Number(d.rechazadas_denunciante ?? 0),
    })),
  };
}

export async function contarDenunciasChatPendientes(supabase: Supabase): Promise<number> {
  const { data, error } = await supabase.rpc("chat_denuncias_pendientes");
  return error ? 0 : Number(data ?? 0);
}

export async function resolverDenunciaChatDB(
  supabase: Supabase,
  id: number,
  aceptar: boolean,
  banHoras: number | null,
  motivo: string | null
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("chat_resolver_denuncia", {
    p_id: id,
    p_aceptar: aceptar,
    p_ban_horas: banHoras,
    p_motivo: motivo,
  });
  if (error) return { ok: false, mensaje: error.message };
  return (data as { ok?: boolean } | null)?.ok ? { ok: true } : { ok: false, mensaje: "No se ha podido resolver." };
}

export async function banearChatDB(
  supabase: Supabase,
  userId: string,
  ligaId: string,
  horas: number,
  motivo: string | null
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("chat_banear", {
    p_user: userId,
    p_liga: ligaId,
    p_horas: horas,
    p_motivo: motivo,
  });
  if (error) return { ok: false, mensaje: error.message };
  return (data as { ok?: boolean } | null)?.ok ? { ok: true } : { ok: false, mensaje: "No se ha podido banear." };
}

export async function desbanearChatDB(supabase: Supabase, userId: string, ligaId: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("chat_desbanear", { p_user: userId, p_liga: ligaId });
  if (error) return { ok: false, mensaje: error.message };
  return (data as { ok?: boolean } | null)?.ok ? { ok: true } : { ok: false, mensaje: "No se ha podido quitar el baneo." };
}

export async function fetchBloqueosAdmin(
  supabase: Supabase
): Promise<{ ok: true; lista: BloqueoAdmin[] } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("chat_bloqueos_admin");
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudieron cargar los baneos." };
  return {
    ok: true,
    lista: (data as Record<string, unknown>[]).map((b) => ({
      userId: b.user_id as string,
      nombre: (b.nombre as string | null) ?? null,
      ligaId: b.league_id as string,
      ligaNombre: b.liga_nombre as string,
      hasta: b.hasta as string,
      motivo: (b.motivo as string | null) ?? null,
    })),
  };
}
