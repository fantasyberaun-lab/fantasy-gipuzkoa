// Estructura sencilla para escribir los documentos legales como datos.
// En los textos, lo que vaya entre **dobles asteriscos** se pinta en negrita.
export type Bloque =
  | { tipo: "p"; texto: string }
  | { tipo: "ul"; items: string[] }
  | { tipo: "lineas"; lineas: string[] }
  | { tipo: "destacado"; texto: string };

export interface Seccion {
  titulo: string;
  bloques: Bloque[];
}

export const p = (texto: string): Bloque => ({ tipo: "p", texto });
export const ul = (...items: string[]): Bloque => ({ tipo: "ul", items });
export const lineas = (...l: string[]): Bloque => ({ tipo: "lineas", lineas: l });
export const destacado = (texto: string): Bloque => ({ tipo: "destacado", texto });
