import type { Seccion } from "../es/clasificacion";

const en: Seccion = {
  cargando: "Loading standings…",
  titulo: "Overall standings",
  managersPublica: (n: number) =>
    `${n} ${n === 1 ? "manager" : "managers"} in the public league`,
  jornadaAria: "Matchday",
  puntosTotales: "Total points",
  jornadaFecha: (n: number, fecha: string) => `Matchday ${n} · ${fecha}`,
  enJuego: "in progress",
  enJornada: (n: number) => `on matchday ${n}`,
  esteAno: "this year",
  tuPosicion: "Your position:",
  posicionDe: (pos: number, total: number) => [`#${pos}`, ` of ${total}`] as const,
  irAMiEquipo: "Go to my team",
  buscar: "Search by team or username…",
  vacia: "There are no teams in the standings yet.",
  sinCoincidencias: (q: string) => `No team matches “${q}”.`,
  verPerfil: "View manager profile",
  verJornadasTitle: "View squad and points for each matchday",
  jornadas: "Matchdays",
  pts: (n: number) => `${n} pts`,
  plantilla: "Squad",
  mostrarMas: (n: number) => `Show more (${n} left)`,
  cerrar: "Close",
  cargandoPlantilla: "Loading squad…",
  errorPlantilla: "The squad couldn't be loaded.",
  sinFichajes: "This manager hasn't signed anyone yet.",
  categoriaCorta: (n: number | string) => `Div. ${n}`,
  ocultarPuntos: "Hide points",
  verPuntos: "View points",
  importeOferta: "Offer amount (M)",
  hacerOferta: "Make offer",
  pagarClausula: (m: number) => `Pay clause (${m} M)`,
  cancelarOferta: (m: number) => `Cancel my offer (${m} M)`,
  tuSaldo: (m: number) => `Your balance: ${m} M`,
  ofertaEnviada: "Offer sent.",
  ofertaCancelada: "Offer cancelled. Your balance hasn't been affected.",
  clausulaPagada: "Clause paid — the player is now yours.",
  numJugadores: (n: number) => `${n} ${n === 1 ? "player" : "players"}`,
  clausulaCorta: (m: number) => `Clause ${m} M`,
  protegidos: (n: number) =>
    n === 1
      ? "1 player is shielded or locked: no clause buyout possible right now."
      : `${n} players are shielded or locked: no clause buyout possible right now.`,
  teFaltan: (m: number) => `You need ${m} M more to pay the clause.`,
  sancion: (n: number) => `includes −${n} penalty`,
};

export default en;
