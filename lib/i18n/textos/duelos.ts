import { definirTextos } from "../definir";

// Pantalla "Duelos" cara a cara (Fase 1).
export default definirTextos(
  {
    abrir: "Duelos",
    titulo: "Duelos de la jornada",
    soloPrivadas: "Los duelos son solo para ligas privadas.",
    sinJornada: "Aún no hay ninguna jornada con duelos. Vuelve cuando empiece la ronda.",
    tuDuelo: "Tu duelo",
    derbi: "Derbi de la jornada",
    enJuego: "En juego",
    cerrada: "Cerrada",
    descansa: "Descansa esta jornada",
    vs: "vs",
    clasifTitulo: "Clasificación por duelos",
    col: { equipo: "Equipo", g: "G", e: "E", p: "P", pts: "Pts" },
    leyenda: "G ganados · E empatados · P perdidos · Pts (3 por victoria, 1 por empate)",
  },
  {
    eu: {
      abrir: "Dueluak",
      titulo: "Jardunaldiko dueluak",
      soloPrivadas: "Dueluak liga pribatuetarako baino ez dira.",
      sinJornada: "Oraindik ez dago duelurik duen jardunaldirik. Itzuli erronda hastean.",
      tuDuelo: "Zure duelua",
      derbi: "Jardunaldiko derbia",
      enJuego: "Jokoan",
      cerrada: "Itxita",
      descansa: "Jardunaldi honetan atseden",
      vs: "vs",
      clasifTitulo: "Dueluen sailkapena",
      col: { equipo: "Taldea", g: "I", e: "B", p: "G", pts: "Pt" },
      leyenda: "I irabaziak · B berdinduak · G galduak · Pt (3 garaipeneko, 1 berdinketako)",
    },
    en: {
      abrir: "Duels",
      titulo: "Matchday duels",
      soloPrivadas: "Duels are only for private leagues.",
      sinJornada: "No matchday with duels yet. Come back when the round starts.",
      tuDuelo: "Your duel",
      derbi: "Duel of the matchday",
      enJuego: "Live",
      cerrada: "Closed",
      descansa: "Bye this matchday",
      vs: "vs",
      clasifTitulo: "Duel standings",
      col: { equipo: "Team", g: "W", e: "D", p: "L", pts: "Pts" },
      leyenda: "W won · D drawn · L lost · Pts (3 per win, 1 per draw)",
    },
  }
);
