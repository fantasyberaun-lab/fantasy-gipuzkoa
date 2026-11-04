import type { Ancho } from "../../definir";

// Para el selector de idioma del menú de configuración.

const es = {
  titulo: "Idioma",
  descripcion: "Elige el idioma de la aplicación.",
  aviso:
    "Algunos textos (comunicados, avisos generados por el juego y documentos legales) siguen en castellano.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
