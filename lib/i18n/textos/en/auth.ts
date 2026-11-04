import type { Seccion } from "../es/auth";

const en: Seccion = {
  subtituloCabecera: "Gipuzkoa Championships",
  altEscudo: "Beraun crest",

  email: "Email",
  contrasena: "Password",
  nombreUsuario: "Username",
  mostrarContrasena: "Show password",
  ocultarContrasena: "Hide password",
  errorConexion: "Couldn't connect. Please try again.",
  irALogin: "Go to log in",

  emailOUsuario: "Email or username",
  olvidada: "Forgot your password?",
  entrando: "Logging in...",
  entrar: "Log in",
  sinCuenta: "Don't have an account yet?",
  registrate: "Sign up",
  errorLogin: "Couldn't log in.",

  recuperarIntro:
    "Enter the email you signed up with and we'll send you your username and a temporary password to log in.",
  enviando: "Sending...",
  enviarCorreo: "Send me the email",
  volverLogin: "Back to log in",
  errorEnvio: "Couldn't send the email.",
  revisaCorreoFrase: "Check your email.",
  revisaCorreo: "Check your email",
  instruccionesTemporal:
    "Log in with the temporary password and, once inside, change it in Settings → My account (the gear icon at the top).",

  errorAceptacion:
    "To sign up you must accept the Terms of Use, read the Privacy Policy and confirm that you are 14 or older.",
  formatoNombreUsuario:
    "Usernames must be 3 to 20 characters long: letters, numbers, dot, hyphen or underscore (no spaces).",
  errorComprobarNombre: "Couldn't check the username. Please try again.",
  nombreEnUso: "That username is already taken.",
  revisaEmail: "Check your email",
  confirmacionAntes: "We've sent a confirmation link to",
  confirmacionDespues: ". Once you confirm your account, you can log in.",
  creandoCuenta: "Creating account...",
  crearCuenta: "Create account",
  yaTienesCuenta: "Already have an account?",
  iniciaSesion: "Log in",

  errorCredenciales: "Incorrect username/email or password.",
  peticionNoValida: "Invalid request.",
  rellenaCampos: "Please fill in all fields.",
  soloEmail: "Right now you can only log in with your email.",
  errorLoginReintentar: "Couldn't log in. Please try again.",
  confirmaEmail: "You need to confirm your email before logging in.",
  demasiadosIntentos: "Too many attempts. Please wait a moment.",

  recuperarOk:
    "If that email is registered, we've sent you an email with your username and a temporary password. If you don't see it within a few minutes, check your spam folder.",
  recuperarNoDisponible: "Account recovery isn't available right now. Please try again later.",
  emailInvalido: "Enter a valid email.",
  demasiadasSolicitudes: (email: string) =>
    `Too many requests today. Please try again later or write to ${email}.`,
  errorEnvioCorreo: "We couldn't send the email. Please try again in a few minutes.",
};

export default en;
