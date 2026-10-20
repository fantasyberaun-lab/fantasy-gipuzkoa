// Cuándo se puede ver una jornada (fin de semana). Las rondas se crean a veces
// días antes (al importar emparejamientos) y la base de datos ya les rehace la
// foto de titulares con la plantilla de ese momento (0078). Para no enseñar
// una jornada que todavía no ha empezado, ni las alineaciones de los demás
// antes de tiempo, la jornada no aparece hasta el sábado a las 16:00 (hora de
// Madrid), que es cuando se hace la foto de las alineaciones. Mantener igual
// que registrar_alineaciones_si_toca() en 0051_alineaciones_sabado.sql.
export const HORA_FOTO_SABADO = "16:00";

const formatoMadrid = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// "YYYY-MM-DDTHH:mm" en hora de Madrid: así se compara como texto con la
// fecha de la jornada sin hacer cuentas de husos horarios.
function ahoraEnMadrid(ahora: Date): string {
  const p = Object.fromEntries(formatoMadrid.formatToParts(ahora).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// `semana` es el sábado de la jornada, "YYYY-MM-DD".
export function jornadaVisible(semana: string, ahora: Date = new Date()): boolean {
  return ahoraEnMadrid(ahora) >= `${semana}T${HORA_FOTO_SABADO}`;
}
