import { definirTextos } from "../definir";

// Selector de avatar de perfil (SelectorAvatar, en Ajustes > Mi cuenta).
export default definirTextos(
  {
    titulo: "Icono de perfil",
    ayuda: "Prueba: de momento solo lo ves tú (root). Más adelante se desbloquearán por nivel.",
    sinAvatar: "Sin icono",
    guardado: "Icono actualizado.",
  },
  {
    eu: {
      titulo: "Profileko ikonoa",
      ayuda: "Proba: oraingoz zuk bakarrik ikusten duzu (root). Aurrerago mailaka desblokeatuko dira.",
      sinAvatar: "Ikonorik gabe",
      guardado: "Ikonoa eguneratuta.",
    },
    en: {
      titulo: "Profile icon",
      ayuda: "Test: for now only you can see it (root). Later they'll unlock by level.",
      sinAvatar: "No icon",
      guardado: "Icon updated.",
    },
  }
);
