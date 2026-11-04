import type { Ancho } from "../../definir";

// Misiones (tarjeta de la cabecera y página /misiones). Ver 0103_misiones_v2.sql.
// Los textos de cada serie van por familia (sin el sufijo _pub / _pri). `texto` recibe el
// objetivo como número (para plurales) y ya formateado (para cifras grandes).
// El euskera necesita revisión humana.

const es = {
  titulo: "Misiones",
  volver: "← Volver",
  tarjeta: "Misiones",
  tarjetaDetalle: "Gana XP y sube de nivel",
  tarjetaListas: (n: number) => `${n} ${n === 1 ? "misión lista" : "misiones listas"}`,
  intro:
    "Cumple misiones para ganar XP. Al reclamar una se desbloquea la siguiente de su serie, más difícil y con más XP. Son largas: están pensadas para durar años.",
  cargando: "Cargando misiones…",
  error: "No se han podido cargar las misiones. Inténtalo de nuevo.",
  reintentar: "Reintentar",
  listas: (n: number) => `${n} ${n === 1 ? "misión lista" : "misiones listas"} para reclamar`,
  ningunaLista: "Ninguna misión lista todavía",
  soloListas: "Solo por reclamar",
  nadaAqui: "No hay misiones por reclamar en esta pestaña.",
  escalon: (n: number, total: number) => `Misión ${n} de ${total}`,
  recompensa: (xp: number) => `+${xp} XP`,
  reclamar: (xp: number) => `Reclamar +${xp} XP`,
  reclamando: "Reclamando…",
  reclamada: (xp: number) => `¡+${xp} XP!`,
  completada: "Serie completada",
  verNiveles: "Ver mi nivel",
  puesto: (n: number) => `#${n}`,
  sinPuesto: "Sin puesto",
  pestanas: {
    pub: "Liga pública",
    pri: "Ligas privadas",
    gen: "Cuenta",
    mj: "Minijuegos",
  },
  ayudaPestana: {
    pub: "Cuentan solo tus equipos de la liga pública activa. Las de plantilla, saldo y alineación se comprueban al empezar la jornada (sábado) y solo cuentan con el saldo sin números rojos.",
    pri: "Cuentan tus equipos de ligas privadas, con sus propios contadores. Dan menos XP y las ventas entre managers tienen medidas antiamaños.",
    gen: "Tu cuenta, sin importar la liga.",
    mj: "Todo lo que haces en los minijuegos.",
  },
  grupos: {
    partidas: "Partidas y puntos",
    clasificacion: "Clasificación",
    economia: "Plantilla y economía",
    mercado: "Mercado",
    progresion: "Progresión",
    minijuegos: "Minijuegos",
  },
  series: {
    caz100: {
      titulo: "Cazagigantes +100",
      texto: (n: number) =>
        `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores de tu once contra rivales con 100 de Elo más o más.`,
    },
    caz200: {
      titulo: "Cazagigantes +200",
      texto: (n: number) =>
        `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores de tu once contra rivales con 200 de Elo más o más.`,
    },
    caz300: {
      titulo: "Cazagigantes +300",
      texto: (n: number) =>
        `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores de tu once contra rivales con 300 de Elo más o más.`,
    },
    capitan: {
      titulo: "Brazalete de capitán",
      texto: (_n: number, f: string) => `Suma ${f} puntos con tu capitán (ya con el multiplicador).`,
    },
    oro: {
      titulo: "Jornada de oro",
      texto: (_n: number, f: string) => `Suma ${f} puntos o más con tu equipo en una sola jornada.`,
    },
    regular: {
      titulo: "Regularidad",
      texto: (n: number) => `Haz 25 puntos o más en ${n} jornadas seguidas.`,
    },
    victorias: {
      titulo: "Victoriosos",
      texto: (_n: number, f: string) => `Consigue ${f} victorias con los titulares de tu once.`,
    },
    capgig: {
      titulo: "Capitán gigante",
      texto: (n: number) =>
        `Que tu capitán gane ${n} ${n === 1 ? "partida" : "partidas"} contra rivales con 100 de Elo más o más.`,
    },
    cuatro: {
      titulo: "Cuatro de seis",
      texto: (n: number) =>
        `Que 4 o más de tus titulares ganen en la misma jornada, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    pleno: {
      titulo: "Pleno de victorias",
      texto: (n: number) =>
        `Que ganen los 6 titulares en la misma jornada, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    fiel: {
      titulo: "Jugador fiel",
      texto: (n: number) => `Mantén al mismo jugador en tu once ${n} jornadas seguidas.`,
    },
    pujas: {
      titulo: "Cazapujas",
      texto: (n: number) => `Gana pujas del mercado por ${n} jugadores distintos.`,
    },
    fichajes: {
      titulo: "Fichador",
      texto: (n: number) => `Ficha a ${n} jugadores distintos.`,
    },
    blindaje: {
      titulo: "Blindado",
      texto: (n: number) => `Blinda a ${n} jugadores distintos.`,
    },
    subircl: {
      titulo: "Cláusula al alza",
      texto: (n: number) => `Sube la cláusula de ${n} jugadores distintos.`,
    },
    clausulazo: {
      titulo: "Cláusula en mano",
      texto: (n: number) => `Paga la cláusula de ${n} jugadores distintos de otros managers.`,
    },
    plusvalia: {
      titulo: "Plusvalía",
      texto: (_n: number, f: string) =>
        `Gana ${f} M en total vendiendo jugadores por más de lo que pagaste (al mercado o a la máquina).`,
    },
    mejorop: {
      titulo: "Mejor operación",
      texto: (_n: number, f: string) =>
        `Gana ${f} M o más en una sola venta respecto a lo que pagaste por el jugador.`,
    },
    top10: {
      titulo: "Entre los diez mejores",
      texto: (n: number) =>
        `Queda entre los 10 primeros de una jornada de la liga pública, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    podio: {
      titulo: "Podio",
      texto: (n: number) =>
        `Queda entre los 3 primeros de una jornada de la liga pública, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    primero: {
      titulo: "En lo más alto",
      texto: (n: number) =>
        `Queda primero en una jornada de la liga pública, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    lider: {
      titulo: "Líder de la general",
      texto: (n: number) =>
        `Sé líder de la clasificación general de la liga pública al cerrar una jornada, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    presencia: {
      titulo: "Presencia",
      texto: (n: number) =>
        `Acaba ${n} jornadas entre los 10 primeros de la clasificación general de la liga pública.`,
    },
    valorplantilla: {
      titulo: "Plantilla millonaria",
      texto: (_n: number, f: string) =>
        `Presenta al empezar la jornada (sábado) una plantilla que valga ${f} M en la liga pública.`,
    },
    caja: {
      titulo: "Caja fuerte",
      texto: (_n: number, f: string) => `Ten ${f} M de saldo en la liga pública al empezar la jornada (sábado).`,
    },
    estrella: {
      titulo: "Jugador estrella",
      texto: (_n: number, f: string) =>
        `Presenta al empezar la jornada (sábado) en tu plantilla de la liga pública a un jugador valorado en ${f} M o más.`,
    },
    lujo: {
      titulo: "Plantilla de lujo",
      texto: (n: number) => `Alinea el sábado ${n} jugadores de 100 M o más a la vez en la liga pública, con el saldo en positivo.`,
    },
    mercader: {
      titulo: "Mercader",
      texto: (_n: number, f: string) =>
        `Vende jugadores a otros managers de ligas privadas por ${f} M en total (cada venta cuenta como máximo el valor de la cláusula del jugador).`,
    },
    ganajor: {
      titulo: "Rey de la liga",
      texto: (n: number) =>
        `Gana ${n} jornadas en ligas privadas con al menos 5 managers puntuando.`,
    },
    rachadiaria: {
      titulo: "Constancia",
      texto: (n: number) => `Alcanza una racha de ${n} días seguidos.`,
    },
    nivel: {
      titulo: "Maestro",
      texto: (n: number) => `Alcanza el nivel ${n}.`,
    },
    veterano: {
      titulo: "Veterano",
      texto: (n: number) => `Entra en la app ${n} días distintos.`,
    },
    cofres: {
      titulo: "Cofres de racha",
      texto: (n: number) => `Abre ${n} cofres de racha.`,
    },
    semana: {
      titulo: "Semana perfecta",
      texto: (n: number) =>
        `Entra los 7 días de una semana (de lunes a domingo) y completa los minijuegos de cada día: ${n} ${n === 1 ? "semana" : "semanas"}.`,
    },
    diacompleto: {
      titulo: "Día completo",
      texto: (n: number) => `Completa los 8 minijuegos del día durante ${n} días.`,
    },
    seguidos: {
      titulo: "Sin fallar un día",
      texto: (n: number) => `Completa los 8 minijuegos del día durante ${n} días seguidos.`,
    },
    cadena: {
      titulo: "Cadena",
      texto: (n: number) =>
        `Encadena ${n} aciertos seguidos en una partida de Higher or Lower (el máximo es 20).`,
    },
    cadenaperf: {
      titulo: "Cadena perfecta",
      texto: (n: number) =>
        `Consigue los 20 aciertos de Higher or Lower en ${n} ${n === 1 ? "partida" : "partidas"}.`,
    },
    m900v: {
      titulo: "Sobresaliente",
      texto: (n: number) =>
        `Consigue 900 puntos o más en una partida diaria de un minijuego, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    m900j: {
      titulo: "Sobresaliente en todo",
      texto: (n: number) => `Consigue 900 puntos o más en ${n} minijuegos distintos.`,
    },
    perfn: {
      titulo: "Sin fallos",
      texto: (n: number) =>
        `Haz una partida perfecta (todas las rondas acertadas) en ${n} minijuegos distintos.`,
    },
    perfleyj: {
      titulo: "Leyenda sin fallos",
      texto: (n: number) =>
        `Haz una partida perfecta en modo leyenda en ${n} minijuegos distintos.`,
    },
    perfleyv: {
      titulo: "Leyenda imbatible",
      texto: (n: number) => `Haz ${n} partidas perfectas en modo leyenda.`,
    },
    rankmj: {
      titulo: "Top del ranking",
      texto: (n: number) =>
        n === 1
          ? "Sé el número 1 del ranking general de minijuegos (con 10 o más participantes)."
          : `Llega al puesto ${n} del ranking general de minijuegos (con 10 o más participantes).`,
    },
    primerodia: {
      titulo: "Primero del día",
      texto: (n: number) =>
        `Queda primero del ranking diario de un minijuego (con 5 o más jugadores), ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    maraton: {
      titulo: "Maratón",
      texto: (_n: number, f: string) => `Juega ${f} partidas de minijuegos.`,
    },
    cofresmj: {
      titulo: "Cofres del día",
      texto: (n: number) => `Abre ${n} cofres de minijuegos.`,
    },
    m500x8: {
      titulo: "Nivel parejo",
      texto: (n: number) =>
        `Saca 500 puntos o más en los 8 minijuegos el mismo día, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    tt4: {
      titulo: "Casi todoterreno",
      texto: (n: number) =>
        `Saca 800 puntos o más en 4 minijuegos el mismo día, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    tt8: {
      titulo: "Todoterreno",
      texto: (n: number) =>
        `Saca 800 puntos o más en los 8 minijuegos el mismo día, ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    plenopron: {
      titulo: "Pleno de pronósticos",
      texto: (n: number) =>
        `Acierta todos los pronósticos de una ronda de torneo (4 mesas o más), ${n} ${n === 1 ? "vez" : "veces"}.`,
    },
    alinea120: {
      titulo: "Alineación galáctica",
      texto: (n: number) =>
        `Alinea el sábado a ${n} titulares de 120 M o más a la vez en la liga pública.`,
    },
    sinelo: {
      titulo: "Equipo sin Elo",
      texto: (n: number) => `Presenta el sábado ${n} jugadores sin Elo a la vez en tu plantilla.`,
    },
    sinelov: {
      titulo: "Victorias sin Elo",
      texto: (n: number) =>
        `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores sin Elo de tu once.`,
    },
    puntosmj: {
      titulo: "Puntos de minijuegos",
      texto: (_n: number, f: string) => `Suma ${f} puntos en total en los minijuegos.`,
    },
  },
  // Guía de estreno (TutorialMisiones)
  tutorial: {
    saltar: "Saltar",
    siguiente: "Siguiente",
    entendido: "¡Entendido!",
    pasoDe: (n: number, total: number) => `${n} de ${total}`,
    perfilTitulo: "Estrenamos misiones",
    perfilTexto:
      "Cumple objetivos y gana XP para subir de nivel. Cuando una misión esté lista, tu tarjeta de Mi perfil se marcará en dorado y te llevará directo a ella.",
    escalonTitulo: "Así funcionan",
    escalonTexto:
      "Cada misión tiene una barra de progreso. Al llenarla, pulsa «Reclamar» para cobrar su XP y se desbloquea la siguiente de la serie, más difícil y con más XP. Hay una pestaña por cada sitio donde juegas: liga pública, ligas privadas, minijuegos y una general para tu cuenta. Cada una lleva su propio progreso.",
  },
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
