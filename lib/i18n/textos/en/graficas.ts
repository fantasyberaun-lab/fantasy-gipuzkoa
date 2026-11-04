import type { Seccion } from "../es/graficas";

const en: Seccion = {
  jornadaCorta: (n: number) => `MD${n}`,
  puntosPorJornada: "Points per matchday",
  sinTorneo: "No tournament",
  jornadaSinJugar: (j: number) => `Matchday ${j}: not played`,
  jornadaSinEmparejar: (j: number, p: number) => `Matchday ${j}: bye, ${p} pt`,
  jornadaPuntos: (j: number, p: number) => `Matchday ${j}: ${p} pts`,
  leyendaSinEmparejar: "Bye: scores 1 point",
  evolucionValor: "Value over time",
  valorVacio:
    "No value changes yet. They'll appear after the first daily change or game.",
  desdeInicio: (pct: string) => `${pct}% since start`,
  ariaValor: (titulo: string, de: number, a: number) => `${titulo}: from ${de} M to ${a} M`,
  minMaxValor: (min: number, max: number) => `Min ${min} M · Max ${max} M`,
  cambioPorPartida: "Change from a game",
  motivo: {
    inicial: "initial value",
    diaria: "daily change",
    resultado: "game",
    correccion: "result correction",
    ajuste: "manual adjustment",
    elo: "Elo update",
  },
  evolucionElo: "Elo over time",
  eloVacio: "No Elo changes yet. They'll appear with the next monthly FIDE list.",
  eloDesde: (total: string, mes: string) => `${total} since ${mes}`,
  ariaElo: (titulo: string, de: number, a: number) => `${titulo}: from ${de} to ${a}`,
  minMaxElo: (min: number, max: number) => `Min ${min} · Max ${max}`,
  proxRival: "Next opponent:",
  sinEmparejar: "Bye",
  ronda: (n: number) => `Round ${n}`,
  mesa: (n: number) => `Board ${n}`,
  juegaBlancas: "Plays white",
  juegaNegras: "Plays black",
};

export default en;
