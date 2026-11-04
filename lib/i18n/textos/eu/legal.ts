import type { Seccion } from "../es/legal";
import { DIAS_CONSERVACION_CHAT as DIAS, DIAS_CONSERVACION_FORO as DIAS_FORO, MAX_DENUNCIAS_DIA_CHAT as MAX_DEN, RESPONSABLE as R } from "@/lib/legal/config";

const eu: Seccion = {
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

  gateIntroActualizacion:
    "Erabilera-baldintzak eta Pribatutasun-politika eguneratu ditugu. Fantasy Beraun Bera erabiltzen jarraitzeko, berriro onartu behar dituzu.",
  motivoTitulo: "Txatari foroak gehitu dizkiogu",
  motivoIntro: "Horregatik eguneratu ditugu baldintzak. Funtsezkoena:",
  novedades: [
    "Testuzko txat bat dago liga pribatu bakoitzarentzat eta beste bat liga publikoarentzat. Testua eta emojiak soilik.",
    "Idazteko arauak daude, mezuak salatzeko botoi bat eta moderazio-neurriak: mezuak ezabatzea edo denbora batez idaztea eragoztea.",
    `Mezuak ${DIAS} egunera ezabatzen dira automatikoki, eta baita zure kontua ezabatzen baduzu ere.`,
    "Liga publikoko txata isilaraz dezakezu, inork ez zaitzan aipa.",
    `Abusuak saihesteko, pertsona bakoitzak gehienez ${MAX_DEN} salaketa egin ditzake egunean.`,
    `Berria: foroak txataren barruan, gaiak irekitzeko eta eztabaidatzeko. Jarduerarik gabeko gaiak ${DIAS_FORO} egunera ezabatzen dira.`,
    "Berria: emoji-erreakzioak, boto sekretuko inkestak eta aipatzen edo erantzuten zaituztenean oharrak.",
    "Zure mezuak editatu ditzakezu bidali eta handik denbora batera.",
  ] as string[],
  verCambios: "Testu osoak beheko esteketan irakur ditzakezu.",
};

export default eu;
