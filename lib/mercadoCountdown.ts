// Calcula cuándo se resuelve la próxima tanda del mercado. Las tandas son a
// las 8:00, 17:00 y 23:00 (hora de España, Europe/Madrid), así que cambian de
// hora UTC con el horario de verano; por eso se calcula en hora de Madrid y no
// con horas UTC fijas. Mantener igual que procesar_mercado_si_toca() en
// 0050_horarios_mercado_y_clausulazos.sql.
export const HORAS_TANDA_MADRID = [8, 17, 23];

// Las pujas se ocultan estas horas antes de cada tanda (solo ves cuánta gente
// ha pujado, no los importes). Mantener igual que pujas_ocultas() en
// 0050_horarios_mercado_y_clausulazos.sql.
export const HORAS_OCULTAS = 2;

const formatoHoraMadrid = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  hourCycle: "h23",
});

function horaEnMadrid(ms: number): number {
  const partes = formatoHoraMadrid.formatToParts(new Date(ms));
  return Number(partes.find((p) => p.type === "hour")?.value);
}

export function proximaTandaMercado(ahora: Date = new Date()): Date {
  const HORA_MS = 3600_000;
  // Madrid va siempre a horas enteras respecto a UTC, así que basta con ir
  // avanzando de hora en hora hasta dar con una hora de tanda.
  let t = Math.floor(ahora.getTime() / HORA_MS) * HORA_MS + HORA_MS;
  for (let i = 0; i < 48; i++, t += HORA_MS) {
    if (HORAS_TANDA_MADRID.includes(horaEnMadrid(t))) return new Date(t);
  }
  // No debería pasar nunca (en 48 h siempre hay tanda).
  return new Date(ahora.getTime() + 8 * HORA_MS);
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

// Clausulazos cerrados: desde el viernes a las 16:00 (un día antes de que
// empiece la jornada) hasta el sábado a las 18:00 (hora de Madrid). Mantener
// igual que clausulazos_cerrados() en 0050_horarios_mercado_y_clausulazos.sql.
// Texto en castellano; las traducciones están en t.mercado.clausulazosCerrados
// (lib/i18n/textos/mercado.ts).
export const MENSAJE_CLAUSULAZOS_CERRADOS =
  "Los clausulazos están cerrados: no se pueden hacer desde el viernes a las 16:00 hasta el sábado a las 18:00.";

export function clausulazosCerrados(ahora: Date = new Date()): boolean {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  if (dia === "Fri") return hora >= 16;
  if (dia === "Sat") return hora < 18;
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