import { definirTextos } from "../definir";

// Inicio de sesión, registro y recuperación de cuenta (páginas y API).
export default definirTextos(
  {
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
  },
  {
    eu: {
      subtituloCabecera: "Gipuzkoako txapelketak",
      altEscudo: "Beraun armarria",

      email: "Helbide elektronikoa",
      contrasena: "Pasahitza",
      nombreUsuario: "Erabiltzaile-izena",
      mostrarContrasena: "Erakutsi pasahitza",
      ocultarContrasena: "Ezkutatu pasahitza",
      errorConexion: "Ezin izan da konektatu. Saiatu berriro.",
      irALogin: "Joan saioa hastera",

      emailOUsuario: "Helbide elektronikoa edo erabiltzaile-izena",
      olvidada: "Pasahitza ahaztu duzu?",
      entrando: "Sartzen...",
      entrar: "Sartu",
      sinCuenta: "Ez duzu konturik oraindik?",
      registrate: "Erregistratu",
      errorLogin: "Ezin izan da saioa hasi.",

      recuperarIntro:
        "Idatzi erregistratzeko erabili zenuen helbide elektronikoa, eta zure erabiltzaile-izena eta sartzeko aldi baterako pasahitz bat bidaliko dizkizugu.",
      enviando: "Bidaltzen...",
      enviarCorreo: "Bidali mezua",
      volverLogin: "Itzuli saioa hastera",
      errorEnvio: "Ezin izan da mezua bidali.",
      revisaCorreoFrase: "Begiratu zure posta.",
      revisaCorreo: "Begiratu zure posta",
      instruccionesTemporal:
        "Sartu aldi baterako pasahitzarekin eta, barruan zaudenean, alda ezazu Ezarpenak → Nire kontua ataletik (goiko engranajea).",

      errorAceptacion:
        "Erregistratzeko, Erabilera-baldintzak onartu, Pribatutasun-politika irakurri eta 14 urte edo gehiago dituzula baieztatu behar duzu.",
      formatoNombreUsuario:
        "Erabiltzaile-izenak 3 eta 20 karaktere artean izan behar ditu: letrak, zenbakiak, puntua, marratxoa edo azpimarra (zuriunerik gabe).",
      errorComprobarNombre: "Ezin izan da erabiltzaile-izena egiaztatu. Saiatu berriro.",
      nombreEnUso: "Erabiltzaile-izen hori hartuta dago.",
      revisaEmail: "Begiratu zure posta",
      confirmacionAntes: "Berrespen-esteka bat bidali dizugu helbide honetara:",
      confirmacionDespues: ". Kontua berresten duzunean, saioa has dezakezu.",
      creandoCuenta: "Kontua sortzen...",
      crearCuenta: "Kontua sortu",
      yaTienesCuenta: "Baduzu konturik?",
      iniciaSesion: "Hasi saioa",

      errorCredenciales: "Erabiltzailea/helbide elektronikoa edo pasahitza ez da zuzena.",
      peticionNoValida: "Eskaera baliogabea.",
      rellenaCampos: "Bete eremu guztiak.",
      soloEmail: "Une honetan helbide elektronikoarekin bakarrik has daiteke saioa.",
      errorLoginReintentar: "Ezin izan da saioa hasi. Saiatu berriro.",
      confirmaEmail: "Helbide elektronikoa berretsi behar duzu saioa hasi aurretik.",
      demasiadosIntentos: "Saiakera gehiegi. Itxaron pixka bat.",

      recuperarOk:
        "Helbide elektroniko hori erregistratuta badago, mezu bat bidali dizugu zure erabiltzaile-izenarekin eta aldi baterako pasahitz batekin. Minutu batzuetan ikusten ez baduzu, begiratu spam karpetan.",
      recuperarNoDisponible:
        "Kontua berreskuratzeko aukera ez dago erabilgarri une honetan. Saiatu geroago.",
      emailInvalido: "Idatzi baliozko helbide elektroniko bat.",
      demasiadasSolicitudes: (email: string) =>
        `Gaur eskaera gehiegi egon dira. Saiatu geroago edo idatzi ${email} helbidera.`,
      errorEnvioCorreo: "Ezin izan dugu mezua bidali. Saiatu berriro minutu batzuk barru.",
    },
    en: {
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
    },
  }
);
