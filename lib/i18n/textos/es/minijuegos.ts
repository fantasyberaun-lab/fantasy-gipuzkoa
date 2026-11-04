import type { Ancho } from "../../definir";

// Minijuegos (página /minijuegos, pestaña flotante, ranking y panel del día).
// El euskera necesita revisión humana.

const es = {
  titulo: "Minijuegos",
  volver: "Volver a la app",
  flotante: "Minijuegos",
  flotanteAria: "Ir a los minijuegos",
  cargando: "Cargando minijuegos…",
  error: "No se han podido cargar los minijuegos. Inténtalo de nuevo.",
  reintentar: "Reintentar",
  desactivado: "Los minijuegos están desactivados ahora mismo.",

  // Pestañas
  pestanaRanking: "Ranking",
  juegos: {
    hol: { nombre: "Higher or lower", corto: "Higher/Lower", descripcion: "¿El siguiente jugador tiene más o menos Elo? Sigue hasta que falles." },
    elo: { nombre: "Elo exacto", corto: "Elo exacto", descripcion: "Adivina el Elo de cada jugador con la barra. Cuanto antes y más cerca, más puntos." },
    orden: { nombre: "Ordena por Elo", corto: "Ordena por Elo", descripcion: "Ordena 5 jugadores de menor a mayor Elo. Cuantos más pares aciertes y antes lo hagas, más puntos." },
    adivina: { nombre: "Adivina el jugador", corto: "Adivina", descripcion: "Con su Elo, club, categoría y valor, elige quién es entre cuatro jugadores de nivel parecido. Cuanto antes aciertes, más puntos." },
    acierta: { nombre: "Acierta el jugador", corto: "Acierta", descripcion: "Lee la descripción de un icono de perfil y elige a qué personaje del ajedrez se refiere. Cuanto antes aciertes, más puntos." },
    precio: { nombre: "Adivina el precio", corto: "Precio", descripcion: "Estima cuánto suman los valores de mercado de tres jugadores (de 30 a 500 M). No hay cronómetro, pero cuanto antes respondas, más puntos." },
    impostor: { nombre: "Adivina el impostor", corto: "Impostor", descripcion: "Tres de los cuatro jugadores comparten club, categoría o un Elo parecido. Encuentra al que no encaja." },
    parejas: { nombre: "Encontrar las parejas", corto: "Parejas", descripcion: "Une los ocho jugadores en cuatro parejas que compartan club, categoría, Elo parecido, valor parecido o año de nacimiento." },
  },

  // Panel del día
  hoy: "Tu día",
  monedasHoy: "Monedas",
  xpHoy: "Experiencia",
  maximoAlcanzado: "¡Máximo de hoy alcanzado!",
  topeAyuda: (monedas: string, xp: number) =>
    `Cada día puedes ganar hasta ${monedas} M y ${xp} XP con los minijuegos. Al llegar al máximo puedes seguir jugando, pero sin recompensa. Se reinicia a medianoche.`,
  monedasLigas: (privada: string, publica: string) =>
    `Cada minijuego te da ${privada} M en cada liga privada y ${publica} M en la liga pública.`,
  misiones: "Partidas del día",
  misionesCompletadas: (n: number, total: number) => `${n} de ${total} completadas`,
  cofreTitulo: "Cofre del día",
  cofreBloqueado: "Completa todas las partidas del día para abrir el cofre.",
  cofreListo: "¡Cofre listo!",
  abrirCofre: "Abrir cofre",
  abriendo: "Abriendo…",
  cofreAbierto: "Cofre de hoy abierto",
  premioMonedas: (m: string) => `${m} M para tus equipos`,
  premioReparador: "Un reparador de racha",
  premioReintento: "Un reintento",
  masXp: (xp: number) => `+${xp} XP`,
  objetos: "Tus objetos",
  reparadores: (n: number) => `Reparadores de racha: ${n}`,
  reintentos: (n: number) => `Reintentos: ${n}`,
  reparar: "Reparar mi racha",
  reparada: (n: number) => `¡Racha recuperada! Ahora llevas ${n} días.`,
  reparableAviso: (de: number, a: number) => `Te saltaste un día: tu racha de ${de} se ha reiniciado. Con un reparador pasas a ${a}.`,
  cerrar: "Cerrar",

  // Inicio de un minijuego
  partidaDelDia: "Partida del día",
  partidaDelDiaAyuda: "Es la misma para todos, cuenta para el ranking y da la recompensa del día. Solo se juega una vez.",
  jugarDelDia: "Jugar la partida del día",
  continuarDelDia: "Continuar la partida del día",
  yaJugada: (puntos: number) => `Hoy has hecho ${puntos} puntos`,
  recompensaGanada: (m: string, xp: number) => `Ganado: ${m} M · ${xp} XP`,
  sinRecompensa: "Sin recompensa (techo de hoy)",
  usarReintento: "Usar un reintento",
  reintentoAyuda: "Repites la partida del día con preguntas nuevas y se queda tu mejor puntuación.",
  partidaLibre: "Partida libre",
  partidaLibreAyuda: "Juega las veces que quieras. No cuenta para el ranking ni da recompensa.",
  modo: "Modo",
  modoEstandar: "Estándar",
  modoEstandarAyuda: "Jugadores activos en los torneos en curso.",
  modoLeyenda: "Leyenda",
  modoLeyendaAyuda: "Todos los jugadores de la base de datos.",
  jugarLibre: "Jugar partida libre",
  reglas: "Cómo se juega",

  // En partida
  ronda: (n: number, total: number) => `Ronda ${n} de ${total}`,
  puntos: (n: number) => `${n} pts`,
  tiempo: (s: number) => `${s} s`,
  siguiente: "Siguiente",
  verResultado: "Ver resultado",
  abandonarAviso: "Si sales, la partida del día queda en marcha y el reloj sigue corriendo.",
  enviar: "Enviar",

  // Higher or lower
  holActual: "Elo",
  holPregunta: "¿Tiene más o menos Elo que el anterior?",
  holToca: "¿Quién tiene más Elo? Toca su ficha.",
  holMas: "Más Elo",
  holMenos: "Menos Elo",
  holAciertos: (n: number, total: number) => `${n} de ${total} aciertos`,
  holAcierto: "¡Correcto!",
  holFallo: "Has fallado",
  holPerfecta: "¡Partida perfecta!",

  // Elo exacto
  eloPregunta: "¿Qué Elo tiene este jugador?",
  eloAyudaBarra: "Mueve la barra. Si se acaba el tiempo se envía lo que tengas.",
  eloSinElo: "Sin Elo",
  eloMenos: "Bajar 5",
  eloMas: "Subir 5",
  eloReal: "Elo real",
  eloTuRespuesta: "Tu respuesta",
  eloUltimo: (nombre: string, real: string, tu: string, pts: number) =>
    `${nombre}: Elo ${real} · tu respuesta ${tu} · +${pts} pts`,
  eloSinRespuesta: "sin respuesta",

  // Ordena por Elo
  ordenPregunta: "Arrastra los jugadores: el de más Elo arriba y el de menos abajo",
  ordenMenor: "Menor Elo",
  ordenMayor: "Mayor Elo",
  ordenQuitar: (n: string) => `Quitar ${n}`,
  ordenDeshacer: "Deshacer",
  ordenReiniciar: "Empezar de nuevo",
  ordenAyuda: "Puedes mover las fichas las veces que quieras. Si se acaba el tiempo se envía el orden que tengas.",
  ordenFicha: (n: string, pos: number, total: number) => `${n}, posición ${pos} de ${total}. Usa las flechas arriba y abajo para moverlo.`,
  ordenUltimo: (real: string, pts: number) => `Orden real: ${real} · +${pts} pts`,

  // Juegos de cartas (adivina, acierta, precio, impostor, parejas)
  eloEtiqueta: "Elo",
  clubEtiqueta: "Club",
  categoriaEtiqueta: "Cat.",
  valorEtiqueta: "Valor",
  fichaSinElo: "Sin Elo",
  fichaSinClub: "Sin club",
  sinCronometro: "No hay cronómetro, pero cuanto antes envíes, más puntos.",
  tablero: (n: number, total: number) => `Tablero ${n} de ${total}`,
  adivinaPregunta: "¿Quién es este jugador?",
  aciertaPregunta: "¿De qué personaje habla esta descripción?",
  opcionUltimo: (correcta: boolean, nombre: string, pts: number) =>
    `${correcta ? "¡Correcto!" : "Has fallado."} Era ${nombre} · +${pts} pts`,
  precioPregunta: "¿Cuánto suman sus valores de mercado?",
  precioBajar: "Bajar 5 M",
  precioSubir: "Subir 5 M",
  precioUltimo: (detalle: string, total: number, tu: number | null, pts: number) =>
    `${detalle} = ${total} M · tu respuesta ${tu == null ? "ninguna" : `${tu} M`} · +${pts} pts`,
  impostorPregunta: "Tres comparten algo. ¿Quién es el impostor?",
  impostorSenalar: "Señalar impostor",
  impostorReglaClub: (club: string) => `los otros tres son del club ${club}`,
  impostorReglaCategoria: (c: string) => `los otros tres son de la categoría ${c}`,
  impostorReglaElo: "los otros tres tienen un Elo parecido",
  impostorUltimo: (nombre: string, regla: string, pts: number) =>
    `El impostor era ${nombre}: ${regla} · +${pts} pts`,
  parejasPregunta: "Une los jugadores que compartan algo",
  parejasAyuda: "Toca un jugador y luego otro para unirlos; toca uno ya unido para deshacer su pareja. Pueden compartir club, categoría, Elo parecido, valor parecido o año de nacimiento.",
  parejasUltimo: (validas: number, pts: number) => `${validas} de 4 parejas correctas · +${pts} pts`,
  parejasSolucion: (sol: string) => `Parejas previstas: ${sol}`,
  parejasRelacion: {
    club: "mismo club",
    categoria: "misma categoría",
    elo: "Elo de la misma centena",
    valor: "valor en la misma franja de 10 M",
    anio: "mismo año de nacimiento",
  },

  // Repaso
  repasoVer: "Ver repaso de la partida",
  repasoOcultar: "Ocultar repaso",
  repasoTitulo: "Repaso",
  repasoRonda: (n: number) => `Ronda ${n}`,
  repasoTu: (x: string) => `Tu respuesta: ${x}`,
  partidaHecha: "Partida del día hecha",

  // Final
  finTitulo: "Partida terminada",
  finPuntos: (n: number) => `${n} puntos`,
  finMejora: "¡Nueva mejor puntuación de hoy!",
  finNoMejora: "No supera tu mejor puntuación de hoy.",
  finLibre: "Partida libre: no cuenta para el ranking ni da recompensa.",
  finRecompensa: "Recompensa",
  finTope: "Has llegado al techo diario: sigues jugando sin recompensa.",
  jugarOtra: "Jugar otra libre",
  volverInicio: "Volver al inicio",

  // Ranking
  rankingHoy: "Hoy",
  rankingGeneral: "General",
  rankingTotalTitulo: "Ranking de minijuegos",
  rankingTotalAyuda: "Suma de la mejor puntuación de cada día en todos los minijuegos.",
  rankingNadie: "Todavía no hay puntuaciones.",
  rankingTuPosicion: (pos: number, puntos: string) => `Tu posición: ${pos}º · ${puntos} pts`,
  rankingSinPuntos: "Aún no tienes puntos en este ranking.",
  rankingParticipantes: (n: number) => `${n} participante${n === 1 ? "" : "s"}`,
  nivelCorto: (n: number) => `Nv ${n}`,
  tu: "tú",

  // Chip de la cabecera
  chipAria: (pos: number | null) =>
    pos ? `Minijuegos: vas el ${pos} del ranking general` : "Minijuegos: ranking general",
  chipJugar: "Jugar",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
