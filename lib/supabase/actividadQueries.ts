import type { SupabaseClient } from "@supabase/supabase-js";

export interface Ubicacion {
  pais: string; // "ES"
  region: string; // código ISO 3166-2, p. ej. "PV"
  ciudad: string;
}

export interface ActividadUsuario {
  id: string;
  nombre: string;
  equipos: string | null;
  registrado: string;
  ultimoLogin: string | null;
  ultimaActividad: string | null;
  diasActivos: number;
  visitas: number;
  operaciones: number;
  ubicacion: Ubicacion | null; // la más frecuente del periodo
}

export interface Actividad {
  dias: number;
  registroDesde: string | null; // desde cuándo se anotan visitas
  totales: {
    registrados: number;
    nuevosPeriodo: number;
    activosHoy: number;
    activos7d: number;
    activos30d: number;
    visitasPeriodo: number;
    login7d: number;
    sinEntrar14d: number;
  };
  porDia: { dia: string; usuarios: number; visitas: number }[];
  paginas: { ruta: string; visitas: number; usuarios: number }[];
  ubicaciones: (Ubicacion & { managers: number; visitas: number })[];
  usuarios: ActividadUsuario[];
}

export async function fetchActividad(
  supabase: SupabaseClient,
  dias: number
): Promise<{ ok: true; actividad: Actividad } | { ok: false; mensaje: string }> {
  const { data, error } = await supabase.rpc("admin_actividad", { p_dias: dias });
  if (error || !data) return { ok: false, mensaje: error?.message ?? "No se pudo cargar la actividad." };

  const t = data.totales ?? {};
  return {
    ok: true,
    actividad: {
      dias: Number(data.dias),
      registroDesde: data.registro_desde ?? null,
      totales: {
        registrados: Number(t.registrados ?? 0),
        nuevosPeriodo: Number(t.nuevos_periodo ?? 0),
        activosHoy: Number(t.activos_hoy ?? 0),
        activos7d: Number(t.activos_7d ?? 0),
        activos30d: Number(t.activos_30d ?? 0),
        visitasPeriodo: Number(t.visitas_periodo ?? 0),
        login7d: Number(t.login_7d ?? 0),
        sinEntrar14d: Number(t.sin_entrar_14d ?? 0),
      },
      porDia: (data.por_dia ?? []).map((d: any) => ({
        dia: d.dia,
        usuarios: Number(d.usuarios),
        visitas: Number(d.visitas),
      })),
      paginas: (data.paginas ?? []).map((p: any) => ({
        ruta: p.ruta,
        visitas: Number(p.visitas),
        usuarios: Number(p.usuarios),
      })),
      ubicaciones: (data.ubicaciones ?? []).map((l: any) => ({
        pais: l.pais ?? "",
        region: l.region ?? "",
        ciudad: l.ciudad ?? "",
        managers: Number(l.managers ?? 0),
        visitas: Number(l.visitas ?? 0),
      })),
      usuarios: (data.usuarios ?? []).map((u: any) => ({
        id: u.id,
        nombre: u.nombre,
        equipos: u.equipos ?? null,
        registrado: u.registrado,
        ultimoLogin: u.ultimo_login ?? null,
        ultimaActividad: u.ultima_actividad ?? null,
        diasActivos: Number(u.dias_activos ?? 0),
        visitas: Number(u.visitas ?? 0),
        operaciones: Number(u.operaciones ?? 0),
        ubicacion: u.ubicacion
          ? {
              pais: u.ubicacion.pais ?? "",
              region: u.ubicacion.region ?? "",
              ciudad: u.ubicacion.ciudad ?? "",
            }
          : null,
      })),
    },
  };
}
