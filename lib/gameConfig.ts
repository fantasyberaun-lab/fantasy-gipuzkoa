// Parámetros del Reglamento V3.1 que la organización puede querer tocar
// sin tocar código. De momento viven aquí como valores por defecto;
// la idea (ver README) es moverlos a la tabla `game_config` de Supabase
// y que un panel de administración (rol "root") los edite en caliente.

export const gameConfig = {
  plantilla: {
    tamanoPlantilla: 10,
    minimoPrimeraSegunda: 7,
    maximoTercera: 3,
  },
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
  // jornada. Mantener igual que puntos_descanso() en 0023_descanso_un_punto.sql.
  puntosPorDescanso: 1,
  bonusJugadorDeLaJornada: {
    victoria: 2,
    tablas: 1,
    derrota: 0,
  },
  variacionValorMercado: [
    { hasta: 0, variacion: -2 },
    { hasta: 1, variacion: -1 },
    { hasta: 3, variacion: 0 },
    { hasta: 5, variacion: 1 },
    { hasta: 7, variacion: 2 },
    { hasta: 11, variacion: 3 },
  ],
  clausula: {
    porcentaje: 1.5, // 150% del valor de mercado
    redondeoAlMillonSuperior: true,
  },
  subidaClausula: {
    multiplicador: 2, // cada M pagado sube la cláusula este factor
  },
  limiteOperacionesPorPeriodo: 3, // placeholder: lo fija la organización
} as const;