import {
  FECHA_PRIVACIDAD,
  PLAZO_INACTIVIDAD,
  PROVEEDORES_TECNOLOGICOS,
  RESPONSABLE as R,
  VERSION_PRIVACIDAD,
} from "./config";
import { lineas, p, ul, type Seccion } from "./tipos";

export const TITULO_PRIVACIDAD = "Política de privacidad y protección de datos";
export const SUBTITULO_PRIVACIDAD =
  "Fantasy Beraun Bera — Liga Fantasy de ajedrez de Gipuzkoa";
export const PIE_PRIVACIDAD = `Versión ${VERSION_PRIVACIDAD} — Última actualización: ${FECHA_PRIVACIDAD}.`;

// Primera capa (información básica). Se enseña también en el formulario de registro.
export const INFO_BASICA: { etiqueta: string; texto: string }[] = [
  {
    etiqueta: "Responsable",
    texto: `${R.razonSocial} (${R.nombreComercial}), CIF ${R.cif}.`,
  },
  {
    etiqueta: "Finalidad",
    texto:
      "Gestionar la liga Fantasy de ajedrez: jugadores seleccionables, equipos, puntuaciones y clasificaciones, y las cuentas de los usuarios registrados.",
  },
  {
    etiqueta: "Legitimación",
    texto:
      "Jugadores: interés legítimo (art. 6.1.f RGPD). Usuarios: ejecución de las Condiciones de Uso aceptadas (art. 6.1.b RGPD). Comunicaciones opcionales: consentimiento (art. 6.1.a RGPD).",
  },
  {
    etiqueta: "Destinatarios",
    texto:
      "No se ceden datos a terceros salvo obligación legal. Intervienen proveedores tecnológicos como encargados del tratamiento.",
  },
  {
    etiqueta: "Derechos",
    texto: `Acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo a ${R.email}. Reclamación ante la AEPD.`,
  },
  {
    etiqueta: "Más información",
    texto: "En la Política de Privacidad completa.",
  },
];

