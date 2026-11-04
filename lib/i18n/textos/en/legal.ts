import type { Seccion } from "../es/legal";
import { DIAS_CONSERVACION_CHAT as DIAS, DIAS_CONSERVACION_FORO as DIAS_FORO, MAX_DENUNCIAS_DIA_CHAT as MAX_DEN, RESPONSABLE as R } from "@/lib/legal/config";

const en: Seccion = {
  irALaApp: "Go to the app",
  soloCastellano: "This document is only available in Spanish.",

  infoBasicaTitulo: "Basic data protection information",
  infoBasica: [
    { etiqueta: "Controller", texto: `${R.razonSocial} (${R.nombreComercial}), Tax ID ${R.cif}.` },
    {
      etiqueta: "Purpose",
      texto:
        "Running the chess Fantasy league: selectable players, teams, scores and standings, and the accounts of registered users.",
    },
    {
      etiqueta: "Legal basis",
      texto:
        "Players: legitimate interest (Art. 6.1.f GDPR). Users: performance of the accepted Terms of Use (Art. 6.1.b GDPR). Optional communications: consent (Art. 6.1.a GDPR).",
    },
    {
      etiqueta: "Recipients",
      texto:
        "No data is disclosed to third parties unless required by law. Technology providers act as data processors.",
    },
    {
      etiqueta: "Rights",
      texto: `Access, rectification, erasure, objection, restriction and portability, by writing to ${R.email}. Complaints may be lodged with the Spanish Data Protection Agency (AEPD).`,
    },
    { etiqueta: "More information", texto: "In the full Privacy Policy." },
  ],
  masInfoAntes: "In the full ",
  masInfoEnlace: "Privacy Policy",
  masInfoDespues: ".",

  condicionesAntes: "I have read and accept the ",
  condicionesEnlace: "Terms of Use",
  condicionesDespues: " and the rules of Fantasy Beraun Bera.",
  privacidadAntes: "I have read the ",
  privacidadEnlace: "Privacy Policy",
  privacidadDespues:
    " and have been informed about the processing of my personal data and how to exercise my rights.",
  mayor14:
    "I declare that I am 14 or older. If I am under 14, my registration must be requested by my parent or guardian.",
  comunicaciones:
    "(Optional) I'd like to receive emails with news about Fantasy Beraun Bera and the activities of Beraun Bera Xake Taldea.",

  errorGuardar: "Couldn't save your acceptance.",
  errorComprobar: "Couldn't check whether you've accepted the terms.",
  reintentar: "Retry",
  antesDeContinuar: "Before you continue",
  gateIntro:
    "We've added Terms of Use and a Privacy Policy. To keep using Fantasy Beraun Bera, please read and accept them.",
  aceptarContinuar: "Accept and continue",
  noAcepto: "I don't accept — log out",

  gateIntroActualizacion:
    "We've updated the Terms of Use and the Privacy Policy. To keep using Fantasy Beraun Bera, please accept them again.",
  motivoTitulo: "We've added forums to the chat",
  motivoIntro: "That's why we've updated the terms. The essentials:",
  novedades: [
    "There's a text chat for each private league and another for the public league. Text and emojis only.",
    "There are rules about what you can write, a button to report messages, and moderation measures: deleting messages or stopping someone from writing for a while.",
    `Messages are deleted automatically after ${DIAS} days, and also if you delete your account.`,
    "You can mute the public chat so nobody can mention you.",
    `To prevent abuse, each person can send at most ${MAX_DEN} reports per day.`,
    `New: forums inside the chat, to open topics and discuss. Topics with no activity are deleted after ${DIAS_FORO} days.`,
    "New: emoji reactions, secret-ballot polls, and notices when you are mentioned or replied to.",
    "You can edit your messages for a short time after sending them.",
  ] as string[],
  verCambios: "You can read the full texts using the links below.",
};

export default en;
