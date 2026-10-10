import { definirTextos } from "../definir";

// Buzón de sugerencias: formulario e historial (MenuAjustes) y el aviso de
// "sugerencia leída" en la pestaña Avisos. El panel de admin va en castellano.
export default definirTextos(
  {
    detalleMenu: "Ideas, errores o lo que quieras contarnos",
    intro:
      "Cuéntanos qué mejorarías, qué echas en falta o si algo no funciona. Lo leemos todo y, cuando lo leamos, te avisaremos en Avisos.",
    tipo: "Tipo",
    tipos: {
      sugerencia: "Sugerencia",
      error: "Error",
      otro: "Otro",
    },
    mensaje: "Mensaje",
    placeholder: {
      sugerencia: "Estaría bien poder…",
      error: "Qué ha pasado, en qué pantalla y qué esperabas que pasara…",
      otro: "Escribe aquí tu mensaje…",
    },
    sinDatosPersonales: "No incluyas datos personales (teléfono, dirección…).",
    caracteres: (n: number, max: number) => `${n}/${max}`,
    enviar: "Enviar",
    enviando: "Enviando…",
    enviada: "¡Gracias! Hemos recibido tu mensaje.",
    errores: {
      sesion: "Inicia sesión para enviar sugerencias.",
      vacia: "Escribe tu mensaje antes de enviarlo.",
      larga: "El mensaje es demasiado largo.",
      tipo: "Elige un tipo de mensaje.",
      limite: "Has enviado muchos mensajes hoy. Vuelve a intentarlo mañana.",
      red: "No se ha podido enviar. Inténtalo de nuevo.",
    },
    historial: "Tus mensajes",
    sinHistorial: "Todavía no has enviado ninguno.",
    pendiente: "Enviada",
    leida: "Leída",
    leidaEl: (fecha: string) => `Leída el ${fecha}`,
    respuesta: "Respuesta:",
    // Pestaña Avisos
    avisosTitulo: "Tus sugerencias",
    avisoEtiqueta: "Leída ✓",
    avisoTexto: (fecha: string) => `Hemos leído tu mensaje del ${fecha}. ¡Gracias por ayudarnos a mejorar!`,
    avisoRespuesta: "Respuesta del club:",
  },
  {
    eu: {
      detalleMenu: "Ideiak, akatsak edo kontatu nahi diguzun edozer",
      intro:
        "Kontaiguzu zer hobetuko zenukeen, zer faltan botatzen duzun edo zerbaitek huts egiten badu. Dena irakurtzen dugu eta, irakurtzean, Abisuetan jakinaraziko dizugu.",
      tipo: "Mota",
      tipos: {
        sugerencia: "Iradokizuna",
        error: "Akatsa",
        otro: "Bestelakoa",
      },
      mensaje: "Mezua",
      placeholder: {
        sugerencia: "Ondo legoke…",
        error: "Zer gertatu den, zein pantailatan eta zer espero zenuen…",
        otro: "Idatzi hemen zure mezua…",
      },
      sinDatosPersonales: "Ez sartu datu pertsonalik (telefonoa, helbidea…).",
      caracteres: (n: number, max: number) => `${n}/${max}`,
      enviar: "Bidali",
      enviando: "Bidaltzen…",
      enviada: "Eskerrik asko! Zure mezua jaso dugu.",
      errores: {
        sesion: "Hasi saioa iradokizunak bidaltzeko.",
        vacia: "Idatzi zure mezua bidali aurretik.",
        larga: "Mezua luzeegia da.",
        tipo: "Aukeratu mezu mota bat.",
        limite: "Gaur mezu asko bidali dituzu. Saiatu berriro bihar.",
        red: "Ezin izan da bidali. Saiatu berriro.",
      },
      historial: "Zure mezuak",
      sinHistorial: "Oraindik ez duzu bat ere bidali.",
      pendiente: "Bidalita",
      leida: "Irakurrita",
      leidaEl: (fecha: string) => `Irakurrita: ${fecha}`,
      respuesta: "Erantzuna:",
      avisosTitulo: "Zure iradokizunak",
      avisoEtiqueta: "Irakurrita ✓",
      avisoTexto: (fecha: string) =>
        `Zure mezua irakurri dugu (${fecha}). Eskerrik asko hobetzen laguntzeagatik!`,
      avisoRespuesta: "Klubaren erantzuna:",
    },
    en: {
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
    },
  }
);
