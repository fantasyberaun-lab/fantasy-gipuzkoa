import type { Seccion } from "../es/pronosticos";

const en: Seccion = {
  pestana: "Predictions",
  titulo: "Predictions",
  intro:
    "Say how you think each game will end before the round starts. It's optional, you only play the boards you want, and it gives no prizes or points.",
  sin: "There is no published round to predict right now.",
  volver: "Back to tournaments",
  jornadaFecha: (n: number, fecha: string) => (fecha ? `Matchday ${n} · ${fecha}` : `Matchday ${n}`),
  abiertaEtiqueta: "Open",
  cerradaEtiqueta: "Closed",
  cerradaAviso: "This round has started or has no date: predictions are closed.",
  haciendo: (hechos: number, total: number) => `${hechos} of ${total} boards predicted`,
  blancas: "White",
  tablas: "Draw",
  negras: "Black",
  acierto: "Correct",
  fallo: "Wrong",
  quitar: "Remove prediction",
  guardado: "Prediction saved",
  quitado: "Prediction removed",
  error: "Couldn't save the prediction.",
  resumen: (aciertos: number, resueltos: number) =>
    `Your hits: ${aciertos} of ${resueltos} games played`,
};

export default en;
