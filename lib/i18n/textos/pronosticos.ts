import { definirTextos } from "../definir";

// Pronósticos de partidas (dentro de Minijuegos, sin recompensas).
export default definirTextos(
  {
    pestana: "Pronósticos",
    titulo: "Pronósticos",
    intro:
      "Opina sobre cómo acabará cada partida antes de que empiece la ronda. Es opcional, solo juegas las mesas que quieras y no da premios ni puntos.",
    sin: "Ahora mismo no hay ninguna ronda publicada para pronosticar.",
    volver: "Volver a los torneos",
    jornadaFecha: (n: number, fecha: string) => (fecha ? `Jornada ${n} · ${fecha}` : `Jornada ${n}`),
    abiertaEtiqueta: "Abierto",
    cerradaEtiqueta: "Cerrado",
    cerradaAviso: "Esta ronda ya ha empezado o no tiene fecha: los pronósticos están cerrados.",
    haciendo: (hechos: number, total: number) => `${hechos} de ${total} mesas pronosticadas`,
    blancas: "Blancas",
    tablas: "Tablas",
    negras: "Negras",
    acierto: "Acierto",
    fallo: "Fallo",
    quitar: "Quitar pronóstico",
    guardado: "Pronóstico guardado",
    quitado: "Pronóstico quitado",
    error: "No se ha podido guardar el pronóstico.",
    resumen: (aciertos: number, resueltos: number) =>
      `Tus aciertos: ${aciertos} de ${resueltos} partidas jugadas`,
  },
  {
    eu: {
      pestana: "Pronostikoak",
      titulo: "Pronostikoak",
      intro:
        "Eman zure iritzia partida bakoitzak nola amaituko duen, erronda hasi aurretik. Aukerakoa da, nahi dituzun mahaiak soilik jokatzen dituzu eta ez du sari edo punturik ematen.",
      sin: "Oraingoz ez dago erronda argitaraturik pronostikatzeko.",
      volver: "Itzuli txapelketetara",
      jornadaFecha: (n: number, fecha: string) =>
        fecha ? `${n}. jardunaldia · ${fecha}` : `${n}. jardunaldia`,
      abiertaEtiqueta: "Irekita",
      cerradaEtiqueta: "Itxita",
      cerradaAviso: "Erronda hasi da edo ez du daturik: pronostikoak itxita daude.",
      haciendo: (hechos: number, total: number) => `${total} mahaitatik ${hechos} pronostikatuta`,
      blancas: "Zuriak",
      tablas: "Berdinketa",
      negras: "Beltzak",
      acierto: "Asmatu",
      fallo: "Huts",
      quitar: "Kendu pronostikoa",
      guardado: "Pronostikoa gordeta",
      quitado: "Pronostikoa kenduta",
      error: "Ezin izan da pronostikoa gorde.",
      resumen: (aciertos: number, resueltos: number) =>
        `Zure asmatzeak: ${aciertos} / ${resueltos} jokatutako partida`,
    },
    en: {
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
    },
  }
);
