import type { Seccion } from "../es/inicio";

const en: Seccion = {
  altEscudo: "Beraun Fantasy crest",
  lema: "The chess fantasy game of the Gipuzkoa Championships.",
  crearCuenta: "Create a free account",
  entrar: "Sign in",
  queEs: "What is Beraun Fantasy?",
  queEsTexto:
    "Beraun Fantasy is a free chess fantasy game. Pick real players competing in the Gipuzkoa Championships, build your squad and earn points from what happens on the board: results, performance and Elo changes.",
  comoSeJuega: "How to play",
  paso: (n) => `Step ${n}`,
  preguntas: "Frequently asked questions",
  gratis: "Is it free?",
  gratisRespuesta: "Yes. You play with the game's fictional money.",
  campeonatos: "Which championships are included?",
  campeonatosRespuesta: "The Gipuzkoa Chess Championships, with their real players and rounds.",
  movil: "Can I play on mobile?",
  movilRespuesta: "Yes, it works in a browser and can be installed as an app.",
  pasos: [
    { titulo: "Build your squad", texto: "Sign Gipuzkoa Championship players with your starting budget and choose who to field each round." },
    { titulo: "Bid in the market", texto: "Place bids, pay release clauses and sell players to improve your team before your rival does." },
    { titulo: "Score from real games", texto: "Your players score according to their results and Elo in each round. The better they play, the more your team rises." },
    { titulo: "Compete in leagues", texto: "Create a private league with friends or play in the public one, level up and unlock avatars." },
  ],
};

export default en;
