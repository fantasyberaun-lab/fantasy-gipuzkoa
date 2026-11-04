import type { Ancho } from "../../definir";

// Listado y detalle de torneos, y ficha del torneo.

const es = {
  // Estados (las claves son los valores de estadoTorneo()).
  estados: {
    "En curso": "En curso",
    Próximo: "Próximo",
    Finalizado: "Finalizado",
  },
  categoria: (n: number) => `${n}ª categoría`,
  // Listado
  cargando: "Cargando torneos…",
  vacio: "Todavía no hay torneos.",
  intro:
    "Los torneos reales de los que salen las jornadas del Fantasy. Entra en uno para ver sus jugadores y resultados.",
  jugadores: (n: number) => `${n} jugador${n === 1 ? "" : "es"}`,
  jornadas: (creadas: number, total: number | null) =>
    `${creadas}${total != null ? ` / ${total}` : ""} jornada${creadas === 1 ? "" : "s"}`,
  // Detalle
  cargandoTorneo: "Cargando torneo…",
  noEncontrado: "No se ha encontrado este torneo.",
  volverATorneos: "← Volver a torneos",
  migaTorneos: "← Torneos",
  informacion: "Información del torneo",
  pestanaJugadores: (n: number) => `Jugadores (${n})`,
  pestanaResultados: (n: number) => `Resultados (${n})`,
  sinInscritos: "Todavía no hay jugadores inscritos en este torneo.",
  colJugador: "Jugador",
  colClub: "Club",
  colCat: "Cat.",
  catOrdinal: (n: number) => `${n}ª`,
  colElo: "Elo",
  colPartidas: "Partidas",
  colPuntos: "Puntos",
  colPerf: "Perf. Elo",
  colPtsFantasy: "Pts Fantasy",
  sinJornadas: "Este torneo todavía no tiene jornadas.",
  jornada: (n: number) => `Jornada ${n}`,
  sinResultados: "Todavía no hay resultados en esta jornada.",
  emparejamientosPendientes: "Emparejamientos · pendientes de resultado",
  mesa: (n: number) => `Mesa ${n}`,
  pts: (n: number) => `${n} pts`,
  descansan: "Sin emparejar (descansan):",
  // Ficha
  fichaFechas: "Fechas",
  fichaLugar: "Lugar de juego",
  fichaDireccion: "Dirección",
  fichaOrganizador: "Organizador",
  fichaFederacion: "Federación",
  fichaDirector: "Director del torneo",
  fichaArbitro: "Árbitro principal",
  fichaArbitros: "Árbitros adjuntos",
  fichaRondas: "Rondas",
  fichaSistema: "Sistema",
  fichaRitmo: "Ritmo de juego",
  fichaElo: "Cómputo de Elo",
  fichaDesempates: "Desempates",
  fichaEmail: "Email de contacto",
  fichaWeb: "Web",
  fichaBonus: "Bonus por victoria",
  fichaBonusValor: (n: number) => `+${n} puntos por cada victoria`,
  fichaObservaciones: "Observaciones",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
