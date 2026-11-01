import { definirTextos } from "../definir";

// Activar/desactivar las notificaciones push (menú de ajustes).
export default definirTextos(
  {
    titulo: "Avisos en el móvil",
    intro:
      "Recibe un aviso cuando pujen por tu jugador, te hagan un clausulazo, haya un torneo nuevo o el administrador publique un aviso, aunque no tengas la app abierta.",
    activar: "Activar avisos",
    activando: "Activando…",
    activados: "Avisos activados",
    desactivar: "Desactivar avisos",
    noSoportado: "Tu navegador no admite avisos. Instala la app para recibirlos.",
    bloqueado:
      "Has bloqueado los avisos en este navegador. Cámbialo en los ajustes del navegador para activarlos.",
    sinConfigurar: "Los avisos aún no están configurados.",
    error: "No se han podido activar los avisos. Inténtalo de nuevo.",
  },
  {
    eu: {
      titulo: "Abisuak mugikorrean",
      intro:
        "Jaso abisua zure jokalariagatik puja egitean, klausulazoa jasotzean, txapelketa berri bat dagoenean edo administratzaileak abisu bat argitaratzen duenean, aplikazioa irekita izan gabe ere.",
      activar: "Gaitu abisuak",
      activando: "Gaitzen…",
      activados: "Abisuak gaituta",
      desactivar: "Desgaitu abisuak",
      noSoportado: "Zure nabigatzaileak ez ditu abisuak onartzen. Instalatu aplikazioa jasotzeko.",
      bloqueado:
        "Nabigatzaile honetan abisuak blokeatu dituzu. Aldatu nabigatzailearen ezarpenetan gaitzeko.",
      sinConfigurar: "Abisuak oraindik ez daude konfiguratuta.",
      error: "Ezin izan dira abisuak gaitu. Saiatu berriro.",
    },
    en: {
      titulo: "Phone alerts",
      intro:
        "Get an alert when someone bids for your player, pays your clause, a new tournament is created or the admin posts a notice, even with the app closed.",
      activar: "Turn on alerts",
      activando: "Turning on…",
      activados: "Alerts on",
      desactivar: "Turn off alerts",
      noSoportado: "Your browser doesn't support alerts. Install the app to receive them.",
      bloqueado:
        "You've blocked alerts in this browser. Change it in your browser settings to turn them on.",
      sinConfigurar: "Alerts aren't set up yet.",
      error: "Couldn't turn on alerts. Please try again.",
    },
  }
);
