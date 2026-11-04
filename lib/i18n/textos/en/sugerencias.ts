import type { Seccion } from "../es/sugerencias";

const en: Seccion = {
  detalleMenu: "Ideas, bugs or anything you want to tell us",
  intro:
    "Tell us what you'd improve, what you miss or if something isn't working. We read everything and we'll let you know in Alerts once we've read it.",
  tipo: "Type",
  tipos: {
    sugerencia: "Suggestion",
    error: "Bug",
    otro: "Other",
  },
  mensaje: "Message",
  placeholder: {
    sugerencia: "It would be great if…",
    error: "What happened, on which screen and what you expected…",
    otro: "Write your message here…",
  },
  sinDatosPersonales: "Don't include personal details (phone, address…).",
  caracteres: (n: number, max: number) => `${n}/${max}`,
  enviar: "Send",
  enviando: "Sending…",
  enviada: "Thanks! We've received your message.",
  errores: {
    sesion: "Log in to send suggestions.",
    vacia: "Write your message before sending it.",
    larga: "The message is too long.",
    tipo: "Choose a message type.",
    limite: "You've sent a lot of messages today. Try again tomorrow.",
    red: "Couldn't send it. Please try again.",
  },
  historial: "Your messages",
  sinHistorial: "You haven't sent any yet.",
  pendiente: "Sent",
  leida: "Read",
  leidaEl: (fecha: string) => `Read on ${fecha}`,
  respuesta: "Reply:",
  avisosTitulo: "Your suggestions",
  avisoEtiqueta: "Read ✓",
  avisoTexto: (fecha: string) =>
    `We've read your message from ${fecha}. Thanks for helping us improve!`,
  avisoRespuesta: "Reply from the club:",
};

export default en;
