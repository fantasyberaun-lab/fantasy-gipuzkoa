import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Resumen semanal (ver 0117 y 0123): se enseña una vez, al volver tras cerrarse la
// jornada, con una tarjeta por cada liga en la que juega el manager.
export interface ResumenLiga {
  equipo: string;
  liga: string | null;
  puntos: number;
  posicion: number | null;
  variacion: number | null; // puestos ganados (+) o perdidos (-)
  equipos: number | null; // equipos de la liga
  total: number | null; // puntos acumulados
  importe: number | null; // millones cobrados por la jornada
  mejor: { nombre: string; puntos: number } | null; // jugador que más ha sumado
}

export interface ResumenSemanal {
  semana: string;
  jornada: number | null;
  ligas: ResumenLiga[]; // de más a menos puntos; nunca vacío
}

const numero = (v: unknown): number | null => (v != null ? Number(v) : null);

function leerLiga(d: Record<string, unknown>): ResumenLiga {
  const mejor = d.mejor as { nombre?: unknown; puntos?: unknown } | null | undefined;
  return {
    equipo: String(d.equipo ?? ""),
    liga: d.liga != null ? String(d.liga) : null,
    puntos: Number(d.puntos ?? 0),
    posicion: numero(d.posicion),
    variacion: numero(d.variacion),
    equipos: numero(d.equipos),
    total: numero(d.total),
    importe: numero(d.importe),
    mejor: mejor?.nombre ? { nombre: String(mejor.nombre), puntos: Number(mejor.puntos ?? 0) } : null,
  };
}

export async function fetchResumenPendiente(supabase: Supabase): Promise<ResumenSemanal | null> {
  const { data, error } = await supabase.rpc("resumen_pendiente");
  const d = (data ?? {}) as Record<string, unknown>;
  if (error || !d.hay) return null;
  // Antes de 0123 la función devolvía un solo equipo en la raíz.
  const filas = Array.isArray(d.resumenes) && d.resumenes.length > 0 ? d.resumenes : [d];
  return {
    semana: String(d.semana),
    jornada: numero(d.jornada),
    ligas: filas.map((f) => leerLiga(f as Record<string, unknown>)),
  };
}

export async function marcarResumenVisto(supabase: Supabase, semana: string): Promise<void> {
  await supabase.rpc("marcar_resumen_visto", { p_semana: semana });
}
