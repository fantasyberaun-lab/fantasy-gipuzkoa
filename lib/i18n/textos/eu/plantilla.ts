import type { Seccion } from "../es/plantilla";

const eu: Seccion = {
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
  seccionTitulares: "Titularrak",
  seccionSuplentes: "Ordezkoak",
  sinSuplentes: "Ez duzu ordezkorik.",
  resumenTitulares: "Titularrak",
  resumenPlantilla: "Plantilla",
  resumenValor: "Balioa",
  masDetalle: "Xehetasun gehiago",
  menosDetalle: "Xehetasun gutxiago",
  sinCapitan: "Oraindik ez duzu kapitainik aukeratu.",
  vacioPublica:
    "Oraindik ez duzu jokalaririk. Joan Merkatua fitxara eta fitxatu nahi dituzunak: denak daude eskuragarri eta fitxaketa berehalakoa da.",
  vacioPrivada:
    "Oraindik ez duzu jokalaririk zure plantillan. Joan Jokalariak fitxara klausula bat ordaintzeko, edo itxaron Merkatuan jokalari libreak egon arte.",
  bloqueoMaxTitulares: (max: number) =>
    `Dagoeneko ${max} titular dituzu — pasatu beste bat ordezkora lehenago.`,
  bloqueoMaxPorTorneo: (max: number, torneos: string) =>
    `Dagoeneko ${max} titular dituzu hemen: ${torneos} — pasatu beste bat ordezkora lehenago.`,
};

export default eu;
