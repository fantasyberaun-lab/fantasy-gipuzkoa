import { definirTextos } from "../definir";

// Misiones (tarjeta de la cabecera y página /misiones). Ver 0103_misiones_v2.sql.
// Los textos de cada serie van por familia (sin el sufijo _pub / _pri). `texto` recibe el
// objetivo como número (para plurales) y ya formateado (para cifras grandes).
// El euskera necesita revisión humana.
export default definirTextos(
  {
    titulo: "Misiones",
    volver: "← Volver",
    tarjeta: "Misiones",
    tarjetaDetalle: "Gana XP y sube de nivel",
    tarjetaListas: (n: number) => `${n} por reclamar`,
    intro:
      "Cumple misiones para ganar XP. Al reclamar una se desbloquea la siguiente de su serie, más difícil y con más XP. Son largas: están pensadas para durar años.",
    cargando: "Cargando misiones…",
    error: "No se han podido cargar las misiones. Inténtalo de nuevo.",
    reintentar: "Reintentar",
    listas: (n: number) => `${n} ${n === 1 ? "misión lista" : "misiones listas"} para reclamar`,
    ningunaLista: "Ninguna misión lista todavía",
    soloListas: "Solo por reclamar",
    nadaAqui: "No hay misiones por reclamar en esta pestaña.",
    escalon: (n: number, total: number) => `Misión ${n} de ${total}`,
    recompensa: (xp: number) => `+${xp} XP`,
    reclamar: (xp: number) => `Reclamar +${xp} XP`,
    reclamando: "Reclamando…",
    reclamada: (xp: number) => `¡+${xp} XP!`,
    completada: "Serie completada",
    verNiveles: "Ver mi nivel",
    puesto: (n: number) => `#${n}`,
    sinPuesto: "Sin puesto",
    pestanas: {
      pub: "Liga pública",
      pri: "Ligas privadas",
      gen: "Cuenta",
      mj: "Minijuegos",
    },
    ayudaPestana: {
      pub: "Cuentan solo tus equipos de la liga pública activa. Las de plantilla, saldo y alineación se comprueban al empezar la jornada (sábado) y solo cuentan con el saldo sin números rojos.",
      pri: "Cuentan tus equipos de ligas privadas, con sus propios contadores. Dan menos XP y las ventas entre managers tienen medidas antiamaños.",
      gen: "Tu cuenta, sin importar la liga.",
      mj: "Todo lo que haces en los minijuegos.",
    },
    grupos: {
      partidas: "Partidas y puntos",
      clasificacion: "Clasificación",
      economia: "Plantilla y economía",
      mercado: "Mercado",
      progresion: "Progresión",
      minijuegos: "Minijuegos",
    },
    series: {
      caz100: {
        titulo: "Cazagigantes +100",
        texto: (n: number) =>
          `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores de tu once contra rivales con 100 de Elo más o más.`,
      },
      caz200: {
        titulo: "Cazagigantes +200",
        texto: (n: number) =>
          `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores de tu once contra rivales con 200 de Elo más o más.`,
      },
      caz300: {
        titulo: "Cazagigantes +300",
        texto: (n: number) =>
          `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores de tu once contra rivales con 300 de Elo más o más.`,
      },
      capitan: {
        titulo: "Brazalete de capitán",
        texto: (_n: number, f: string) => `Suma ${f} puntos con tu capitán (ya con el multiplicador).`,
      },
      oro: {
        titulo: "Jornada de oro",
        texto: (_n: number, f: string) => `Suma ${f} puntos o más con tu equipo en una sola jornada.`,
      },
      regular: {
        titulo: "Regularidad",
        texto: (n: number) => `Haz 25 puntos o más en ${n} jornadas seguidas.`,
      },
      victorias: {
        titulo: "Victoriosos",
        texto: (_n: number, f: string) => `Consigue ${f} victorias con los titulares de tu once.`,
      },
      capgig: {
        titulo: "Capitán gigante",
        texto: (n: number) =>
          `Que tu capitán gane ${n} ${n === 1 ? "partida" : "partidas"} contra rivales con 100 de Elo más o más.`,
      },
      cuatro: {
        titulo: "Cuatro de seis",
        texto: (n: number) =>
          `Que 4 o más de tus titulares ganen en la misma jornada, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      pleno: {
        titulo: "Pleno de victorias",
        texto: (n: number) =>
          `Que ganen los 6 titulares en la misma jornada, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      fiel: {
        titulo: "Jugador fiel",
        texto: (n: number) => `Mantén al mismo jugador en tu once ${n} jornadas seguidas.`,
      },
      pujas: {
        titulo: "Cazapujas",
        texto: (n: number) => `Gana pujas del mercado por ${n} jugadores distintos.`,
      },
      fichajes: {
        titulo: "Fichador",
        texto: (n: number) => `Ficha a ${n} jugadores distintos.`,
      },
      blindaje: {
        titulo: "Blindado",
        texto: (n: number) => `Blinda a ${n} jugadores distintos.`,
      },
      subircl: {
        titulo: "Cláusula al alza",
        texto: (n: number) => `Sube la cláusula de ${n} jugadores distintos.`,
      },
      clausulazo: {
        titulo: "Cláusula en mano",
        texto: (n: number) => `Paga la cláusula de ${n} jugadores distintos de otros managers.`,
      },
      plusvalia: {
        titulo: "Plusvalía",
        texto: (_n: number, f: string) =>
          `Gana ${f} M en total vendiendo jugadores por más de lo que pagaste (al mercado o a la máquina).`,
      },
      mejorop: {
        titulo: "Mejor operación",
        texto: (_n: number, f: string) =>
          `Gana ${f} M o más en una sola venta respecto a lo que pagaste por el jugador.`,
      },
      top10: {
        titulo: "Entre los diez mejores",
        texto: (n: number) =>
          `Queda entre los 10 primeros de una jornada de la liga pública, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      podio: {
        titulo: "Podio",
        texto: (n: number) =>
          `Queda entre los 3 primeros de una jornada de la liga pública, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      primero: {
        titulo: "En lo más alto",
        texto: (n: number) =>
          `Queda primero en una jornada de la liga pública, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      lider: {
        titulo: "Líder de la general",
        texto: (n: number) =>
          `Sé líder de la clasificación general de la liga pública al cerrar una jornada, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      presencia: {
        titulo: "Presencia",
        texto: (n: number) =>
          `Acaba ${n} jornadas entre los 10 primeros de la clasificación general de la liga pública.`,
      },
      valorplantilla: {
        titulo: "Plantilla millonaria",
        texto: (_n: number, f: string) =>
          `Presenta al empezar la jornada (sábado) una plantilla que valga ${f} M en la liga pública.`,
      },
      caja: {
        titulo: "Caja fuerte",
        texto: (_n: number, f: string) => `Ten ${f} M de saldo en la liga pública al empezar la jornada (sábado).`,
      },
      estrella: {
        titulo: "Jugador estrella",
        texto: (_n: number, f: string) =>
          `Presenta al empezar la jornada (sábado) en tu plantilla de la liga pública a un jugador valorado en ${f} M o más.`,
      },
      lujo: {
        titulo: "Plantilla de lujo",
        texto: (n: number) => `Alinea el sábado ${n} jugadores de 100 M o más a la vez en la liga pública, con el saldo en positivo.`,
      },
      mercader: {
        titulo: "Mercader",
        texto: (_n: number, f: string) =>
          `Vende jugadores a otros managers de ligas privadas por ${f} M en total (cada venta cuenta como máximo el valor de la cláusula del jugador).`,
      },
      ganajor: {
        titulo: "Rey de la liga",
        texto: (n: number) =>
          `Gana ${n} jornadas en ligas privadas con al menos 5 managers puntuando.`,
      },
      rachadiaria: {
        titulo: "Constancia",
        texto: (n: number) => `Alcanza una racha de ${n} días seguidos.`,
      },
      nivel: {
        titulo: "Maestro",
        texto: (n: number) => `Alcanza el nivel ${n}.`,
      },
      veterano: {
        titulo: "Veterano",
        texto: (n: number) => `Entra en la app ${n} días distintos.`,
      },
      cofres: {
        titulo: "Cofres de racha",
        texto: (n: number) => `Abre ${n} cofres de racha.`,
      },
      semana: {
        titulo: "Semana perfecta",
        texto: (n: number) =>
          `Entra los 7 días de una semana (de lunes a domingo) y completa los minijuegos de cada día: ${n} ${n === 1 ? "semana" : "semanas"}.`,
      },
      diacompleto: {
        titulo: "Día completo",
        texto: (n: number) => `Completa los 8 minijuegos del día durante ${n} días.`,
      },
      seguidos: {
        titulo: "Sin fallar un día",
        texto: (n: number) => `Completa los 8 minijuegos del día durante ${n} días seguidos.`,
      },
      cadena: {
        titulo: "Cadena",
        texto: (n: number) =>
          `Encadena ${n} aciertos seguidos en una partida de Higher or Lower (el máximo es 20).`,
      },
      cadenaperf: {
        titulo: "Cadena perfecta",
        texto: (n: number) =>
          `Consigue los 20 aciertos de Higher or Lower en ${n} ${n === 1 ? "partida" : "partidas"}.`,
      },
      m900v: {
        titulo: "Sobresaliente",
        texto: (n: number) =>
          `Consigue 900 puntos o más en una partida diaria de un minijuego, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      m900j: {
        titulo: "Sobresaliente en todo",
        texto: (n: number) => `Consigue 900 puntos o más en ${n} minijuegos distintos.`,
      },
      perfn: {
        titulo: "Sin fallos",
        texto: (n: number) =>
          `Haz una partida perfecta (todas las rondas acertadas) en ${n} minijuegos distintos.`,
      },
      perfleyj: {
        titulo: "Leyenda sin fallos",
        texto: (n: number) =>
          `Haz una partida perfecta en modo leyenda en ${n} minijuegos distintos.`,
      },
      perfleyv: {
        titulo: "Leyenda imbatible",
        texto: (n: number) => `Haz ${n} partidas perfectas en modo leyenda.`,
      },
      rankmj: {
        titulo: "Top del ranking",
        texto: (n: number) =>
          n === 1
            ? "Sé el número 1 del ranking general de minijuegos (con 10 o más participantes)."
            : `Llega al puesto ${n} del ranking general de minijuegos (con 10 o más participantes).`,
      },
      primerodia: {
        titulo: "Primero del día",
        texto: (n: number) =>
          `Queda primero del ranking diario de un minijuego (con 5 o más jugadores), ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      maraton: {
        titulo: "Maratón",
        texto: (_n: number, f: string) => `Juega ${f} partidas de minijuegos.`,
      },
      cofresmj: {
        titulo: "Cofres del día",
        texto: (n: number) => `Abre ${n} cofres de minijuegos.`,
      },
      m500x8: {
        titulo: "Nivel parejo",
        texto: (n: number) =>
          `Saca 500 puntos o más en los 8 minijuegos el mismo día, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      tt4: {
        titulo: "Casi todoterreno",
        texto: (n: number) =>
          `Saca 800 puntos o más en 4 minijuegos el mismo día, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      tt8: {
        titulo: "Todoterreno",
        texto: (n: number) =>
          `Saca 800 puntos o más en los 8 minijuegos el mismo día, ${n} ${n === 1 ? "vez" : "veces"}.`,
      },
      alinea120: {
        titulo: "Alineación galáctica",
        texto: (n: number) =>
          `Alinea el sábado a ${n} titulares de 120 M o más a la vez en la liga pública.`,
      },
      sinelo: {
        titulo: "Equipo sin Elo",
        texto: (n: number) => `Presenta el sábado ${n} jugadores sin Elo a la vez en tu plantilla.`,
      },
      sinelov: {
        titulo: "Victorias sin Elo",
        texto: (n: number) =>
          `Gana ${n} ${n === 1 ? "partida" : "partidas"} con jugadores sin Elo de tu once.`,
      },
      puntosmj: {
        titulo: "Puntos de minijuegos",
        texto: (_n: number, f: string) => `Suma ${f} puntos en total en los minijuegos.`,
      },
    },
  },
  {
    eu: {
      titulo: "Misioak",
      volver: "← Itzuli",
      tarjeta: "Misioak",
      tarjetaDetalle: "Irabazi XP eta igo maila",
      tarjetaListas: (n: number) => `${n} jasotzeko`,
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
    },
    en: {
      titulo: "Missions",
      volver: "← Back",
      tarjeta: "Missions",
      tarjetaDetalle: "Earn XP and level up",
      tarjetaListas: (n: number) => `${n} to claim`,
      intro:
        "Complete missions to earn XP. Claiming one unlocks the next in its series, harder and worth more XP. They're long: built to last for years.",
      cargando: "Loading missions…",
      error: "Couldn't load missions. Please try again.",
      reintentar: "Retry",
      listas: (n: number) => `${n} ${n === 1 ? "mission" : "missions"} ready to claim`,
      ningunaLista: "No missions ready yet",
      soloListas: "Ready to claim only",
      nadaAqui: "Nothing to claim in this tab.",
      escalon: (n: number, total: number) => `Mission ${n} of ${total}`,
      recompensa: (xp: number) => `+${xp} XP`,
      reclamar: (xp: number) => `Claim +${xp} XP`,
      reclamando: "Claiming…",
      reclamada: (xp: number) => `+${xp} XP!`,
      completada: "Series complete",
      verNiveles: "See my level",
      puesto: (n: number) => `#${n}`,
      sinPuesto: "No rank",
      pestanas: {
        pub: "Public league",
        pri: "Private leagues",
        gen: "Account",
        mj: "Minigames",
      },
      ayudaPestana: {
        pub: "Only your teams in the active public league count. Squad, cash and lineup missions are checked when the round starts (Saturday) and only count with a non-negative balance.",
        pri: "Your teams in private leagues count, with their own counters. They give less XP and sales between managers have anti-cheating rules.",
        gen: "Your account, whatever the league.",
        mj: "Everything you do in the minigames.",
      },
      grupos: {
        partidas: "Games and points",
        clasificacion: "Standings",
        economia: "Squad and economy",
        mercado: "Market",
        progresion: "Progression",
        minijuegos: "Minigames",
      },
      series: {
        caz100: {
          titulo: "Giant slayer +100",
          texto: (n: number) =>
            `Win ${n} ${n === 1 ? "game" : "games"} with players in your lineup against opponents rated 100 Elo above them or more.`,
        },
        caz200: {
          titulo: "Giant slayer +200",
          texto: (n: number) =>
            `Win ${n} ${n === 1 ? "game" : "games"} with players in your lineup against opponents rated 200 Elo above them or more.`,
        },
        caz300: {
          titulo: "Giant slayer +300",
          texto: (n: number) =>
            `Win ${n} ${n === 1 ? "game" : "games"} with players in your lineup against opponents rated 300 Elo above them or more.`,
        },
        capitan: {
          titulo: "Captain's armband",
          texto: (_n: number, f: string) => `Score ${f} points with your captain (with the multiplier).`,
        },
        oro: {
          titulo: "Golden round",
          texto: (_n: number, f: string) => `Score ${f} points or more with your team in a single round.`,
        },
        regular: {
          titulo: "Consistency",
          texto: (n: number) => `Score 25 points or more in ${n} rounds in a row.`,
        },
        victorias: {
          titulo: "Winners",
          texto: (_n: number, f: string) => `Get ${f} wins with your lineup players.`,
        },
        capgig: {
          titulo: "Giant captain",
          texto: (n: number) =>
            `Have your captain win ${n} ${n === 1 ? "game" : "games"} against opponents rated 100 Elo above them or more.`,
        },
        cuatro: {
          titulo: "Four of six",
          texto: (n: number) =>
            `Have 4 or more of your lineup players win in the same round, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        pleno: {
          titulo: "Clean sweep",
          texto: (n: number) =>
            `Have all 6 lineup players win in the same round, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        fiel: {
          titulo: "Loyal player",
          texto: (n: number) => `Keep the same player in your lineup for ${n} rounds in a row.`,
        },
        pujas: {
          titulo: "Bid hunter",
          texto: (n: number) => `Win market bids for ${n} different players.`,
        },
        fichajes: {
          titulo: "Signer",
          texto: (n: number) => `Sign ${n} different players.`,
        },
        blindaje: {
          titulo: "Shielded",
          texto: (n: number) => `Shield ${n} different players.`,
        },
        subircl: {
          titulo: "Clause up",
          texto: (n: number) => `Raise the clause of ${n} different players.`,
        },
        clausulazo: {
          titulo: "Clause in hand",
          texto: (n: number) => `Pay the release clause of ${n} different players from other managers.`,
        },
        plusvalia: {
          titulo: "Capital gain",
          texto: (_n: number, f: string) =>
            `Earn ${f} M in total by selling players for more than you paid (to the market or the machine).`,
        },
        mejorop: {
          titulo: "Best deal",
          texto: (_n: number, f: string) =>
            `Earn ${f} M or more on a single sale compared with what you paid for the player.`,
        },
        top10: {
          titulo: "Top ten",
          texto: (n: number) =>
            `Finish in the top 10 of a public league round, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        podio: {
          titulo: "Podium",
          texto: (n: number) =>
            `Finish in the top 3 of a public league round, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        primero: {
          titulo: "At the top",
          texto: (n: number) =>
            `Finish first in a public league round, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        lider: {
          titulo: "Overall leader",
          texto: (n: number) =>
            `Lead the public league overall standings after a round, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        presencia: {
          titulo: "Presence",
          texto: (n: number) =>
            `End ${n} rounds in the top 10 of the public league overall standings.`,
        },
        valorplantilla: {
          titulo: "Millionaire squad",
          texto: (_n: number, f: string) =>
            `Present when the round starts (Saturday) a squad worth ${f} M in the public league.`,
        },
        caja: {
          titulo: "Strongbox",
          texto: (_n: number, f: string) => `Have ${f} M in cash in the public league when the round starts (Saturday).`,
        },
        estrella: {
          titulo: "Star player",
          texto: (_n: number, f: string) =>
            `Have a player worth ${f} M or more in your public league squad when the round starts (Saturday).`,
        },
        lujo: {
          titulo: "Luxury squad",
          texto: (n: number) => `Field ${n} players worth 100 M or more at the same time on Saturday in the public league, with a positive balance.`,
        },
        mercader: {
          titulo: "Trader",
          texto: (_n: number, f: string) =>
            `Sell players to other managers in private leagues for ${f} M in total (each sale counts for at most the player's release clause value).`,
        },
        ganajor: {
          titulo: "King of the league",
          texto: (n: number) =>
            `Win ${n} rounds in private leagues with at least 5 managers scoring.`,
        },
        rachadiaria: {
          titulo: "Streak",
          texto: (n: number) => `Reach a ${n}-day streak.`,
        },
        nivel: {
          titulo: "Master",
          texto: (n: number) => `Reach level ${n}.`,
        },
        veterano: {
          titulo: "Veteran",
          texto: (n: number) => `Open the app on ${n} different days.`,
        },
        cofres: {
          titulo: "Streak chests",
          texto: (n: number) => `Open ${n} streak chests.`,
        },
        semana: {
          titulo: "Perfect week",
          texto: (n: number) =>
            `Log in all 7 days of a week (Monday to Sunday) and complete the minigames each day: ${n} ${n === 1 ? "week" : "weeks"}.`,
        },
        diacompleto: {
          titulo: "Full day",
          texto: (n: number) => `Complete all 8 daily minigames on ${n} days.`,
        },
        seguidos: {
          titulo: "Never miss a day",
          texto: (n: number) => `Complete all 8 daily minigames ${n} days in a row.`,
        },
        cadena: {
          titulo: "Chain",
          texto: (n: number) =>
            `Chain ${n} correct answers in a row in one Higher or Lower game (the maximum is 20).`,
        },
        cadenaperf: {
          titulo: "Perfect chain",
          texto: (n: number) =>
            `Get all 20 correct answers in Higher or Lower in ${n} ${n === 1 ? "game" : "games"}.`,
        },
        m900v: {
          titulo: "Outstanding",
          texto: (n: number) =>
            `Score 900 points or more in a daily minigame game, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        m900j: {
          titulo: "Outstanding at everything",
          texto: (n: number) => `Score 900 points or more in ${n} different minigames.`,
        },
        perfn: {
          titulo: "No mistakes",
          texto: (n: number) =>
            `Play a perfect game (every round correct) in ${n} different minigames.`,
        },
        perfleyj: {
          titulo: "Flawless legend",
          texto: (n: number) =>
            `Play a perfect game in legend mode in ${n} different minigames.`,
        },
        perfleyv: {
          titulo: "Unbeatable legend",
          texto: (n: number) => `Play ${n} perfect games in legend mode.`,
        },
        rankmj: {
          titulo: "Top of the ranking",
          texto: (n: number) =>
            n === 1
              ? "Be number 1 in the overall minigames ranking (with 10 or more participants)."
              : `Reach position ${n} in the overall minigames ranking (with 10 or more participants).`,
        },
        primerodia: {
          titulo: "Daily winner",
          texto: (n: number) =>
            `Finish first in a minigame's daily ranking (with 5 or more players), ${n} ${n === 1 ? "time" : "times"}.`,
        },
        maraton: {
          titulo: "Marathon",
          texto: (_n: number, f: string) => `Play ${f} minigame games.`,
        },
        cofresmj: {
          titulo: "Daily chests",
          texto: (n: number) => `Open ${n} minigame chests.`,
        },
        m500x8: {
          titulo: "Even level",
          texto: (n: number) =>
            `Score 500 points or more in all 8 minigames on the same day, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        tt4: {
          titulo: "Almost all-round",
          texto: (n: number) =>
            `Score 800 points or more in 4 minigames on the same day, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        tt8: {
          titulo: "All-rounder",
          texto: (n: number) =>
            `Score 800 points or more in all 8 minigames on the same day, ${n} ${n === 1 ? "time" : "times"}.`,
        },
        alinea120: {
          titulo: "Galactic lineup",
          texto: (n: number) =>
            `Field ${n} starters worth 120 M or more at the same time on Saturday in the public league.`,
        },
        sinelo: {
          titulo: "Unrated squad",
          texto: (n: number) => `Have ${n} players without an Elo rating in your squad at the same time on Saturday.`,
        },
        sinelov: {
          titulo: "Unrated wins",
          texto: (n: number) =>
            `Win ${n} ${n === 1 ? "game" : "games"} with unrated players in your lineup.`,
        },
        puntosmj: {
          titulo: "Minigame points",
          texto: (_n: number, f: string) => `Score ${f} points in total in the minigames.`,
        },
      },
    },
  }
);
