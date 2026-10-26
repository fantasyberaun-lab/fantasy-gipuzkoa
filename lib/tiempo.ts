// "hace 5 minutos", "ayer"… con Intl, para listas de temas y avisos.
export function haceTiempo(iso: string, locale: string, ahoraMismo: string): string {
  const segundos = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(segundos);
  if (abs < 60) return ahoraMismo;
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(segundos / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(segundos / 86400), "day");
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}
