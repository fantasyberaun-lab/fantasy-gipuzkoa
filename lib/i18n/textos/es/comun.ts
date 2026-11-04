import type { Ancho } from "../../definir";

// Textos sueltos que se usan en muchos sitios.

const es = {
  cargando: "Cargando…",
  guardar: "Guardar",
  guardando: "Guardando…",
  cancelar: "Cancelar",
  cerrar: "Cerrar",
  aceptar: "Aceptar",
  volver: "Volver",
  error: "Ha ocurrido un error. Inténtalo de nuevo.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
