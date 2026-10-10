import { definirTextos } from "../definir";

// Mercado (por tandas con pujas y el de la liga pública) y el buscador
// desplegable (BuscadorSelect).
export default definirTextos(
  {
    cargando: "Cargando el mercado…",
    titulo: "Mercado",
    tuSaldo: "Tu saldo:",
    pujaRegistrada: "Puja registrada.",
    pujaCancelada: "Puja cancelada. Tu saldo no se ha visto afectado.",
    pujasOcultas: "Pujas ocultas",
    pujasSeOcultanEn: "Las pujas se ocultan en",
    ocultas: "Ocultas",
    seActualizaEn: "El mercado se actualiza en",
    jugadoresEnTanda: (n: number) => `${n} jugadores en la tanda de hoy.`,
    avisoOcultas: "En las últimas 2 horas solo ves cuánta gente ha pujado, no los importes.",
    avisoAntesOcultar:
      "2 horas antes de que se actualice el mercado dejarán de verse las pujas de los demás: solo verás cuánta gente ha pujado, no el precio.",
    buscarJugador: "Buscar jugador por nombre...",
    ordenarValor: "Ordenar por valor",
    ordenarElo: "Ordenar por Elo",
    ordenarPuntos: "Ordenar por puntos",
    ordenarPujas: "Ordenar por número de pujas",
    ordenarNombre: "Ordenar por nombre",
    ordenarCategoria: "Ordenar por categoría",
    sinJugadores: "No hay jugadores en el mercado ahora mismo.",
    sinCoincidencias: (busqueda: string) => `No hay jugadores que coincidan con "${busqueda}".`,
    ptsTemporada: (n: number) => `${n} pts esta temporada`,
    numPujas: (n: number) => `${n} pujas`,
    tuPujaImporte: (importe: number) => `Tu puja: ${importe} M`,
    ocultarPuntos: "Ocultar puntos",
    verPuntosJornada: "Ver puntos por jornada",
    verPuntos: "Ver puntos",
    pujasPorEsteJugador: "Pujas por este jugador",
    nadiePorAhora: "Nadie ha pujado por ahora.",
    resumenPujasOcultas: (total: number, conMiPuja: boolean, otras: number) =>
      `${total} ${total === 1 ? "puja" : "pujas"} en total${
        conMiPuja ? ` (${otras === 0 ? "solo la tuya" : `la tuya y ${otras} más`})` : ""
      }. Los importes están ocultos hasta que se actualice el mercado.`,
    nadieTodavia: (minimo: number) =>
      `Nadie ha pujado todavía. Con la puja mínima (${minimo} M) te lo llevarías si nadie puja más.`,
    tuPuja: "Tu puja",
    laMasAlta: "la más alta",
    valorSubio: (valor: number, miImporte: number) =>
      `El valor del jugador ha subido a ${valor} M, pero tu puja de ${miImporte} M se mantiene. Compite con su importe: si alguien puja ahora, tendrá que llegar al valor actual.`,
    etiquetaImporte: (mejorar: boolean, minimo: number) =>
      `${mejorar ? "Mejorar tu puja" : "Importe de la puja"} (M) — mínimo ${minimo} M`,
    pujar: "Pujar",
    cancelarMiPuja: (importe: number) => `Cancelar mi puja (${importe} M)`,
    // Liga pública
    saldoYPlantilla: (saldo: number, n: number, max: number) =>
      `Saldo: ${saldo} M · Plantilla: ${n}/${max}`,
    explicacionPublica:
      "Liga pública: todos los jugadores están siempre disponibles y cualquiera puede tener al mismo jugador. Comprar y vender es inmediato, al valor de mercado.",
    buscarJugadorClub: "Buscar jugador o club...",
    valorDesc: "Valor: de mayor a menor",
    valorAsc: "Valor: de menor a mayor",
    eloDesc: "Elo: de mayor a menor",
    eloAsc: "Elo: de menor a mayor",
    todasCategorias: "Todas las categorías",
    categoriaN: (n: number) => `${n}ª categoría`,
    todosJugadores: "Todos los jugadores",
    soloMiPlantilla: "Solo mi plantilla",
    soloAsequibles: "Solo los que puedo pagar",
    sinJugadoresLiga: "Todavía no hay jugadores cargados en la liga.",
    sinCoincidenciasFiltros: "No hay jugadores que coincidan con los filtros.",
    plantillaLlena: (max: number) =>
      `Tu plantilla ya tiene los ${max} jugadores permitidos: vende a alguno primero.`,
    teFaltan: (falta: number) => `Te faltan ${falta} M para poder ficharlo.`,
    enTuPlantilla: "En tu plantilla",
    fichadoPor: (valor: number) => `Fichado por ${valor} M.`,
    vendidoPor: (valor: number) => `Vendido por ${valor} M.`,
    vendiendo: "Vendiendo…",
    siVenderPor: (valor: number) => `Sí, vender por ${valor} M`,
    venderPor: (valor: number) => `Vender por ${valor} M`,
    fichando: "Fichando…",
    ficharPor: (valor: number) => `Fichar por ${valor} M`,
    mostrarMas: (restantes: number) => `Mostrar más (${restantes} restantes)`,
    // Mismo texto que MENSAJE_CLAUSULAZOS_CERRADOS de lib/mercadoCountdown.ts.
    clausulazosCerrados:
      "Los clausulazos están cerrados: no se pueden hacer desde el viernes a las 16:00 hasta el sábado a las 18:00.",
    // BuscadorSelect
    buscar: "Buscar…",
    sinResultados: "Sin resultados",
    yMas: (n: number) => `Y ${n} más — sigue escribiendo para acotar.`,
  },
  {
    eu: {
      cargando: "Merkatua kargatzen…",
      titulo: "Merkatua",
      tuSaldo: "Zure saldoa:",
      pujaRegistrada: "Poxa erregistratu da.",
      pujaCancelada: "Poxa bertan behera utzi da. Zure saldoak ez du aldaketarik izan.",
      pujasOcultas: "Poxak ezkutuan",
      pujasSeOcultanEn: "Poxak ezkutatu arte",
      ocultas: "Ezkutuan",
      seActualizaEn: "Merkatua eguneratu arte",
      jugadoresEnTanda: (n: number) => `${n} jokalari gaurko txandan.`,
      avisoOcultas:
        "Azken 2 orduetan zenbat jendek poxatu duen bakarrik ikusten duzu, ez zenbatekoak.",
      avisoAntesOcultar:
        "Merkatua eguneratu baino 2 ordu lehenago, besteen poxak ez dira gehiago ikusiko: zenbat jendek poxatu duen bakarrik ikusiko duzu, ez prezioa.",
      buscarJugador: "Bilatu jokalaria izenez...",
      ordenarValor: "Ordenatu balioaren arabera",
      ordenarElo: "Ordenatu Eloaren arabera",
      ordenarPuntos: "Ordenatu puntuen arabera",
      ordenarPujas: "Ordenatu poxa kopuruaren arabera",
      ordenarNombre: "Ordenatu izenaren arabera",
      ordenarCategoria: "Ordenatu kategoriaren arabera",
      sinJugadores: "Une honetan ez dago jokalaririk merkatuan.",
      sinCoincidencias: (busqueda: string) =>
        `Ez dago "${busqueda}" bilaketarekin bat datorren jokalaririk.`,
      ptsTemporada: (n: number) => `${n} puntu denboraldi honetan`,
      numPujas: (n: number) => `${n} poxa`,
      tuPujaImporte: (importe: number) => `Zure poxa: ${importe} M`,
      ocultarPuntos: "Ezkutatu puntuak",
      verPuntosJornada: "Ikusi puntuak jardunaldika",
      verPuntos: "Ikusi puntuak",
      pujasPorEsteJugador: "Jokalari honen poxak",
      nadiePorAhora: "Oraingoz inork ez du poxatu.",
      resumenPujasOcultas: (total: number, conMiPuja: boolean, otras: number) =>
        `Guztira ${total} poxa${
          conMiPuja ? ` (${otras === 0 ? "zurea bakarrik" : `zurea eta beste ${otras}`})` : ""
        }. Zenbatekoak ezkutuan daude merkatua eguneratu arte.`,
      nadieTodavia: (minimo: number) =>
        `Oraindik inork ez du poxatu. Gutxieneko poxarekin (${minimo} M) zuretzat izango litzateke, inork gehiago poxatzen ez badu.`,
      tuPuja: "Zure poxa",
      laMasAlta: "altuena",
      valorSubio: (valor: number, miImporte: number) =>
        `Jokalariaren balioa ${valor} M-ra igo da, baina zure ${miImporte} M-ko poxak bere horretan jarraitzen du. Bere zenbatekoarekin lehiatzen da: orain norbaitek poxatzen badu, egungo baliora iritsi beharko du.`,
      etiquetaImporte: (mejorar: boolean, minimo: number) =>
        `${mejorar ? "Hobetu zure poxa" : "Poxaren zenbatekoa"} (M) — gutxienez ${minimo} M`,
      pujar: "Poxatu",
      cancelarMiPuja: (importe: number) => `Kendu nire poxa (${importe} M)`,
      saldoYPlantilla: (saldo: number, n: number, max: number) =>
        `Saldoa: ${saldo} M · Plantilla: ${n}/${max}`,
      explicacionPublica:
        "Liga publikoa: jokalari guztiak beti daude eskuragarri, eta edonork izan dezake jokalari bera. Erostea eta saltzea berehalakoa da, merkatu-balioan.",
      buscarJugadorClub: "Bilatu jokalaria edo kluba...",
      valorDesc: "Balioa: handienetik txikienera",
      valorAsc: "Balioa: txikienetik handienera",
      eloDesc: "Elo: handienetik txikienera",
      eloAsc: "Elo: txikienetik handienera",
      todasCategorias: "Kategoria guztiak",
      categoriaN: (n: number) => `${n}. kategoria`,
      todosJugadores: "Jokalari guztiak",
      soloMiPlantilla: "Nire plantilla bakarrik",
      soloAsequibles: "Ordain ditzakedanak bakarrik",
      sinJugadoresLiga: "Oraindik ez dago jokalaririk kargatuta ligan.",
      sinCoincidenciasFiltros: "Ez dago iragazkiekin bat datorren jokalaririk.",
      plantillaLlena: (max: number) =>
        `Zure plantillak baimendutako ${max} jokalariak ditu dagoeneko: saldu bat lehenik.`,
      teFaltan: (falta: number) => `${falta} M falta zaizkizu fitxatu ahal izateko.`,
      enTuPlantilla: "Zure plantillan",
      fichadoPor: (valor: number) => `Fitxatuta, ${valor} M-tan.`,
      vendidoPor: (valor: number) => `Salduta, ${valor} M-tan.`,
      vendiendo: "Saltzen…",
      siVenderPor: (valor: number) => `Bai, saldu ${valor} M-tan`,
      venderPor: (valor: number) => `Saldu ${valor} M-tan`,
      fichando: "Fitxatzen…",
      ficharPor: (valor: number) => `Fitxatu ${valor} M-tan`,
      mostrarMas: (restantes: number) => `Erakutsi gehiago (${restantes} falta)`,
      clausulazosCerrados:
        "Klausulazoak itxita daude: ezin dira egin ostiraleko 16:00etatik larunbateko 18:00ak arte.",
      buscar: "Bilatu…",
      sinResultados: "Emaitzarik ez",
      yMas: (n: number) => `Eta beste ${n} — jarraitu idazten zehazteko.`,
    },
    en: {
      cargando: "Loading the market…",
      titulo: "Market",
      tuSaldo: "Your balance:",
      pujaRegistrada: "Bid placed.",
      pujaCancelada: "Bid cancelled. Your balance hasn't been affected.",
      pujasOcultas: "Bids hidden",
      pujasSeOcultanEn: "Bids hidden in",
      ocultas: "Hidden",
      seActualizaEn: "Market updates in",
      jugadoresEnTanda: (n: number) =>
        `${n} ${n === 1 ? "player" : "players"} on the market today.`,
      avisoOcultas: "In the last 2 hours you only see how many people have bid, not the amounts.",
      avisoAntesOcultar:
        "2 hours before the market updates, other managers' bids are hidden: you'll only see how many people have bid, not the price.",
      buscarJugador: "Search player by name...",
      ordenarValor: "Sort by value",
      ordenarElo: "Sort by Elo",
      ordenarPuntos: "Sort by points",
      ordenarPujas: "Sort by number of bids",
      ordenarNombre: "Sort by name",
      ordenarCategoria: "Sort by category",
      sinJugadores: "There are no players on the market right now.",
      sinCoincidencias: (busqueda: string) => `No players match "${busqueda}".`,
      ptsTemporada: (n: number) => `${n} pts this season`,
      numPujas: (n: number) => `${n} ${n === 1 ? "bid" : "bids"}`,
      tuPujaImporte: (importe: number) => `Your bid: ${importe} M`,
      ocultarPuntos: "Hide points",
      verPuntosJornada: "View points per matchday",
      verPuntos: "View points",
      pujasPorEsteJugador: "Bids for this player",
      nadiePorAhora: "No one has bid yet.",
      resumenPujasOcultas: (total: number, conMiPuja: boolean, otras: number) =>
        `${total} ${total === 1 ? "bid" : "bids"} in total${
          conMiPuja ? ` (${otras === 0 ? "only yours" : `yours and ${otras} more`})` : ""
        }. Amounts are hidden until the market updates.`,
      nadieTodavia: (minimo: number) =>
        `No bids yet. With the minimum bid (${minimo} M) you'd get the player if no one bids more.`,
      tuPuja: "Your bid",
      laMasAlta: "highest",
      valorSubio: (valor: number, miImporte: number) =>
        `The player's value has risen to ${valor} M, but your ${miImporte} M bid still stands. It competes at its amount: anyone bidding now must reach the current value.`,
      etiquetaImporte: (mejorar: boolean, minimo: number) =>
        `${mejorar ? "Raise your bid" : "Bid amount"} (M) — minimum ${minimo} M`,
      pujar: "Bid",
      cancelarMiPuja: (importe: number) => `Cancel my bid (${importe} M)`,
      saldoYPlantilla: (saldo: number, n: number, max: number) =>
        `Balance: ${saldo} M · Squad: ${n}/${max}`,
      explicacionPublica:
        "Public league: every player is always available and anyone can own the same player. Buying and selling is instant, at market value.",
      buscarJugadorClub: "Search player or club...",
      valorDesc: "Value: high to low",
      valorAsc: "Value: low to high",
      eloDesc: "Elo: high to low",
      eloAsc: "Elo: low to high",
      todasCategorias: "All categories",
      categoriaN: (n: number) => `Category ${n}`,
      todosJugadores: "All players",
      soloMiPlantilla: "My squad only",
      soloAsequibles: "Only ones I can afford",
      sinJugadoresLiga: "No players have been loaded into the league yet.",
      sinCoincidenciasFiltros: "No players match the filters.",
      plantillaLlena: (max: number) =>
        `Your squad already has the ${max} players allowed: sell one first.`,
      teFaltan: (falta: number) => `You need ${falta} M more to sign this player.`,
      enTuPlantilla: "In your squad",
      fichadoPor: (valor: number) => `Signed for ${valor} M.`,
      vendidoPor: (valor: number) => `Sold for ${valor} M.`,
      vendiendo: "Selling…",
      siVenderPor: (valor: number) => `Yes, sell for ${valor} M`,
      venderPor: (valor: number) => `Sell for ${valor} M`,
      fichando: "Signing…",
      ficharPor: (valor: number) => `Sign for ${valor} M`,
      mostrarMas: (restantes: number) => `Show more (${restantes} left)`,
      clausulazosCerrados:
        "Clause buyouts are closed: they can't be made from Friday 16:00 until Saturday 18:00.",
      buscar: "Search…",
      sinResultados: "No results",
      yMas: (n: number) => `And ${n} more — keep typing to narrow it down.`,
    },
  }
);
