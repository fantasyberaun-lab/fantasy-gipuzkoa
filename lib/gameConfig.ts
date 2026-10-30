// Parámetros del Reglamento V3.1 que la organización puede querer tocar
// sin tocar código. De momento viven aquí como valores por defecto;
// la idea (ver README) es moverlos a la tabla `game_config` de Supabase
// y que un panel de administración (rol "root") los edite en caliente.

export const gameConfig = {
  plantilla: {
    // Valor por defecto y de respaldo: variable plantilla_tamano (0096); el frontend usa reglas_liga().
    tamanoPlantilla: 10,
    minimoPrimeraSegunda: 7,
    // Máximo de titulares por equipo (valor por defecto y de respaldo). La base de
    // datos lo lee de la variable plantilla_max_titulares (0092/0094) y el frontend
    // usa reglas_liga(); mantener igual que el defecto del registro.
    maximoTitulares: 6,
    // Máximo de titulares inscritos en un mismo torneo (por defecto / respaldo).
    // Variable plantilla_max_titulares_torneo (0092/0094).
    maximoTitularesPorTorneo: 4,
  },
  // Valores por defecto de la variable puntos_por_diferencia_elo (0096; calcular_puntos_resultado() la lee).
  puntuacionPorDiferenciaElo: [
    { hasta: 29, victoria: 3, tablas: 1, derrota: 0 },
    { hasta: 99, victoria: 4, tablas: 2, derrota: 0 },
    { hasta: 199, victoria: 5, tablas: 3, derrota: 0 },
    { hasta: 299, victoria: 7, tablas: 4, derrota: 0 },
    { hasta: Infinity, victoria: 9, tablas: 5, derrota: 0 },
  ],
  // Rondas de un torneo (las que enseña el gráfico de puntos por jornada).
  rondasPorTorneo: 7,
  // Puntos Fantasy de un jugador que queda sin emparejar (descansa) en una
  // jornada. Variable puntos_descanso (0092/0094); este es el valor por defecto.
  puntosPorDescanso: 1,
  bonusJugadorDeLaJornada: {
    victoria: 2,
    tablas: 1,
    derrota: 0,
  },
  // Cláusula, subida, capitán y blindaje: valores por defecto y de respaldo. La base de datos
  // los lee de las variables del panel (0096) y el frontend usa reglas_liga().
  clausula: {
    porcentaje: 1.1, // 110% de lo que pagó el dueño (0111)
    redondeoAlMillonSuperior: true,
  },
  subidaClausula: {
    multiplicador: 2, // cada M pagado sube la cláusula este factor
  },
  // Capitán: un titular por equipo puntúa doble en la jornada.
  // Variable capitan_multiplicador (0096; multiplicador_capitan() la lee).
  capitan: {
    multiplicador: 2,
  },
  // Blindaje: el jugador no puede ser clausulado durante una semana desde que se blinda (ver 0113).
  // Cuesta este porcentaje del valor de mercado, redondeado al millón superior.
  // Variable blindaje_porcentaje (0096; porcentaje_blindaje() la lee).
  blindaje: {
    porcentaje: 0.1,
  },
  limiteOperacionesPorPeriodo: 3, // placeholder: lo fija la organización
} as const;