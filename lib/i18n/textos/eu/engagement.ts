import type { Seccion } from "../es/engagement";

const eu: Seccion = {
  compartir: "Partekatu",
  compartirCopiado: "Irudia kopiatuta! Orain zure storyan itsats dezakezu.",
  compartirError: "Ezin izan da partekatu. Saiatu berriro.",
  compartirPreparando: "Irudia prestatzen…",
  resumenTitulo: "Zure astea",
  resumenEquipo: "Taldea",
  resumenLiga: "Liga",
  resumenPuntos: (n: number) => `${n} puntu aste honetan`,
  resumenPosicion: (n: number) => `${n}. zaude zure ligan`,
  resumenSube: (n: number) => `${n} postu igo zara`,
  resumenBaja: (n: number) => `${n} postu jaitsi zara`,
  resumenIgual: "Postuari eusten diozu",
  resumenCerrar: "Itxi",
};

export default eu;
