import type { Ancho } from "../../definir";

// Página Plantilla (y los motivos de bloqueo de titulares de lib/titulares).

const es = {
  cargando: "Cargando tu plantilla…",
  sinEquipo:
    "No se ha encontrado un equipo Fantasy asociado a tu cuenta. Si acabas de registrarte, prueba a recargar la página en unos segundos.",
  // Resumen
  valorPlantilla: "Valor de la plantilla",
  jugadores: (n: number) => `${n} jugador${n === 1 ? "" : "es"}`,
  valorTitulares: "Valor de titulares",
  sinTitulares: "Sin titulares",
  titulares: (n: number) => `${n} titular${n === 1 ? "" : "es"}`,
  eloMedioPlantilla: "Elo medio plantilla",
  eloMedioTitulares: "Elo medio titulares",
  notaSinElo: (n: number) =>
    `Las medias de Elo no cuentan a ${n} jugador${n === 1 ? "" : "es"} sin Elo.`,
  // Ofertas recibidas. La frase va en trozos: {equipo}{trasEquipo}{importe M}{trasImporte}{jugador}{fin}
  ofertasRecibidas: "Ofertas recibidas",
  sinOfertas: "No hay ofertas recibidas.",
  ofertaTrasEquipo: " te ofrece ",
  ofertaTrasImporte: " por ",
  ofertaFin: ".",
  rechazar: "Rechazar",
  aceptar: "Aceptar",
  // Contadores
  titularesMismoTorneo: "Titulares en un mismo torneo",
  sinTitularesTorneo: "Sin titulares en ningún torneo",
  topeTorneo: "Límite alcanzado — no puedes poner más titulares de ese torneo.",
  titularesSeleccionados: "Titulares seleccionados",
  topeTitulares: "Límite alcanzado — no puedes poner más titulares.",
  jugadoresEnPlantilla: "Jugadores en plantilla",
  plantillaCompleta: "Plantilla completa.",
  // Secciones y resumen compacto
  seccionTitulares: "Titulares",
  seccionSuplentes: "Suplentes",
  sinSuplentes: "No tienes suplentes.",
  resumenTitulares: "Titulares",
  resumenPlantilla: "Plantilla",
  resumenValor: "Valor",
  masDetalle: "Más detalle",
  menosDetalle: "Menos detalle",
  sinCapitan: "Todavía no has elegido capitán.",
  // Vacía
  vacioPublica:
    "Todavía no tienes jugadores. Ve a la pestaña Mercado y ficha a los que quieras: todos están disponibles y el fichaje es inmediato.",
  vacioPrivada:
    "Todavía no tienes jugadores en tu plantilla. Ve a la pestaña Jugadores para pagar una cláusula, o espera a que haya jugadores libres en el Mercado.",
  // Motivos de bloqueo (lib/titulares)
  bloqueoMaxTitulares: (max: number) =>
    `Ya tienes ${max} titulares — pasa a suplente a otro primero.`,
  bloqueoMaxPorTorneo: (max: number, torneos: string) =>
    `Ya tienes ${max} titulares en ${torneos} — pasa a suplente a otro primero.`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
