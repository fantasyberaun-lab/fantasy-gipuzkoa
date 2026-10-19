import { definirTextos } from "../definir";

// Pestañas principales (escritorio y barra inferior del móvil).
export default definirTextos(
  {
    plantilla: "Plantilla",
    mercado: "Mercado",
    jugadores: "Jugadores",
    clasificacion: "Clasificación",
    torneos: "Torneos",
    avisos: "Avisos",
    chat: "Chat",
    navegacionPrincipal: "Navegación principal",
    sinLeer: (n: number) => `${n} sin leer`,
  },
  {
    eu: {
      plantilla: "Plantilla",
      mercado: "Merkatua",
      jugadores: "Jokalariak",
      clasificacion: "Sailkapena",
      torneos: "Txapelketak",
      avisos: "Abisuak",
      chat: "Txata",
      navegacionPrincipal: "Nabigazio nagusia",
      sinLeer: (n: number) => `${n} irakurri gabe`,
    },
    en: {
      plantilla: "Squad",
      mercado: "Market",
      jugadores: "Players",
      clasificacion: "Standings",
      torneos: "Tournaments",
      avisos: "Alerts",
      chat: "Chat",
      navegacionPrincipal: "Main navigation",
      sinLeer: (n: number) => `${n} unread`,
    },
  }
);
