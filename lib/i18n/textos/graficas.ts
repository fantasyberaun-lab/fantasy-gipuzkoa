import { definirTextos } from "../definir";

// Gráficas de historial (puntos, valor, Elo) y la línea "Próx. rival".
export default definirTextos(
  {
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
  },
  {
    eu: {
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
    },
    en: {
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
    },
  }
);
