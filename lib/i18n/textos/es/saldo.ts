import type { Ancho } from "../../definir";

// Saldo (tarjeta de saldo y saldo con pujas comprometidas).

const es = {
  titulo: "Saldo",
  comprometido: "Comprometido en tus pujas abiertas",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
