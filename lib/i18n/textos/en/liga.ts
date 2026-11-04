import type { Seccion } from "../es/liga";

const en: Seccion = {
  tituloSinEquipo: "Gipuzkoa Championships Fantasy",
  sinEquipo: "You don't have a team in any league yet.",
  errorCarga: "We couldn't load your leagues. Your data is safe.",
  reintentar: "Try again",
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
  seCreaEn: "The league will be created in:",
  ambito: "Scope",
  comunidad: "Autonomous community",
  provincia: "Province",
  provinciaProximamente: "Coming soon: this league has no players or tournaments yet. For now only Gipuzkoa is live.",
  ligaDePrueba: "Test league: only the administrator can open it.",
  entrarPrueba: "Enter the test league",

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
};

export default en;
