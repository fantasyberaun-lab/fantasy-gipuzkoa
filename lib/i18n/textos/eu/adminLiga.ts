import type { Seccion } from "../es/adminLiga";

const eu: Seccion = {
  titulo: "Liga kudeatu",
  botonAbrir: "Liga kudeatu",
  botonAbrirDetalle: "Zigorrak, kanporaketak eta merkatua",
  etiquetaAdmin: "Admin",
  etiquetaAdminTitle: "Ligako administratzailea (sortu zuena)",
  volver: "← Itzuli sailkapenera",
  cargando: "Panela kargatzen…",
  soloAdmin:
    "Ligako administratzaileak bakarrik sar daiteke hemen. Administratzailea liga sortu zuena da.",
  soloPrivadas: "Liga publikoak ez du administratzailerik.",
  errorCarga: "Ezin izan da panela kargatu. Saiatu berriro geroago.",
  intro:
    "Liga hau zuk sortu zenuenez, zu zara administratzailea. Hemen egiten duzun guztia Jakinarazpenetan agertzen da liga osoarentzat.",
  mercadoTitulo: "Merkatua",
  mercadoTexto: "Egunean zenbat aldiz ebazten da zure ligako merkatua?",
  tandas: (n: number) => (n === 1 ? "Behin" : `${n} aldiz`),
  horasTandas: (n: number) =>
    n === 1 ? "23:00etan" : n === 2 ? "8:00etan eta 23:00etan" : "8:00etan, 17:00etan eta 23:00etan",
  mercadoAviso:
    "Aldaketa hurrengo txandatik aurrera balio du. Eginda dauden poxak ordutegi berriaren hurrengo orduan ebazten dira. Ezin da aldatu txanda baten aurreko 2 orduetan.",
  mercadoGuardado: "Merkatuaren ordutegia gordeta.",
  mercadoBloqueado: (h: number) =>
    `Orain ezin da aldatu: ${h}:00etako txandarako 2 ordu baino gutxiago falta dira. ${h}:00etatik aurrera aldatu ahal izango duzu.`,
  managersTitulo: "Managerrak",
  sinManagers: "Oraindik ez dago beste managerrik zure ligan.",
  pts: (n: number) => `${n} pt.`,
  sancionPts: (n: number) => `−${n} pt. zigorra`,
  accion: "Zigortu edo kanporatu",
  cerrarAccion: "Itxi",
  tipoPuntos: "Puntuak kendu",
  tipoMillones: "Milioiak kendu",
  tipoAdvertencia: "Abisua",
  tipoExpulsar: "Kanporatu",
  cantidadPuntos: "Kentzen zaizkion puntuak",
  cantidadMillones: "Kentzen zaizkion milioiak",
  motivo: "Arrazoia (liga osoak ikusiko du)",
  motivoPlaceholder: "Adib.: irainak txatean",
  avisoExpulsar: (equipo: string) =>
    `«${equipo}» taldea ezabatuko da, bere plantilla eta puntuekin, eta ezin izango da kodearekin berriro sartu zuk berriro onartu arte. Ezin da desegin.`,
  confirmarSancion: "Aplikatu",
  confirmarExpulsion: "Ligatik kanporatu",
  enviando: "Gordetzen…",
  hecho: {
    puntos: (equipo: string, n: number) => `${equipo}: −${n} puntu.`,
    millones: (equipo: string, n: number) => `${equipo}: −${n} M.`,
    advertencia: (equipo: string) => `Abisua bidali zaio ${equipo} taldeari.`,
    expulsion: (equipo: string) => `${equipo} ligatik kanporatu da.`,
  },
  historialTitulo: "Zigorrak eta abisuak",
  sinHistorial: "Ez duzu zigorrik jarri.",
  lineaSancion: {
    puntos: (n: number) => `−${n} puntu`,
    millones: (n: number) => `−${n} M`,
    advertencia: "Abisua",
  },
  anular: "Baliogabetu",
  confirmarAnular: "Baliogabetu? Abisua kenduko da eta, milioiak baziren, itzuli egingo zaizkio.",
  si: "Bai, baliogabetu",
  no: "Ez",
  anulada: "Zigorra baliogabetuta.",
  expulsadosTitulo: "Kanporatuak",
  sinExpulsados: "Ez duzu inor kanporatu.",
  expulsadoLinea: (manager: string, equipo: string) => `${manager} («${equipo}» zen)`,
  readmitir: "Berriro onartu",
  readmitido: (manager: string) => `${manager} kodearekin berriro sar daiteke.`,
};

export default eu;
