import type { Ancho } from "../../definir";

// Inicio de sesión, registro y recuperación de cuenta (páginas y API).

const es = {
  // Cabecera de las páginas de acceso
  subtituloCabecera: "Campeonatos de Gipuzkoa",
  altEscudo: "Escudo Beraun",

  // Campos comunes
  email: "Email",
  contrasena: "Contraseña",
  nombreUsuario: "Nombre de usuario",
  mostrarContrasena: "Mostrar contraseña",
  ocultarContrasena: "Ocultar contraseña",
  errorConexion: "No se ha podido conectar. Inténtalo de nuevo.",
  irALogin: "Ir a iniciar sesión",

  // Login
  emailOUsuario: "Email o nombre de usuario",
  olvidada: "¿Has olvidado tu contraseña?",
  entrando: "Entrando...",
  entrar: "Entrar",
  sinCuenta: "¿No tienes cuenta todavía?",
  registrate: "Regístrate",
  errorLogin: "No se ha podido iniciar sesión.",

  // Recuperar
  recuperarIntro:
    "Escribe el email con el que te registraste y te enviaremos tu nombre de usuario y una contraseña temporal para entrar.",
  enviando: "Enviando...",
  enviarCorreo: "Enviarme el correo",
  volverLogin: "Volver a iniciar sesión",
  errorEnvio: "No se ha podido enviar el correo.",
  revisaCorreoFrase: "Revisa tu correo.",
  revisaCorreo: "Revisa tu correo",
  instruccionesTemporal:
    "Entra con la contraseña temporal y, una vez dentro, cámbiala desde Ajustes → Mi cuenta (el engranaje de arriba).",

  // Registro
  errorAceptacion:
    "Para registrarte tienes que aceptar las Condiciones de Uso, leer la Política de Privacidad y confirmar que tienes 14 años o más.",
  formatoNombreUsuario:
    "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).",
  errorComprobarNombre: "No se ha podido comprobar el nombre de usuario. Inténtalo de nuevo.",
  nombreEnUso: "Ese nombre de usuario ya está en uso.",
  revisaEmail: "Revisa tu email",
  confirmacionAntes: "Te hemos enviado un enlace de confirmación a",
  confirmacionDespues: ". Una vez confirmes la cuenta, ya puedes iniciar sesión.",
  creandoCuenta: "Creando cuenta...",
  crearCuenta: "Crear cuenta",
  yaTienesCuenta: "¿Ya tienes cuenta?",
  iniciaSesion: "Inicia sesión",

  // Mensajes de la API de login
  errorCredenciales: "Usuario/email o contraseña incorrectos.",
  peticionNoValida: "Petición no válida.",
  rellenaCampos: "Rellena todos los campos.",
  soloEmail: "Ahora mismo solo se puede iniciar sesión con el email.",
  errorLoginReintentar: "No se ha podido iniciar sesión. Inténtalo de nuevo.",
  confirmaEmail: "Tienes que confirmar tu email antes de iniciar sesión.",
  demasiadosIntentos: "Demasiados intentos. Espera un momento.",

  // Mensajes de la API de recuperación
  recuperarOk:
    "Si ese email está registrado, te hemos enviado un correo con tu nombre de usuario y una contraseña temporal. Si no lo ves en unos minutos, mira en spam.",
  recuperarNoDisponible:
    "La recuperación de cuenta no está disponible ahora mismo. Inténtalo más tarde.",
  emailInvalido: "Escribe un email válido.",
  demasiadasSolicitudes: (email: string) =>
    `Hay demasiadas solicitudes hoy. Inténtalo más tarde o escribe a ${email}.`,
  errorEnvioCorreo: "No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
