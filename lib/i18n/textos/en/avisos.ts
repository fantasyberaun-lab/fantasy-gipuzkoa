import type { Seccion } from "../es/avisos";

// Pestaña Avisos: notificaciones de la liga y comunicados.
// Las frases de notificaciones llevan huecos {actor}, {jugador} e {importe}
// que la pantalla rellena con enlaces o negritas.
type Num = number | null;

type Txt = string | null;

const forEn = (imp: Num) => (imp !== null ? ` for ${imp} M` : "");

const fromEn = (obj: Txt) => (obj ? ` (from ${obj})` : "");

const dondeEn = (j: Num) => (j != null ? `matchday ${j}` : "the matchday");

const en: Seccion = {
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
  foros: "Forums",
  foroMencion: "{actor} mentioned you in the topic {titulo}.",
  foroRespuesta: "{actor} replied in the topic {titulo}.",
  foroTemaSinDatos: "a forum topic",
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
    otro: "Notice",
    sancion: "Penalty",
    advertencia: "Warning",
    expulsion: "Expulsion",
    nuevo_admin: "Admin",
    oferta_maquina: "Offer",
    foro_mencion: "Mention",
    foro_respuesta: "Reply",
  },
  avisoGenerico: "News in your league.",
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
  sancionPuntos: (n: number) => `The admin has penalised {objetivo} with −${n} points. Reason: {motivo}`,
  sancionPuntosAMi: (n: number) => `The admin has penalised you with −${n} points. Reason: {motivo}`,
  sancionMillones: (n: number) => `The admin has penalised {objetivo} with −${n} M. Reason: {motivo}`,
  sancionMillonesAMi: (n: number) => `The admin has penalised you with −${n} M. Reason: {motivo}`,
  advertencia: "The admin has warned {objetivo}. Reason: {motivo}",
  advertenciaAMi: "The admin has sent you a warning. Reason: {motivo}",
  expulsion: "The admin has expelled {objetivo} from the league. Reason: {motivo}",
  nuevoAdmin: "{objetivo} is now the league admin.",
  ofertaMaquina: "The machine has made an offer for the players you have for sale. Accept or reject them in your Squad.",
  nuevoAdminAMi: "You're now the league admin: you can manage it from Standings → Manage league.",
  clausulazoYo: (obj: Txt, imp: Num) =>
    `You paid {jugador}'s release clause${fromEn(obj)}${forEn(imp)}.`,
  clausulazoAMi: (imp: Num) =>
    `{actor} took {jugador} from you by paying their release clause${forEn(imp)}.`,
  clausulazoOtro: (obj: Txt, imp: Num) =>
    `{actor} paid {jugador}'s release clause${fromEn(obj)}${forEn(imp)}.`,
};

export default en;
