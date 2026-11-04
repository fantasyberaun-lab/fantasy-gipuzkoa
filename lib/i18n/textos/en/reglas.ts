import type { Seccion } from "../es/reglas";

// "8:00, 17:00 y 23:00" (o "8:00etan, 17:00etan eta 23:00etan").
function listaHoras(horas: number[], y: string, sufijo = ""): string {
  const textos = horas.map((h) => `${h}:00${sufijo}`);
  if (textos.length <= 1) return textos.join("");
  return `${textos.slice(0, -1).join(", ")}${y}${textos[textos.length - 1]}`;
}

const en: Seccion = {
  titulo: "How the game works",
  puntosTitulo: "Points",
  puntosIntro:
    "Each matchday your 6 starters score points (bench players don't count). The points for each game depend on the result and on the Elo difference with the opponent (opponent's Elo − your Elo):",
  tablaDiferencia: "Elo difference",
  tablaResultados: "Win · Draw · Loss",
  tramo1: "29 or less (includes lower-rated opponents)",
  tramo2: "30 to 99",
  tramo3: "100 to 199",
  tramo4: "200 to 299",
  tramo5: "300 or more",
  bonus:
    "**Win bonus.** Depending on the tournament, winning gives extra points: Third and Cadet, **+1**; Second, Gros Open and Super Veterans, **+2**; Absolute, **+3**. It only applies to wins (not draws or losses). Players with 0 Elo always score 3 points per win (plus the tournament bonus).",
  descanso: (n: number) =>
    `**Bye.** If your player is left unpaired on a matchday, they get ${n} point. It counts the same whether they have a bye (no opponent) or asked not to be paired.`,
  finDeSemana:
    "**Your weekend squad.** On Saturday at 16:00 your starters and captain are saved. That squad counts for every round played that weekend, in any tournament (even if one tournament is on round 1 and another on round 2). When the weekend ends, your points are the sum of what each starter scored.",
  unTorneo:
    "**One player, one tournament.** If one of your starters plays in more than one tournament on the same weekend, they only score for you in the tournament where they got the most points; the other counts as 0. For example: if they get 5 points in Second and 3 in the Gros Open, you get 5.",
  limite: (n: number) =>
    `Starter limit: at most ${n} of your starters can be registered in the same tournament. In Squad you can see how many you have per tournament. With a negative balance you don't score.`,
  automatico: (n: number) =>
    `**Automatic starter.** If you have fewer than ${n} starters, players you sign go straight into the starting line-up (as long as the per-tournament limit isn't exceeded). You can move them to the bench whenever you like.`,
  mercadoTitulo: "Market and bids (private leagues)",
  mercado:
    (horas: number[]) =>
      `Your league's market refreshes at ${listaHoras(horas, " and ")} (Spanish time; the league admin chooses); the countdown on the Market screen tells you how long is left. When it's resolved, the player goes to whoever made the highest bid, who pays what they bid. In a tie, the earliest bid wins.`,
  ventaMaquina:
    "**Selling.** In private leagues players aren't sold instantly: you put them up for sale and, at each market update, the machine makes you an offer around their value (between 10 % less and 10 % more, usually close). You accept or reject it; if you reject it, you get another one next time. Meanwhile, the player stays in your team and keeps scoring.",
  pujasOcultas:
    "**Hidden bids.** During the last 2 hours before the market refreshes, other people's bids are hidden: you only see how many people have bid for each player, not the price or who. You can still see your own bid. The Market has a countdown telling you how long until bids are hidden.",
  capitanTitulo: "Captain",
  capitan: (mult: number) =>
    `Choose one of your starters as captain: everything they get that matchday (game points, win bonus or bye point) is multiplied by **${mult}**.`,
  capitanUnico:
    "Each team can only have one captain and they must be a starter: if you move them to the bench or sell them, they lose the captaincy.",
  clausulazosTitulo: "Clause buyouts (private leagues)",
  clausula: (pct: number) =>
    `Every player has a release clause: ${pct} % of what their owner paid for them (or of their market value if they got them free in the starting squad), rounded up to the next million. If you pay it, the player joins your squad and the owner can't refuse (as long as you have enough balance).`,
  subirClausula: (mult: number) =>
    `**Raise the clause.** You can pay an amount for one of your players to protect them: each M you pay raises their clause by ${mult} M. That extra is lost if the player leaves your squad.`,
  candado:
    "**Lock.** A newly signed player (by bid or by clause buyout) can't be bought out for one week after signing.",
  cierre:
    "**Clause buyout window closed.** They can't be made from Friday 16:00 until Saturday 18:00 (Spanish time). If you try during that window, the app warns you and nothing is paid.",
  sinClausulazosPublica:
    "There are no clause buyouts in the public league: you sign and sell instantly in the Market.",
  blindajeTitulo: "Shield (private leagues)",
  blindaje: (pct: number) =>
    `Shielding a player stops anyone from buying out their clause for one week. It costs ${pct} % of their market value, rounded up to the next million.`,
  blindajeUno: "You can only shield one player per matchday.",
};

export default en;
