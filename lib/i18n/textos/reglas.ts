import { definirTextos } from "../definir";

// Ventana "Cómo funciona el juego". Lo que va entre **dobles asteriscos**
// se pinta en negrita.
export default definirTextos(
  {
    titulo: "Cómo funciona el juego",
    // Puntos
    puntosTitulo: "Puntos",
    puntosIntro:
      "Cada jornada puntúan tus 6 titulares (los suplentes no suman). Los puntos de cada partida dependen del resultado y de la diferencia de Elo con el rival (Elo del rival − tu Elo):",
    tablaDiferencia: "Diferencia de Elo",
    tablaResultados: "Victoria · Tablas · Derrota",
    tramo1: "29 o menos (incluye rivales con menos Elo)",
    tramo2: "De 30 a 99",
    tramo3: "De 100 a 199",
    tramo4: "De 200 a 299",
    tramo5: "300 o más",
    bonus:
      "**Bonus por victoria.** Según el torneo, ganar da puntos extra: Tercera y Cadete, **+1**; Segunda, Open de Gros y Superveteranos, **+2**; Absoluto, **+3**. Solo se aplica a las victorias (no a tablas ni derrotas). Los jugadores con 0 de Elo puntúan siempre 3 puntos por victoria (más el bonus del torneo).",
    descanso: (n: number) =>
      `**Descanso.** Si tu jugador queda sin emparejar en una jornada, suma ${n} punto. Cuenta igual si tiene un bye (no le toca rival) que si ha pedido que no le emparejen.`,
    finDeSemana:
      "**Tu plantilla del fin de semana.** El sábado a las 16:00 se guardan tus titulares y tu capitán. Esa plantilla vale para todas las rondas que se jueguen ese fin de semana, en cualquier torneo (aunque un torneo vaya por la ronda 1 y otro por la 2). Cuando acaba el fin de semana, tus puntos son la suma de lo que ha hecho cada titular.",
    unTorneo:
      "**Un jugador, un torneo.** Si un titular tuyo juega en más de un torneo el mismo fin de semana, solo te puntúa en el torneo donde más puntos haya hecho; en el otro suma 0. Por ejemplo: si saca 5 puntos en Segunda y 3 en el Open de Gros, te suma 5.",
    limite: (n: number) =>
      `Límite de titulares: como máximo ${n} de tus titulares pueden estar inscritos en el mismo torneo. En Plantilla ves cuántos llevas por torneo. Con el saldo en negativo no puntúas.`,
    automatico: (n: number) =>
      `**Titular automático.** Si tienes menos de ${n} titulares, los jugadores que fiches entran de titular directamente (si no se supera el límite por torneo). Puedes pasarlos a suplente cuando quieras.`,
    // Mercado
    mercadoTitulo: "Mercado y pujas (ligas privadas)",
    mercado:
      "El mercado se renueva a las 8:00, 17:00 y 23:00 (hora de España); el contador de la pantalla Mercado te dice cuánto falta. Al resolverse, el jugador es para quien haya hecho la puja más alta, que paga lo que pujó. Si hay empate, gana quien pujó antes.",
    pujasOcultas:
      "**Pujas ocultas.** Durante las 2 últimas horas antes de que se actualice el mercado dejan de verse las pujas de los demás: solo ves cuánta gente ha pujado por cada jugador, no el precio ni quién. Tu propia puja sí la ves. En el Mercado hay un contador que te dice cuánto falta para que se oculten.",
    // Capitán
    capitanTitulo: "Capitán",
    capitan: (mult: number) =>
      `Elige a uno de tus titulares como capitán: todo lo que consiga esa jornada (puntos de la partida, bonus por victoria o punto de descanso) se multiplica por **${mult}**.`,
    capitanUnico:
      "Solo puede haber un capitán por equipo y tiene que ser titular: si lo pasas a suplente o lo vendes, pierde la capitanía.",
    // Clausulazos
    clausulazosTitulo: "Clausulazos (ligas privadas)",
    clausula: (pct: number) =>
      `Cada jugador tiene una cláusula: el ${pct} % de su valor de mercado, redondeada al millón superior. Si la pagas, el jugador pasa a tu plantilla sin que el dueño pueda negarse (siempre que tengas saldo suficiente).`,
    subirClausula: (mult: number) =>
      `**Subir la cláusula.** Puedes pagar una cantidad por uno de tus jugadores para protegerlo: cada M que pagas sube su cláusula ${mult} M. Ese extra se pierde si el jugador sale de tu plantilla.`,
    candado:
      "**Candado.** Un jugador recién fichado (por puja o por clausulazo) no se puede clausular hasta que empiece la siguiente jornada.",
    cierre:
      "**Cierre de clausulazos.** No se pueden hacer desde el viernes a las 16:00 hasta el sábado a las 18:00 (hora de España). Si lo intentas en ese tramo, la app te avisa y no se paga nada.",
    sinClausulazosPublica:
      "En la liga pública no hay clausulazos: fichas y vendes al instante en el Mercado.",
    // Blindaje
    blindajeTitulo: "Blindaje (ligas privadas)",
    blindaje: (pct: number) =>
      `Blindar a un jugador impide que le hagan un clausulazo hasta que empiece la siguiente jornada. Cuesta el ${pct} % de su valor de mercado, redondeado al millón superior.`,
    blindajeUno: "Solo puedes blindar a un jugador por jornada.",
  },
  {
    eu: {
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
        "Merkatua 8:00etan, 17:00etan eta 23:00etan berritzen da (Espainiako ordua); Merkatua pantailako kontagailuak esaten dizu zenbat falta den. Ebaztean, jokalaria poxa handiena egin duenarentzat da, eta poxatutakoa ordaintzen du. Berdinketa badago, lehenago poxatu duenak irabazten du.",
      pujasOcultas:
        "**Poxa ezkutuak.** Merkatua eguneratu aurreko azken 2 orduetan besteen poxak ez dira ikusten: jokalari bakoitzagatik zenbat lagunek poxatu duten bakarrik ikusten duzu, ez prezioa ezta nork ere. Zure poxa bai, ikusten duzu. Merkatuan kontagailu batek esaten dizu zenbat falta den ezkutatzeko.",
      capitanTitulo: "Kapitaina",
      capitan: (mult: number) =>
        `Aukeratu zure titularretako bat kapitain: jardunaldi horretan lortzen duen guztia (partidako puntuak, garaipen-bonusa edo atseden-puntua) **${mult}** aldiz biderkatzen da.`,
      capitanUnico:
        "Talde bakoitzak kapitain bakarra izan dezake, eta titularra izan behar du: ordezko pasatzen baduzu edo saltzen baduzu, kapitaintza galtzen du.",
      clausulazosTitulo: "Klausulazoak (liga pribatuak)",
      clausula: (pct: number) =>
        `Jokalari bakoitzak askatze-klausula bat du: bere merkatu-balioaren % ${pct}, goranzko milioira biribilduta. Ordaintzen baduzu, jokalaria zure plantillara pasatzen da, jabeak ezetz esan ahal izan gabe (saldo nahikoa baduzu).`,
      subirClausula: (mult: number) =>
        `**Klausula igo.** Zure jokalarietako batengatik kopuru bat ordain dezakezu hura babesteko: ordaintzen duzun M bakoitzak ${mult} M igotzen du haren klausula. Gehigarri hori galdu egiten da jokalariak zure plantilla uzten badu.`,
      candado:
        "**Giltzarrapoa.** Fitxatu berri den jokalari bati (poxaz edo klausulazoz) ezin zaio klausulazorik egin hurrengo jardunaldia hasi arte.",
      cierre:
        "**Klausulazoen itxiera.** Ezin dira egin ostiraleko 16:00etatik larunbateko 18:00etara (Espainiako ordua). Tarte horretan saiatzen bazara, aplikazioak abisatu egiten dizu eta ez da ezer ordaintzen.",
      sinClausulazosPublica:
        "Liga publikoan ez dago klausulazorik: Merkatuan berehala fitxatzen eta saltzen duzu.",
      blindajeTitulo: "Blindajea (liga pribatuak)",
      blindaje: (pct: number) =>
        `Jokalari bat blindatuz gero, ezin zaio klausulazorik egin hurrengo jardunaldia hasi arte. Bere merkatu-balioaren % ${pct} balio du, goranzko milioira biribilduta.`,
      blindajeUno: "Jardunaldi bakoitzean jokalari bakarra blinda dezakezu.",
    },
    en: {
      titulo: "How the game works",
      puntosTitulo: "Points",
      puntosIntro:
        "Each matchday your 6 starters score points (bench players don't count). The points for each game depend on the result and on the Elo difference with the opponent (opponent's Elo − your Elo):",
      tablaDiferencia: "Elo difference",
      tablaResultados: "Win · Draw · Loss",
      tramo1: "29 or less (includes lower-rated opponents)",
      tramo2: "30 to 99",
      tramo3: "100 to 199",
      tramo4: "200 to 299",
      tramo5: "300 or more",
      bonus:
        "**Win bonus.** Depending on the tournament, winning gives extra points: Third and Cadet, **+1**; Second, Gros Open and Super Veterans, **+2**; Absolute, **+3**. It only applies to wins (not draws or losses). Players with 0 Elo always score 3 points per win (plus the tournament bonus).",
      descanso: (n: number) =>
        `**Bye.** If your player is left unpaired on a matchday, they get ${n} point. It counts the same whether they have a bye (no opponent) or asked not to be paired.`,
      finDeSemana:
        "**Your weekend squad.** On Saturday at 16:00 your starters and captain are saved. That squad counts for every round played that weekend, in any tournament (even if one tournament is on round 1 and another on round 2). When the weekend ends, your points are the sum of what each starter scored.",
      unTorneo:
        "**One player, one tournament.** If one of your starters plays in more than one tournament on the same weekend, they only score for you in the tournament where they got the most points; the other counts as 0. For example: if they get 5 points in Second and 3 in the Gros Open, you get 5.",
      limite: (n: number) =>
        `Starter limit: at most ${n} of your starters can be registered in the same tournament. In Squad you can see how many you have per tournament. With a negative balance you don't score.`,
      automatico: (n: number) =>
        `**Automatic starter.** If you have fewer than ${n} starters, players you sign go straight into the starting line-up (as long as the per-tournament limit isn't exceeded). You can move them to the bench whenever you like.`,
      mercadoTitulo: "Market and bids (private leagues)",
      mercado:
        "The market refreshes at 8:00, 17:00 and 23:00 (Spanish time); the countdown on the Market screen tells you how long is left. When it's resolved, the player goes to whoever made the highest bid, who pays what they bid. In a tie, the earliest bid wins.",
      pujasOcultas:
        "**Hidden bids.** During the last 2 hours before the market refreshes, other people's bids are hidden: you only see how many people have bid for each player, not the price or who. You can still see your own bid. The Market has a countdown telling you how long until bids are hidden.",
      capitanTitulo: "Captain",
      capitan: (mult: number) =>
        `Choose one of your starters as captain: everything they get that matchday (game points, win bonus or bye point) is multiplied by **${mult}**.`,
      capitanUnico:
        "Each team can only have one captain and they must be a starter: if you move them to the bench or sell them, they lose the captaincy.",
      clausulazosTitulo: "Clause buyouts (private leagues)",
      clausula: (pct: number) =>
        `Every player has a release clause: ${pct} % of their market value, rounded up to the next million. If you pay it, the player joins your squad and the owner can't refuse (as long as you have enough balance).`,
      subirClausula: (mult: number) =>
        `**Raise the clause.** You can pay an amount for one of your players to protect them: each M you pay raises their clause by ${mult} M. That extra is lost if the player leaves your squad.`,
      candado:
        "**Lock.** A newly signed player (by bid or by clause buyout) can't be bought out until the next matchday starts.",
      cierre:
        "**Clause buyout window closed.** They can't be made from Friday 16:00 until Saturday 18:00 (Spanish time). If you try during that window, the app warns you and nothing is paid.",
      sinClausulazosPublica:
        "There are no clause buyouts in the public league: you sign and sell instantly in the Market.",
      blindajeTitulo: "Shield (private leagues)",
      blindaje: (pct: number) =>
        `Shielding a player stops anyone from buying out their clause until the next matchday starts. It costs ${pct} % of their market value, rounded up to the next million.`,
      blindajeUno: "You can only shield one player per matchday.",
    },
  }
);
