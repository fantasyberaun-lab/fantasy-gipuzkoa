import type { Seccion } from "../es/engagement";

const en: Seccion = {
  compartir: "Share",
  compartirCopiado: "Image copied! You can paste it into your story.",
  compartirError: "Couldn't share. Please try again.",
  compartirPreparando: "Preparing image…",
  resumenTitulo: "Your week",
  resumenEquipo: "Team",
  resumenLiga: "League",
  resumenPuntos: (n: number) => `${n} ${n === 1 ? "point" : "points"} this week`,
  resumenPosicion: (n: number) => `You're ${n}th in your league`,
  resumenSube: (n: number) => `You climbed ${n} ${n === 1 ? "place" : "places"}`,
  resumenBaja: (n: number) => `You dropped ${n} ${n === 1 ? "place" : "places"}`,
  resumenIgual: "You held your place",
  resumenCerrar: "Close",
};

export default en;
