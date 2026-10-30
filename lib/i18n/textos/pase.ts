import { definirTextos } from "../definir";

// Pase de recompensas por temporada (Fase 2).
export default definirTextos(
  {
    abrir: "Pase",
    titulo: "Pase de temporada",
    sin: "No hay ninguna temporada activa ahora mismo.",
    intro: "Gana puntos jugando cada día y reclama las recompensas de cada escalón.",
    puntos: (n: number) => `${n} puntos de pase`,
    reclamar: "Reclamar",
    reclamado: "Reclamado",
    bloqueado: (n: number) => `${n} pts`,
    reclamadoOk: "¡Recompensa reclamada!",
    error: "No se ha podido reclamar.",
  },
  {
    eu: {
      abrir: "Pasea",
      titulo: "Denboraldiko pasea",
      sin: "Oraingoz ez dago denboraldi aktiborik.",
      intro: "Irabazi puntuak egunero jokatuz eta eskuratu maila bakoitzeko sariak.",
      puntos: (n: number) => `${n} pase-puntu`,
      reclamar: "Eskuratu",
      reclamado: "Eskuratuta",
      bloqueado: (n: number) => `${n} pt`,
      reclamadoOk: "Saria eskuratuta!",
      error: "Ezin izan da eskuratu.",
    },
    en: {
      abrir: "Pass",
      titulo: "Season pass",
      sin: "No active season right now.",
      intro: "Earn points by playing every day and claim each tier's reward.",
      puntos: (n: number) => `${n} pass points`,
      reclamar: "Claim",
      reclamado: "Claimed",
      bloqueado: (n: number) => `${n} pts`,
      reclamadoOk: "Reward claimed!",
      error: "Couldn't claim.",
    },
  }
);
