// Pruebas sin red de los lectores y del emparejador, con páginas de
// ejemplo montadas a mano (basadas en lo que se ve en Info64 y Chess-Results).
// Ejecutar:  npx tsx scripts/test-importador.ts

import type { Pagina, Tabla } from "../lib/importador/tipos";
import { parsearRondaInfo64, parsearTorneoInfo64 } from "../lib/importador/info64";
import {
  parsearRondaChessResults,
  parsearTorneoChessResults,
} from "../lib/importador/chessResults";
import { parsearRankingInfo64 } from "../lib/importador/info64";
import { interpretarResultadoPartida, interpretarSinRival } from "../lib/importador/resultados";
import { buscarJugador, crearIndice } from "../lib/importador/emparejar";

let fallos = 0;
function igual(real: unknown, esperado: unknown, que: string) {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos++;
    console.error(`✗ ${que}\n   esperado ${b}\n   obtenido ${a}`);
  } else console.log(`✓ ${que}`);
}

const fila = (celdas: string[], cabecera = false) => ({
  cabecera,
  celdas: celdas.map((texto) => ({ texto, href: null })),
});
const tabla = (cab: string[], datos: string[][]): Tabla => ({
  filas: [fila(cab, true), ...datos.map((d) => fila(d))],
});
const pagina = (p: Partial<Pagina>): Pagina => ({
  titulo: "",
  tablas: [],
  lineas: [],
  enlaces: [],
  ...p,
});

// ---------------- Info64 ----------------
const rankingInfo64 = tabla(
  ["Ran. (Initial ranking)", "Tit. (Title)", "Name", "Fed. (Federation)", "FIDE", "FIDE ID", "Origin"],
  [
    ["1", "FM", "Ros Eskisabel, Jose Ramon", "ESP", "2053", "2212510", "F. Cultural Renteria"],
    ["2", "CM", "Sarasketa Irastortza, Oier", "ESP", "2053", "54728207", "KBI Zumaia"],
    ["14", "", "San Martin Santamaria, Jose Manu", "ESP", "1796", "553016157", "B. Bera Renteria"],
    ["46", "", "Riestra Manterola, Nicolas", "ESP", "0", "535069643", "Zarauz"],
    ["17", "", "Aranzabal Minguez, Alex", "ESP", "1762", "32077033", "Eibar"],
  ]
);
const paginaFichaInfo64 = pagina({
  titulo: "CAMPEONATO DE GIPUZKOA DE AJEDREZ RAPIDO 2026 - info64.org",
  tablas: [rankingInfo64],
  lineas: [
    "Deba, from 2026-04-26 to 2026-04-26",
    "Chief Arbiter: Lukas Iruretagoiena (I.A. 2204916)",
    "Rate of play: 15 minutes + 5",
  ],
  enlaces: [
    "https://info64.org/campeonato-de-gipuzkoa-de-ajedrez-rapido-2026/1",
    "https://info64.org/campeonato-de-gipuzkoa-de-ajedrez-rapido-2026/2",
    "https://info64.org/campeonato-de-gipuzkoa-de-ajedrez-rapido-2026/standings",
  ],
});
const torneoI = parsearTorneoInfo64(
  paginaFichaInfo64,
  "https://info64.org/campeonato-de-gipuzkoa-de-ajedrez-rapido-2026",
  "campeonato-de-gipuzkoa-de-ajedrez-rapido-2026"
);
igual(torneoI.nombre, "CAMPEONATO DE GIPUZKOA DE AJEDREZ RAPIDO 2026", "Info64: nombre");
igual(
  [torneoI.lugar, torneoI.fechaInicio, torneoI.fechaFin, torneoI.arbitroPrincipal, torneoI.ritmoJuego],
  ["Deba", "2026-04-26", "2026-04-26", "Lukas Iruretagoiena", "15 minutes + 5"],
  "Info64: lugar, fechas, árbitro y ritmo"
);
igual(torneoI.rondasPublicadas, [1, 2], "Info64: rondas publicadas");
igual(torneoI.jugadores.length, 5, "Info64: nº de jugadores");
igual(torneoI.jugadores[0], { rank: 1, nombre: "Ros Eskisabel, Jose Ramon", fideId: "2212510", elo: 2053, club: "F. Cultural Renteria" }, "Info64: jugador 1");
igual(torneoI.jugadores[3].elo, null, "Info64: Elo 0 = sin Elo");

