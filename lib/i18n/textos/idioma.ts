import { definirTextos } from "../definir";

// Para el selector de idioma del menú de configuración.
export default definirTextos(
  {
    titulo: "Idioma",
    descripcion: "Elige el idioma de la aplicación.",
    aviso:
      "Algunos textos (comunicados, avisos generados por el juego y documentos legales) siguen en castellano.",
  },
  {
    eu: {
      titulo: "Hizkuntza",
      descripcion: "Aukeratu aplikazioaren hizkuntza.",
      aviso:
        "Testu batzuk (komunikatuak, jokoak sortutako abisuak eta lege-dokumentuak) gaztelaniaz daude oraindik.",
    },
    en: {
      titulo: "Language",
      descripcion: "Choose the app language.",
      aviso:
        "Some texts (announcements, game-generated notices and legal documents) are still in Spanish.",
    },
  }
);
