import type { Textos } from "..";
import adminLiga from "./adminLiga";
import ajustes from "./ajustes";
import auth from "./auth";
import avatares from "./avatares";
import avisos from "./avisos";
import avisosPush from "./avisosPush";
import chat from "./chat";
import clasificacion from "./clasificacion";
import comun from "./comun";
import cuenta from "./cuenta";
import engagement from "./engagement";
import ficha from "./ficha";
import foros from "./foros";
import graficas from "./graficas";
import idioma from "./idioma";
import invitar from "./invitar";
import juego from "./juego";
import jugadores from "./jugadores";
import legal from "./legal";
import liga from "./liga";
import managers from "./managers";
import mercado from "./mercado";
import minijuegos from "./minijuegos";
import misiones from "./misiones";
import nav from "./nav";
import niveles from "./niveles";
import plantilla from "./plantilla";
import pronosticos from "./pronosticos";
import pwa from "./pwa";
import racha from "./racha";
import reglas from "./reglas";
import saldo from "./saldo";
import sugerencias from "./sugerencias";
import torneos from "./torneos";

// Todas las secciones en euskera. Para añadir una sección: crea textos/{es,eu,en}/<seccion>.ts
// y regístrala aquí y en los otros dos idiomas.
const eu: Textos = {
  adminLiga,
  ajustes,
  auth,
  avatares,
  avisos,
  avisosPush,
  chat,
  clasificacion,
  comun,
  cuenta,
  engagement,
  ficha,
  foros,
  graficas,
  idioma,
  invitar,
  juego,
  jugadores,
  legal,
  liga,
  managers,
  mercado,
  minijuegos,
  misiones,
  nav,
  niveles,
  plantilla,
  pronosticos,
  pwa,
  racha,
  reglas,
  saldo,
  sugerencias,
  torneos,
};

export default eu;
