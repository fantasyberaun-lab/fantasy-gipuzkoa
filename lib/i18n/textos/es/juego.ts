import type { Ancho } from "../../definir";

// Mensajes de las acciones del juego (GameStateProvider).

const es = {
  sinEquipo: "No tienes equipo todavía.",
  capitanTitular: "El capitán tiene que ser titular.",
  importeInvalido: "Introduce un importe válido.",
  pagarMasQueSaldo: (saldo: number) => `No puedes pagar más de tu saldo futuro (${saldo} M).`,
  ofertarMasQueSaldo: (saldo: number) =>
    `No puedes ofertar más de tu saldo futuro (${saldo} M).`,
  ofertaMinima: (valor: number) =>
    `La oferta no puede ser inferior al valor de mercado del jugador (${valor} M).`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
