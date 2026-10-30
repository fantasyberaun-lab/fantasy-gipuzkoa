import { definirTextos } from "../definir";

// Pantalla "Jornada en directo" (Fase 1).
export default definirTextos(
  {
    abrir: "En directo",
    titulo: "Jornada en directo",
    subtitulo: "Se actualiza solo a medida que entran los resultados.",
    jornadaNum: (n: number) => `Jornada ${n}`,
    enJuego: "En juego",
    cerrada: "Jornada cerrada",
    sinJornada: "Aún no hay ninguna jornada en juego. Vuelve cuando empiece la ronda.",
    pts: (n: number) => `${n} ${n === 1 ? "punto" : "puntos"}`,
    tuEquipo: "Tu equipo",
    actualizado: "Actualizado",
  },
  {
    eu: {
      abrir: "Zuzenean",
      titulo: "Jardunaldia zuzenean",
      subtitulo: "Emaitzak sartu ahala eguneratzen da.",
      jornadaNum: (n: number) => `${n}. jardunaldia`,
      enJuego: "Jokoan",
      cerrada: "Jardunaldia itxita",
      sinJornada: "Oraindik ez dago jardunaldirik jokoan. Itzuli erronda hastean.",
      pts: (n: number) => `${n} puntu`,
      tuEquipo: "Zure taldea",
      actualizado: "Eguneratuta",
    },
    en: {
      abrir: "Live",
      titulo: "Live matchday",
      subtitulo: "Updates on its own as results come in.",
      jornadaNum: (n: number) => `Matchday ${n}`,
      enJuego: "In play",
      cerrada: "Matchday closed",
      sinJornada: "No matchday in play yet. Come back when the round starts.",
      pts: (n: number) => `${n} ${n === 1 ? "point" : "points"}`,
      tuEquipo: "Your team",
      actualizado: "Updated",
    },
  }
);
