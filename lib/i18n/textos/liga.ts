import { definirTextos } from "../definir";

// Crear / unirse / cambiar / salir de ligas.
export default definirTextos(
  {
    // Pantalla sin equipo (LigaGate)
    tituloSinEquipo: "Fantasy Campeonatos de Gipuzkoa",
    sinEquipo: "Todavía no tienes equipo en ninguna liga.",
    cerrarSesion: "Cerrar sesión",

    // Formulario (LigaForm)
    ligaCreada: "¡Liga creada!",
    compartirCodigo: "Comparte este código con tus amigos para que se unan (máximo 9 por liga):",
    entrarMiLiga: "Entrar a mi liga",
    crearNueva: "Crear una liga nueva",
    unirmeCodigo: "Unirme a una liga con un código",
    unirmePublica: "Unirme a la liga pública (todos contra todos)",
    nombreLiga: "Nombre de la liga",
    placeholderLiga: "Fantasy con los amigos",
    nombreEquipo: "Nombre de tu equipo",
    crearLiga: "Crear liga",
    publicaDescripcion:
      "Liga abierta en la que compiten todos los managers. Todos empiezan con el mismo presupuesto y sin plantilla: construye el mejor equipo posible fichando en el Mercado, donde todos los jugadores están siempre disponibles y comprar y vender es inmediato.",
    entrando: "Entrando…",
    entrarPublica: "Entrar en la liga pública",
    codigoLiga: "Código de la liga",
    unirme: "Unirme",

    // Modal de ligas (CambiarLigaModal)
    salirDe: (liga: string) => `Salir de ${liga}`,
    salirAvisoAntes: "Se borrarán tu equipo ",
    salirAvisoDespues:
      ", su saldo, su plantilla y sus puntos en esta liga. Tus jugadores volverán al mercado. No se puede deshacer.",
    publicaVolver: "Podrás volver a entrar a la liga pública, pero empezarás de cero.",
    unicoMiembro: "Eres el único miembro: la liga se eliminará también.",
    necesitarasCodigo: "Para volver a entrar necesitarás el código de la liga y que haya hueco.",
    saliendo: "Saliendo…",
    salirLiga: "Salir de la liga",
    unirmeOtra: "Unirme a otra liga",
    tusLigas: "Tus ligas",
    activa: "Activa",
    resumenPublica: (equipo: string, miembros: number, saldo: number) =>
      `${equipo} · Todos contra todos · ${miembros} managers · ${saldo} M`,
    resumenPrivada: (equipo: string, miembros: number, max: number, codigo: string, saldo: number) =>
      `${equipo} · ${miembros}/${max} · código ${codigo} · ${saldo} M`,
    crearOUnirme: "Crear o unirme a otra liga",

    // Botón de copiar código
    copiado: "¡Copiado!",
    copiarCodigo: "Copiar código",
  },
  {
    eu: {
      tituloSinEquipo: "Fantasy Gipuzkoako Txapelketak",
      sinEquipo: "Oraindik ez duzu talderik inongo ligatan.",
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
    },
    en: {
      tituloSinEquipo: "Gipuzkoa Championships Fantasy",
      sinEquipo: "You don't have a team in any league yet.",
      cerrarSesion: "Log out",

      ligaCreada: "League created!",
      compartirCodigo: "Share this code with your friends so they can join (max. 9 per league):",
      entrarMiLiga: "Go to my league",
      crearNueva: "Create a new league",
      unirmeCodigo: "Join a league with a code",
      unirmePublica: "Join the public league (everyone vs everyone)",
      nombreLiga: "League name",
      placeholderLiga: "Fantasy with friends",
      nombreEquipo: "Your team name",
      crearLiga: "Create league",
      publicaDescripcion:
        "An open league where every manager competes. Everyone starts with the same budget and no squad: build the best team you can by signing players in the Market, where every player is always available and buying and selling is instant.",
      entrando: "Joining…",
      entrarPublica: "Join the public league",
      codigoLiga: "League code",
      unirme: "Join",

      salirDe: (liga: string) => `Leave ${liga}`,
      salirAvisoAntes: "Your team ",
      salirAvisoDespues:
        ", its balance, squad and points in this league will be deleted. Your players will go back to the market. This can't be undone.",
      publicaVolver: "You can rejoin the public league, but you'll start from scratch.",
      unicoMiembro: "You're the only member: the league will be deleted too.",
      necesitarasCodigo: "To rejoin you'll need the league code and a free spot.",
      saliendo: "Leaving…",
      salirLiga: "Leave league",
      unirmeOtra: "Join another league",
      tusLigas: "Your leagues",
      activa: "Active",
      resumenPublica: (equipo: string, miembros: number, saldo: number) =>
        `${equipo} · Everyone vs everyone · ${miembros} managers · ${saldo} M`,
      resumenPrivada: (equipo: string, miembros: number, max: number, codigo: string, saldo: number) =>
        `${equipo} · ${miembros}/${max} · code ${codigo} · ${saldo} M`,
      crearOUnirme: "Create or join another league",

      copiado: "Copied!",
      copiarCodigo: "Copy code",
    },
  }
);
