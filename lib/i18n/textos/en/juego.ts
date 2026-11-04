import type { Seccion } from "../es/juego";

const en: Seccion = {
  sinEquipo: "You don't have a team yet.",
  capitanTitular: "The captain must be a starter.",
  importeInvalido: "Enter a valid amount.",
  pagarMasQueSaldo: (saldo: number) =>
    `You can't pay more than your future balance (${saldo} M).`,
  ofertarMasQueSaldo: (saldo: number) =>
    `You can't offer more than your future balance (${saldo} M).`,
  ofertaMinima: (valor: number) =>
    `The offer can't be lower than the player's market value (${valor} M).`,
};

export default en;
