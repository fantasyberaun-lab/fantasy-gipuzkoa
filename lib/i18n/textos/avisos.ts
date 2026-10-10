import { definirTextos } from "../definir";

// Pestaña Avisos: notificaciones de la liga y comunicados.
// Las frases de notificaciones llevan huecos {actor}, {jugador} e {importe}
// que la pantalla rellena con enlaces o negritas.
type Num = number | null;
type Txt = string | null;

const por = (imp: Num) => (imp !== null ? ` por ${imp} M` : "");
const deObj = (obj: Txt) => (obj ? ` (de ${obj})` : "");
const dondeEs = (j: Num) => (j != null ? `la jornada ${j}` : "la jornada");

const tan = (imp: Num) => (imp !== null ? ` ${imp} M-tan` : "");
const objEu = (obj: Txt) => (obj ? ` (${obj} taldearena)` : "");
const zenbat = (imp: Num) => (imp !== null ? `: ${imp} M` : "");

const forEn = (imp: Num) => (imp !== null ? ` for ${imp} M` : "");
const fromEn = (obj: Txt) => (obj ? ` (from ${obj})` : "");
const dondeEn = (j: Num) => (j != null ? `matchday ${j}` : "the matchday");

export default definirTextos(
  {
    cargando: "Cargando notificaciones…",
    ahoraMismo: "ahora mismo",
    nueva: "Nueva",
    nuevo: "Nuevo",
    avisos: "Avisos",
    comunicados: "Comunicados",
    sinComunicadosPublica:
      "No hay comunicados por ahora. Aquí aparecerán las novedades y avisos importantes.",
    sinComunicados: "No hay comunicados vigentes.",
    tusIngresos: "Tus ingresos",
    actividad: "Actividad de la liga",
    sinMovimientos: "Todavía no hay movimientos en tu liga.",
    // Etiquetas de las notificaciones
    tipos: {
      oferta_recibida: "Oferta",
      fichaje: "Fichaje",
      clausulazo: "Cláusula",
      clausula_subida: "Cláusula ↑",
      oferta_rechazada: "Oferta rechazada",
      venta: "Venta",
      actualizacion_elo: "Actualización de Elo",
      pago_jornada: "Ingreso",
    },
    // Etiquetas de los comunicados
    etiquetas: {
      importante: "Importante",
      actualizacion: "Actualización",
      novedad: "Novedad",
      aviso: "Aviso",
      mercado: "Mercado",
      torneo: "Torneo",
    },
    // Tarjeta de actualización de Elo
    importante: "Importante",
    eloTitulo: "Elo y valores actualizados",
    eloTexto: (n: number) =>
      `Se ha actualizado el Elo de ${n} jugadores con la nueva lista de la FIDE y su valor de mercado se ha reajustado.`,
    valorPlantilla: "Valor de tu plantilla:",
    ningunCambio: "Ninguno de tus jugadores ha cambiado de Elo.",
    conCambio: (n: number) => `${n} de tus jugadores han cambiado de Elo.`,
    mayorSubida: (nombre: string, delta: number) => ` Mayor subida: ${nombre} (▲ ${delta}).`,
    mayorBajada: (nombre: string, delta: number) => ` Mayor bajada: ${nombre} (▼ ${delta}).`,
    // Frases de las notificaciones
    ofertaRecibida: (imp: Num) =>
      `{actor} te ha hecho una oferta${imp !== null ? ` de ${imp} M` : ""} por {jugador}.`,
    fichajeYo: (imp: Num) => `Has fichado a {jugador}${por(imp)}.`,
    fichajeOtro: (imp: Num) => `{actor} ha fichado a {jugador}${por(imp)}.`,
    ventaYo: (imp: Num) => `Has vendido a {jugador}${por(imp)} al mercado.`,
    ventaOtro: (imp: Num) => `{actor} ha vendido a {jugador}${por(imp)} al mercado.`,
    clausulaSubida: (imp: Num) =>
      `Has subido la cláusula de {jugador}${imp !== null ? ` en ${imp} M` : ""}.`,
    ofertaRechazada: (imp: Num) => `Tu oferta por {jugador}${por(imp)} ha sido rechazada.`,
    pagoCorreccion: (jornada: Num, puntos: number) =>
      `Corrección de tus ingresos en ${dondeEs(jornada)}: {importe} (ahora cuentas ${puntos} puntos).`,
    pagoIngreso: (jornada: Num, puntos: number) =>
      `Has ingresado {importe} por tus ${puntos} puntos en ${dondeEs(jornada)}.`,
    clausulazoYo: (obj: Txt, imp: Num) =>
      `Has pagado la cláusula de {jugador}${deObj(obj)}${por(imp)}.`,
    clausulazoAMi: (imp: Num) => `{actor} te ha quitado a {jugador} pagando su cláusula${por(imp)}.`,
    clausulazoOtro: (obj: Txt, imp: Num) =>
      `{actor} ha pagado la cláusula de {jugador}${deObj(obj)}${por(imp)}.`,
  },
  {
    eu: {
      cargando: "Jakinarazpenak kargatzen…",
      ahoraMismo: "oraintxe",
      nueva: "Berria",
      nuevo: "Berria",
      avisos: "Abisuak",
      comunicados: "Komunikatuak",
      sinComunicadosPublica:
        "Oraingoz ez dago komunikaturik. Hemen agertuko dira berritasunak eta abisu garrantzitsuak.",
      sinComunicados: "Ez dago indarrean dagoen komunikaturik.",
      tusIngresos: "Zure diru-sarrerak",
      actividad: "Ligako jarduera",
      sinMovimientos: "Oraindik ez dago mugimendurik zure ligan.",
      tipos: {
        oferta_recibida: "Eskaintza",
        fichaje: "Fitxaketa",
        clausulazo: "Klausula",
        clausula_subida: "Klausula ↑",
        oferta_rechazada: "Eskaintza baztertua",
        venta: "Salmenta",
        actualizacion_elo: "Elo eguneratzea",
        pago_jornada: "Diru-sarrera",
      },
      etiquetas: {
        importante: "Garrantzitsua",
        actualizacion: "Eguneratzea",
        novedad: "Berritasuna",
        aviso: "Abisua",
        mercado: "Merkatua",
        torneo: "Txapelketa",
      },
      importante: "Garrantzitsua",
      eloTitulo: "Eloa eta balioak eguneratuta",
      eloTexto: (n: number) =>
        `FIDEren zerrenda berriarekin ${n} jokalariren Eloa eguneratu da, eta haien merkatu-balioa birdoitu da.`,
      valorPlantilla: "Zure plantillaren balioa:",
      ningunCambio: "Zure jokalarietako inoren Eloa ez da aldatu.",
      conCambio: (n: number) => `Zure ${n} jokalariren Eloa aldatu da.`,
      mayorSubida: (nombre: string, delta: number) =>
        ` Igoera handiena: ${nombre} (▲ ${delta}).`,
      mayorBajada: (nombre: string, delta: number) =>
        ` Jaitsiera handiena: ${nombre} (▼ ${delta}).`,
      ofertaRecibida: (imp: Num) =>
        `{actor} managerrak eskaintza bat egin dizu {jugador} jokalariagatik${imp !== null ? `: ${imp} M` : ""}.`,
      fichajeYo: (imp: Num) => `{jugador} fitxatu duzu${tan(imp)}.`,
      fichajeOtro: (imp: Num) => `{actor} managerrak {jugador} fitxatu du${tan(imp)}.`,
      ventaYo: (imp: Num) => `{jugador} merkatuari saldu diozu${tan(imp)}.`,
      ventaOtro: (imp: Num) => `{actor} managerrak {jugador} merkatuari saldu dio${tan(imp)}.`,
      clausulaSubida: (imp: Num) =>
        imp !== null
          ? `{jugador} jokalariaren klausula ${imp} M igo duzu.`
          : `{jugador} jokalariaren klausula igo duzu.`,
      ofertaRechazada: (imp: Num) =>
        `{jugador} jokalariagatik egin duzun eskaintza${imp !== null ? ` (${imp} M)` : ""} baztertu egin dute.`,
      pagoCorreccion: (jornada: Num, puntos: number) =>
        `${jornada != null ? `${jornada}. jardunaldiko` : "Jardunaldiko"} diru-sarreren zuzenketa: {importe} (orain ${puntos} puntu dituzu).`,
      pagoIngreso: (jornada: Num, puntos: number) =>
        `{importe} jaso dituzu ${jornada != null ? `${jornada}. jardunaldian` : "jardunaldian"} lortutako ${puntos} puntuengatik.`,
      clausulazoYo: (obj: Txt, imp: Num) =>
        `{jugador} jokalariaren klausula ordaindu duzu${objEu(obj)}${zenbat(imp)}.`,
      clausulazoAMi: (imp: Num) =>
        `{actor} managerrak {jugador} kendu dizu, haren klausula ordainduta${imp !== null ? ` (${imp} M)` : ""}.`,
      clausulazoOtro: (obj: Txt, imp: Num) =>
        `{actor} managerrak {jugador} jokalariaren klausula ordaindu du${objEu(obj)}${zenbat(imp)}.`,
    },
    en: {
      cargando: "Loading notifications…",
      ahoraMismo: "just now",
      nueva: "New",
      nuevo: "New",
      avisos: "Alerts",
      comunicados: "Announcements",
      sinComunicadosPublica:
        "No announcements for now. News and important notices will appear here.",
      sinComunicados: "No active announcements.",
      tusIngresos: "Your earnings",
      actividad: "League activity",
      sinMovimientos: "No activity in your league yet.",
      tipos: {
        oferta_recibida: "Offer",
        fichaje: "Signing",
        clausulazo: "Clause",
        clausula_subida: "Clause ↑",
        oferta_rechazada: "Offer rejected",
        venta: "Sale",
        actualizacion_elo: "Elo update",
        pago_jornada: "Earnings",
      },
      etiquetas: {
        importante: "Important",
        actualizacion: "Update",
        novedad: "News",
        aviso: "Notice",
        mercado: "Market",
        torneo: "Tournament",
      },
      importante: "Important",
      eloTitulo: "Elo and values updated",
      eloTexto: (n: number) =>
        `The Elo of ${n} players has been updated with the new FIDE list and their market value has been readjusted.`,
      valorPlantilla: "Your squad value:",
      ningunCambio: "None of your players' Elo has changed.",
      conCambio: (n: number) => `${n} of your players have changed Elo.`,
      mayorSubida: (nombre: string, delta: number) => ` Biggest rise: ${nombre} (▲ ${delta}).`,
      mayorBajada: (nombre: string, delta: number) => ` Biggest drop: ${nombre} (▼ ${delta}).`,
      ofertaRecibida: (imp: Num) =>
        `{actor} made you an offer${imp !== null ? ` of ${imp} M` : ""} for {jugador}.`,
      fichajeYo: (imp: Num) => `You signed {jugador}${forEn(imp)}.`,
      fichajeOtro: (imp: Num) => `{actor} signed {jugador}${forEn(imp)}.`,
      ventaYo: (imp: Num) => `You sold {jugador}${forEn(imp)} to the market.`,
      ventaOtro: (imp: Num) => `{actor} sold {jugador}${forEn(imp)} to the market.`,
      clausulaSubida: (imp: Num) =>
        `You raised {jugador}'s release clause${imp !== null ? ` by ${imp} M` : ""}.`,
      ofertaRechazada: (imp: Num) => `Your offer for {jugador}${forEn(imp)} was rejected.`,
      pagoCorreccion: (jornada: Num, puntos: number) =>
        `Correction to your earnings for ${dondeEn(jornada)}: {importe} (you now have ${puntos} points).`,
      pagoIngreso: (jornada: Num, puntos: number) =>
        `You earned {importe} for your ${puntos} points in ${dondeEn(jornada)}.`,
      clausulazoYo: (obj: Txt, imp: Num) =>
        `You paid {jugador}'s release clause${fromEn(obj)}${forEn(imp)}.`,
      clausulazoAMi: (imp: Num) =>
        `{actor} took {jugador} from you by paying their release clause${forEn(imp)}.`,
      clausulazoOtro: (obj: Txt, imp: Num) =>
        `{actor} paid {jugador}'s release clause${fromEn(obj)}${forEn(imp)}.`,
    },
  }
);
