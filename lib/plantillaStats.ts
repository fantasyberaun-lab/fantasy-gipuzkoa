import type { PlantillaSlot } from "@/lib/types";

export interface ResumenPlantilla {
  valorPlantilla: number;
  valorTitulares: number;
  // null si no hay ningún jugador con Elo en ese grupo.
  eloMedioPlantilla: number | null;
  eloMedioTitulares: number | null;
  numTitulares: number;
  // Jugadores sin Elo (Elo 0): no entran en las medias de Elo, porque
  // hundirían el promedio sin decir nada del nivel real del jugador.
  sinElo: number;
}

const redondear2 = (n: number) => Math.round(n * 100) / 100;

function mediaElo(elos: number[]): number | null {
  const conElo = elos.filter((e) => e > 0);
  if (conElo.length === 0) return null;
  return Math.round(conElo.reduce((a, b) => a + b, 0) / conElo.length);
}

export function resumenPlantilla(
  squad: PlantillaSlot[],
  titulares: Record<string, boolean>
): ResumenPlantilla {
  const jugadores = squad.map((s) => s.jugador);
  const titularesJ = jugadores.filter((j) => titulares[j.id]);

  const suma = (lista: typeof jugadores) =>
    redondear2(lista.reduce((total, j) => total + j.valorMercado, 0));

  return {
    valorPlantilla: suma(jugadores),
    valorTitulares: suma(titularesJ),
    eloMedioPlantilla: mediaElo(jugadores.map((j) => j.elo)),
    eloMedioTitulares: mediaElo(titularesJ.map((j) => j.elo)),
    numTitulares: titularesJ.length,
    sinElo: jugadores.filter((j) => !(j.elo > 0)).length,
  };
}
