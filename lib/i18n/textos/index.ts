import type { Idioma } from "../config";
import comun from "./comun";
import idioma from "./idioma";
import ajustes from "./ajustes";
import cuenta from "./cuenta";
import auth from "./auth";
import legal from "./legal";
import liga from "./liga";
import pwa from "./pwa";
import mercado from "./mercado";
import ficha from "./ficha";
import saldo from "./saldo";
import plantilla from "./plantilla";
import jugadores from "./jugadores";
import managers from "./managers";
import graficas from "./graficas";
import clasificacion from "./clasificacion";
import torneos from "./torneos";
import avisos from "./avisos";
import nav from "./nav";
import racha from "./racha";
import reglas from "./reglas";
import juego from "./juego";
import sugerencias from "./sugerencias";

// Todas las secciones de textos. Para añadir una: crea textos/<seccion>.ts
// con definirTextos(...) y regístrala aquí.
const SECCIONES = {
  comun,
  idioma,
  ajustes,
  cuenta,
  auth,
  legal,
  liga,
  pwa,
  mercado,
  ficha,
  saldo,
  plantilla,
  jugadores,
  managers,
  graficas,
  clasificacion,
  torneos,
  avisos,
  nav,
  racha,
  reglas,
  juego,
  sugerencias,
};

type Secciones = typeof SECCIONES;
export type Textos = { [K in keyof Secciones]: Secciones[K]["es"] };

function textosDe(idioma: Idioma): Textos {
  const salida = {} as Record<string, unknown>;
  for (const [nombre, seccion] of Object.entries(SECCIONES)) {
    salida[nombre] = seccion[idioma];
  }
  return salida as Textos;
}

export const TEXTOS: Record<Idioma, Textos> = {
  es: textosDe("es"),
  eu: textosDe("eu"),
  en: textosDe("en"),
};
