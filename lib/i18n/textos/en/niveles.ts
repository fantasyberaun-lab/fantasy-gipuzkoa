import type { Seccion } from "../es/niveles";

const en: Seccion = {
  pestana: "Levels",
  cargando: "Loading levels…",
  error: "Couldn't load your levels.",
  nivel: (n: number) => `Level ${n}`,
  nivelCorto: (n: number) => `Lv ${n}`,
  xpTotal: (xp: string) => `${xp} XP`,
  faltan: (xp: string, nivel: number) => `${xp} XP to level ${nivel}`,
  siguienteIcono: "Next icon",
  todosDesbloqueados: "You've unlocked every icon. Keep levelling up!",
  filtroTodos: "All",
  filtroMios: "Unlocked",
  filtroBloqueados: "Locked",
  bloqueadoHasta: (n: number) => `Level ${n}`,
  desbloqueadoEnNivel: (n: number) => `Unlocked at level ${n}`,
  bloqueadoEnNivel: (n: number, xp: string) => `Unlocks at level ${n} · ${xp} XP`,
  usar: "Use this icon",
  enUso: "Icon in use",
  quitar: "Remove icon",
  comoGanar: "How to earn XP",
  ganarLogin: (xp: number) => `Log in every day: ${xp} XP`,
  ganarCofre: (xp: number) => `Open the streak chest: ${xp} XP`,
  ganarJornada: (xp: number) => `Matchday points: ${xp} XP per point`,
  ganarMision: "Complete missions: the harder, the more XP",
  tutorial: {
    saltar: "Skip",
    siguiente: "Next",
    entendido: "Got it!",
    pasoDe: (n: number, total: number) => `${n} of ${total}`,
    perfilTitulo: "Levels are here",
    perfilTexto: "Your profile now keeps your level and your icons. Let's take a look.",
    nivelTitulo: "Your level and XP",
    nivelTexto:
      "You earn XP by logging in every day, opening the streak chest and with your points in each matchday. The more XP, the higher your level.",
    iconosTitulo: "Unlock icons",
    iconosTexto: (total: number) =>
      `There are ${total} icons, from chess pieces to world champions. The coloured ones are already yours; the grey ones unlock as you level up. Tap them to pick one and learn their story.`,
  },
};

export default en;
