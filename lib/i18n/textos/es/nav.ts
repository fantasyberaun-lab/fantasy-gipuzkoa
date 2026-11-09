import type { Ancho } from "../../definir";

// Pestañas principales (escritorio y barra inferior del móvil).

const es = {
  plantilla: "Plantilla",
  mercado: "Mercado",
  jugadores: "Jugadores",
  clasificacion: "Clasificación",
  torneos: "Torneos",
  avisos: "Avisos",
  chat: "Chat",
  resultados: "Resultados",
  comunicados: "Comunicados",
  actividad: "Actividad",
  sugerencias: "Sugerencias",
  variables: "Variables",
  administracion: "Administración",
  navegacionPrincipal: "Navegación principal",
  sinLeer: (n: number) => `${n} sin leer`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
