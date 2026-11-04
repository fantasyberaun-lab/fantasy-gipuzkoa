// Los textos de cada sección viven en textos/{es,eu,en}/<seccion>.ts (ver textos/index.ts).
// El castellano marca la forma: si a euskera o inglés les falta una clave (o sobra), no compila.
// Los textos pueden ser funciones para interpolar o pluralizar:
//   jugadores: (n: number) => `${n} jugador${n === 1 ? "" : "es"}`

// Forma de una sección a partir de los textos en castellano: igual, pero con los textos
// "ensanchados" a string / number / boolean. Sin esto TypeScript exigiría que la traducción
// devolviera exactamente las mismas frases literales que el castellano.
export type Ancho<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Ancho<R>
        : T extends object
          ? { [K in keyof T]: Ancho<T[K]> }
          : T;
