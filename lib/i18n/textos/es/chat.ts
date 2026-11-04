import type { Ancho } from "../../definir";
import { DIAS_CONSERVACION_CHAT } from "@/lib/legal/config";

// Chat por liga (ver 0089_chat.sql). El panel de administración sigue en castellano
// (como el resto del admin), por eso sus textos no están aquí.

const es = {
  titulo: "Chat",
  chatDe: (liga: string) => `Chat de ${liga}`,
  chatPublico: "Chat de la liga pública",
  cargando: "Cargando el chat…",
  errorCarga: "No se ha podido cargar el chat.",
  reintentar: "Reintentar",
  sinLiga: "Elige una liga para ver su chat.",
  soloLectura: "Ves este chat como administrador; no juegas en esta liga.",
  vacio: "Todavía no hay mensajes. ¡Rompe el hielo!",
  verAnteriores: "Ver mensajes anteriores",
  cargandoAnteriores: "Cargando…",
  nuevosMensajes: (n: number) => `${n} mensaje${n === 1 ? "" : "s"} nuevo${n === 1 ? "" : "s"}`,
  hoy: "Hoy",
  ayer: "Ayer",
  tu: "Tú",
  // Redacción
  placeholder: "Escribe un mensaje…",
  enviar: "Enviar",
  pista: "Solo texto y emojis · @ para mencionar",
  emojis: "Emojis",
  mencionBuscando: "Buscando…",
  mencionSinResultados: "Nadie con ese nombre",
  mencionIgnorada: "Algún mencionado no recibirá el aviso porque tiene silenciado el chat público.",
  // Silenciar menciones del chat público (el interruptor se ve en todos los chats)
  silenciar: "Silenciar menciones",
  silenciarDesdePrivada: "Silenciar menciones del chat público",
  silenciarAyuda:
    "Si lo activas, nadie podrá mencionarte en el chat público y no recibirás avisos de menciones de ese chat.",
  silenciadoAviso: "Tienes las menciones silenciadas: nadie puede mencionarte aquí.",
  // Acciones sobre un mensaje
  acciones: "Acciones del mensaje",
  borrar: "Borrar",
  editar: "Editar",
  editado: "editado",
  guardarEdicion: "Guardar",
  editando: "Editando mensaje",
  errorEditarPlazo: (min: number) => `Solo se puede editar durante los ${min} minutos siguientes a enviarlo.`,
  mensajeEditado: "Mensaje editado.",
  denunciar: "Denunciar",
  confirmarBorrar: "¿Borrar este mensaje?",
  confirmarDenunciar: "¿Denunciar este mensaje a los administradores?",
  denunciaEnviada: "Denuncia enviada. Gracias por avisar.",
  mencionTuya: "Te han mencionado",
  // Primera vez
  normasTitulo: "Normas del chat",
  normasTexto: `Aquí se habla de ajedrez y del juego, con respeto. Solo texto y emojis. No compartas datos personales (tuyos ni de otros) y no hables mal de jugadores concretos. Tus mensajes los ven otras personas y se borran a los ${DIAS_CONSERVACION_CHAT} días. Si ves algo que no está bien, pulsa «Denunciar».`,
  normasEntendido: "Entendido",
  // Restricciones
  baneado: (hasta: string) => `No puedes escribir en este chat hasta el ${hasta}.`,
  baneoMotivo: (motivo: string) => `Motivo: ${motivo}`,
  nivelBloqueo: (n: number) => `Necesitas el nivel ${n} para escribir en el chat público.`,
  // Errores al enviar (códigos de chat_enviar)
  errores: {
    sesion: "Vuelve a iniciar sesión.",
    permiso: "No puedes editar este mensaje.",
    no_existe: "Ese mensaje ya no existe.",
    plazo: "Ya ha pasado el tiempo para editar este mensaje.",
    denunciado: "Este mensaje tiene una denuncia pendiente y no se puede editar.",
    no_miembro: "No eres miembro de esta liga.",
    bloqueado: "Ahora mismo no puedes escribir en este chat.",
    nivel: "No tienes el nivel necesario para escribir aquí.",
    vacia: "El mensaje está vacío.",
    larga: "El mensaje es demasiado largo.",
    enlace: "No se admiten enlaces, direcciones web, correos ni teléfonos.",
    vetada: "Ese mensaje no cumple las normas del chat.",
    rapido: "Más despacio: espera un momento entre mensajes.",
    limite: "Demasiados mensajes en un minuto. Espera un poco.",
    repetido: "Ya has enviado ese mensaje hace un momento.",
    menciones: "Puedes mencionar como máximo a 3 personas por mensaje.",
    red: "No se ha podido enviar. Inténtalo de nuevo.",
  },
  errorLarga: (max: number) => `El mensaje no puede superar los ${max} caracteres.`,
  errorDenuncia: {
    sesion: "Vuelve a iniciar sesión.",
    no_existe: "Ese mensaje ya no existe.",
    no_miembro: "No eres miembro de esta liga.",
    propio: "No puedes denunciar tu propio mensaje.",
    repetida: "Ya has denunciado ese mensaje.",
    limite: "Has llegado al máximo de denuncias de hoy.",
    red: "No se ha podido enviar la denuncia. Inténtalo de nuevo.",
  },
  errorBorrar: "No se ha podido borrar el mensaje.",
  // Campana de la cabecera (los avisos)
  campana: (n: number) => (n > 0 ? `Avisos, ${n} sin leer` : "Avisos"),
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
