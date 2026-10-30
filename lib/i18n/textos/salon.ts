import { definirTextos } from "../definir";

// Salón de la fama (Fase 3).
export default definirTextos(
  {
    abrir: "Salón de la fama",
    titulo: "Salón de la fama",
    sin: "Aún no hay récords en esta liga. ¡Juega las primeras jornadas!",
    lider: "Líder de la temporada",
    mejorJornada: "Mejor jornada",
    reyDuelos: "Rey de los duelos",
    puntos: (n: number) => `${n} ${n === 1 ? "punto" : "puntos"}`,
    victorias: (n: number) => `${n} ${n === 1 ? "victoria" : "victorias"}`,
    enJornada: (n: number) => `Jornada ${n}`,
  },
  {
    eu: {
      abrir: "Ospearen aretoa",
      titulo: "Ospearen aretoa",
      sin: "Oraindik ez dago errekorrik liga honetan. Jokatu lehen jardunaldiak!",
      lider: "Denboraldiko liderra",
      mejorJornada: "Jardunaldirik onena",
      reyDuelos: "Dueluen erregea",
      puntos: (n: number) => `${n} puntu`,
      victorias: (n: number) => `${n} garaipen`,
      enJornada: (n: number) => `${n}. jardunaldia`,
    },
    en: {
      abrir: "Hall of fame",
      titulo: "Hall of fame",
      sin: "No records in this league yet. Play the first matchdays!",
      lider: "Season leader",
      mejorJornada: "Best matchday",
      reyDuelos: "Duel king",
      puntos: (n: number) => `${n} ${n === 1 ? "point" : "points"}`,
      victorias: (n: number) => `${n} ${n === 1 ? "win" : "wins"}`,
      enJornada: (n: number) => `Matchday ${n}`,
    },
  }
);
