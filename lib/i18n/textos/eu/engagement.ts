import type { Seccion } from "../es/engagement";

const eu: Seccion = {
  compartir: "Partekatu",
  compartirCopiado: "Irudia kopiatuta! Orain zure storyan itsats dezakezu.",
  compartirError: "Ezin izan da partekatu. Saiatu berriro.",
  compartirPreparando: "Irudia prestatzen…",
  resumenTitulo: "Zure astea",
  resumenJornada: (n: number) => `${n}. jardunaldia`,
  resumenPuntos: (n: number) => `${n} puntu aste honetan`,
  resumenPuntosEtiqueta: () => "puntu aste honetan",
  resumenSube: (n: number) => `${n} postu igo zara`,
  resumenBaja: (n: number) => `${n} postu jaitsi zara`,
  resumenIgual: "Postuari eusten diozu",
  resumenOrdinal: (n: number) => `${n}.`,
  resumenDe: (n: number) => `${n}tik`,
  resumenPosicionEtiqueta: "Postua",
  resumenAcumulado: "Guztira",
  resumenGanado: "Irabazia",
  resumenPts: (n: number) => `${n} pt`,
  resumenMejor: "Zure jokalari onena",
  resumenLigas: "Zure ligak",
  resumenAnterior: "Aurreko liga",
  resumenSiguiente: "Hurrengo liga",
  resumenCerrar: "Itxi",
};

export default eu;
