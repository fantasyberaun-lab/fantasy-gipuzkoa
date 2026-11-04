import type { Ancho } from "../../definir";

// Activar/desactivar las notificaciones push (menú de ajustes).

const es = {
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
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
