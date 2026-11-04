import type { Seccion } from "../es/reglas";

// "8:00, 17:00 y 23:00" (o "8:00etan, 17:00etan eta 23:00etan").
function listaHoras(horas: number[], y: string, sufijo = ""): string {
  const textos = horas.map((h) => `${h}:00${sufijo}`);
  if (textos.length <= 1) return textos.join("");
  return `${textos.slice(0, -1).join(", ")}${y}${textos[textos.length - 1]}`;
}

const eu: Seccion = {
  titulo: "Nola funtzionatzen du jokoak",
  puntosTitulo: "Puntuak",
  puntosIntro:
    "Jardunaldi bakoitzean zure 6 titularrek lortzen dituzte puntuak (ordezkoek ez dute batzen). Partida bakoitzeko puntuak emaitzaren eta aurkariarekiko Elo-aldearen araberakoak dira (aurkariaren Eloa − zure Eloa):",
  tablaDiferencia: "Elo-aldea",
  tablaResultados: "Garaipena · Berdinketa · Porrota",
  tramo1: "29 edo gutxiago (Elo txikiagoko aurkariak barne)",
  tramo2: "30etik 99ra",
  tramo3: "100etik 199ra",
  tramo4: "200etik 299ra",
  tramo5: "300 edo gehiago",
  bonus:
    "**Garaipen-bonusa.** Txapelketaren arabera, irabazteak puntu gehigarriak ematen ditu: Hirugarren maila eta Kadeteak, **+1**; Bigarren maila, Gros Open eta Superbeteranoak, **+2**; Absolutua, **+3**. Garaipenei bakarrik aplikatzen zaie (ez berdinketei edo porrotei). 0 Elo duten jokalariek beti 3 puntu lortzen dituzte garaipen bakoitzeko (gehi txapelketaren bonusa).",
  descanso: (n: number) =>
    `**Atsedena.** Zure jokalaria jardunaldi batean parekatu gabe geratzen bada, ${n} puntu batzen du. Berdin balio du bye bat badu (ez dagokio aurkaririk) edo ez parekatzeko eskatu badu.`,
  finDeSemana:
    "**Zure asteburuko plantilla.** Larunbatean 16:00etan zure titularrak eta kapitaina gordetzen dira. Plantilla horrek asteburu horretan jokatzen diren txanda guztietarako balio du, edozein txapelketatan (txapelketa bat 1. txandan eta beste bat 2.ean egon arren). Asteburua amaitzean, zure puntuak titular bakoitzak egindakoaren batura dira.",
  unTorneo:
    "**Jokalari bat, txapelketa bat.** Zure titular batek asteburu berean txapelketa batean baino gehiagotan jokatzen badu, puntu gehien egin dituen txapelketan bakarrik ematen dizkizu puntuak; bestean 0 batzen du. Adibidez: Bigarren mailan 5 puntu eta Gros Openean 3 lortzen baditu, 5 batzen dizkizu.",
  limite: (n: number) =>
    `Titularren muga: zure titularretatik gehienez ${n} egon daitezke txapelketa berean izena emanda. Plantillan ikusiko duzu txapelketa bakoitzean zenbat dituzun. Saldoa negatiboan baduzu, ez duzu punturik lortzen.`,
  automatico: (n: number) =>
    `**Titular automatikoa.** ${n} titular baino gutxiago badituzu, fitxatzen dituzun jokalariak zuzenean titular sartzen dira (txapelketako muga gainditzen ez bada). Nahi duzunean pasa ditzakezu ordezko.`,
  mercadoTitulo: "Merkatua eta poxak (liga pribatuak)",
  mercado:
    (horas: number[]) =>
      `Zure ligako merkatua ${listaHoras(horas, " eta ", "etan")} berritzen da (Espainiako ordua; ligako administratzaileak aukeratzen du); Merkatua pantailako kontagailuak esaten dizu zenbat falta den. Ebaztean, jokalaria poxa handiena egin duenarentzat da, eta poxatutakoa ordaintzen du. Berdinketa badago, lehenago poxatu duenak irabazten du.`,
  ventaMaquina:
    "**Saldu.** Liga pribatuetan jokalariak ez dira berehala saltzen: salgai jartzen dituzu eta, merkatuaren eguneraketa bakoitzean, makinak bere balioaren inguruko eskaintza egiten dizu (% 10 gutxiago eta % 10 gehiago artean, ia beti hurbil). Zuk onartu edo baztertzen duzu; baztertzen baduzu, hurrengoan beste bat egiten dizu. Bitartean, jokalariak zure taldean jarraitzen du eta puntuatzen.",
  pujasOcultas:
    "**Poxa ezkutuak.** Merkatua eguneratu aurreko azken 2 orduetan besteen poxak ez dira ikusten: jokalari bakoitzagatik zenbat lagunek poxatu duten bakarrik ikusten duzu, ez prezioa ezta nork ere. Zure poxa bai, ikusten duzu. Merkatuan kontagailu batek esaten dizu zenbat falta den ezkutatzeko.",
  capitanTitulo: "Kapitaina",
  capitan: (mult: number) =>
    `Aukeratu zure titularretako bat kapitain: jardunaldi horretan lortzen duen guztia (partidako puntuak, garaipen-bonusa edo atseden-puntua) **${mult}** aldiz biderkatzen da.`,
  capitanUnico:
    "Talde bakoitzak kapitain bakarra izan dezake, eta titularra izan behar du: ordezko pasatzen baduzu edo saltzen baduzu, kapitaintza galtzen du.",
  clausulazosTitulo: "Klausulazoak (liga pribatuak)",
  clausula: (pct: number) =>
    `Jokalari bakoitzak askatze-klausula bat du: jabeak haren truke ordaindutakoaren % ${pct} (edo hasierako plantillan doan jaso bazuen, merkatu-balioaren %${pct}), goranzko milioira biribilduta. Ordaintzen baduzu, jokalaria zure plantillara pasatzen da, jabeak ezetz esan ahal izan gabe (saldo nahikoa baduzu).`,
  subirClausula: (mult: number) =>
    `**Klausula igo.** Zure jokalarietako batengatik kopuru bat ordain dezakezu hura babesteko: ordaintzen duzun M bakoitzak ${mult} M igotzen du haren klausula. Gehigarri hori galdu egiten da jokalariak zure plantilla uzten badu.`,
  candado:
    "**Giltzarrapoa.** Fitxatu berri den jokalari bati (poxaz edo klausulazoz) ezin zaio klausulazorik egin aste batez.",
  cierre:
    "**Klausulazoen itxiera.** Ezin dira egin ostiraleko 16:00etatik larunbateko 18:00etara (Espainiako ordua). Tarte horretan saiatzen bazara, aplikazioak abisatu egiten dizu eta ez da ezer ordaintzen.",
  sinClausulazosPublica:
    "Liga publikoan ez dago klausulazorik: Merkatuan berehala fitxatzen eta saltzen duzu.",
  blindajeTitulo: "Blindajea (liga pribatuak)",
  blindaje: (pct: number) =>
    `Jokalari bat blindatuz gero, ezin zaio klausulazorik egin aste batez. Bere merkatu-balioaren % ${pct} balio du, goranzko milioira biribilduta.`,
  blindajeUno: "Jardunaldi bakoitzean jokalari bakarra blinda dezakezu.",
};

export default eu;
