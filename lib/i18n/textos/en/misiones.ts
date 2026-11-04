import type { Seccion } from "../es/misiones";

const en: Seccion = {
  titulo: "Missions",
  volver: "← Back",
  tarjeta: "Missions",
  tarjetaDetalle: "Earn XP and level up",
  tarjetaListas: (n: number) => `${n} ${n === 1 ? "mission" : "missions"} ready`,
  intro:
    "Complete missions to earn XP. Claiming one unlocks the next in its series, harder and worth more XP. They're long: built to last for years.",
  cargando: "Loading missions…",
  error: "Couldn't load missions. Please try again.",
  reintentar: "Retry",
  listas: (n: number) => `${n} ${n === 1 ? "mission" : "missions"} ready to claim`,
  ningunaLista: "No missions ready yet",
  soloListas: "Ready to claim only",
  nadaAqui: "Nothing to claim in this tab.",
  escalon: (n: number, total: number) => `Mission ${n} of ${total}`,
  recompensa: (xp: number) => `+${xp} XP`,
  reclamar: (xp: number) => `Claim +${xp} XP`,
  reclamando: "Claiming…",
  reclamada: (xp: number) => `+${xp} XP!`,
  completada: "Series complete",
  verNiveles: "See my level",
  puesto: (n: number) => `#${n}`,
  sinPuesto: "No rank",
  pestanas: {
    pub: "Public league",
    pri: "Private leagues",
    gen: "Account",
    mj: "Minigames",
  },
  ayudaPestana: {
    pub: "Only your teams in the active public league count. Squad, cash and lineup missions are checked when the round starts (Saturday) and only count with a non-negative balance.",
    pri: "Your teams in private leagues count, with their own counters. They give less XP and sales between managers have anti-cheating rules.",
    gen: "Your account, whatever the league.",
    mj: "Everything you do in the minigames.",
  },
  grupos: {
    partidas: "Games and points",
    clasificacion: "Standings",
    economia: "Squad and economy",
    mercado: "Market",
    progresion: "Progression",
    minijuegos: "Minigames",
  },
  series: {
    caz100: {
      titulo: "Giant slayer +100",
      texto: (n: number) =>
        `Win ${n} ${n === 1 ? "game" : "games"} with players in your lineup against opponents rated 100 Elo above them or more.`,
    },
    caz200: {
      titulo: "Giant slayer +200",
      texto: (n: number) =>
        `Win ${n} ${n === 1 ? "game" : "games"} with players in your lineup against opponents rated 200 Elo above them or more.`,
    },
    caz300: {
      titulo: "Giant slayer +300",
      texto: (n: number) =>
        `Win ${n} ${n === 1 ? "game" : "games"} with players in your lineup against opponents rated 300 Elo above them or more.`,
    },
    capitan: {
      titulo: "Captain's armband",
      texto: (_n: number, f: string) => `Score ${f} points with your captain (with the multiplier).`,
    },
    oro: {
      titulo: "Golden round",
      texto: (_n: number, f: string) => `Score ${f} points or more with your team in a single round.`,
    },
    regular: {
      titulo: "Consistency",
      texto: (n: number) => `Score 25 points or more in ${n} rounds in a row.`,
    },
    victorias: {
      titulo: "Winners",
      texto: (_n: number, f: string) => `Get ${f} wins with your lineup players.`,
    },
    capgig: {
      titulo: "Giant captain",
      texto: (n: number) =>
        `Have your captain win ${n} ${n === 1 ? "game" : "games"} against opponents rated 100 Elo above them or more.`,
    },
    cuatro: {
      titulo: "Four of six",
      texto: (n: number) =>
        `Have 4 or more of your lineup players win in the same round, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    pleno: {
      titulo: "Clean sweep",
      texto: (n: number) =>
        `Have all 6 lineup players win in the same round, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    fiel: {
      titulo: "Loyal player",
      texto: (n: number) => `Keep the same player in your lineup for ${n} rounds in a row.`,
    },
    pujas: {
      titulo: "Bid hunter",
      texto: (n: number) => `Win market bids for ${n} different players.`,
    },
    fichajes: {
      titulo: "Signer",
      texto: (n: number) => `Sign ${n} different players.`,
    },
    blindaje: {
      titulo: "Shielded",
      texto: (n: number) => `Shield ${n} different players.`,
    },
    subircl: {
      titulo: "Clause up",
      texto: (n: number) => `Raise the clause of ${n} different players.`,
    },
    clausulazo: {
      titulo: "Clause in hand",
      texto: (n: number) => `Pay the release clause of ${n} different players from other managers.`,
    },
    plusvalia: {
      titulo: "Capital gain",
      texto: (_n: number, f: string) =>
        `Earn ${f} M in total by selling players for more than you paid (to the market or the machine).`,
    },
    mejorop: {
      titulo: "Best deal",
      texto: (_n: number, f: string) =>
        `Earn ${f} M or more on a single sale compared with what you paid for the player.`,
    },
    top10: {
      titulo: "Top ten",
      texto: (n: number) =>
        `Finish in the top 10 of a public league round, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    podio: {
      titulo: "Podium",
      texto: (n: number) =>
        `Finish in the top 3 of a public league round, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    primero: {
      titulo: "At the top",
      texto: (n: number) =>
        `Finish first in a public league round, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    lider: {
      titulo: "Overall leader",
      texto: (n: number) =>
        `Lead the public league overall standings after a round, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    presencia: {
      titulo: "Presence",
      texto: (n: number) =>
        `End ${n} rounds in the top 10 of the public league overall standings.`,
    },
    valorplantilla: {
      titulo: "Millionaire squad",
      texto: (_n: number, f: string) =>
        `Present when the round starts (Saturday) a squad worth ${f} M in the public league.`,
    },
    caja: {
      titulo: "Strongbox",
      texto: (_n: number, f: string) => `Have ${f} M in cash in the public league when the round starts (Saturday).`,
    },
    estrella: {
      titulo: "Star player",
      texto: (_n: number, f: string) =>
        `Have a player worth ${f} M or more in your public league squad when the round starts (Saturday).`,
    },
    lujo: {
      titulo: "Luxury squad",
      texto: (n: number) => `Field ${n} players worth 100 M or more at the same time on Saturday in the public league, with a positive balance.`,
    },
    mercader: {
      titulo: "Trader",
      texto: (_n: number, f: string) =>
        `Sell players to other managers in private leagues for ${f} M in total (each sale counts for at most the player's release clause value).`,
    },
    ganajor: {
      titulo: "King of the league",
      texto: (n: number) =>
        `Win ${n} rounds in private leagues with at least 5 managers scoring.`,
    },
    rachadiaria: {
      titulo: "Streak",
      texto: (n: number) => `Reach a ${n}-day streak.`,
    },
    nivel: {
      titulo: "Master",
      texto: (n: number) => `Reach level ${n}.`,
    },
    veterano: {
      titulo: "Veteran",
      texto: (n: number) => `Open the app on ${n} different days.`,
    },
    cofres: {
      titulo: "Streak chests",
      texto: (n: number) => `Open ${n} streak chests.`,
    },
    semana: {
      titulo: "Perfect week",
      texto: (n: number) =>
        `Log in all 7 days of a week (Monday to Sunday) and complete the minigames each day: ${n} ${n === 1 ? "week" : "weeks"}.`,
    },
    diacompleto: {
      titulo: "Full day",
      texto: (n: number) => `Complete all 8 daily minigames on ${n} days.`,
    },
    seguidos: {
      titulo: "Never miss a day",
      texto: (n: number) => `Complete all 8 daily minigames ${n} days in a row.`,
    },
    cadena: {
      titulo: "Chain",
      texto: (n: number) =>
        `Chain ${n} correct answers in a row in one Higher or Lower game (the maximum is 20).`,
    },
    cadenaperf: {
      titulo: "Perfect chain",
      texto: (n: number) =>
        `Get all 20 correct answers in Higher or Lower in ${n} ${n === 1 ? "game" : "games"}.`,
    },
    m900v: {
      titulo: "Outstanding",
      texto: (n: number) =>
        `Score 900 points or more in a daily minigame game, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    m900j: {
      titulo: "Outstanding at everything",
      texto: (n: number) => `Score 900 points or more in ${n} different minigames.`,
    },
    perfn: {
      titulo: "No mistakes",
      texto: (n: number) =>
        `Play a perfect game (every round correct) in ${n} different minigames.`,
    },
    perfleyj: {
      titulo: "Flawless legend",
      texto: (n: number) =>
        `Play a perfect game in legend mode in ${n} different minigames.`,
    },
    perfleyv: {
      titulo: "Unbeatable legend",
      texto: (n: number) => `Play ${n} perfect games in legend mode.`,
    },
    rankmj: {
      titulo: "Top of the ranking",
      texto: (n: number) =>
        n === 1
          ? "Be number 1 in the overall minigames ranking (with 10 or more participants)."
          : `Reach position ${n} in the overall minigames ranking (with 10 or more participants).`,
    },
    primerodia: {
      titulo: "Daily winner",
      texto: (n: number) =>
        `Finish first in a minigame's daily ranking (with 5 or more players), ${n} ${n === 1 ? "time" : "times"}.`,
    },
    maraton: {
      titulo: "Marathon",
      texto: (_n: number, f: string) => `Play ${f} minigame games.`,
    },
    cofresmj: {
      titulo: "Daily chests",
      texto: (n: number) => `Open ${n} minigame chests.`,
    },
    m500x8: {
      titulo: "Even level",
      texto: (n: number) =>
        `Score 500 points or more in all 8 minigames on the same day, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    tt4: {
      titulo: "Almost all-round",
      texto: (n: number) =>
        `Score 800 points or more in 4 minigames on the same day, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    tt8: {
      titulo: "All-rounder",
      texto: (n: number) =>
        `Score 800 points or more in all 8 minigames on the same day, ${n} ${n === 1 ? "time" : "times"}.`,
    },
    plenopron: {
      titulo: "Perfect forecast",
      texto: (n: number) =>
        `Get every forecast right in a tournament round (4 boards or more), ${n} ${n === 1 ? "time" : "times"}.`,
    },
    alinea120: {
      titulo: "Galactic lineup",
      texto: (n: number) =>
        `Field ${n} starters worth 120 M or more at the same time on Saturday in the public league.`,
    },
    sinelo: {
      titulo: "Unrated squad",
      texto: (n: number) => `Have ${n} players without an Elo rating in your squad at the same time on Saturday.`,
    },
    sinelov: {
      titulo: "Unrated wins",
      texto: (n: number) =>
        `Win ${n} ${n === 1 ? "game" : "games"} with unrated players in your lineup.`,
    },
    puntosmj: {
      titulo: "Minigame points",
      texto: (_n: number, f: string) => `Score ${f} points in total in the minigames.`,
    },
  },
  // Guía de estreno (TutorialMisiones)
  tutorial: {
    saltar: "Skip",
    siguiente: "Next",
    entendido: "Got it!",
    pasoDe: (n: number, total: number) => `${n} of ${total}`,
    perfilTitulo: "Missions are here",
    perfilTexto:
      "Complete goals and earn XP to level up. When a mission is ready, your My profile card turns gold and takes you straight to it.",
    escalonTitulo: "How they work",
    escalonTexto:
      "Each mission has a progress bar. When it fills up, tap “Claim” to collect its XP and the next one in the series unlocks, harder and worth more XP. There is one tab for each place you play: public league, private leagues, minigames and a general one for your account. Each keeps its own progress.",
  },
};

export default en;
