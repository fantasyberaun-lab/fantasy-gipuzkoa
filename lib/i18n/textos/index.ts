// Tipo de todos los textos de la interfaz. Los textos en sí viven en un directorio
// por idioma (es/, eu/, en/), cada uno con un archivo por sección, para que el
// navegador descargue SOLO el idioma que usa el jugador:
//
//   textos/es/<seccion>.ts   castellano: define la forma de la sección (export type Seccion)
//   textos/eu/<seccion>.ts   euskera: `const eu: Seccion = {…}` (TypeScript exige las mismas claves)
//   textos/en/<seccion>.ts   inglés: igual
//   textos/<idioma>/index.ts reúne las secciones de ese idioma
//
// Para añadir una sección: crea los tres archivos y regístrala en los tres index.ts.
// Este archivo solo exporta el tipo (no arrastra ningún idioma al navegador).
import type { Ancho } from "../definir";
import type es from "./es";

export type Textos = Ancho<typeof es>;
