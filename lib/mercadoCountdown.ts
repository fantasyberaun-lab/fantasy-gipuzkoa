// Calcula cuándo se resuelve la próxima tanda del mercado, a partir de
// las mismas horas UTC que usa el cron en Supabase (0, 8, 16 UTC — ver
// 'mercado-cada-8h' programado desde el SQL Editor). Si algún día se
// cambia la frecuencia del cron, hay que actualizar HORAS_UTC aquí para
// que coincida.
const HORAS_UTC = [0, 8, 16];

// Las pujas se ocultan estas horas antes de cada tanda (solo ves cuánta gente
// ha pujado, no los importes). Mantener igual que pujas_ocultas() en
// 0047_pujas_ocultas_clausulazos_superveteranos.sql.
export const HORAS_OCULTAS = 2;

export function proximaTandaMercado(ahora: Date = new Date()): Date {
  const inicioDeHoy = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())
  );

  for (const hora of HORAS_UTC) {
    const candidato = new Date(inicioDeHoy);
    candidato.setUTCHours(hora, 0, 0, 0);
    if (candidato.getTime() > ahora.getTime()) return candidato;
  }

  // Ya ha pasado la última hora de hoy (16 UTC) → primera hora de mañana.
  const manana = new Date(inicioDeHoy);
  manana.setUTCDate(manana.getUTCDate() + 1);
  manana.setUTCHours(HORAS_UTC[0], 0, 0, 0);
  return manana;
}

// ¿Estamos en las últimas HORAS_OCULTAS horas antes de la tanda?
export function pujasOcultas(ahora: Date = new Date()): boolean {
  const msHastaTanda = proximaTandaMercado(ahora).getTime() - ahora.getTime();
  return msHastaTanda <= HORAS_OCULTAS * 3600_000;
}

// Cuánto falta para que las pujas dejen de verse (0 si ya están ocultas).
export function msHastaOcultarPujas(ahora: Date = new Date()): number {
  const msHastaTanda = proximaTandaMercado(ahora).getTime() - ahora.getTime();
  return Math.max(0, msHastaTanda - HORAS_OCULTAS * 3600_000);
}

export function formatearCuentaAtras(msRestantes: number): string {
  const totalMinutos = Math.max(0, Math.floor(msRestantes / 60000));
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
}

// Clausulazos cerrados: desde el sábado a las 12:00 hasta el lunes a las 00:00
// (hora de Madrid). Mantener igual que clausulazos_cerrados() en
// 0047_pujas_ocultas_clausulazos_superveteranos.sql.
export const MENSAJE_CLAUSULAZOS_CERRADOS =
  "Los clausulazos están cerrados: no se pueden hacer desde el sábado a las 12:00 hasta el lunes a las 00:00.";

export function clausulazosCerrados(ahora: Date = new Date()): boolean {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  if (dia === "Sun") return true;
  if (dia === "Sat") return hora >= 12;
  return false;
}

// Igual que formatearCuentaAtras pero con segundos (para el contador del Mercado).
export function formatearCuentaAtrasConSegundos(msRestantes: number): string {
  const totalSegundos = Math.max(0, Math.floor(msRestantes / 1000));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(horas)}:${dos(minutos)}:${dos(segundos)}`;
}
