import type { Seccion } from "../es/graficas";

const eu: Seccion = {
  jornadaCorta: (n: number) => `J${n}`,
  puntosPorJornada: "Puntuak jardunaldika",
  sinTorneo: "Txapelketarik gabe",
  jornadaSinJugar: (j: number) => `${j}. jardunaldia: jokatu gabe`,
  jornadaSinEmparejar: (j: number, p: number) => `${j}. jardunaldia: parekatu gabe, ${p} puntu`,
  jornadaPuntos: (j: number, p: number) => `${j}. jardunaldia: ${p} puntu`,
  leyendaSinEmparejar: "Parekatu gabe: puntu 1 gehitzen du",
  evolucionValor: "Balioaren bilakaera",
  valorVacio:
    "Oraindik ez dago balio-aldaketarik. Eguneko lehen aldaketarekin edo lehen partidarekin agertuko dira.",
  desdeInicio: (pct: string) => `${pct} % hasieratik`,
  ariaValor: (titulo: string, de: number, a: number) => `${titulo}: ${de} M → ${a} M`,
  minMaxValor: (min: number, max: number) => `Min. ${min} M · Max. ${max} M`,
  cambioPorPartida: "Partida baten ondoriozko aldaketa",
  motivo: {
    inicial: "hasierako balioa",
    diaria: "eguneko aldaketa",
    resultado: "partida",
    correccion: "emaitza-zuzenketa",
    ajuste: "eskuzko doikuntza",
    elo: "Elo eguneratzea",
  },
  evolucionElo: "Eloaren bilakaera",
  eloVacio:
    "Oraindik ez dago Elo aldaketarik. FIDEren hurrengo hileko zerrendarekin agertuko dira.",
  eloDesde: (total: string, mes: string) => `${total} ${mes} geroztik`,
  ariaElo: (titulo: string, de: number, a: number) => `${titulo}: ${de} → ${a}`,
  minMaxElo: (min: number, max: number) => `Min. ${min} · Max. ${max}`,
  proxRival: "Hurrengo aurkaria:",
  sinEmparejar: "Parekatu gabe",
  ronda: (n: number) => `${n}. txanda`,
  mesa: (n: number) => `${n}. mahaia`,
  juegaBlancas: "Zuriekin jokatzen du",
  juegaNegras: "Beltzekin jokatzen du",
};

export default eu;