export const SECCIONES_PRIVACIDAD: Seccion[] = [
  {
    titulo: "1. Responsable del tratamiento",
    bloques: [
      p("El responsable del tratamiento de los datos personales utilizados en la aplicación Fantasy Beraun Bera es:"),
      lineas(
        `Razón social: ${R.razonSocial}`,
        `Nombre comercial: ${R.nombreComercial}`,
        `CIF: ${R.cif}`,
        `Domicilio: ${R.domicilio}`,
        `Correo electrónico general y de contacto en materia de protección de datos: ${R.email}`,
        `Sitio web: ${R.web}`,
        `Aplicación: ${R.aplicacion}`
      ),
      p("Fantasy Beraun Bera es una aplicación de carácter deportivo, recreativo y no lucrativo cuya finalidad principal es permitir la creación y participación en una liga Fantasy basada en jugadores y competiciones de ajedrez de Gipuzkoa."),
    ],
  },
  {
    titulo: "2. Normativa aplicable",
    bloques: [
      p("El tratamiento se rige por el Reglamento (UE) 2016/679, General de Protección de Datos (RGPD); la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD); la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI), en lo relativo a cookies y comunicaciones electrónicas; y demás normativa aplicable."),
    ],
  },
  {
    titulo: "3. Contacto en materia de protección de datos",
    bloques: [
      p(`${R.razonSocial} no ha designado un delegado de protección de datos, al no encontrarse en ninguno de los supuestos en que su designación es obligatoria (art. 37 RGPD y art. 34 LOPDGDD).`),
      p(`Cualquier consulta relacionada con el tratamiento de datos personales o el ejercicio de derechos podrá dirigirse a ${R.razonSocial} – ${R.nombreComercial}, ${R.domicilio}, o al correo electrónico ${R.email}.`),
    ],
  },
  {
    titulo: "4. Datos de los jugadores de ajedrez",
    bloques: [
      p("Para el funcionamiento de Fantasy Beraun Bera se tratan exclusivamente los datos deportivos necesarios para identificar a los jugadores y desarrollar las funcionalidades del juego:"),
      ul(
        "nombre y apellidos;",
        "club o entidad deportiva;",
        "ELO o valoración deportiva;",
        "resultados y puntuaciones obtenidos en competiciones;",
        "sexo;",
        "el identificador del jugador que se muestra en la aplicación (ID Fantasy);",
        "año de nacimiento, únicamente en el caso de los jugadores de 20 años o más;",
        "categoría deportiva cuando resulte necesaria, incluida, en su caso, una categoría genérica de edad como «Sub-20»;",
        "la valoración y puntuación virtual que la aplicación calcula a partir de los datos anteriores."
      ),
      p("En el caso de los jugadores menores de 20 años, el año de nacimiento no se publica: solo aparece la categoría «Sub-20». Ese dato se utiliza únicamente de forma interna para calcular su valoración virtual."),
      p("No se publicarán domicilios, teléfonos, direcciones de correo electrónico, documentos de identidad, fechas de nacimiento completas, la edad, fotografías ni otros datos pertenecientes a la esfera privada de los jugadores."),
      p("Los datos de los jugadores solo son visibles para los usuarios registrados que han aceptado las Condiciones de Uso. No se publican en abierto ni son accesibles a buscadores de internet."),
      p("La inclusión de un jugador en Fantasy Beraun Bera no implica que disponga de una cuenta de usuario ni que participe personalmente en el juego."),
    ],
  },
  {
    titulo: "5. Jugadores menores de edad",
    bloques: [
      p("La categoría «Sub-20» es una categoría deportiva genérica que comprende tanto a personas menores como mayores de 18 años, por lo que de la mera aparición de un jugador en ella no puede deducirse su edad ni su condición de menor."),
      p("Si entre los jugadores incluidos existieran menores de edad, se aplicarán las siguientes garantías reforzadas:"),
      ul(
        "Los jugadores menores de 14 años solo se incluirán como jugadores seleccionables cuando sus padres, madres o tutores lo hayan autorizado expresamente.",
        "Cualquier jugador menor de edad, o sus representantes legales, podrá solicitar su exclusión del Fantasy en cualquier momento. La solicitud se atenderá sin necesidad de justificar motivos adicionales.",
        "Respecto de ellos no se publicará ningún dato distinto de los indicados en el apartado 4, ni se habilitarán comentarios o valoraciones de otros usuarios sobre su persona."
      ),
    ],
  },
  {
    titulo: "6. Procedencia de los datos deportivos",
    bloques: [
      p("Los datos deportivos de los jugadores no se obtienen directamente de ellos. Proceden de fuentes, registros y clasificaciones públicas relacionados con la actividad ajedrecística: la Federación Internacional de Ajedrez (FIDE), la Federación Española de Ajedrez (FEDA), la Federación Vasca de Ajedrez, la Federación Guipuzcoana de Ajedrez, los sistemas de gestión y publicación de competiciones, clasificaciones y resultados oficiales, y otras fuentes deportivas públicamente accesibles."),
      p(`Que un dato sea públicamente accesible no permite reutilizarlo sin límite. ${R.razonSocial} limitará su tratamiento a las finalidades descritas en esta política y aplicará los principios de licitud, lealtad, transparencia, minimización, exactitud, limitación de la finalidad y limitación del plazo de conservación.`),
      p(`Para dar cumplimiento al artículo 14 del RGPD, esta política se mantendrá publicada de forma permanente en ${R.web} y en la aplicación, y el club comunicará la existencia del Fantasy y el modo de ejercer los derechos a los clubes participantes y a la Federación Guipuzcoana de Ajedrez para su difusión entre los jugadores, dentro del mes siguiente a la incorporación de sus datos.`),
    ],
  },
  {
    titulo: "7. Bases jurídicas del tratamiento",
    bloques: [
      ul(
        `**Datos deportivos de los jugadores:** interés legítimo del responsable (art. 6.1.f RGPD), consistente en desarrollar una actividad deportiva y recreativa vinculada al ajedrez utilizando información deportiva limitada. ${R.razonSocial} ha realizado y conserva por escrito la ponderación entre este interés y los derechos de los jugadores, prestando especial atención a los menores de edad; puede solicitarse información sobre ella en ${R.email}.`,
        "**Autorización de padres o tutores para incluir a jugadores menores de 14 años:** consentimiento (art. 6.1.a RGPD).",
        "**Cuentas de usuario y participación en el juego:** ejecución de las Condiciones de Uso aceptadas por el usuario (art. 6.1.b RGPD).",
        "**Seguridad de la aplicación y prevención del fraude:** interés legítimo (art. 6.1.f RGPD).",
        "**Envío de novedades del club o del Fantasy:** consentimiento (art. 6.1.a RGPD), que es opcional y puede retirarse en cualquier momento sin que ello afecte a la licitud del tratamiento anterior.",
        "**Atención de requerimientos legales:** cumplimiento de obligaciones legales (art. 6.1.c RGPD)."
      ),
    ],
  },
  {
    titulo: "8. Finalidades del tratamiento",
    bloques: [
      p("Los datos se utilizan para identificar a los jugadores seleccionables, asignarles una valoración o precio virtual, permitir la confección de equipos Fantasy, calcular puntuaciones, incorporar resultados deportivos, elaborar clasificaciones y estadísticas, gestionar jornadas y temporadas, gestionar las cuentas de usuario, prevenir usos fraudulentos y garantizar el correcto funcionamiento de la aplicación."),
      p("Los datos no serán vendidos a terceros ni utilizados para elaborar perfiles comerciales o realizar publicidad personalizada. Solo se enviarán comunicaciones sobre novedades a los usuarios que lo hayan consentido."),
    ],
  },
  {
    titulo: "9. Datos de los usuarios registrados",
    bloques: [
      p("Para crear una cuenta se solicitan exclusivamente los datos necesarios para gestionarla: alias, dirección de correo electrónico y contraseña. Durante el uso de la aplicación se tratan además los equipos creados, los jugadores seleccionados, las puntuaciones, las clasificaciones y los datos técnicos necesarios para garantizar la seguridad (como registros de acceso y dirección IP)."),
      p("Los datos marcados como obligatorios en el formulario de registro son necesarios para participar; si no se facilitan, no será posible crear la cuenta."),
      p("La dirección de correo electrónico no se publica en las clasificaciones ni se muestra al resto de participantes. En las clasificaciones solo aparece el alias elegido por el usuario, por lo que se recomienda no utilizar como alias el nombre completo."),
    ],
  },
  {
    titulo: "10. Información y casillas en el registro",
    bloques: [
      p("Antes de completar el registro, el usuario tendrá acceso a esta Política de Privacidad y a las Condiciones de Uso mediante enlaces visibles en el propio formulario, junto con la información básica sobre protección de datos."),
      p("El formulario incorporará las siguientes casillas, todas desmarcadas por defecto:"),
      p("**Obligatorias para registrarse:**"),
      ul(
        "☐ He leído y acepto las Condiciones de Uso y las reglas de Fantasy Beraun Bera.",
        "☐ He leído la Política de Privacidad y he sido informado sobre el tratamiento de mis datos personales y sobre la forma de ejercer mis derechos.",
        "☐ Declaro tener 14 años o más. Si soy menor de 14 años, mi registro debe solicitarlo mi padre, madre o tutor."
      ),
      p("**Opcional:**"),
      ul("☐ Quiero recibir por correo electrónico novedades sobre Fantasy Beraun Bera y las actividades de Beraun Bera Xake Taldea."),
      p("La casilla opcional es independiente: no marcarla no impide registrarse. El club conservará constancia de la fecha y hora de cada aceptación y de la versión de la política vigente en ese momento, a fin de poder acreditarla (art. 7.1 RGPD)."),
    ],
  },
  {
    titulo: "11. Usuarios menores de edad",
    bloques: [
      p(`De acuerdo con el artículo 7 de la LOPDGDD, los mayores de 14 años pueden registrarse por sí mismos. Los menores de 14 años no pueden hacerlo: su participación requiere que el padre, la madre o el tutor la solicite en ${R.email} y preste su consentimiento, pudiendo el club adoptar medidas razonables para verificarlo.`),
      p("Si se detecta que se ha registrado un menor de 14 años sin dicha autorización, la cuenta se desactivará y sus datos se suprimirán."),
      p("No se solicitará a los usuarios menores información que no sea necesaria para participar. La condición de usuario menor de edad es distinta de la inclusión de un jugador en la categoría deportiva «Sub-20»."),
    ],
  },
  {
    titulo: "12. Conservación de los datos",
    bloques: [
      ul(
        "**Datos deportivos de los jugadores:** mientras el jugador figure en el Fantasy. Los resultados y clasificaciones de temporadas finalizadas podrán conservarse como histórico deportivo. Si un jugador ejerce con éxito su derecho de oposición, sus datos se suprimirán o anonimizarán, también en el histórico.",
        `**Cuentas de usuario:** mientras la cuenta esté activa. Las cuentas sin actividad durante ${PLAZO_INACTIVIDAD} se suprimirán, previo aviso por correo electrónico.`,
        "**Constancia de aceptaciones y consentimientos:** mientras la cuenta esté activa y, después, durante el plazo de prescripción de las posibles responsabilidades."
      ),
      p("Al término de estos plazos, los datos se suprimirán o anonimizarán o, cuando exista una obligación legal de conservación, quedarán bloqueados conforme al artículo 32 de la LOPDGDD."),
    ],
  },
  {
    titulo: "13. Destinatarios y proveedores tecnológicos",
    bloques: [
      p(`${R.razonSocial} no vende ni cede los datos personales tratados en Fantasy Beraun Bera.`),
      p(`Acceden a determinados datos, como encargados del tratamiento y con el contrato exigido por el artículo 28 del RGPD, los proveedores necesarios para el alojamiento web, las bases de datos, las copias de seguridad, el correo electrónico y el soporte técnico. Actualmente: ${PROVEEDORES_TECNOLOGICOS} y Google (servicio de correo electrónico Gmail).`),
      p("Los datos solo se comunicarán a administraciones públicas, autoridades, jueces o tribunales cuando exista una obligación legal."),
    ],
  },
  {
    titulo: "14. Transferencias internacionales de datos",
    bloques: [
      p(`Algunos proveedores, como Google, pueden tratar datos fuera del Espacio Económico Europeo. Estas transferencias se amparan en los mecanismos del capítulo V del RGPD: la decisión de adecuación del Marco de Privacidad de Datos UE-EE. UU. cuando el proveedor esté adherido a él y, en su defecto, las cláusulas contractuales tipo aprobadas por la Comisión Europea. Puede solicitarse información sobre estas garantías en ${R.email}.`),
    ],
  },
  {
    titulo: "15. Puntuaciones, valoraciones y clasificaciones automáticas",
    bloques: [
      p("Fantasy Beraun Bera calcula automáticamente precios virtuales, puntuaciones, estadísticas y clasificaciones aplicando reglas públicas y previamente establecidas para el juego."),
      p("Estos cálculos tienen una finalidad exclusivamente recreativa: no valoran a la persona, no producen efectos jurídicos ni le afectan significativamente, por lo que no constituyen decisiones individuales automatizadas en el sentido del artículo 22 del RGPD."),
    ],
  },
  {
    titulo: "16. Derechos de las personas interesadas",
    bloques: [
      p("Cualquier persona cuyos datos sean tratados por Fantasy Beraun Bera puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, así como retirar en cualquier momento el consentimiento prestado, sin que ello afecte a la licitud del tratamiento anterior."),
      p(`Las solicitudes son gratuitas y pueden dirigirse al correo ${R.email} o por escrito a ${R.razonSocial}, ${R.domicilio}. Solo se pedirá documentación acreditativa de la identidad cuando existan dudas razonables sobre ella. Los derechos de los menores de 14 años se ejercen a través de sus padres, madres o tutores.`),
    ],
  },
  {
    titulo: "17. Derecho de oposición de los jugadores incluidos en el Fantasy",
    bloques: [
      p(`Dado que los datos deportivos de los jugadores se tratan sobre la base del interés legítimo, cualquier jugador puede oponerse a su inclusión en el Fantasy (art. 21 RGPD) por motivos relacionados con su situación particular, escribiendo a ${R.email}.`),
      p("Mientras se examina la solicitud, el jugador dejará de ser seleccionable. Cuando la solicitud proceda, sus datos se suprimirán o anonimizarán. Las solicitudes de jugadores menores de edad o de sus representantes se atenderán siempre, sin necesidad de justificar motivos adicionales."),
    ],
  },
  {
    titulo: "18. Plazo para atender los derechos",
    bloques: [
      p("Las solicitudes se atenderán sin dilación indebida y, en todo caso, en el plazo máximo de un mes desde su recepción. Cuando concurran las circunstancias previstas en el artículo 12.3 del RGPD, el plazo podrá prorrogarse otros dos meses, informando al interesado dentro del primer mes."),
    ],
  },
  {
    titulo: "19. Reclamaciones ante la autoridad de control",
    bloques: [
      p(`Quien considere que el tratamiento de sus datos vulnera la normativa puede presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD), C/ Jorge Juan 6, 28001 Madrid, www.aepd.es. Previamente, si lo desea, puede contactar con el club en ${R.email}.`),
    ],
  },
  {
    titulo: "20. Seguridad de los datos",
    bloques: [
      p(`${R.razonSocial} aplica medidas técnicas y organizativas apropiadas al riesgo, como el cifrado de las comunicaciones (HTTPS), el almacenamiento de contraseñas cifradas, el acceso restringido a los datos y las copias de seguridad periódicas, para prevenir el acceso, la utilización, la modificación o la pérdida no autorizados de los datos.`),
      p("En caso de brecha de seguridad, se notificará a la AEPD en un plazo de 72 horas cuando sea exigible y se informará a las personas afectadas cuando exista un alto riesgo para sus derechos (arts. 33 y 34 RGPD)."),
    ],
  },
  {
    titulo: "21. Principio de minimización",
    bloques: [
      p("Fantasy Beraun Bera trata exclusivamente la información necesaria para las funcionalidades del juego, en los términos de los apartados 4, 5 y 9. Cualquier nueva categoría de datos o finalidad requerirá actualizar esta política y, en su caso, una nueva base jurídica."),
    ],
  },
  {
    titulo: "22. Cookies y tecnologías similares",
    bloques: [
      p("Fantasy Beraun Bera utiliza cookies y almacenamiento local técnicos, necesarios para mantener la sesión, recordar preferencias y garantizar la seguridad, que no requieren consentimiento."),
      p("Si en el futuro se utilizan cookies analíticas, publicitarias o de terceros, se solicitará el consentimiento previo mediante un aviso de cookies y se informará en una Política de Cookies específica (art. 22.2 LSSI)."),
    ],
  },
  {
    titulo: "23. Modificaciones de la política de privacidad",
    bloques: [
      p(`${R.razonSocial} podrá modificar esta política para adaptarla a cambios legislativos, nuevas funcionalidades o cambios en las finalidades o bases jurídicas del tratamiento. La versión vigente estará disponible en ${R.web} y en la aplicación. Los cambios sustanciales se comunicarán a los usuarios registrados por correo electrónico o mediante un aviso en la aplicación.`),
    ],
  },
  {
    titulo: "24. Identificación final del responsable",
    bloques: [
      lineas(
        `Responsable: ${R.razonSocial}`,
        `Nombre comercial: ${R.nombreComercial}`,
        `CIF: ${R.cif}`,
        `Domicilio: ${R.domicilio}`,
        `Correo electrónico: ${R.email}`,
        `Web: ${R.web}`,
        `Aplicación: ${R.aplicacion}`
      ),
    ],
  },
];
