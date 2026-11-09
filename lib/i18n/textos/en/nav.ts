import type { Seccion } from "../es/nav";

const en: Seccion = {
  plantilla: "Squad",
  mercado: "Market",
  jugadores: "Players",
  clasificacion: "Standings",
  torneos: "Tournaments",
  avisos: "Alerts",
  chat: "Chat",
  resultados: "Results",
  comunicados: "Announcements",
  actividad: "Activity",
  sugerencias: "Suggestions",
  variables: "Variables",
  administracion: "Administration",
  navegacionPrincipal: "Main navigation",
  sinLeer: (n: number) => `${n} unread`,
};

export default en;
