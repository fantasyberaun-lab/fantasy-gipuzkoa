import type { Ancho } from "../../definir";

// Botón de instalar la app (PWA).

const es = {
  instalarApp: "Instalar app",
  // iOS: "<antes> ↑<despues>"
  iosAntes: "Pulsa el icono Compartir",
  iosDespues: ' de Safari y luego "Añadir a pantalla de inicio".',
  android: 'Abre el menú (⋮) de Chrome y toca "Añadir a pantalla de inicio" o "Instalar app".',
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
