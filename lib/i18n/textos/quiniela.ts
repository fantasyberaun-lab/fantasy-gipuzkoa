import { definirTextos } from "../definir";

// Quiniela de emparejamientos (Fase 2).
export default definirTextos(
  {
    abrir: "Quiniela",
    titulo: "Quiniela de la jornada",
    sin: "No hay ninguna ronda publicada para pronosticar ahora mismo.",
    intro: "Acierta el resultado de cada partida y gana saldo.",
    jornadaTorneo: (n: number, torneo: string) => (torneo ? `Jornada ${n} · ${torneo}` : `Jornada ${n}`),
    blancas: "Blancas",
    tablas: "Tablas",
    negras: "Negras",
    acierto: "¡Acierto!",
    fallo: "Fallo",
    jugada: "Partida jugada",
    guardado: "Pronóstico guardado",
    error: "No se ha podido guardar el pronóstico.",
  },
  {
    eu: {
      abrir: "Kiniela",
      titulo: "Jardunaldiko kiniela",
      sin: "Oraingoz ez dago erronda argitaraturik pronostikatzeko.",
      intro: "Asmatu partida bakoitzaren emaitza eta irabazi saldoa.",
      jornadaTorneo: (n: number, torneo: string) =>
        torneo ? `${n}. jardunaldia · ${torneo}` : `${n}. jardunaldia`,
      blancas: "Zuriak",
      tablas: "Berdinketa",
      negras: "Beltzak",
      acierto: "Asmatu duzu!",
      fallo: "Huts",
      jugada: "Jokatutako partida",
      guardado: "Pronostikoa gordeta",
      error: "Ezin izan da pronostikoa gorde.",
    },
    en: {
      abrir: "Pools",
      titulo: "Matchday pools",
      sin: "No published round to predict right now.",
      intro: "Call each game right and win balance.",
      jornadaTorneo: (n: number, torneo: string) =>
        torneo ? `Matchday ${n} · ${torneo}` : `Matchday ${n}`,
      blancas: "White",
      tablas: "Draw",
      negras: "Black",
      acierto: "Correct!",
      fallo: "Wrong",
      jugada: "Game played",
      guardado: "Prediction saved",
      error: "Couldn't save the prediction.",
    },
  }
);
