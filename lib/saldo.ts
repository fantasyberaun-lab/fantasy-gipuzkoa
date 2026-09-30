// Redondea a 2 decimales como máximo (125.4 -> 125.4, 125.456 -> 125.46).
// Devuelve un número, así que no añade ceros sobrantes ("125" y no "125.00").
export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
