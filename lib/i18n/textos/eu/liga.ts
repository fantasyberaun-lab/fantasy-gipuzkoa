import type { Seccion } from "../es/liga";

const eu: Seccion = {
  tituloSinEquipo: "Fantasy Gipuzkoako Txapelketak",
  sinEquipo: "Oraindik ez duzu talderik inongo ligatan.",
  errorCarga: "Ezin izan ditugu zure ligak kargatu. Zure datuak seguru daude.",
  reintentar: "Saiatu berriro",
  cerrarSesion: "Saioa itxi",

  ligaCreada: "Liga sortu da!",
  compartirCodigo:
    "Partekatu kode hau zure lagunekin, ligara batu daitezen (gehienez 9 liga bakoitzeko):",
  entrarMiLiga: "Sartu nire ligan",
  crearNueva: "Sortu liga berri bat",
  unirmeCodigo: "Batu liga batera kode batekin",
  unirmePublica: "Batu liga publikora (denak denen aurka)",
  nombreLiga: "Ligaren izena",
  placeholderLiga: "Fantasy lagunekin",
  nombreEquipo: "Zure taldearen izena",
  crearLiga: "Sortu liga",
  publicaDescripcion:
    "Manager guztiak lehiatzen diren liga irekia. Denak aurrekontu berarekin eta plantillarik gabe hasten dira: osatu ahalik eta talderik onena Merkatuan fitxatuz; han jokalari guztiak beti daude eskuragarri, eta erostea eta saltzea berehalakoa da.",
  entrando: "Sartzen…",
  entrarPublica: "Sartu liga publikoan",
  codigoLiga: "Ligaren kodea",
  unirme: "Batu",
  seCreaEn: "Liga hemen sortuko da:",
  ambito: "Eremua",
  comunidad: "Autonomia erkidegoa",
  provincia: "Probintzia",
  provinciaProximamente: "Laster: liga honetan oraindik ez dago jokalaririk ez txapelketarik. Oraingoz Gipuzkoa bakarrik dago martxan.",
  ligaDePrueba: "Proba-liga: administratzaileak bakarrik ireki dezake.",
  entrarPrueba: "Sartu proba-ligan",

  salirDe: (liga: string) => `Irten ligatik: ${liga}`,
  salirAvisoAntes: "Zure taldea (",
  salirAvisoDespues:
    ") eta haren saldoa, plantilla eta puntuak ezabatuko dira liga honetan. Zure jokalariak merkatura itzuliko dira. Ezin da desegin.",
  publicaVolver: "Liga publikora berriro sar zaitezke, baina hutsetik hasiko zara.",
  unicoMiembro: "Kide bakarra zara: liga ere ezabatu egingo da.",
  necesitarasCodigo:
    "Berriro sartzeko, ligaren kodea beharko duzu, eta tokia egon beharko da.",
  saliendo: "Irteten…",
  salirLiga: "Irten ligatik",
  unirmeOtra: "Batu beste liga batera",
  tusLigas: "Zure ligak",
  activa: "Aktiboa",
  resumenPublica: (equipo: string, miembros: number, saldo: number) =>
    `${equipo} · Denak denen aurka · ${miembros} manager · ${saldo} M`,
  resumenPrivada: (equipo: string, miembros: number, max: number, codigo: string, saldo: number) =>
    `${equipo} · ${miembros}/${max} · kodea ${codigo} · ${saldo} M`,
  crearOUnirme: "Sortu edo batu beste liga batera",

  copiado: "Kopiatuta!",
  copiarCodigo: "Kopiatu kodea",
};

export default eu;
