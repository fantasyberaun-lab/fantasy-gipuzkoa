// Calcula cuándo se resuelve la próxima tanda del mercado, a partir de
// las mismas horas UTC que usa el cron en Supabase (0, 8, 16 UTC — ver
// 'mercado-cada-8h' programado desde el SQL Editor). Si algún día se
// cambia la frecuencia del cron, hay que actualizar HORAS_UTC aquí para
// que coincida.
const HORAS_UTC = [0, 8, 16];

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

export function formatearCuentaAtras(msRestantes: number): string {
  const totalMinutos = Math.max(0, Math.floor(msRestantes / 60000));
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
}