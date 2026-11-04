import type { Seccion } from "../es/managers";

const en: Seccion = {
  cargando: "Loading profile…",
  noEncontrado: "Manager not found (or you're not in the same league).",
  tuPerfil: "Your profile",
  todosContraTodos: " · All vs all",
  resumen: "Overview",
  jornadas: "Matchdays",
  managerDesde: "Manager since",
  ligasGanadas: "Leagues won",
  todaviaNinguna: "None yet",
  ligasJugadas: "Leagues joined",
  puntosLiga: "Points in this league",
  mejorJornada: "Best matchday",
  valorPlantilla: "Squad value",
  jugadores: (n: number) => `${n} player${n === 1 ? "" : "s"}`,
  evolucionValorPlantilla: "Squad value over time",
  evolucionVacia: "Not enough days of history yet to draw the trend.",
  pts: (n: number) => `${n} pts`,
  cargandoJornadas: "Loading matchdays…",
  sinJornadas:
    "No squads saved yet. Squads are saved automatically every Saturday at 16:00.",
  finDeSemana: (fecha: string) => `Weekend of ${fecha}`,
  pendiente: "Squad as of Saturday 16:00 · no results yet",
  cerrada: "Squad as of Saturday 16:00 · all tournaments combined",
  saldoNegativoJornada:
    "The balance was negative when the round started: this team scores 0 this weekend.",
  habriaSumado: (n: number) => `would have scored ${n} pts`,
  descanso: "Bye",
  victoria: "Win",
  tablas: "Draw",
  derrota: "Loss",
  sinResultado: "No result",
  categoriaCorta: (n: number) => `Cat. ${n}`,
  ronda: (n: number) => ` · round ${n}`,
  capitanCorto: "C",
};

export default en;
