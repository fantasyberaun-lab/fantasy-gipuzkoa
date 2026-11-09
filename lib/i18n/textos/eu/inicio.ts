import type { Seccion } from "../es/inicio";

const eu: Seccion = {
  altEscudo: "Beraun Fantasyren armarria",
  lema: "Gipuzkoako Txapelketetako xakeko fantasy-a.",
  crearCuenta: "Sortu kontua doan",
  entrar: "Sartu",
  queEs: "Zer da Beraun Fantasy?",
  queEsTexto:
    "Beraun Fantasy doako xakeko fantasy jokoa da. Gipuzkoako Txapelketetan jokatzen duten benetako xakelariak aukeratu, zure taldea osatu eta taulan gertatzen denaren arabera puntuak irabazten dituzu: emaitzak, errendimendua eta Eloaren aldaketak.",
  comoSeJuega: "Nola jokatzen da?",
  paso: (n) => `${n}. urratsa`,
  preguntas: "Ohiko galderak",
  gratis: "Doakoa al da?",
  gratisRespuesta: "Bai. Jokoaren diru faltsuarekin jokatzen da.",
  campeonatos: "Zein txapelketa sartzen dira?",
  campeonatosRespuesta: "Gipuzkoako xakeko Txapelketak, benetako jokalari eta txandekin.",
  movil: "Mugikorretik joka daiteke?",
  movilRespuesta: "Bai, nabigatzailean funtzionatzen du eta aplikazio gisa instala daiteke.",
  pasos: [
    { titulo: "Osatu zure taldea", texto: "Fitxatu Gipuzkoako Txapelketetako xakelariak hasierako aurrekontuarekin eta aukeratu nor lerrokatu jardunaldi bakoitzean." },
    { titulo: "Egin eskaintzak merkatuan", texto: "Egin eskaintzak, ordaindu klausulak eta saldu zure taldea hobetzeko aurkariak egin baino lehen." },
    { titulo: "Lortu puntuak benetako partidetan", texto: "Zure jokalariek emaitzen eta txanda bakoitzeko Eloaren arabera lortzen dituzte puntuak. Zenbat eta hobeto jokatu, orduan eta gehiago igoko da zure taldea." },
    { titulo: "Lehiatu ligetan", texto: "Sortu liga pribatua lagunekin edo jokatu publikoan, igo mailaz eta desblokeatu avatarrak." },
  ],
};

export default eu;
