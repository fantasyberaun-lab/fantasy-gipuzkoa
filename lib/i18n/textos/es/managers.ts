import type { Ancho } from "../../definir";

// Perfil de un manager y su pestaña "Jornadas" (AlineacionesJornadas).

const es = {
  cargando: "Cargando perfil…",
  noEncontrado: "No se ha encontrado este manager (o no compartís liga).",
  tuPerfil: "Tu perfil",
  todosContraTodos: " · Todos contra todos",
  resumen: "Resumen",
  jornadas: "Jornadas",
  managerDesde: "Manager desde",
  ligasGanadas: "Ligas ganadas",
  todaviaNinguna: "Todavía ninguna",
  ligasJugadas: "Ligas en las que juega",
  puntosLiga: "Puntos en esta liga",
  mejorJornada: "Mejor jornada",
  valorPlantilla: "Valor de la plantilla",
  jugadores: (n: number) => `${n} jugadores`,
  evolucionValorPlantilla: "Evolución del valor de la plantilla",
  evolucionVacia: "Todavía no hay suficientes días de historial para dibujar la evolución.",
  pts: (n: number) => `${n} pts`,
  // Jornadas
  cargandoJornadas: "Cargando jornadas…",
  sinJornadas:
    "Todavía no hay ninguna plantilla registrada. Las plantillas se guardan automáticamente los sábados a las 16:00.",
  finDeSemana: (fecha: string) => `Fin de semana del ${fecha}`,
  pendiente: "Plantilla del sábado a las 16:00 · todavía sin resultados",
  cerrada: "Plantilla del sábado a las 16:00 · todos los torneos juntos",
  saldoNegativoJornada:
    "El saldo estaba en negativo cuando empezó la jornada: este equipo puntúa 0 este fin de semana.",
  habriaSumado: (n: number) => `habría sumado ${n} pts`,
  descanso: "Descansó",
  victoria: "Victoria",
  tablas: "Tablas",
  derrota: "Derrota",
  sinResultado: "Sin resultado",
  categoriaCorta: (n: number) => `${n}ª cat.`,
  ronda: (n: number) => ` · ronda ${n}`,
  capitanCorto: "C",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
