import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Racha diaria (ver 0075_racha_diaria.sql y 0086_niveles.sql). Importes en M,
// como el saldo. La entrada del día se registra sola; lo único que se reclama
// es el cofre.
export interface EstadoRacha {
  racha: number; // racha viva (0 si se rompió)
  mejorRacha: number;
  registradaHoy: boolean;
  cofresPendientes: number; // cofres por abrir
  diasCofre: number; // cada cuántos días hay cofre (7)
  diasParaCofre: number; // días que faltan para el próximo cofre
  recompensaDiaria: number;
  recuperable: boolean; // la racha se rompió pero aún se puede recuperar (0116)
  rachaPerdida: number; // racha que se recuperaría
  diasPerdidos: number;
  recuperarCoste: number; // coste total en M
}

export type ResultadoRecuperar =
  | { ok: true; racha: number; coste: number; equipos: number }
  | { ok: false; mensaje: string };

export type ResultadoEntrada =
  | {
      ok: true;
      nuevo: boolean; // false si hoy ya estaba registrada
      racha: number;
      importeDiario: number; // 0 si no es nuevo
      xp: number; // 0 si no es nuevo
      equipos: number;
      cofresPendientes: number;
    }
  | { ok: false; mensaje: string };

export type ResultadoCofre =
  | {
      ok: true;
      racha: number;
      importeCofre: number;
      xp: number;
      equipos: number;
      cofresPendientes: number;
    }
  | { ok: false; mensaje: string };

export async function fetchEstadoRacha(supabase: Supabase): Promise<EstadoRacha | null> {
  const { data, error } = await supabase.rpc("estado_racha");
  if (error || !data) return null;
  const d = data as Record<string, number | boolean>;
  return {
    racha: Number(d.racha),
    mejorRacha: Number(d.mejor_racha),
    registradaHoy: Boolean(d.registrada_hoy),
    cofresPendientes: Number(d.cofres_pendientes ?? 0),
    diasCofre: Number(d.dias_cofre),
    diasParaCofre: Number(d.dias_para_cofre),
    recompensaDiaria: Number(d.recompensa_diaria),
    recuperable: Boolean(d.recuperable),
    rachaPerdida: Number(d.racha_perdida ?? 0),
    diasPerdidos: Number(d.dias_perdidos ?? 0),
    recuperarCoste: Number(d.recuperar_coste ?? 0),
  };
}

// Recupera la racha rota pagando el coste (ver 0116). Idempotente: si la racha
// sigue viva o ya es tarde, devuelve ok = false con el motivo.
export async function recuperarRachaDB(supabase: Supabase): Promise<ResultadoRecuperar> {
  const { data, error } = await supabase.rpc("recuperar_racha");
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Record<string, unknown>;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido recuperar la racha.") };
  return {
    ok: true,
    racha: Number(d.racha),
    coste: Number(d.coste),
    equipos: Number(d.equipos),
  };
}

// Registra la entrada de hoy (cobra el millón, sube la racha y da XP). Es
// idempotente: si hoy ya estaba registrada devuelve nuevo = false.
export async function registrarInicioSesionDB(supabase: Supabase): Promise<ResultadoEntrada> {
  const { data, error } = await supabase.rpc("registrar_inicio_sesion");
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Record<string, unknown>;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido registrar la entrada.") };
  return {
    ok: true,
    nuevo: Boolean(d.nuevo),
    racha: Number(d.racha),
    importeDiario: Number(d.importe_diario ?? 0),
    xp: Number(d.xp ?? 0),
    equipos: Number(d.equipos ?? 0),
    cofresPendientes: Number(d.cofres_pendientes ?? 0),
  };
}

export async function abrirCofreDB(supabase: Supabase): Promise<ResultadoCofre> {
  const { data, error } = await supabase.rpc("abrir_cofre_racha");
  if (error) return { ok: false, mensaje: error.message };
  const d = data as Record<string, unknown>;
  if (!d.ok) return { ok: false, mensaje: String(d.mensaje ?? "No se ha podido abrir el cofre.") };
  return {
    ok: true,
    racha: Number(d.racha),
    importeCofre: Number(d.importe_cofre),
    xp: Number(d.xp),
    equipos: Number(d.equipos),
    cofresPendientes: Number(d.cofres_pendientes),
  };
}
