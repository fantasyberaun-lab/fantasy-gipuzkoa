import type { Ancho } from "../../definir";

// Ventana "Cómo funciona el juego". Lo que va entre **dobles asteriscos**
// se pinta en negrita.

// "8:00, 17:00 y 23:00" (o "8:00etan, 17:00etan eta 23:00etan").
function listaHoras(horas: number[], y: string, sufijo = ""): string {
  const textos = horas.map((h) => `${h}:00${sufijo}`);
  if (textos.length <= 1) return textos.join("");
  return `${textos.slice(0, -1).join(", ")}${y}${textos[textos.length - 1]}`;
}

const es = {
  titulo: "Cómo funciona el juego",
  // Puntos
  puntosTitulo: "Puntos",
  puntosIntro:
    "Cada jornada puntúan tus 6 titulares (los suplentes no suman). Los puntos de cada partida dependen del resultado y de la diferencia de Elo con el rival (Elo del rival − tu Elo):",
  tablaDiferencia: "Diferencia de Elo",
  tablaResultados: "Victoria · Tablas · Derrota",
  tramo1: "29 o menos (incluye rivales con menos Elo)",
  tramo2: "De 30 a 99",
  tramo3: "De 100 a 199",
  tramo4: "De 200 a 299",
  tramo5: "300 o más",
  bonus:
    "**Bonus por victoria.** Según el torneo, ganar da puntos extra: Tercera y Cadete, **+1**; Segunda, Open de Gros y Superveteranos, **+2**; Absoluto, **+3**. Solo se aplica a las victorias (no a tablas ni derrotas). Los jugadores con 0 de Elo puntúan siempre 3 puntos por victoria (más el bonus del torneo).",
  descanso: (n: number) =>
    `**Descanso.** Si tu jugador queda sin emparejar en una jornada, suma ${n} punto. Cuenta igual si tiene un bye (no le toca rival) que si ha pedido que no le emparejen.`,
  finDeSemana:
    "**Tu plantilla del fin de semana.** El sábado a las 16:00 se guardan tus titulares y tu capitán. Esa plantilla vale para todas las rondas que se jueguen ese fin de semana, en cualquier torneo (aunque un torneo vaya por la ronda 1 y otro por la 2). Cuando acaba el fin de semana, tus puntos son la suma de lo que ha hecho cada titular.",
  unTorneo:
    "**Un jugador, un torneo.** Si un titular tuyo juega en más de un torneo el mismo fin de semana, solo te puntúa en el torneo donde más puntos haya hecho; en el otro suma 0. Por ejemplo: si saca 5 puntos en Segunda y 3 en el Open de Gros, te suma 5.",
  limite: (n: number) =>
    `Límite de titulares: como máximo ${n} de tus titulares pueden estar inscritos en el mismo torneo. En Plantilla ves cuántos llevas por torneo. Con el saldo en negativo no puntúas.`,
  automatico: (n: number) =>
    `**Titular automático.** Si tienes menos de ${n} titulares, los jugadores que fiches entran de titular directamente (si no se supera el límite por torneo). Puedes pasarlos a suplente cuando quieras.`,
  // Mercado
  mercadoTitulo: "Mercado y pujas (ligas privadas)",
  mercado:
    (horas: number[]) =>
      `El mercado de tu liga se renueva a las ${listaHoras(horas, " y ")} (hora de España; lo elige el administrador de la liga); el contador de la pantalla Mercado te dice cuánto falta. Al resolverse, el jugador es para quien haya hecho la puja más alta, que paga lo que pujó. Si hay empate, gana quien pujó antes.`,
  ventaMaquina:
    "**Vender.** En las ligas privadas los jugadores no se venden al momento: los pones a la venta y, en cada actualización del mercado, la máquina te hace una oferta de alrededor de su valor (entre un 10 % menos y un 10 % más, casi siempre cerca). Tú la aceptas o la rechazas; si la rechazas, en la siguiente te hace otra. Mientras, el jugador sigue en tu equipo y puntuando.",
  pujasOcultas:
    "**Pujas ocultas.** Durante las 2 últimas horas antes de que se actualice el mercado dejan de verse las pujas de los demás: solo ves cuánta gente ha pujado por cada jugador, no el precio ni quién. Tu propia puja sí la ves. En el Mercado hay un contador que te dice cuánto falta para que se oculten.",
  // Capitán
  capitanTitulo: "Capitán",
  capitan: (mult: number) =>
    `Elige a uno de tus titulares como capitán: todo lo que consiga esa jornada (puntos de la partida, bonus por victoria o punto de descanso) se multiplica por **${mult}**.`,
  capitanUnico:
    "Solo puede haber un capitán por equipo y tiene que ser titular: si lo pasas a suplente o lo vendes, pierde la capitanía.",
  // Clausulazos
  clausulazosTitulo: "Clausulazos (ligas privadas)",
  clausula: (pct: number) =>
    `Cada jugador tiene una cláusula: el ${pct} % de lo que pagó su dueño por él (o de su valor de mercado si lo recibió gratis en la plantilla inicial), redondeada al millón superior. Si la pagas, el jugador pasa a tu plantilla sin que el dueño pueda negarse (siempre que tengas saldo suficiente).`,
  subirClausula: (mult: number) =>
    `**Subir la cláusula.** Puedes pagar una cantidad por uno de tus jugadores para protegerlo: cada M que pagas sube su cláusula ${mult} M. Ese extra se pierde si el jugador sale de tu plantilla.`,
  candado:
    "**Candado.** Un jugador recién fichado (por puja o por clausulazo) no se puede clausular durante una semana desde el fichaje.",
  cierre:
    "**Cierre de clausulazos.** No se pueden hacer desde el viernes a las 16:00 hasta el sábado a las 18:00 (hora de España). Si lo intentas en ese tramo, la app te avisa y no se paga nada.",
  sinClausulazosPublica:
    "En la liga pública no hay clausulazos: fichas y vendes al instante en el Mercado.",
  // Blindaje
  blindajeTitulo: "Blindaje (ligas privadas)",
  blindaje: (pct: number) =>
    `Blindar a un jugador impide que le hagan un clausulazo durante una semana. Cuesta el ${pct} % de su valor de mercado, redondeado al millón superior.`,
  blindajeUno: "Solo puedes blindar a un jugador por jornada.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