const cabRonda = [
  "Brd. (Board)", "White", "Ran. (Initial ranking)", "Pts. (Points)", "FIDE", "Fed. (Federation)",
  "Res. (Result)", "Black", "Ran. (Initial ranking)", "Pts. (Points)", "FIDE", "Fed. (Federation)",
];
const rondaI = parsearRondaInfo64(
  pagina({
    lineas: ["Pairings of round 3 - 2026-04-26 - 11:45"],
    tablas: [
      tabla(cabRonda, [
        ["1", "San Martin Santamaria, Jose Manu", "14", "2.0", "1796", "ESP", "1-0", "FM Ros Eskisabel, Jose Ramon", "1", "2.0", "2053", "ESP"],
        ["2", "CM Sarasketa Irastortza, Oier", "2", "2.0", "2053", "ESP", "½-½", "Roldan", "3", "2.0", "2033", "ESP"],
        ["3", "Roldan2", "4", "1.0", "1900", "ESP", "", "Otro", "5", "1.0", "1800", "ESP"],
        ["24", "Riestra Manterola, Nicolas", "46", "0.0", "0", "ESP", "+", "", "", "", "", ""],
        ["25", "Aranzabal Minguez, Alex", "17", "0.0", "1762", "ESP", "0"],
      ]),
    ],
  }),
  3,
  torneoI.jugadores
);
igual(rondaI.fecha + " " + rondaI.hora, "2026-04-26 11:45", "Info64 ronda: fecha y hora");
igual(rondaI.partidas.length, 3, "Info64 ronda: partidas");
igual(rondaI.partidas[0].resultado, "blancas", "Info64 ronda: 1-0");
igual(rondaI.partidas[0].negras.nombre, "Ros Eskisabel, Jose Ramon", "Info64 ronda: quita el título FM");
igual(rondaI.partidas[0].negras.fideId, "2212510", "Info64 ronda: FIDE ID por ranking inicial");
igual(rondaI.partidas[1].resultado, "tablas", "Info64 ronda: ½-½");
igual(rondaI.partidas[2].resultado, "pendiente", "Info64 ronda: sin resultado = pendiente");
igual(
  rondaI.sinRival.map((s) => [s.jugador.fideId, s.tipo]),
  [["535069643", "descanso"], ["32077033", "ausente"]],
  "Info64 ronda: '+' = descanso, '0' sin rival = ausente"
);

// ---------------- Chess-Results ----------------
const rankingCR = tabla(
  ["No.", "", "Nombre", "FIDE-ID", "FED", "FIDE"],
  [
    ["1", "", "MUNOZ FERREIRA, Ibon", "54732158", "ESP", "2189"],
    ["2", "", "BARROS PECINA, Daniel", "523096853", "ESP", "1996"],
    ["3", "", "ARANA GARATE, Jon", "22200622", "ESP", "1969"],
    ["4", "", "VERNIER URTASUN, Jon", "94717753", "ESP", "1916"],
  ]
);
const fichaCR = {
  filas: [
    fila(["Organizador", "Gipuzkoako Xake Federazioa - Anaitasuna-kakute X. T.- Eibar X.T. - Elgoibar X.T."]),
    fila(["Federación", "España ( ESP )"]),
    fila(["Director del Torneo", "Julen Rodriguez Aboy"]),
    fila(["Árbitro principal", "Urtzi Urdampilleta Garcia 32077696"]),
    fila(["Control de tiempo (Standard)", "90 min. + 30 seg."]),
    fila(["Lugar", "Azkoitia - Eibar"]),
    fila(["Número de rondas", "5"]),
    fila(["Tipo de torneo", "Sistema Suizo"]),
    fila(["Cálculo de elo", "Elo internacional"]),
    fila(["Fecha", "2026/10/03 al 2026/11/07"]),
  ],
};
const torneoC = parsearTorneoChessResults(
  pagina({
    titulo: "Chess-Results Server Chess-results.com - Gipuzkoako Absolutua 2026ko Txapelketa",
    tablas: [fichaCR, rankingCR],
    lineas: ["Última actualización01.10.2026 18:35:59, Propietario/Última carga: GIPUZKOAKO XAKE FEDERAKUNTZA"],
  }),
  "https://chess-results.com/tnr1497509.aspx?lan=2"
);
igual(torneoC.nombre, "Gipuzkoako Absolutua 2026ko Txapelketa", "Chess-Results: nombre");
igual(
  [torneoC.lugar, torneoC.numeroRondas, torneoC.fechaInicio, torneoC.fechaFin, torneoC.arbitroPrincipal],
  ["Azkoitia - Eibar", 5, "2026-10-03", "2026-11-07", "Urtzi Urdampilleta Garcia"],
  "Chess-Results: lugar, rondas, fechas y árbitro (sin el ID FIDE pegado)"
);
igual(
  [torneoC.sistema, torneoC.ritmoJuego, torneoC.computoElo, torneoC.director],
  ["Sistema Suizo", "90 min. + 30 seg.", "Elo internacional", "Julen Rodriguez Aboy"],
  "Chess-Results: sistema, ritmo, cómputo y director"
);
igual(torneoC.ultimaActualizacion, "01.10.2026 18:35:59", "Chess-Results: última actualización");
igual(torneoC.jugadores.length, 4, "Chess-Results: nº de jugadores");
igual(torneoC.jugadores[0], { rank: 1, nombre: "MUNOZ FERREIRA, Ibon", fideId: "54732158", elo: 2189, club: null }, "Chess-Results: jugador 1");

