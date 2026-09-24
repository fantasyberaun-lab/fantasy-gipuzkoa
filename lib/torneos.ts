// Tipos y utilidades de torneos compartidas entre el panel de admin y las
// pantallas de los managers. Ver 0019_torneos.sql y 0020_*.sql.
//
// Todos los textos son libres y opcionales (salvo el nombre): nada valida
// el formato porque solo los administradores crean torneos.

import type { Categoria, ResultadoPartida } from "@/lib/types";

export interface DatosTorneo {
  // General
  nombre: string;
  categoria: Categoria | null;
  observaciones: string | null;
  // Organización
  organizador: string | null;
  federacion: string | null;
  director: string | null;
  arbitroPrincipal: string | null;
  arbitrosAdjuntos: string | null;
  // Lugar de juego
  lugar: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  // Calendario
  fechaInicio: string | null; // YYYY-MM-DD
  fechaFin: string | null;
  numeroRondas: number | null;
  // Sistema de juego
  sistema: string | null;
  ritmoJuego: string | null;
  computoElo: string | null;
  desempates: string | null;
  // Enlaces y contacto
  webUrl: string | null;
  emailContacto: string | null;
}

export interface Torneo extends DatosTorneo {
  id: string;
  rondasCreadas: number; // jornadas ya creadas en este torneo
  participantes: number; // jugadores inscritos
}

export type EstadoTorneo = "En curso" | "Próximo" | "Finalizado";

// El estado se deduce de las fechas (no se guarda), así nunca queda
// desfasado. Sin fechas no se puede saber y devuelve null.
export function estadoTorneo(
  t: Pick<DatosTorneo, "fechaInicio" | "fechaFin">
): EstadoTorneo | null {
  const hoy = new Date().toISOString().slice(0, 10);
  if (t.fechaInicio && hoy < t.fechaInicio) return "Próximo";
  if (t.fechaFin && hoy > t.fechaFin) return "Finalizado";
  if (t.fechaInicio || t.fechaFin) return "En curso";
  return null;
}

const ORDEN_ESTADO: Record<string, number> = {
  "En curso": 0,
  Próximo: 1,
  sin: 2,
  Finalizado: 3,
};

// En curso primero, luego próximos, luego los que no tienen fechas y por
// último los finalizados; dentro de cada grupo, el más reciente antes.
export function ordenarTorneos<T extends Torneo>(torneos: T[]): T[] {
  return [...torneos].sort((a, b) => {
    const ea = ORDEN_ESTADO[estadoTorneo(a) ?? "sin"];
    const eb = ORDEN_ESTADO[estadoTorneo(b) ?? "sin"];
    if (ea !== eb) return ea - eb;
    const fa = a.fechaInicio ?? "";
    const fb = b.fechaInicio ?? "";
    if (fa !== fb) return fb.localeCompare(fa);
    return a.nombre.localeCompare(b.nombre);
  });
}

export function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function rangoFechas(
  t: Pick<DatosTorneo, "fechaInicio" | "fechaFin">
): string | null {
  const inicio = formatearFecha(t.fechaInicio);
  const fin = formatearFecha(t.fechaFin);
  if (inicio && fin) return inicio === fin ? inicio : `${inicio} – ${fin}`;
  return inicio ?? fin;
}

// ---------- Resultados y performance Elo ----------

export const MARCADOR: Record<ResultadoPartida, string> = {
  victoria: "1-0",
  tablas: "½-½",
  derrota: "0-1",
};

// El mismo resultado visto desde el lado del rival.
export function resultadoInverso(r: ResultadoPartida): ResultadoPartida {
  return r === "victoria" ? "derrota" : r === "derrota" ? "victoria" : "tablas";
}

// Tabla de conversión del porcentaje de puntos "p" en diferencia de
// rating "dp" (Reglamento de rating de la FIDE, B.02, tabla 8.1.1): aquí
// están los valores para p = 0,50 … 1,00 de centésima en centésima. Para
// p < 0,5 se usa el valor simétrico con signo negativo. Con p = 1 o 0 el
// valor es "teórico" (800) porque en realidad no está determinado.
const DP_FIDE = [
  0, 7, 14, 21, 29, 36, 43, 50, 57, 65, 72, 80, 87, 95, 102, 110, 117, 125,
  133, 141, 149, 158, 166, 175, 184, 193, 202, 211, 220, 230, 240, 251, 262,
  273, 284, 296, 309, 322, 336, 351, 366, 383, 401, 422, 444, 470, 501, 538,
  589, 677, 800,
];

export function diferenciaDp(p: number): number {
  const centesimas = Math.min(100, Math.max(0, Math.round(p * 100)));
  return centesimas >= 50 ? DP_FIDE[centesimas - 50] : -DP_FIDE[50 - centesimas];
}

export interface PartidaParaCalculo {
  resultado: ResultadoPartida;
  rivalElo: number | null;
}

export interface EstadisticasJugador {
  partidas: number;
  puntos: number; // 1 por victoria, ½ por tablas
  rendimiento: number | null; // performance Elo; null si no hay datos
}

const valorPartida = (r: ResultadoPartida) =>
  r === "victoria" ? 1 : r === "tablas" ? 0.5 : 0;

// Puntos de torneo y performance Elo: Rp = media del Elo de los rivales +
// dp(porcentaje de puntos), como calcula la FIDE. Las partidas sin Elo de
// rival conocido cuentan para los puntos pero no para la performance.
export function calcularEstadisticas(
  partidas: PartidaParaCalculo[]
): EstadisticasJugador {
  const puntos = partidas.reduce((total, p) => total + valorPartida(p.resultado), 0);

  const conElo = partidas.filter((p) => p.rivalElo != null);
  let rendimiento: number | null = null;
  if (conElo.length > 0) {
    const eloMedio =
      conElo.reduce((total, p) => total + (p.rivalElo as number), 0) / conElo.length;
    const porcentaje =
      conElo.reduce((total, p) => total + valorPartida(p.resultado), 0) / conElo.length;
    rendimiento = Math.round(eloMedio + diferenciaDp(porcentaje));
  }

  return { partidas: partidas.length, puntos, rendimiento };
}

// 3, 3½, ½, 0…
export function formatearPuntos(n: number): string {
  const entero = Math.floor(n);
  if (n - entero < 0.5) return String(entero);
  return entero === 0 ? "½" : `${entero}½`;
}
