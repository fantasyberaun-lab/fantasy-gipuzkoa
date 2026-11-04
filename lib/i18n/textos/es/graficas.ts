import type { Ancho } from "../../definir";

// Gráficas de historial (puntos, valor, Elo) y la línea "Próx. rival".

const es = {
  // Etiqueta corta de jornada (bajo las barras y en listas).
  jornadaCorta: (n: number) => `J${n}`,
  // Puntos
  puntosPorJornada: "Puntos por jornada",
  sinTorneo: "Sin torneo",
  jornadaSinJugar: (j: number) => `Jornada ${j}: sin jugar`,
  jornadaSinEmparejar: (j: number, p: number) => `Jornada ${j}: sin emparejar, ${p} pt`,
  jornadaPuntos: (j: number, p: number) => `Jornada ${j}: ${p} pts`,
  leyendaSinEmparejar: "Sin emparejar: suma 1 punto",
  // Valor
  evolucionValor: "Evolución del valor",
  valorVacio:
    "Todavía no hay cambios de valor. Aparecerán con la primera variación diaria o partida.",
  desdeInicio: (pct: string) => `${pct} % desde el inicio`,
  ariaValor: (titulo: string, de: number, a: number) => `${titulo}: de ${de} M a ${a} M`,
  minMaxValor: (min: number, max: number) => `Mín. ${min} M · Máx. ${max} M`,
  cambioPorPartida: "Cambio por partida",
  motivo: {
    inicial: "valor inicial",
    diaria: "variación diaria",
    resultado: "partida",
    correccion: "corrección de resultado",
    ajuste: "ajuste manual",
    elo: "actualización de Elo",
  },
  // Elo
  evolucionElo: "Evolución del Elo",
  eloVacio:
    "Todavía no hay cambios de Elo. Aparecerán con la próxima lista mensual de la FIDE.",
  eloDesde: (total: string, mes: string) => `${total} desde ${mes}`,
  ariaElo: (titulo: string, de: number, a: number) => `${titulo}: de ${de} a ${a}`,
  minMaxElo: (min: number, max: number) => `Mín. ${min} · Máx. ${max}`,
  // Próximo rival
  proxRival: "Próx. rival:",
  sinEmparejar: "Sin emparejar",
  ronda: (n: number) => `Ronda ${n}`,
  mesa: (n: number) => `Mesa ${n}`,
  juegaBlancas: "Juega con blancas",
  juegaNegras: "Juega con negras",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
