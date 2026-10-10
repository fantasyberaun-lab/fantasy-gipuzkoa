import type { Idioma } from "./config";

// Une los textos de una sección en los tres idiomas. El castellano marca la
// forma: si a euskera o inglés les falta una clave (o sobra), no compila.
// Los textos pueden ser funciones para interpolar o pluralizar:
//   jugadores: (n: number) => `${n} jugador${n === 1 ? "" : "es"}`
export function definirTextos<T>(es: T, otros: { eu: T; en: T }): Record<Idioma, T> {
  return { es, eu: otros.eu, en: otros.en };
}
