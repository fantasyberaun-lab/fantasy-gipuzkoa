import type { Seccion } from "../es/avisos";

// Pestaña Avisos: notificaciones de la liga y comunicados.
// Las frases de notificaciones llevan huecos {actor}, {jugador} e {importe}
// que la pantalla rellena con enlaces o negritas.
type Num = number | null;

type Txt = string | null;

const tan = (imp: Num) => (imp !== null ? ` ${imp} M-tan` : "");

const objEu = (obj: Txt) => (obj ? ` (${obj} taldearena)` : "");

const zenbat = (imp: Num) => (imp !== null ? `: ${imp} M` : "");

const eu: Seccion = {
  cargando: "Jakinarazpenak kargatzen…",
  ahoraMismo: "oraintxe",
  nueva: "Berria",
  nuevo: "Berria",
  avisos: "Abisuak",
  comunicados: "Komunikatuak",
  sinComunicadosPublica:
    "Oraingoz ez dago komunikaturik. Hemen agertuko dira berritasunak eta abisu garrantzitsuak.",
  sinComunicados: "Ez dago indarrean dagoen komunikaturik.",
  tusIngresos: "Zure diru-sarrerak",
  foros: "Foroak",
  foroMencion: "{actor}(e)k aipatu zaitu {titulo} gaian.",
  foroRespuesta: "{actor}(e)k erantzun du {titulo} gaian.",
  foroTemaSinDatos: "foroko gai bat",
  actividad: "Ligako jarduera",
  sinMovimientos: "Oraindik ez dago mugimendurik zure ligan.",
  tipos: {
    oferta_recibida: "Eskaintza",
    fichaje: "Fitxaketa",
    clausulazo: "Klausula",
    clausula_subida: "Klausula ↑",
    oferta_rechazada: "Eskaintza baztertua",
    venta: "Salmenta",
    actualizacion_elo: "Elo eguneratzea",
    pago_jornada: "Diru-sarrera",
    otro: "Oharra",
    sancion: "Zigorra",
    advertencia: "Abisua",
    expulsion: "Kanporaketa",
    nuevo_admin: "Administratzailea",
    oferta_maquina: "Eskaintza",
    foro_mencion: "Aipamena",
    foro_respuesta: "Erantzuna",
  },
  avisoGenerico: "Albistea zure ligan.",
  etiquetas: {
    importante: "Garrantzitsua",
    actualizacion: "Eguneratzea",
    novedad: "Berritasuna",
    aviso: "Abisua",
    mercado: "Merkatua",
    torneo: "Txapelketa",
  },
  importante: "Garrantzitsua",
  eloTitulo: "Eloa eta balioak eguneratuta",
  eloTexto: (n: number) =>
    `FIDEren zerrenda berriarekin ${n} jokalariren Eloa eguneratu da, eta haien merkatu-balioa birdoitu da.`,
  valorPlantilla: "Zure plantillaren balioa:",
  ningunCambio: "Zure jokalarietako inoren Eloa ez da aldatu.",
  conCambio: (n: number) => `Zure ${n} jokalariren Eloa aldatu da.`,
  mayorSubida: (nombre: string, delta: number) =>
    ` Igoera handiena: ${nombre} (▲ ${delta}).`,
  mayorBajada: (nombre: string, delta: number) =>
    ` Jaitsiera handiena: ${nombre} (▼ ${delta}).`,
  ofertaRecibida: (imp: Num) =>
    `{actor} managerrak eskaintza bat egin dizu {jugador} jokalariagatik${imp !== null ? `: ${imp} M` : ""}.`,
  fichajeYo: (imp: Num) => `{jugador} fitxatu duzu${tan(imp)}.`,
  fichajeOtro: (imp: Num) => `{actor} managerrak {jugador} fitxatu du${tan(imp)}.`,
  ventaYo: (imp: Num) => `{jugador} merkatuari saldu diozu${tan(imp)}.`,
  ventaOtro: (imp: Num) => `{actor} managerrak {jugador} merkatuari saldu dio${tan(imp)}.`,
  clausulaSubida: (imp: Num) =>
    imp !== null
      ? `{jugador} jokalariaren klausula ${imp} M igo duzu.`
      : `{jugador} jokalariaren klausula igo duzu.`,
  ofertaRechazada: (imp: Num) =>
    `{jugador} jokalariagatik egin duzun eskaintza${imp !== null ? ` (${imp} M)` : ""} baztertu egin dute.`,
  pagoCorreccion: (jornada: Num, puntos: number) =>
    `${jornada != null ? `${jornada}. jardunaldiko` : "Jardunaldiko"} diru-sarreren zuzenketa: {importe} (orain ${puntos} puntu dituzu).`,
  pagoIngreso: (jornada: Num, puntos: number) =>
    `{importe} jaso dituzu ${jornada != null ? `${jornada}. jardunaldian` : "jardunaldian"} lortutako ${puntos} puntuengatik.`,
  sancionPuntos: (n: number) => `Administratzaileak {objetivo} zigortu du: −${n} puntu. Arrazoia: {motivo}`,
  sancionPuntosAMi: (n: number) => `Administratzaileak zigortu zaitu: −${n} puntu. Arrazoia: {motivo}`,
  sancionMillones: (n: number) => `Administratzaileak {objetivo} zigortu du: −${n} M. Arrazoia: {motivo}`,
  sancionMillonesAMi: (n: number) => `Administratzaileak zigortu zaitu: −${n} M. Arrazoia: {motivo}`,
  advertencia: "Administratzaileak abisua eman dio {objetivo} taldeari. Arrazoia: {motivo}",
  advertenciaAMi: "Administratzaileak abisu bat bidali dizu. Arrazoia: {motivo}",
  expulsion: "Administratzaileak {objetivo} ligatik kanporatu du. Arrazoia: {motivo}",
  nuevoAdmin: "{objetivo} da orain ligako administratzailea.",
  ofertaMaquina: "Makinak eskaintza egin du salgai dituzun jokalarien gainean. Onartu edo baztertu itzazu zure Plantillan.",
  nuevoAdminAMi:
    "Orain zu zara ligako administratzailea: Sailkapena → Liga kudeatu atalean kudea dezakezu.",
  clausulazoYo: (obj: Txt, imp: Num) =>
    `{jugador} jokalariaren klausula ordaindu duzu${objEu(obj)}${zenbat(imp)}.`,
  clausulazoAMi: (imp: Num) =>
    `{actor} managerrak {jugador} kendu dizu, haren klausula ordainduta${imp !== null ? ` (${imp} M)` : ""}.`,
  clausulazoOtro: (obj: Txt, imp: Num) =>
    `{actor} managerrak {jugador} jokalariaren klausula ordaindu du${objEu(obj)}${zenbat(imp)}.`,
};

export default eu;
