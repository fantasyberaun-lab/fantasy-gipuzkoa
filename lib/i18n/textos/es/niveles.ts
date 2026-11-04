import type { Ancho } from "../../definir";

// Pestaña Niveles del perfil: experiencia, nivel e iconos desbloqueables.

const es = {
  pestana: "Niveles",
  cargando: "Cargando niveles…",
  error: "No se han podido cargar los niveles.",
  nivel: (n: number) => `Nivel ${n}`,
  nivelCorto: (n: number) => `Nv ${n}`,
  xpTotal: (xp: string) => `${xp} XP`,
  faltan: (xp: string, nivel: number) => `Te faltan ${xp} XP para el nivel ${nivel}`,
  siguienteIcono: "Siguiente icono",
  todosDesbloqueados: "Has desbloqueado todos los iconos. ¡Sigue subiendo!",
  filtroTodos: "Todos",
  filtroMios: "Míos",
  filtroBloqueados: "Bloqueados",
  bloqueadoHasta: (n: number) => `Nivel ${n}`,
  desbloqueadoEnNivel: (n: number) => `Desbloqueado en el nivel ${n}`,
  bloqueadoEnNivel: (n: number, xp: string) => `Se desbloquea en el nivel ${n} · ${xp} XP`,
  usar: "Usar este icono",
  enUso: "Icono en uso",
  quitar: "Quitar icono",
  comoGanar: "Cómo ganar XP",
  ganarLogin: (xp: number) => `Entrar cada día: ${xp} XP`,
  ganarCofre: (xp: number) => `Abrir el cofre de racha: ${xp} XP`,
  ganarJornada: (xp: number) => `Puntos de jornada: ${xp} XP por punto`,
  ganarMision: "Completar misiones: más XP cuanto más difíciles",
  // Guía de estreno (TutorialNiveles)
  tutorial: {
    saltar: "Saltar",
    siguiente: "Siguiente",
    entendido: "¡Entendido!",
    pasoDe: (n: number, total: number) => `${n} de ${total}`,
    perfilTitulo: "Estrenamos niveles",
    perfilTexto: "Tu perfil guarda ahora tu nivel y tus iconos. Vamos a verlo.",
    nivelTitulo: "Tu nivel y tu XP",
    nivelTexto:
      "Ganas XP al entrar cada día, al abrir el cofre de la racha y con los puntos de cada jornada. Cuanta más XP, más nivel.",
    iconosTitulo: "Desbloquea iconos",
    iconosTexto: (total: number) =>
      `Hay ${total} iconos, entre piezas y campeones del mundo. Los de color ya son tuyos y los grises se desbloquean al subir de nivel. Tócalos para elegirlos y conocer su historia.`,
  },
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
