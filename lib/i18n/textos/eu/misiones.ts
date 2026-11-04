import type { Seccion } from "../es/misiones";

const eu: Seccion = {
  titulo: "Misioak",
  volver: "← Itzuli",
  tarjeta: "Misioak",
  tarjetaDetalle: "Irabazi XP eta igo maila",
  tarjetaListas: (n: number) => `${n} misio prest`,
  intro:
    "Bete misioak XP irabazteko. Bat jasotzean, bere seriako hurrengoa desblokeatzen da, zailagoa eta XP gehiagorekin. Luzeak dira: urteak irauteko pentsatuta daude.",
  cargando: "Misioak kargatzen…",
  error: "Ezin izan dira misioak kargatu. Saiatu berriro.",
  reintentar: "Saiatu berriro",
  listas: (n: number) => `${n} misio jasotzeko prest`,
  ningunaLista: "Oraindik ez dago misiorik prest",
  soloListas: "Jasotzekoak soilik",
  nadaAqui: "Ez dago jasotzeko misiorik fitxa honetan.",
  escalon: (n: number, total: number) => `${n}. misioa / ${total}`,
  recompensa: (xp: number) => `+${xp} XP`,
  reclamar: (xp: number) => `Jaso +${xp} XP`,
  reclamando: "Jasotzen…",
  reclamada: (xp: number) => `+${xp} XP!`,
  completada: "Seriea osatuta",
  verNiveles: "Ikusi nire maila",
  puesto: (n: number) => `#${n}`,
  sinPuesto: "Postu gabe",
  pestanas: {
    pub: "Liga publikoa",
    pri: "Liga pribatuak",
    gen: "Kontua",
    mj: "Minijokoak",
  },
  ayudaPestana: {
    pub: "Liga publiko aktiboko zure taldeak soilik zenbatzen dira. Plantila, saldo eta aljeazioarenak jardunaldia hastean (larunbata) egiaztatzen dira, eta saldo gorririk gabe bakarrik zenbatzen dira.",
    pri: "Liga pribatuetako zure taldeak zenbatzen dira, kontagailu propioekin. XP gutxiago ematen dute eta managerren arteko salmentek iruzurren aurkako neurriak dituzte.",
    gen: "Zure kontua, ligak axola gabe.",
    mj: "Minijokoetan egiten duzun guztia.",
  },
  grupos: {
    partidas: "Partidak eta puntuak",
    clasificacion: "Sailkapena",
    economia: "Plantila eta ekonomia",
    mercado: "Merkatua",
    progresion: "Aurrerapena",
    minijuegos: "Minijokoak",
  },
  series: {
    caz100: {
      titulo: "Erraldoi-ehiztaria +100",
      texto: (n: number) =>
        `Irabazi ${n} partida zure taldeko jokalariekin, 100 Elo edo gehiago dituzten aurkarien aurka.`,
    },
    caz200: {
      titulo: "Erraldoi-ehiztaria +200",
      texto: (n: number) =>
        `Irabazi ${n} partida zure taldeko jokalariekin, 200 Elo edo gehiago dituzten aurkarien aurka.`,
    },
    caz300: {
      titulo: "Erraldoi-ehiztaria +300",
      texto: (n: number) =>
        `Irabazi ${n} partida zure taldeko jokalariekin, 300 Elo edo gehiago dituzten aurkarien aurka.`,
    },
    capitan: {
      titulo: "Kapitain-besokoa",
      texto: (_n: number, f: string) => `Batu ${f} puntu zure kapitainarekin (biderkatzailearekin).`,
    },
    oro: {
      titulo: "Urrezko jardunaldia",
      texto: (_n: number, f: string) => `Batu ${f} puntu edo gehiago zure taldearekin jardunaldi bakar batean.`,
    },
    regular: {
      titulo: "Erregulartasuna",
      texto: (n: number) => `Egin 25 puntu edo gehiago ${n} jardunaldi jarraian.`,
    },
    victorias: {
      titulo: "Garaileak",
      texto: (_n: number, f: string) => `Lortu ${f} garaipen zure titularrekin.`,
    },
    capgig: {
      titulo: "Kapitain erraldoia",
      texto: (n: number) =>
        `Zure kapitainak ${n} partida irabaz ditzala, 100 Elo edo gehiago dituzten aurkarien aurka.`,
    },
    cuatro: {
      titulo: "Seietik lau",
      texto: (n: number) =>
        `Zure 4 titular edo gehiagok jardunaldi berean irabaz dezatela, ${n} aldiz.`,
    },
    pleno: {
      titulo: "Garaipen osoa",
      texto: (n: number) => `6 titularrek jardunaldi berean irabaz dezatela, ${n} aldiz.`,
    },
    fiel: {
      titulo: "Jokalari leiala",
      texto: (n: number) => `Eduki jokalari bera zure taldean ${n} jardunaldi jarraian.`,
    },
    pujas: {
      titulo: "Puja-ehiztaria",
      texto: (n: number) => `Irabazi merkatuko pujak ${n} jokalari desberdinengatik.`,
    },
    fichajes: {
      titulo: "Fitxatzailea",
      texto: (n: number) => `Fitxatu ${n} jokalari desberdin.`,
    },
    blindaje: {
      titulo: "Blindatua",
      texto: (n: number) => `Blindatu ${n} jokalari desberdin.`,
    },
    subircl: {
      titulo: "Klausula gora",
      texto: (n: number) => `Igo ${n} jokalari desberdinen klausula.`,
    },
    clausulazo: {
      titulo: "Klausula eskuan",
      texto: (n: number) => `Ordaindu beste manager batzuen ${n} jokalari desberdinen klausula.`,
    },
    plusvalia: {
      titulo: "Plusbalioa",
      texto: (_n: number, f: string) =>
        `Irabazi ${f} M guztira jokalariak ordaindu duzuna baino gehiagotan salduz (merkatuari edo makinari).`,
    },
    mejorop: {
      titulo: "Eragiketarik onena",
      texto: (_n: number, f: string) =>
        `Irabazi ${f} M edo gehiago salmenta bakar batean, jokalariagatik ordaindu zenuenarekin alderatuta.`,
    },
    top10: {
      titulo: "Hamar onenen artean",
      texto: (n: number) =>
        `Amaitu liga publikoko jardunaldi baten lehen 10 postuen artean, ${n} aldiz.`,
    },
    podio: {
      titulo: "Podiuma",
      texto: (n: number) =>
        `Amaitu liga publikoko jardunaldi baten lehen 3 postuen artean, ${n} aldiz.`,
    },
    primero: {
      titulo: "Goian-goian",
      texto: (n: number) => `Amaitu lehen liga publikoko jardunaldi batean, ${n} aldiz.`,
    },
    lider: {
      titulo: "Sailkapen orokorreko liderra",
      texto: (n: number) =>
        `Izan liga publikoko sailkapen orokorreko liderra jardunaldi bat itxitakoan, ${n} aldiz.`,
    },
    presencia: {
      titulo: "Presentzia",
      texto: (n: number) =>
        `Amaitu ${n} jardunaldi liga publikoko sailkapen orokorreko lehen 10en artean.`,
    },
    valorplantilla: {
      titulo: "Plantila milioiduna",
      texto: (_n: number, f: string) =>
        `Aurkeztu jardunaldia hastean (larunbata) liga publikoan ${f} M balio duen plantila.`,
    },
    caja: {
      titulo: "Kutxa gotorra",
      texto: (_n: number, f: string) => `Eduki ${f} M saldo liga publikoan jardunaldia hastean (larunbata).`,
    },
    estrella: {
      titulo: "Jokalari izarra",
      texto: (_n: number, f: string) =>
        `Eduki jardunaldia hastean (larunbata) liga publikoko zure plantilan ${f} M edo gehiago balio duen jokalari bat.`,
    },
    lujo: {
      titulo: "Luxuzko plantila",
      texto: (n: number) => `Aljeatu larunbatean aldi berean ${n} jokalari, bakoitza 100 M edo gehiagokoa, liga publikoan, saldo positiboarekin.`,
    },
    mercader: {
      titulo: "Merkataria",
      texto: (_n: number, f: string) =>
        `Saldu jokalariak liga pribatuetako beste manager batzuei ${f} M-ko guztizko balioan (salmenta bakoitzak gehienez jokalariaren klausularen balioa balio du).`,
    },
    ganajor: {
      titulo: "Ligaren erregea",
      texto: (n: number) =>
        `Irabazi ${n} jardunaldi liga pribatuetan, gutxienez 5 manager puntuatzen dutenean.`,
    },
    rachadiaria: {
      titulo: "Iraunkortasuna",
      texto: (n: number) => `Lortu ${n} eguneko segida.`,
    },
    nivel: {
      titulo: "Maisua",
      texto: (n: number) => `Iritsi ${n}. mailara.`,
    },
    veterano: {
      titulo: "Beteranoa",
      texto: (n: number) => `Sartu aplikazioan ${n} egun desberdinetan.`,
    },
    cofres: {
      titulo: "Segidako kutxak",
      texto: (n: number) => `Ireki segidako ${n} kutxa.`,
    },
    semana: {
      titulo: "Aste perfektua",
      texto: (n: number) =>
        `Sartu astearen 7 egunetan (astelehenetik igandera) eta osatu egun bakoitzeko minijokoak: ${n} aste.`,
    },
    diacompleto: {
      titulo: "Egun osoa",
      texto: (n: number) => `Osatu eguneko 8 minijokoak ${n} egunez.`,
    },
    seguidos: {
      titulo: "Egunik huts egin gabe",
      texto: (n: number) => `Osatu eguneko 8 minijokoak ${n} egun jarraian.`,
    },
    cadena: {
      titulo: "Katea",
      texto: (n: number) =>
        `Lortu ${n} asmatze jarraian Higher or Lower partida batean (gehienez 20).`,
    },
    cadenaperf: {
      titulo: "Kate perfektua",
      texto: (n: number) => `Lortu Higher or Lower-eko 20 asmatzeak ${n} partidatan.`,
    },
    m900v: {
      titulo: "Bikain",
      texto: (n: number) =>
        `Lortu 900 puntu edo gehiago minijoko baten eguneko partida batean, ${n} aldiz.`,
    },
    m900j: {
      titulo: "Dena bikain",
      texto: (n: number) => `Lortu 900 puntu edo gehiago ${n} minijoko desberdinetan.`,
    },
    perfn: {
      titulo: "Hutsik gabe",
      texto: (n: number) =>
        `Egin partida perfektua (itzuli guztiak asmatuta) ${n} minijoko desberdinetan.`,
    },
    perfleyj: {
      titulo: "Kondaira hutsik gabe",
      texto: (n: number) =>
        `Egin partida perfektua kondaira moduan ${n} minijoko desberdinetan.`,
    },
    perfleyv: {
      titulo: "Kondaira garaiezina",
      texto: (n: number) => `Egin ${n} partida perfektu kondaira moduan.`,
    },
    rankmj: {
      titulo: "Sailkapenaren goia",
      texto: (n: number) =>
        n === 1
          ? "Izan minijokoen sailkapen orokorreko 1. (10 parte-hartzaile edo gehiagorekin)."
          : `Iritsi minijokoen sailkapen orokorreko ${n}. postura (10 parte-hartzaile edo gehiagorekin).`,
    },
    primerodia: {
      titulo: "Eguneko lehena",
      texto: (n: number) =>
        `Amaitu lehen minijoko baten eguneko sailkapenean (5 jokalari edo gehiagorekin), ${n} aldiz.`,
    },
    maraton: {
      titulo: "Maratoia",
      texto: (_n: number, f: string) => `Jokatu ${f} minijoko-partida.`,
    },
    cofresmj: {
      titulo: "Eguneko kutxak",
      texto: (n: number) => `Ireki minijokoetako ${n} kutxa.`,
    },
    m500x8: {
      titulo: "Maila bera",
      texto: (n: number) =>
        `Lortu 500 puntu edo gehiago 8 minijokoetan egun berean, ${n} aldiz.`,
    },
    tt4: {
      titulo: "Ia dena egiten du",
      texto: (n: number) =>
        `Lortu 800 puntu edo gehiago 4 minijokoetan egun berean, ${n} aldiz.`,
    },
    tt8: {
      titulo: "Dena egiten du",
      texto: (n: number) =>
        `Lortu 800 puntu edo gehiago 8 minijokoetan egun berean, ${n} aldiz.`,
    },
    plenopron: {
      titulo: "Iragarpen osoa",
      texto: (n: number) =>
        `Asmatu txanda baten iragarpen guztiak (4 mahai edo gehiago), ${n} aldiz.`,
    },
    alinea120: {
      titulo: "Aljeazio galaktikoa",
      texto: (n: number) =>
        `Aljeatu larunbatean 120 M edo gehiagoko ${n} titular aldi berean liga publikoan.`,
    },
    sinelo: {
      titulo: "Elo gabeko taldea",
      texto: (n: number) => `Aurkeztu larunbatean Elo gabeko ${n} jokalari aldi berean zure plantilan.`,
    },
    sinelov: {
      titulo: "Elo gabeko garaipenak",
      texto: (n: number) =>
        `Irabazi ${n} partida zure taldeko Elo gabeko jokalariekin.`,
    },
    puntosmj: {
      titulo: "Minijokoen puntuak",
      texto: (_n: number, f: string) => `Batu ${f} puntu guztira minijokoetan.`,
    },
  },
  // Guía de estreno (TutorialMisiones)
  tutorial: {
    saltar: "Saltatu",
    siguiente: "Hurrengoa",
    entendido: "Ulertu dut!",
    pasoDe: (n: number, total: number) => `${n} / ${total}`,
    perfilTitulo: "Misioak iritsi dira",
    perfilTexto:
      "Bete helburuak eta irabazi XP maila igotzeko. Misio bat prest dagoenean, Nire profila txartela urrez markatuko da eta zuzenean eramango zaitu.",
    escalonTitulo: "Horrela funtzionatzen dute",
    escalonTexto:
      "Misio bakoitzak aurrerapen-barra bat du. Betetzean, sakatu «Jaso» bere XP kobratzeko, eta saileko hurrengoa irekitzen da, zailagoa eta XP gehiagorekin. Fitxa bat dago jokatzen duzun leku bakoitzeko: liga publikoa, liga pribatuak, minijokoak eta zure kontuarentzako orokor bat. Bakoitzak bere aurrerapena darama.",
  },
};

export default eu;
