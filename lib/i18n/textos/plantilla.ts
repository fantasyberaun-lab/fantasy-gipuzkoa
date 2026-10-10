import { definirTextos } from "../definir";

// Página Plantilla (y los motivos de bloqueo de titulares de lib/titulares).
export default definirTextos(
  {
    cargando: "Cargando tu plantilla…",
    sinEquipo:
      "No se ha encontrado un equipo Fantasy asociado a tu cuenta. Si acabas de registrarte, prueba a recargar la página en unos segundos.",
    // Resumen
    valorPlantilla: "Valor de la plantilla",
    jugadores: (n: number) => `${n} jugador${n === 1 ? "" : "es"}`,
    valorTitulares: "Valor de titulares",
    sinTitulares: "Sin titulares",
    titulares: (n: number) => `${n} titular${n === 1 ? "" : "es"}`,
    eloMedioPlantilla: "Elo medio plantilla",
    eloMedioTitulares: "Elo medio titulares",
    notaSinElo: (n: number) =>
      `Las medias de Elo no cuentan a ${n} jugador${n === 1 ? "" : "es"} sin Elo.`,
    // Ofertas recibidas. La frase va en trozos: {equipo}{trasEquipo}{importe M}{trasImporte}{jugador}{fin}
    ofertasRecibidas: "Ofertas recibidas",
    sinOfertas: "No hay ofertas recibidas.",
    ofertaTrasEquipo: " te ofrece ",
    ofertaTrasImporte: " por ",
    ofertaFin: ".",
    rechazar: "Rechazar",
    aceptar: "Aceptar",
    // Contadores
    titularesMismoTorneo: "Titulares en un mismo torneo",
    sinTitularesTorneo: "Sin titulares en ningún torneo",
    topeTorneo: "Límite alcanzado — no puedes poner más titulares de ese torneo.",
    titularesSeleccionados: "Titulares seleccionados",
    topeTitulares: "Límite alcanzado — no puedes poner más titulares.",
    jugadoresEnPlantilla: "Jugadores en plantilla",
    plantillaCompleta: "Plantilla completa.",
    // Vacía
    vacioPublica:
      "Todavía no tienes jugadores. Ve a la pestaña Mercado y ficha a los que quieras: todos están disponibles y el fichaje es inmediato.",
    vacioPrivada:
      "Todavía no tienes jugadores en tu plantilla. Ve a la pestaña Jugadores para pagar una cláusula, o espera a que haya jugadores libres en el Mercado.",
    // Motivos de bloqueo (lib/titulares)
    bloqueoMaxTitulares: (max: number) =>
      `Ya tienes ${max} titulares — pasa a suplente a otro primero.`,
    bloqueoMaxPorTorneo: (max: number, torneos: string) =>
      `Ya tienes ${max} titulares en ${torneos} — pasa a suplente a otro primero.`,
  },
  {
    eu: {
      cargando: "Zure plantilla kargatzen…",
      sinEquipo:
        "Ez da zure kontuari lotutako Fantasy talderik aurkitu. Erregistratu berri bazara, kargatu berriro orria segundo batzuk barru.",
      valorPlantilla: "Plantillaren balioa",
      jugadores: (n: number) => `${n} jokalari`,
      valorTitulares: "Titularren balioa",
      sinTitulares: "Titularrik gabe",
      titulares: (n: number) => `${n} titular`,
      eloMedioPlantilla: "Batez besteko Eloa, plantilla",
      eloMedioTitulares: "Batez besteko Eloa, titularrak",
      notaSinElo: (n: number) =>
        `Elo batez bestekoek ez dituzte kontuan hartzen Elorik gabeko ${n} jokalari.`,
      ofertasRecibidas: "Jasotako eskaintzak",
      sinOfertas: "Ez duzu eskaintzarik jaso.",
      ofertaTrasEquipo: " taldeak ",
      ofertaTrasImporte: " eskaintzen dizu ",
      ofertaFin: " jokalariagatik.",
      rechazar: "Ukatu",
      aceptar: "Onartu",
      titularesMismoTorneo: "Titularrak txapelketa berean",
      sinTitularesTorneo: "Ez duzu titularrik inongo txapelketatan",
      topeTorneo: "Mugara iritsi zara — ezin duzu txapelketa horretako titular gehiago jarri.",
      titularesSeleccionados: "Hautatutako titularrak",
      topeTitulares: "Mugara iritsi zara — ezin duzu titular gehiago jarri.",
      jugadoresEnPlantilla: "Jokalariak plantillan",
      plantillaCompleta: "Plantilla beteta.",
      vacioPublica:
        "Oraindik ez duzu jokalaririk. Joan Merkatua fitxara eta fitxatu nahi dituzunak: denak daude eskuragarri eta fitxaketa berehalakoa da.",
      vacioPrivada:
        "Oraindik ez duzu jokalaririk zure plantillan. Joan Jokalariak fitxara klausula bat ordaintzeko, edo itxaron Merkatuan jokalari libreak egon arte.",
      bloqueoMaxTitulares: (max: number) =>
        `Dagoeneko ${max} titular dituzu — pasatu beste bat ordezkora lehenago.`,
      bloqueoMaxPorTorneo: (max: number, torneos: string) =>
        `Dagoeneko ${max} titular dituzu hemen: ${torneos} — pasatu beste bat ordezkora lehenago.`,
    },
    en: {
      cargando: "Loading your squad…",
      sinEquipo:
        "We couldn't find a Fantasy team linked to your account. If you've just signed up, try reloading the page in a few seconds.",
      valorPlantilla: "Squad value",
      jugadores: (n: number) => `${n} player${n === 1 ? "" : "s"}`,
      valorTitulares: "Starters' value",
      sinTitulares: "No starters",
      titulares: (n: number) => `${n} starter${n === 1 ? "" : "s"}`,
      eloMedioPlantilla: "Avg Elo (squad)",
      eloMedioTitulares: "Avg Elo (starters)",
      notaSinElo: (n: number) =>
        `Elo averages leave out ${n} player${n === 1 ? "" : "s"} without Elo.`,
      ofertasRecibidas: "Offers received",
      sinOfertas: "No offers received.",
      ofertaTrasEquipo: " offers you ",
      ofertaTrasImporte: " for ",
      ofertaFin: ".",
      rechazar: "Reject",
      aceptar: "Accept",
      titularesMismoTorneo: "Starters in one tournament",
      sinTitularesTorneo: "No starters in any tournament",
      topeTorneo: "Limit reached — you can't add more starters from that tournament.",
      titularesSeleccionados: "Starters selected",
      topeTitulares: "Limit reached — you can't add more starters.",
      jugadoresEnPlantilla: "Players in squad",
      plantillaCompleta: "Squad full.",
      vacioPublica:
        "You don't have any players yet. Go to the Market tab and sign whoever you like: everyone is available and signings are instant.",
      vacioPrivada:
        "You don't have any players in your squad yet. Go to the Players tab to pay a release clause, or wait for free players to show up in the Market.",
      bloqueoMaxTitulares: (max: number) =>
        `You already have ${max} starters — move another one to the bench first.`,
      bloqueoMaxPorTorneo: (max: number, torneos: string) =>
        `You already have ${max} starters in ${torneos} — move another one to the bench first.`,
    },
  }
);
