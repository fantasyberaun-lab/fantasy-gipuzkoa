import type { Ancho } from "../../definir";

// Evento temporal "Campeonato del Mundo: Gukesh vs Sindarov" (pestaña Match) y selector
// Histórico de la clasificación. Ver 0141_evento_mundial.sql.

const es = {
  titulo: "Match",
  eventoTitulo: "Campeonato del Mundo",
  gukesh: "Gukesh",
  sindarov: "Sindarov",
  tablas: "Tablas",
  cargando: "Cargando el match…",
  inactivo: "El evento del Mundial no está activo ahora mismo.",
  error: "No se pudo cargar el match. Inténtalo de nuevo.",
  intro:
    "Antes de cada partida, di cómo crees que acabará: gana Gukesh, gana Sindarov o tablas. Cada acierto vale 1 punto. Puedes cambiar tu pronóstico hasta que se cierre.",
  marcadorTitulo: "Marcador del match",
  partidasJugadas: (n: number) => `${n} partida${n === 1 ? "" : "s"} jugada${n === 1 ? "" : "s"}`,
  proxima: "Próxima partida",
  partidaN: (n: number) => `Partida ${n}`,
  horaMadrid: (hora: string) => `${hora} (hora de Madrid)`,
  cierraEn: "Se cierra en",
  cerrada: "Pronósticos cerrados",
  esperandoResultado: "Partida en juego o pendiente del resultado.",
  tuPronostico: "Tu pronóstico",
  sinPronostico: "Sin pronóstico",
  gana: (nombre: string) => `Gana ${nombre}`,
  guardado: "Pronóstico guardado.",
  elegir: "Elige tu pronóstico",
  noQuedan: "No quedan partidas por pronosticar.",
  comunidadTitulo: "Cómo ha votado la comunidad",
  comunidadOculta:
    "Los porcentajes de la comunidad se ven cuando se cierra la votación, para no condicionar a nadie.",
  votos: (n: number) => `${n} voto${n === 1 ? "" : "s"}`,
  sinVotos: "Nadie ha votado esta partida.",
  puntuacionTitulo: "Tu puntuación",
  puntos: "Puntos",
  aciertos: "Aciertos",
  racha: "Racha",
  mejorRacha: "Mejor racha",
  deResueltas: (a: number, r: number) => `${a} de ${r}`,
  finalTitulo: "¿Quién será el campeón?",
  finalDescripcion:
    "Hay desempates. En vez de pronosticar partida a partida, vota quién ganará el campeonato: si aciertas, +1 punto final.",
  finalVotos: "Votos de la comunidad",
  campeon: (nombre: string) => `Campeón del mundo: ${nombre}`,
  finalAcertaste: "¡Acertaste el campeón! +1 punto.",
  finalFallaste: "No acertaste el campeón.",
  finalCierraEn: "La votación se cierra en",
  calendarioTitulo: "Calendario y resultados",
  vacio: "El calendario aún no está disponible.",
  descanso: "Día de descanso",
  desempate: "Desempates (si hacen falta)",
  pendiente: "Pendiente",
  acertaste: "Acertaste",
  fallaste: "Fallaste",
  verClasificacion: "Ver la clasificación del evento",
  // Selector de la clasificación
  historico: {
    actual: "Actual",
    historico: "Histórico",
    selectorAria: "Tipo de clasificación",
    elegirAria: "Elige una clasificación histórica",
    cargando: "Cargando…",
    sin: "Todavía no hay clasificaciones archivadas.",
    vacia: "Esta clasificación está vacía.",
    mundialNombre: "Mundial: Gukesh vs Sindarov",
    puntos: "pts",
    aciertos: (a: number, j: number) => `${a} de ${j} aciertos`,
    yo: "Tú",
    nota: "Aquí se guardan las ligas ya jugadas en la liga pública y los eventos.",
  },
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
