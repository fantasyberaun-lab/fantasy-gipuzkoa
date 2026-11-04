import type { Ancho } from "../../definir";

// Buzón de sugerencias: formulario e historial (MenuAjustes) y el aviso de
// "sugerencia leída" en la pestaña Avisos. El panel de admin va en castellano.

const es = {
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
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
