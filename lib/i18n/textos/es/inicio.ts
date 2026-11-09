import type { Ancho } from "../../definir";

const es = {
  altEscudo: "Escudo de Beraun Fantasy",
  lema: "El fantasy de ajedrez de los Campeonatos de Gipuzkoa.",
  crearCuenta: "Crear cuenta gratis",
  entrar: "Entrar",
  queEs: "¿Qué es Beraun Fantasy?",
  queEsTexto:
    "Beraun Fantasy es un juego gratuito de fantasy de ajedrez. Eliges ajedrecistas reales que juegan los Campeonatos de Gipuzkoa, formas tu plantilla y ganas puntos según lo que ocurre en el tablero: resultados, rendimiento y variación de Elo.",
  comoSeJuega: "Cómo se juega",
  paso: (n: number) => `Paso ${n}`,
  preguntas: "Preguntas frecuentes",
  gratis: "¿Es gratis?",
  gratisRespuesta: "Sí. Se juega con dinero ficticio del propio juego.",
  campeonatos: "¿Qué campeonatos incluye?",
  campeonatosRespuesta: "Los Campeonatos de Gipuzkoa de ajedrez, con sus jugadores y rondas reales.",
  movil: "¿Se puede jugar desde el móvil?",
  movilRespuesta: "Sí, funciona en el navegador y se puede instalar como app.",
  pasos: [
    {
      titulo: "Monta tu plantilla",
      texto: "Ficha ajedrecistas de los Campeonatos de Gipuzkoa con tu presupuesto inicial y elige a quién alinear en cada jornada.",
    },
    {
      titulo: "Puja en el mercado",
      texto: "Haz pujas, paga cláusulas de rescisión y vende para mejorar tu equipo antes de que lo haga tu rival.",
    },
    {
      titulo: "Suma puntos con las partidas reales",
      texto: "Tus jugadores puntúan según sus resultados y su Elo en cada ronda. Cuanto mejor jueguen, más sube tu equipo.",
    },
    {
      titulo: "Compite en ligas",
      texto: "Crea una liga privada con tus amigos o juega en la pública, sube de nivel y desbloquea avatares.",
    },
  ],
};

export type Seccion = Ancho<typeof es>;
export default es;
