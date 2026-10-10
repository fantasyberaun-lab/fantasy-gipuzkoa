import { definirTextos } from "../definir";
import { RESPONSABLE as R } from "@/lib/legal/config";
import { INFO_BASICA } from "@/lib/legal/privacidad";

// Interfaz alrededor de los textos legales. Los documentos (condiciones y
// privacidad) NO se traducen: solo existen en castellano.
type FilaInfo = { etiqueta: string; texto: string };

export default definirTextos(
  {
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
  },
  {
    eu: {
      irALaApp: "Joan aplikaziora",
      soloCastellano: "Dokumentu hau gaztelaniaz bakarrik dago eskuragarri.",

      infoBasicaTitulo: "Datuen babesari buruzko oinarrizko informazioa",
      infoBasica: [
        { etiqueta: "Arduraduna", texto: `${R.razonSocial} (${R.nombreComercial}), IFK ${R.cif}.` },
        {
          etiqueta: "Helburua",
          texto:
            "Xake Fantasy liga kudeatzea: hauta daitezkeen jokalariak, taldeak, puntuazioak eta sailkapenak, eta erregistratutako erabiltzaileen kontuak.",
        },
        {
          etiqueta: "Legitimazioa",
          texto:
            "Jokalariak: interes legitimoa (DBEO, 6.1.f art.). Erabiltzaileak: onartutako Erabilera-baldintzak betetzea (DBEO, 6.1.b art.). Aukerako komunikazioak: baimena (DBEO, 6.1.a art.).",
        },
        {
          etiqueta: "Hartzaileak",
          texto:
            "Ez zaie daturik lagatzen hirugarrenei, legeak hala eskatzen duenean izan ezik. Hornitzaile teknologikoek tratamendu-eragile gisa parte hartzen dute.",
        },
        {
          etiqueta: "Eskubideak",
          texto: `Sarbidea, zuzenketa, ezabatzea, aurkaratzea, mugatzea eta eramangarritasuna, ${R.email} helbidera idatzita. Erreklamazioa Datuak Babesteko Espainiako Agentzian (AEPD).`,
        },
        { etiqueta: "Informazio gehiago", texto: "Pribatutasun-politika osoan." },
      ],
      masInfoAntes: "",
      masInfoEnlace: "Pribatutasun-politika",
      masInfoDespues: " osoan.",

      condicionesAntes: "",
      condicionesEnlace: "Erabilera-baldintzak",
      condicionesDespues: " eta Fantasy Beraun Berako arauak irakurri eta onartzen ditut.",
      privacidadAntes: "",
      privacidadEnlace: "Pribatutasun-politika",
      privacidadDespues:
        " irakurri dut, eta nire datu pertsonalen tratamenduari eta nire eskubideak erabiltzeko moduari buruzko informazioa jaso dut.",
      mayor14:
        "14 urte edo gehiago ditudala adierazten dut. 14 urtetik beherakoa banaiz, nire aitak, amak edo tutoreak eskatu behar du nire erregistroa.",
      comunicaciones:
        "(Aukerakoa) Fantasy Beraun Berari eta Beraun Bera Xake Taldearen jarduerei buruzko berriak jaso nahi ditut posta elektronikoz.",

      errorGuardar: "Ezin izan da onarpena gorde.",
      errorComprobar: "Ezin izan da egiaztatu baldintzak onartu dituzun.",
      reintentar: "Saiatu berriro",
      antesDeContinuar: "Jarraitu aurretik",
      gateIntro:
        "Erabilera-baldintzak eta Pribatutasun-politika gehitu ditugu. Fantasy Beraun Bera erabiltzen jarraitzeko, irakurri eta onartu egin behar dituzu.",
      aceptarContinuar: "Onartu eta jarraitu",
      noAcepto: "Ez dut onartzen — saioa itxi",
    },
    en: {
      irALaApp: "Go to the app",
      soloCastellano: "This document is only available in Spanish.",

      infoBasicaTitulo: "Basic data protection information",
      infoBasica: [
        { etiqueta: "Controller", texto: `${R.razonSocial} (${R.nombreComercial}), Tax ID ${R.cif}.` },
        {
          etiqueta: "Purpose",
          texto:
            "Running the chess Fantasy league: selectable players, teams, scores and standings, and the accounts of registered users.",
        },
        {
          etiqueta: "Legal basis",
          texto:
            "Players: legitimate interest (Art. 6.1.f GDPR). Users: performance of the accepted Terms of Use (Art. 6.1.b GDPR). Optional communications: consent (Art. 6.1.a GDPR).",
        },
        {
          etiqueta: "Recipients",
          texto:
            "No data is disclosed to third parties unless required by law. Technology providers act as data processors.",
        },
        {
          etiqueta: "Rights",
          texto: `Access, rectification, erasure, objection, restriction and portability, by writing to ${R.email}. Complaints may be lodged with the Spanish Data Protection Agency (AEPD).`,
        },
        { etiqueta: "More information", texto: "In the full Privacy Policy." },
      ],
      masInfoAntes: "In the full ",
      masInfoEnlace: "Privacy Policy",
      masInfoDespues: ".",

      condicionesAntes: "I have read and accept the ",
      condicionesEnlace: "Terms of Use",
      condicionesDespues: " and the rules of Fantasy Beraun Bera.",
      privacidadAntes: "I have read the ",
      privacidadEnlace: "Privacy Policy",
      privacidadDespues:
        " and have been informed about the processing of my personal data and how to exercise my rights.",
      mayor14:
        "I declare that I am 14 or older. If I am under 14, my registration must be requested by my parent or guardian.",
      comunicaciones:
        "(Optional) I'd like to receive emails with news about Fantasy Beraun Bera and the activities of Beraun Bera Xake Taldea.",

      errorGuardar: "Couldn't save your acceptance.",
      errorComprobar: "Couldn't check whether you've accepted the terms.",
      reintentar: "Retry",
      antesDeContinuar: "Before you continue",
      gateIntro:
        "We've added Terms of Use and a Privacy Policy. To keep using Fantasy Beraun Bera, please read and accept them.",
      aceptarContinuar: "Accept and continue",
      noAcepto: "I don't accept — log out",
    },
  }
);
