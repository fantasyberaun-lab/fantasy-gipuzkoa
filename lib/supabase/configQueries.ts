import type { createClient } from "@/lib/supabase/client";
import { REGLAS_JUEGO_POR_DEFECTO, type ReglasJuego } from "@/lib/reglasJuego";

type Supabase = ReturnType<typeof createClient>;

// Variables ajustables y ligas territoriales de prueba (0092-0096). Todo pasa por
// funciones de la base de datos, que son las que comprueban permisos y rangos.

export type EstadoVariable = "activa" | "pendiente_sql" | "economia";
export type ValorConfig = number | boolean | string | unknown[] | Record<string, unknown>;

export interface VariableConfig {
  clave: string;
  grupo: string;
  etiqueta: string;
  descripcion: string | null;
  tipo: "entero" | "decimal" | "booleano" | "tabla_puntos";
  minimo: number | null;
  maximo: number | null;
  unidad: string | null;
  estado: EstadoVariable;
  funcionSql: string | null;
  permiteLiga: boolean;
  valorDefecto: ValorConfig;
  valorGlobal: ValorConfig | null; // fila de game_config; null = usa el defecto
  valorLiga: ValorConfig | null; // sobrescritura de la liga elegida
  valorEfectivo: ValorConfig;
}

export interface CambioConfig {
  id: number;
  clave: string;
  ligaId: string | null;
  ligaNombre: string | null;
  anterior: unknown;
  nuevo: unknown;
  usuario: string | null;
  fecha: string; // ISO
  revierteId: number | null;
  motivo: string | null;
  deshacible: boolean;
}

export interface CategoriaLiga {
  codigo: string;
  nombre: string;
  nombre_eu: string | null;
  nombre_en: string | null;
}

export interface LigaTerritorial {
  id: string;
  nombre: string;
  codigo: string;
  ambito: "provincia" | "comunidad" | "pais";
  region: string | null;
  estado: "activa" | "prueba";
  miembros: number;
  categorias: CategoriaLiga[];
}

type Lista<T> = { ok: true; lista: T[] } | { ok: false; mensaje: string };
type Resultado = { ok: true } | { ok: false; mensaje: string };

function resultadoRpc(data: unknown, error: { message: string } | null): Resultado {
  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok?: boolean; mensaje?: string } | null;
  if (r?.ok) return { ok: true };
  return { ok: false, mensaje: r?.mensaje ?? "No se pudo guardar." };
}

export async function fetchVariablesConfig(
  supabase: Supabase,
  ligaId: string | null
): Promise<Lista<VariableConfig>> {
  const { data, error } = await supabase.rpc("config_listar", { p_league_id: ligaId });
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudieron cargar las variables." };
  return {
    ok: true,
    lista: (data as Record<string, unknown>[]).map((v) => ({
      clave: v.clave as string,
      grupo: v.grupo as string,
      etiqueta: v.etiqueta as string,
      descripcion: (v.descripcion as string | null) ?? null,
      tipo: v.tipo as VariableConfig["tipo"],
      minimo: v.minimo == null ? null : Number(v.minimo),
      maximo: v.maximo == null ? null : Number(v.maximo),
      unidad: (v.unidad as string | null) ?? null,
      estado: v.estado as EstadoVariable,
      funcionSql: (v.funcion_sql as string | null) ?? null,
      permiteLiga: Boolean(v.permite_liga),
      valorDefecto: v.valor_defecto as ValorConfig,
      valorGlobal: (v.valor_global as ValorConfig | null) ?? null,
      valorLiga: (v.valor_liga as ValorConfig | null) ?? null,
      valorEfectivo: v.valor_efectivo as ValorConfig,
    })),
  };
}

// ligaId null = valor global. valor null con ligaId = quitar la sobrescritura.
export async function guardarVariableConfig(
  supabase: Supabase,
  clave: string,
  valor: ValorConfig | null,
  ligaId: string | null,
  motivo: string | null
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("config_guardar", {
    p_clave: clave,
    p_valor: valor,
    p_league_id: ligaId,
    p_motivo: motivo,
  });
  return resultadoRpc(data, error);
}

