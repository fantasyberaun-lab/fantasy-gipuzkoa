import { definirTextos } from "../definir";

// Mensajes de las acciones del juego (GameStateProvider).
export default definirTextos(
  {
    sinEquipo: "No tienes equipo todavía.",
    capitanTitular: "El capitán tiene que ser titular.",
    importeInvalido: "Introduce un importe válido.",
    pagarMasQueSaldo: (saldo: number) => `No puedes pagar más de tu saldo futuro (${saldo} M).`,
    ofertarMasQueSaldo: (saldo: number) =>
      `No puedes ofertar más de tu saldo futuro (${saldo} M).`,
    ofertaMinima: (valor: number) =>
      `La oferta no puede ser inferior al valor de mercado del jugador (${valor} M).`,
  },
  {
    eu: {
      sinEquipo: "Oraindik ez duzu talderik.",
      capitanTitular: "Kapitainak titularra izan behar du.",
      importeInvalido: "Idatzi zenbateko baliodun bat.",
      pagarMasQueSaldo: (saldo: number) =>
        `Ezin duzu etorkizuneko saldoa (${saldo} M) baino gehiago ordaindu.`,
      ofertarMasQueSaldo: (saldo: number) =>
        `Ezin duzu etorkizuneko saldoa (${saldo} M) baino gehiagoko eskaintzarik egin.`,
      ofertaMinima: (valor: number) =>
        `Eskaintzak ezin du jokalariaren merkatu-balioa (${valor} M) baino txikiagoa izan.`,
    },
    en: {
      sinEquipo: "You don't have a team yet.",
      capitanTitular: "The captain must be a starter.",
      importeInvalido: "Enter a valid amount.",
      pagarMasQueSaldo: (saldo: number) =>
        `You can't pay more than your future balance (${saldo} M).`,
      ofertarMasQueSaldo: (saldo: number) =>
        `You can't offer more than your future balance (${saldo} M).`,
      ofertaMinima: (valor: number) =>
        `The offer can't be lower than the player's market value (${valor} M).`,
    },
  }
);
