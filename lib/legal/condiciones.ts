import {
  FECHA_CONDICIONES,
  RESPONSABLE as R,
  VERSION_CONDICIONES,
} from "./config";
import { destacado, lineas, p, ul, type Seccion } from "./tipos";

export const TITULO_CONDICIONES = "Condiciones de uso";
export const SUBTITULO_CONDICIONES =
  "Fantasy Beraun Bera — Liga Fantasy de ajedrez de Gipuzkoa";
export const PIE_CONDICIONES = `Versión ${VERSION_CONDICIONES} — Última actualización: ${FECHA_CONDICIONES}.`;

export const SECCIONES_CONDICIONES: Seccion[] = [
  {
    titulo: "1. Quiénes somos y objeto",
    bloques: [
      p(`Fantasy Beraun Bera (en adelante, «la aplicación» o «el Fantasy») es un juego de carácter deportivo, recreativo y no lucrativo, basado en jugadores y competiciones de ajedrez de Gipuzkoa. Lo ofrece ${R.razonSocial} (${R.nombreComercial}), CIF ${R.cif}, con domicilio en ${R.domicilio} (en adelante, «el club» o «la organización»).`),
      p("Estas Condiciones de Uso regulan el acceso y el uso de la aplicación y las reglas generales de participación. Complementan la Política de Privacidad, que explica cómo se tratan los datos personales."),
    ],
  },
  {
    titulo: "2. Aceptación",
    bloques: [
      p("Para crear una cuenta es necesario haber leído y aceptado estas Condiciones de Uso y la Política de Privacidad marcando las casillas correspondientes del registro. Si no estás de acuerdo con ellas, no debes registrarte ni usar la aplicación."),
      p("El club conserva constancia de la fecha, la hora y la versión de los textos que aceptas."),
    ],
  },
  {
    titulo: "3. Quién puede participar",
    bloques: [
      ul(
        "Puedes registrarte por tu cuenta si tienes 14 años o más.",
        `Los menores de 14 años no pueden registrarse por sí mismos: su participación requiere que su padre, madre o tutor la solicite en ${R.email} y preste su consentimiento.`,
        "Cada persona puede tener una sola cuenta. No está permitido crear varias cuentas para obtener ventaja en el juego.",
        "Los datos que facilites (por ejemplo, el correo electrónico) deben ser verdaderos y estar actualizados."
      ),
    ],
  },
  {
    titulo: "4. Tu cuenta",
    bloques: [
      p("Eres responsable de mantener en secreto tu contraseña y de la actividad que se realice desde tu cuenta. Si sospechas que alguien la está usando sin permiso, cámbiala y avísanos."),
      p("En las clasificaciones y en el resto de pantallas solo se muestran tu nombre de usuario (alias) y los nombres de tu equipo y de tus ligas. Te recomendamos no usar tu nombre completo. No está permitido usar alias, nombres de equipo o de liga que sean ofensivos, que suplanten a otra persona o que incluyan datos personales de terceros."),
    ],
  },
  {
    titulo: "5. Naturaleza del juego",
    bloques: [
      destacado("Fantasy Beraun Bera es un juego gratuito y sin ánimo de lucro. No es un juego de azar ni de apuestas."),
      ul(
        "No se paga ni se cobra dinero real por participar, fichar, pujar u ofertar.",
        "Los millones («M»), saldos, valores de mercado, cláusulas y puntos son unidades virtuales del juego. No tienen valor monetario, no son canjeables por dinero y no son transferibles fuera de la aplicación."
      ),
    ],
  },
  {
    titulo: "6. Reglas del juego",
    bloques: [
      p("Cada manager dirige un equipo dentro de una liga. A grandes rasgos:"),
      ul(
        "Formas una plantilla con jugadores reales de ajedrez de Gipuzkoa, respetando los límites de tamaño de plantilla, de titulares y de jugadores de cada categoría que fije el Reglamento.",
        "Cada jornada, tus titulares puntúan según los resultados reales de sus partidas, aplicando las reglas de puntuación del juego (por ejemplo, la diferencia de Elo con el rival, el capitán o el jugador de la jornada).",
        "Los jugadores tienen un valor de mercado virtual calculado por la aplicación, que puede variar con el tiempo.",
        "Puedes fichar jugadores libres en el mercado mediante pujas, hacer ofertas directas a otros managers, pagar la cláusula de un jugador cuando las reglas lo permitan, vender jugadores y blindarlos frente a cláusulas.",
        "Puedes jugar en ligas privadas (a las que se entra con un código) o en la liga pública abierta a todos los usuarios, que funciona con sus propias reglas simplificadas.",
        "Las pujas y ofertas pendientes se pueden cancelar sin ningún coste mientras el plazo no haya cerrado ni la otra parte las haya aceptado. Una vez resueltas, las operaciones son definitivas."
      ),
      p("Las cifras y límites concretos (presupuesto inicial, tamaño de plantilla, puntuaciones, porcentajes de cláusula y blindaje, horarios del mercado, etc.) son los que figuran en el Reglamento vigente y en las pantallas de la aplicación. La organización puede ajustarlos para mejorar el juego; si el cambio es relevante, se avisará a los usuarios."),
    ],
  },
  {
    titulo: "7. Resultados, puntuaciones y correcciones",
    bloques: [
      p("Los resultados deportivos se incorporan a partir de fuentes y clasificaciones públicas y de los sistemas de gestión de las competiciones. Pueden contener errores o retrasos."),
      p("La organización puede corregir resultados, puntuaciones, valores y clasificaciones, y deshacer o modificar operaciones realizadas por error, por un fallo técnico o por un uso contrario a estas condiciones. Las decisiones de la organización sobre la interpretación y aplicación de las reglas del juego son definitivas dentro de la aplicación, sin perjuicio de tus derechos legales."),
    ],
  },
  {
    titulo: "8. Los jugadores que aparecen en el juego",
    bloques: [
      p("Los jugadores seleccionables son personas reales cuyos datos deportivos se tratan conforme a la Política de Privacidad. Que un jugador aparezca en el Fantasy no implica que tenga una cuenta ni que participe, colabore o esté de acuerdo con ninguna opinión o decisión de los usuarios."),
      p("Debes tratar a los jugadores con respeto. Está prohibido utilizar la aplicación para acosar, insultar o contactar de forma insistente con los jugadores, o para difundir información sobre ellos que no figure en la propia aplicación."),
      p(`Los datos de los jugadores son visibles únicamente para los usuarios registrados. No está permitido copiarlos de forma masiva, extraerlos con programas automáticos, publicarlos fuera de la aplicación ni reutilizarlos para otros fines. Cualquier jugador, o sus representantes legales si es menor, puede solicitar su exclusión del Fantasy escribiendo a ${R.email}.`),
    ],
  },
  {
    titulo: "9. Conductas no permitidas",
    bloques: [
      p("Para que el juego sea justo y seguro, no está permitido:"),
      ul(
        "crear o usar varias cuentas, o dejar que otra persona use la tuya;",
        "pactar con otros managers operaciones, ofertas o pujas con la intención de falsear la competición o perjudicar a terceros;",
        "usar programas automáticos, bots o scripts, o acceder a la aplicación por medios distintos de la interfaz ofrecida;",
        "aprovechar errores o fallos de la aplicación en beneficio propio en lugar de comunicarlos;",
        "intentar acceder a cuentas o datos ajenos, ni interferir en el funcionamiento o la seguridad de la aplicación;",
        "usar nombres de usuario, de equipo o de liga ofensivos, discriminatorios o que suplanten a otra persona;",
        "utilizar la aplicación para fines ilegales o contrarios a la buena fe."
      ),
    ],
  },
  {
    titulo: "10. Ligas privadas",
    bloques: [
      p("Quien crea una liga privada recibe un código para invitar a otros managers. Eres responsable de con quién compartes ese código. Las ligas privadas tienen un número máximo de miembros, y la organización puede eliminar ligas o expulsar a participantes que incumplan estas condiciones."),
    ],
  },
  {
    titulo: "11. Suspensión y baja",
    bloques: [
      p("Si incumples estas condiciones, la organización puede avisarte, corregir o anular tus operaciones y, en casos graves o reiterados, suspender o eliminar tu cuenta."),
      p("Puedes eliminar tu cuenta cuando quieras desde la propia aplicación. Al hacerlo, se borran tu perfil y tu equipo, y los jugadores de tu plantilla vuelven al mercado. Los datos que debamos conservar por obligación legal, como la constancia de tus aceptaciones, se tratan según la Política de Privacidad."),
    ],
  },
  {
    titulo: "12. Disponibilidad del servicio",
    bloques: [
      p("Intentamos que la aplicación funcione de forma continua, pero no podemos garantizarlo. Puede haber interrupciones por mantenimiento, fallos técnicos o causas ajenas a nuestro control, y la aplicación puede cambiar, ampliarse o dejar de ofrecerse. Al ser un servicio gratuito y recreativo, procuraremos avisar con antelación razonable de los cambios importantes."),
    ],
  },
  {
    titulo: "13. Propiedad intelectual y ausencia de vinculación",
    bloques: [
      p("El diseño, el código, los textos, el nombre y el escudo de la aplicación y del club pertenecen al club o a sus licenciantes y no pueden reproducirse ni usarse fuera de lo permitido sin autorización."),
      p("Fantasy Beraun Bera es una iniciativa independiente del club. No está patrocinada, avalada ni gestionada por la FIDE, la FEDA, la Federación Vasca de Ajedrez, la Federación Guipuzcoana de Ajedrez ni por los clubes o torneos cuyos datos deportivos se utilizan; estos nombres se citan solo para identificar la procedencia de la información."),
    ],
  },
  {
    titulo: "14. Responsabilidad",
    bloques: [
      p("La aplicación se ofrece «tal cual», con fines recreativos. En la medida que permita la ley, el club no responde de los daños derivados de interrupciones del servicio, errores en los datos deportivos, pérdida de información del juego o del uso que hagan otros usuarios de la aplicación."),
      p("Nada de lo dispuesto en estas condiciones limita la responsabilidad que no pueda excluirse legalmente ni los derechos que la normativa reconozca a las personas consumidoras y usuarias."),
    ],
  },
  {
    titulo: "15. Protección de datos",
    bloques: [
      p(`El tratamiento de tus datos personales y de los de los jugadores se explica en la Política de Privacidad. Puedes ejercer tus derechos escribiendo a ${R.email}.`),
    ],
  },
  {
    titulo: "16. Cambios en estas condiciones",
    bloques: [
      p("Podemos actualizar estas condiciones para adaptarlas a cambios legales, a nuevas funcionalidades o a la evolución del juego. La versión vigente estará siempre disponible en la aplicación. Cuando el cambio sea sustancial, te lo comunicaremos y te pediremos que aceptes la nueva versión para seguir usando la aplicación."),
    ],
  },
  {
    titulo: "17. Legislación aplicable y contacto",
    bloques: [
      p("Estas condiciones se rigen por la legislación española. Las controversias se someterán a los juzgados y tribunales que resulten competentes conforme a la normativa aplicable, incluidos, si eres persona consumidora, los de tu domicilio."),
      lineas(
        `Responsable: ${R.razonSocial}`,
        `Nombre comercial: ${R.nombreComercial}`,
        `CIF: ${R.cif}`,
        `Domicilio: ${R.domicilio}`,
        `Correo electrónico: ${R.email}`,
        `Web: ${R.web}`
      ),
    ],
  },
];
