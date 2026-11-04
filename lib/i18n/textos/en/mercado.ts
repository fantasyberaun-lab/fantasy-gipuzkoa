import type { Seccion } from "../es/mercado";

const en: Seccion = {
  cargando: "Loading the market…",
  titulo: "Market",
  tuSaldo: "Your balance:",
  pujaRegistrada: "Bid placed.",
  pujaCancelada: "Bid cancelled. Your balance hasn't been affected.",
  pujasOcultas: "Bids hidden",
  pujasSeOcultanEn: "Bids hidden in",
  ocultas: "Hidden",
  seActualizaEn: "Market updates in",
  jugadoresEnTanda: (n: number) =>
    `${n} ${n === 1 ? "player" : "players"} on the market today.`,
  avisoOcultas: "In the last 2 hours you only see how many people have bid, not the amounts.",
  avisoAntesOcultar:
    "2 hours before the market updates, other managers' bids are hidden: you'll only see how many people have bid, not the price.",
  buscarJugador: "Search player by name...",
  ordenarValor: "Sort by value",
  ordenarElo: "Sort by Elo",
  ordenarPuntos: "Sort by points",
  ordenarPujas: "Sort by number of bids",
  ordenarNombre: "Sort by name",
  ordenarCategoria: "Sort by category",
  sinJugadores: "There are no players on the market right now.",
  sinCoincidencias: (busqueda: string) => `No players match "${busqueda}".`,
  ptsTemporada: (n: number) => `${n} pts this season`,
  numPujas: (n: number) => `${n} ${n === 1 ? "bid" : "bids"}`,
  tuPujaImporte: (importe: number) => `Your bid: ${importe} M`,
  ocultarPuntos: "Hide points",
  verPuntosJornada: "View points per matchday",
  verPuntos: "View points",
  pujasPorEsteJugador: "Bids for this player",
  nadiePorAhora: "No one has bid yet.",
  resumenPujasOcultas: (total: number, conMiPuja: boolean, otras: number) =>
    `${total} ${total === 1 ? "bid" : "bids"} in total${
          conMiPuja ? ` (${otras === 0 ? "only yours" : `yours and ${otras} more`})` : ""
        }. Amounts are hidden until the market updates.`,
  nadieTodavia: (minimo: number) =>
    `No bids yet. With the minimum bid (${minimo} M) you'd get the player if no one bids more.`,
  tuPuja: "Your bid",
  laMasAlta: "highest",
  valorSubio: (valor: number, miImporte: number) =>
    `The player's value has risen to ${valor} M, but your ${miImporte} M bid still stands. It competes at its amount: anyone bidding now must reach the current value.`,
  etiquetaImporte: (mejorar: boolean, minimo: number) =>
    `${mejorar ? "Raise your bid" : "Bid amount"} (M) — minimum ${minimo} M`,
  pujar: "Bid",
  cancelarMiPuja: (importe: number) => `Cancel my bid (${importe} M)`,
  saldoYPlantilla: (saldo: number, n: number, max: number) =>
    `Balance: ${saldo} M · Squad: ${n}/${max}`,
  explicacionPublica:
    "Public league: every player is always available and anyone can own the same player. Buying and selling is instant, at market value.",
  buscarJugadorClub: "Search player or club...",
  valorDesc: "Value: high to low",
  valorAsc: "Value: low to high",
  eloDesc: "Elo: high to low",
  eloAsc: "Elo: low to high",
  todasCategorias: "All categories",
  todosTorneos: "All tournaments",
  torneoAria: "Tournament",
  categoriaN: (n: number) => `Category ${n}`,
  todosJugadores: "All players",
  soloMiPlantilla: "My squad only",
  soloAsequibles: "Only ones I can afford",
  sinJugadoresLiga: "No players have been loaded into the league yet.",
  sinCoincidenciasFiltros: "No players match the filters.",
  plantillaLlena: (max: number) =>
    `Your squad already has the ${max} players allowed: sell one first.`,
  teFaltan: (falta: number) => `You need ${falta} M more to sign this player.`,
  enTuPlantilla: "In your squad",
  fichadoPor: (valor: number) => `Signed for ${valor} M.`,
  vendidoPor: (valor: number) => `Sold for ${valor} M.`,
  vendiendo: "Selling…",
  siVenderPor: (valor: number) => `Yes, sell for ${valor} M`,
  venderPor: (valor: number) => `Sell for ${valor} M`,
  fichando: "Signing…",
  ficharPor: (valor: number) => `Sign for ${valor} M`,
  mostrarMas: (restantes: number) => `Show more (${restantes} left)`,
  clausulazosCerrados:
    "Clause buyouts are closed: they can't be made from Friday 16:00 until Saturday 18:00.",
  buscar: "Search…",
  sinResultados: "No results",
  yMas: (n: number) => `And ${n} more — keep typing to narrow it down.`,
};

export default en;
