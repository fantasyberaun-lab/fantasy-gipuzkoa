import type { Seccion } from "../es/auth";

const eu: Seccion = {
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
};

export default eu;
