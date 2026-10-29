import { definirTextos } from "../definir";

// Álbum de cromos (Fase 3).
export default definirTextos(
  {
    abrir: "Álbum de cromos",
    titulo: "Álbum de cromos",
    intro: "Colecciona el cromo de cada jugador que pase por tu plantilla.",
    progreso: (c: number, total: number) => `${c} de ${total} cromos`,
    rarezas: { legendario: "Legendario", epico: "Épico", raro: "Raro", comun: "Común" },
    categoria: (c: string) => `Categoría ${c}`,
    bloqueado: "Por conseguir",
    sin: "Todavía no hay jugadores que coleccionar.",
  },
  {
    eu: {
      abrir: "Kromo-albuma",
      titulo: "Kromo-albuma",
      intro: "Bildu zure plantillatik pasatzen den jokalari bakoitzaren kromoa.",
      progreso: (c: number, total: number) => `${total}tik ${c} kromo`,
      rarezas: { legendario: "Legendarioa", epico: "Epikoa", raro: "Arraroa", comun: "Arrunta" },
      categoria: (c: string) => `${c}. kategoria`,
      bloqueado: "Lortzeke",
      sin: "Oraindik ez dago jokalaririk biltzeko.",
    },
    en: {
      abrir: "Sticker album",
      titulo: "Sticker album",
      intro: "Collect the sticker of every player who joins your squad.",
      progreso: (c: number, total: number) => `${c} of ${total} stickers`,
      rarezas: { legendario: "Legendary", epico: "Epic", raro: "Rare", comun: "Common" },
      categoria: (c: string) => `Category ${c}`,
      bloqueado: "Not yet",
      sin: "No players to collect yet.",
    },
  }
);
