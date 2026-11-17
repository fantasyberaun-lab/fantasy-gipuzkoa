// Ayudas del evento del Mundial (fechas en hora de Madrid, cuentas atrás y claves de resultado).
import type { EntradaCalendario } from "@/lib/supabase/mundialQueries";

export const ZONA_EVENTO = "Europe/Madrid";

// "24 nov" (día de calendario, sin desfases de zona: la fecha ya viene como YYYY-MM-DD).
export function fechaCalendario(fecha: string, locale: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d))
  );
}

export function fechaLarga(fecha: string, locale: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, d)));
}

// "12:00" en hora de Madrid.
export function horaMadrid(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ZONA_EVENTO,
  }).format(new Date(iso));
}

// Instante (ISO) a partir de una fecha "YYYY-MM-DD" y una hora "HH:MM" en hora de Madrid.
// Se calcula el desfase de Madrid en ese día (invierno +01:00, verano +02:00).
export function isoDesdeMadrid(fecha: string, hora: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const utcSupuesto = Date.UTC(a, m - 1, d, h, mi);
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_EVENTO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(utcSupuesto));
  const g = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const comoMadrid = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
  const desfase = comoMadrid - utcSupuesto; // ms que Madrid va por delante de UTC
  return new Date(utcSupuesto - desfase).toISOString();
}

// "HH:MM" de Madrid de un instante, para rellenar los campos del admin.
export function horaInputMadrid(iso: string | null): string {
  return iso ? horaMadrid(iso, "en-GB") : "";
}

// "2 d 05:10:03" / "05:10:03".
export function cuentaAtras(msRestantes: number): string {
  const total = Math.max(0, Math.floor(msRestantes / 1000));
  const dias = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  const hms = `${dos(h)}:${dos(m)}:${dos(s)}`;
  return dias > 0 ? `${dias} d ${hms}` : hms;
}

export function marcadorTexto(n: number): string {
  const entero = Math.floor(n);
  const medio = n - entero >= 0.5;
  if (!medio) return String(entero);
  return entero === 0 ? "½" : `${entero}½`;
}

export interface SituacionMatch {
  proxima: EntradaCalendario | null; // próxima partida sin resultado
  abierta: boolean; // se puede pronosticar ahora (según el reloj de la pantalla)
}

// La próxima partida es la primera, por fecha, que aún no tiene resultado.
export function proximaPartida(calendario: EntradaCalendario[], ahoraMs: number): SituacionMatch {
  const proxima =
    calendario.find((e) => e.tipo === "partida" && e.resultado === null) ?? null;
  const abierta =
    !!proxima &&
    !!proxima.cierre &&
    ahoraMs < new Date(proxima.cierre).getTime();
  return { proxima, abierta };
}
