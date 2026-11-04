import type { Ancho } from "../../definir";

// Ficha de un jugador de tu plantilla (PlayerCard).

const es = {
  titular: "Titular",
  suplente: "Suplente",
  // Botón que cambia entre titular y suplente.
  pasarASuplente: "Suplente",
  pasarATitular: "Titular",
  capitanTitle: (x: number) => `Capitán: puntúa x${x} esta jornada`,
  blindadoTitle: "Blindado: no se le puede hacer un clausulazo durante una semana",
  blindado: "Blindado",
  candadoTitle: "Con candado: no se le puede hacer un clausulazo durante una semana",
  candado: "Candado",
  clausulableTitle: "Clausulable: se le puede hacer un clausulazo ahora mismo",
  clausulable: "Clausulable",
  categoria: (n: number) => `${n}ª cat.`,
  pts: (n: number) => `${n} pts`,
  topeTitulares: (max: number) =>
    `Ya tienes ${max} titulares en ese torneo — pasa a suplente a otro primero.`,
  vender: "Vender",
  capitanSoloTitular: "Solo un titular puede ser capitán.",
  quitarCapitania: "Quitar la capitanía",
  capitanPuntua: (x: number) => `El capitán puntúa x${x} esta jornada`,
  quitarCapitan: "Quitar capitán",
  capitan: "Capitán",
  yaBlindado: "Ya está blindado durante una semana",
  blindajeAgotado: "Ya has blindado a otro jugador esta semana (solo se permite uno)",
  blindarTitle: "Evita que te lo puedan clausular durante una semana",
  blindar: (precio: number) => `Blindar (${precio} M)`,
  subirClausula: (clausula: number) => `Subir cláusula (${clausula} M)`,
  ocultar: "Ocultar",
  puntosPorJornada: "Puntos por jornada",
  venderA: (nombre: string) => `Vender a ${nombre}`,
  recibiras: (valor: number) =>
    `Recibirás ${valor} M en tu saldo. Esta acción no se puede deshacer.`,
  siVender: "Sí, vender",
  // Ligas privadas: venta a la máquina (0101)
  ponerALaVenta: "Poner a la venta",
  ponerALaVentaA: (nombre: string) => `Poner a la venta a ${nombre}`,
  ponerALaVentaTexto: (hora: string) =>
    `En la próxima actualización del mercado (${hora}) la máquina te hará una oferta de entre un 10 % menos y un 10 % más de su valor. Tú decides si la aceptas. Mientras, sigue en tu equipo y puntuando.`,
  siPonerALaVenta: "Sí, ponerlo a la venta",
  enVenta: "En venta",
  esperandoOferta: (hora: string) =>
    `En venta: a las ${hora} la máquina te hará una oferta de entre un 10 % menos y un 10 % más de su valor.`,
  ofertaMaquina: (oferta: number) => `Oferta de la máquina: ${oferta} M`,
  ofertaMaquinaCorta: (oferta: number) => `Oferta: ${oferta} M`,
  ofertasPorJugador: (n: number) => `Ofertas por este jugador (${n})`,
  ofertaDeEquipo: (equipo: string, oferta: number) => `${equipo}: ${oferta} M`,
  ofertaMejor: "La más alta",
  diferenciaValor: (pct: number) => `${pct > 0 ? "+" : ""}${pct} % sobre su valor`,
  aceptarOferta: (oferta: number) => `Aceptar ${oferta} M`,
  rechazarOferta: "Rechazar",
  rechazadaTexto: "Si la rechazas, en la próxima actualización te hará otra.",
  quitarDeLaVenta: "Quitar de la venta",
  errorVenta: "No se ha podido hacer. Inténtalo de nuevo.",
  blindarA: (nombre: string) => `Blindar a ${nombre}`,
  pagarasBlindaje: (precio: number, porcentaje: number) =>
    `Pagarás ${precio} M (${porcentaje} % de su valor). Nadie podrá hacerle un clausulazo durante una semana.`,
  // "Solo puedes blindar a <b>un jugador por semana</b>. Una vez…"
  unoPorJornadaAntes: "Solo puedes blindar a ",
  unoPorJornadaNegrita: "un jugador por semana",
  unoPorJornadaDespues:
    ". Una vez lo blindes no podrás blindar a otro hasta que pase una semana, aunque vendas al jugador blindado.",
  pagando: "Pagando…",
  confirmar: "Confirmar",
  subirClausulaDe: (nombre: string) => `Subir cláusula de ${nombre}`,
  clausulaActual: (clausula: number, multiplicador: number) =>
    `Cláusula actual: ${clausula} M. Cada M que pagues la sube ${multiplicador} M.`,
  importeAPagar: "Importe a pagar (M)",
  nuevaClausula: "Nueva cláusula:",
  torneos: "Torneos:",
  verFicha: "Ver ficha del jugador",
  cerrar: "Cerrar",
  errorCapitan: "No se ha podido cambiar el capitán.",
  errorBlindar: "No se ha podido blindar al jugador.",
  importeInvalido: "Introduce un importe válido.",
  errorSubirClausula: "No se ha podido subir la cláusula.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