export async function deshacerCambioConfig(supabase: Supabase, id: number): Promise<Resultado> {
  const { data, error } = await supabase.rpc("config_deshacer", { p_historial_id: id });
  return resultadoRpc(data, error);
}

export async function fetchHistorialConfig(supabase: Supabase, limite = 50): Promise<Lista<CambioConfig>> {
  const { data, error } = await supabase.rpc("config_historial_listar", { p_limite: limite });
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudo cargar el historial." };
  return {
    ok: true,
    lista: (data as Record<string, unknown>[]).map((h) => ({
      id: Number(h.id),
      clave: h.clave as string,
      ligaId: (h.league_id as string | null) ?? null,
      ligaNombre: (h.nombre_liga as string | null) ?? null,
      anterior: h.valor_anterior ?? null,
      nuevo: h.valor_nuevo ?? null,
      usuario: (h.nombre_usuario as string | null) ?? null,
      fecha: h.cambiado_en as string,
      revierteId: h.revierte_id == null ? null : Number(h.revierte_id),
      motivo: (h.motivo as string | null) ?? null,
      deshacible: Boolean(h.deshacible),
    })),
  };
}

export async function fetchLigasTerritoriales(supabase: Supabase): Promise<Lista<LigaTerritorial>> {
  const { data, error } = await supabase.rpc("ligas_territoriales_admin");
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudieron cargar las ligas." };
  return {
    ok: true,
    lista: (data as Record<string, unknown>[]).map((l) => ({
      id: l.id as string,
      nombre: l.nombre as string,
      codigo: l.codigo as string,
      ambito: l.ambito as LigaTerritorial["ambito"],
      region: (l.region as string | null) ?? null,
      estado: l.estado as LigaTerritorial["estado"],
      miembros: Number(l.miembros ?? 0),
      categorias: ((l.categorias as Record<string, unknown>[] | null) ?? []).map((c) => ({
        codigo: c.codigo as string,
        nombre: c.nombre as string,
        nombre_eu: (c.nombre_eu as string | null) ?? null,
        nombre_en: (c.nombre_en as string | null) ?? null,
      })),
    })),
  };
}

export async function guardarCategoriasLiga(
  supabase: Supabase,
  ligaId: string,
  categorias: CategoriaLiga[]
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("categorias_guardar", {
    p_league_id: ligaId,
    p_categorias: categorias,
  });
  return resultadoRpc(data, error);
}

// Reglas que aplica la base de datos a una liga (reglas_liga, 0094 y 0096). Si la
// base de datos aún no devuelve alguna (migración sin aplicar), vale la de siempre.
export type ReglasLiga = ReglasJuego;

export async function fetchReglasLiga(supabase: Supabase, ligaId: string): Promise<ReglasLiga | null> {
  const { data, error } = await supabase.rpc("reglas_liga", { p_league_id: ligaId });
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const num = (v: unknown, defecto: number) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : defecto);
  const d = REGLAS_JUEGO_POR_DEFECTO;
  return {
    maxTitulares: num(r.maxTitulares, d.maxTitulares),
    maxTitularesPorTorneo: num(r.maxTitularesPorTorneo, d.maxTitularesPorTorneo),
    maxPlantilla: num(r.maxPlantilla, d.maxPlantilla),
    clausulaPorcentaje: num(r.clausulaPorcentaje, d.clausulaPorcentaje),
    multiplicadorSubida: num(r.multiplicadorSubida, d.multiplicadorSubida),
    blindajePorcentaje: num(r.blindajePorcentaje, d.blindajePorcentaje),
    capitanMultiplicador: num(r.capitanMultiplicador, d.capitanMultiplicador),
    horasMercado:
      Array.isArray(r.horasMercado) && r.horasMercado.length > 0
        ? r.horasMercado.map(Number).filter((h) => Number.isInteger(h) && h >= 0 && h < 24)
        : d.horasMercado,
  };
}