// Dos diseños posibles de la tabla de rondas (normal y espejo).
const normal = tabla(
  ["Bo.", "No.", "", "Nombre", "Rtg", "Pts.", "Resultado", "Nombre", "Rtg", "Pts.", "No."],
  [
    ["1", "1", "", "MUNOZ FERREIRA, Ibon", "2189", "0", "1 - 0", "ARANA GARATE, Jon", "1969", "0", "3"],
    ["2", "2", "", "BARROS PECINA, Daniel", "1996", "0", "½ - ½", "VERNIER URTASUN, Jon", "1916", "0", "4"],
  ]
);
const espejo = tabla(
  ["Bo.", "No.", "Name", "Rtg", "FED", "Pts.", "Result", "Pts.", "FED", "Rtg", "Name", "No."],
  [
    ["1", "1", "MUNOZ FERREIRA, Ibon", "2189", "ESP", "0", "0 - 1", "0", "ESP", "1969", "ARANA GARATE, Jon", "3"],
    ["2", "5", "SIN RANK, Nadie", "1500", "ESP", "0", "1", "0", "ESP", "0", "bye", ""],
  ]
);
for (const [nombre, t] of [["normal", normal], ["espejo", espejo]] as const) {
  const r = parsearRondaChessResults(pagina({ tablas: [t] }), 1, torneoC.jugadores);
  igual(r.partidas[0].blancas.fideId, "54732158", `Chess-Results ronda (${nombre}): FIDE ID de blancas`);
  igual(r.partidas[0].negras.fideId, "22200622", `Chess-Results ronda (${nombre}): FIDE ID de negras`);
  igual(r.partidas[0].resultado, nombre === "normal" ? "blancas" : "negras", `Chess-Results ronda (${nombre}): resultado`);
}
const rEsp = parsearRondaChessResults(pagina({ tablas: [espejo] }), 1, torneoC.jugadores);
igual(rEsp.sinRival.map((s) => s.tipo), ["descanso"], "Chess-Results ronda: bye");

let mensajeError = "";
try {
  parsearRondaChessResults(pagina({ tablas: [rankingCR] }), 2, torneoC.jugadores);
} catch (e) {
  mensajeError = (e as Error).message;
}
igual(mensajeError.includes("Cabeceras vistas"), true, "Chess-Results ronda: error claro si no hay tabla");

// ---------------- Resultados ----------------
for (const [txt, esperado] of [
  ["1-0", "blancas"], ["1 - 0", "blancas"], ["0-1", "negras"], ["½-½", "tablas"], ["1/2-1/2", "tablas"],
  ["0,5 - 0,5", "tablas"], ["", "pendiente"], ["+", "incomparecencia"], ["+-", "incomparecencia"],
  ["-:+", "incomparecencia"], ["0-0", "desconocido"],
] as const) igual(interpretarResultadoPartida(txt), esperado, `resultado "${txt}"`);
for (const [txt, esperado] of [
  ["+", "descanso"], ["1", "descanso"], ["bye", "descanso"], ["½", "medio_punto"], ["0", "ausente"],
] as const) igual(interpretarSinRival(txt), esperado, `sin rival "${txt}"`);

// ---------------- Emparejador ----------------
const indice = crearIndice([
  { id: "a", nombre: "Muñoz Ferreira, Ibon", fideId: "54732158" },
  { id: "b", nombre: "Barros Pecina, Daniel", fideId: null },
  { id: "c", nombre: "Garcia, Jon", fideId: null },
  { id: "d", nombre: "Garcia, Jon", fideId: "111" },
]);
igual(buscarJugador(indice, { fideId: "54732158", nombre: "otro nombre" }), { id: "a", por: "fide" }, "emparejar: por FIDE ID");
igual(buscarJugador(indice, { fideId: null, nombre: "IBON MUNOZ FERREIRA" }), { id: "a", por: "nombre" }, "emparejar: nombre sin tildes y en otro orden");
igual(buscarJugador(indice, { fideId: "999", nombre: "BARROS PECINA, Daniel" }), { id: "b", por: "nombre" }, "emparejar: FIDE ID desconocido -> nombre");
igual(buscarJugador(indice, { fideId: null, nombre: "Garcia, Jon" }), null, "emparejar: nombre repetido no se enlaza");
igual(buscarJugador(indice, { fideId: null, nombre: "Nadie, Nadie" }), null, "emparejar: no encontrado");

if (fallos > 0) {
  console.error(`\n${fallos} prueba(s) fallida(s)`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasan");
