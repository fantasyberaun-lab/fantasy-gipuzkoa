import type { Seccion } from "../es/plantilla";

const en: Seccion = {
  cargando: "Loading your squad…",
  sinEquipo:
    "We couldn't find a Fantasy team linked to your account. If you've just signed up, try reloading the page in a few seconds.",
  valorPlantilla: "Squad value",
  jugadores: (n: number) => `${n} player${n === 1 ? "" : "s"}`,
  valorTitulares: "Starters' value",
  sinTitulares: "No starters",
  titulares: (n: number) => `${n} starter${n === 1 ? "" : "s"}`,
  eloMedioPlantilla: "Avg Elo (squad)",
  eloMedioTitulares: "Avg Elo (starters)",
  notaSinElo: (n: number) =>
    `Elo averages leave out ${n} player${n === 1 ? "" : "s"} without Elo.`,
  ofertasRecibidas: "Offers received",
  sinOfertas: "No offers received.",
  ofertaTrasEquipo: " offers you ",
  ofertaTrasImporte: " for ",
  ofertaFin: ".",
  rechazar: "Reject",
  aceptar: "Accept",
  titularesMismoTorneo: "Starters in one tournament",
  sinTitularesTorneo: "No starters in any tournament",
  topeTorneo: "Limit reached — you can't add more starters from that tournament.",
  titularesSeleccionados: "Starters selected",
  topeTitulares: "Limit reached — you can't add more starters.",
  jugadoresEnPlantilla: "Players in squad",
  plantillaCompleta: "Squad full.",
  seccionTitulares: "Starters",
  seccionSuplentes: "Bench",
  sinSuplentes: "You have no bench players.",
  resumenTitulares: "Starters",
  resumenPlantilla: "Squad",
  resumenValor: "Value",
  masDetalle: "More detail",
  menosDetalle: "Less detail",
  sinCapitan: "You haven't picked a captain yet.",
  vacioPublica:
    "You don't have any players yet. Go to the Market tab and sign whoever you like: everyone is available and signings are instant.",
  vacioPrivada:
    "You don't have any players in your squad yet. Go to the Players tab to pay a release clause, or wait for free players to show up in the Market.",
  bloqueoMaxTitulares: (max: number) =>
    `You already have ${max} starters — move another one to the bench first.`,
  bloqueoMaxPorTorneo: (max: number, torneos: string) =>
    `You already have ${max} starters in ${torneos} — move another one to the bench first.`,
};

export default en;
