import type { Seccion } from "../es/juego";

const eu: Seccion = {
  sinEquipo: "Oraindik ez duzu talderik.",
  capitanTitular: "Kapitainak titularra izan behar du.",
  importeInvalido: "Idatzi zenbateko baliodun bat.",
  pagarMasQueSaldo: (saldo: number) =>
    `Ezin duzu etorkizuneko saldoa (${saldo} M) baino gehiago ordaindu.`,
  ofertarMasQueSaldo: (saldo: number) =>
    `Ezin duzu etorkizuneko saldoa (${saldo} M) baino gehiagoko eskaintzarik egin.`,
  ofertaMinima: (valor: number) =>
    `Eskaintzak ezin du jokalariaren merkatu-balioa (${valor} M) baino txikiagoa izan.`,
};

export default eu;
