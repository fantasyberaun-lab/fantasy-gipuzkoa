import type { Seccion } from "../es/engagement";

const en: Seccion = {
  compartir: "Share",
  compartirCopiado: "Image copied! You can paste it into your story.",
  compartirError: "Couldn't share. Please try again.",
  compartirPreparando: "Preparing image…",
  resumenTitulo: "Your week",
  resumenJornada: (n: number) => `Matchday ${n}`,
  resumenPuntos: (n: number) => `${n} ${n === 1 ? "point" : "points"} this week`,
  resumenPuntosEtiqueta: (n: number) => `${n === 1 ? "point" : "points"} this week`,
  resumenSube: (n: number) => `You climbed ${n} ${n === 1 ? "place" : "places"}`,
  resumenBaja: (n: number) => `You dropped ${n} ${n === 1 ? "place" : "places"}`,
  resumenIgual: "You held your place",
  resumenOrdinal: (n: number) => {
    const u = n % 10;
    const d = n % 100;
    const s = u === 1 && d !== 11 ? "st" : u === 2 && d !== 12 ? "nd" : u === 3 && d !== 13 ? "rd" : "th";
    return `${n}${s}`;
  },
  resumenDe: (n: number) => `of ${n}`,
  resumenPosicionEtiqueta: "Position",
  resumenAcumulado: "Total",
  resumenGanado: "Earned",
  resumenPts: (n: number) => `${n} pts`,
  resumenMejor: "Your best player",
  resumenLigas: "Your leagues",
  resumenAnterior: "Previous league",
  resumenSiguiente: "Next league",
  resumenCerrar: "Close",
};

export default en;
