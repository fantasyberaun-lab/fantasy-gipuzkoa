import type { Ancho } from "../../definir";
import { DIAS_CONSERVACION_CHAT as DIAS, DIAS_CONSERVACION_FORO as DIAS_FORO, MAX_DENUNCIAS_DIA_CHAT as MAX_DEN } from "@/lib/legal/config";
import { INFO_BASICA } from "@/lib/legal/privacidad";

// Interfaz alrededor de los textos legales. Los documentos (condiciones y
// privacidad) NO se traducen: solo existen en castellano.
type FilaInfo = { etiqueta: string; texto: string };

const es = {
  irALaApp: "Ir a la aplicación",
  soloCastellano: "Este documento solo está disponible en castellano.",

  // Información básica RGPD. En castellano es la del documento original.
  infoBasicaTitulo: "Información básica sobre protección de datos",
  infoBasica: INFO_BASICA as FilaInfo[],
  // Última fila con enlace: "<antes><enlace><despues>"
  masInfoAntes: "En la ",
  masInfoEnlace: "Política de Privacidad",
  masInfoDespues: " completa.",

  // Casillas de aceptación: "<antes><enlace><despues>"
  condicionesAntes: "He leído y acepto las ",
  condicionesEnlace: "Condiciones de Uso",
  condicionesDespues: " y las reglas de Fantasy Beraun Bera.",
  privacidadAntes: "He leído la ",
  privacidadEnlace: "Política de Privacidad",
  privacidadDespues:
    " y he sido informado sobre el tratamiento de mis datos personales y sobre la forma de ejercer mis derechos.",
  mayor14:
    "Declaro tener 14 años o más. Si soy menor de 14 años, mi registro debe solicitarlo mi padre, madre o tutor.",
  comunicaciones:
    "(Opcional) Quiero recibir por correo electrónico novedades sobre Fantasy Beraun Bera y las actividades de Beraun Bera Xake Taldea.",

  // LegalGate
  errorGuardar: "No se ha podido guardar la aceptación.",
  errorComprobar: "No se ha podido comprobar la aceptación de las condiciones.",
  reintentar: "Reintentar",
  antesDeContinuar: "Antes de continuar",
  gateIntro:
    "Hemos incorporado unas Condiciones de Uso y una Política de Privacidad. Para seguir usando Fantasy Beraun Bera necesitamos que las leas y las aceptes.",
  aceptarContinuar: "Aceptar y continuar",
  noAcepto: "No acepto — cerrar sesión",

  // LegalGate cuando ya habías aceptado una versión anterior: se explica el motivo
  // del cambio para no tener que releerlo todo. Al subir otra vez la versión de los
  // textos legales, actualiza el motivo y las novedades.
  gateIntroActualizacion:
    "Hemos actualizado las Condiciones de Uso y la Política de Privacidad. Para seguir usando Fantasy Beraun Bera necesitamos que las aceptes de nuevo.",
  motivoTitulo: "Hemos añadido foros al chat",
  motivoIntro: "Por eso actualizamos las condiciones. Lo esencial:",
  novedades: [
    "Hay un chat de texto para cada liga privada y otro para la liga pública. Solo texto y emojis.",
    "Hay normas sobre lo que se puede escribir, un botón para denunciar mensajes y medidas de moderación: borrar mensajes o impedir escribir durante un tiempo.",
    `Los mensajes se borran solos a los ${DIAS} días, y también si eliminas tu cuenta.`,
    "Puedes silenciar el chat público para que nadie pueda mencionarte.",
    `Para evitar abusos, hay un máximo de ${MAX_DEN} denuncias al día por persona.`,
    `Nuevo: foros dentro del chat, para abrir temas y debatir. Los temas sin actividad se borran a los ${DIAS_FORO} días.`,
    "Nuevo: reacciones con emoji, encuestas con voto secreto y avisos cuando te mencionan o te responden.",
    "Puedes editar tus mensajes durante un rato tras enviarlos.",
  ] as string[],
  verCambios: "Puedes leer los textos completos en los enlaces de abajo.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
