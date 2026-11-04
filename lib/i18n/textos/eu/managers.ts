import type { Seccion } from "../es/managers";

const eu: Seccion = {
  cargando: "Profila kargatzen…",
  noEncontrado: "Ez da manager hau aurkitu (edo ez zaudete liga berean).",
  tuPerfil: "Zure profila",
  todosContraTodos: " · Denak denen aurka",
  resumen: "Laburpena",
  jornadas: "Jardunaldiak",
  managerDesde: "Managerra noiztik",
  ligasGanadas: "Irabazitako ligak",
  todaviaNinguna: "Oraindik bat ere ez",
  ligasJugadas: "Jokatzen dituen ligak",
  puntosLiga: "Puntuak liga honetan",
  mejorJornada: "Jardunaldirik onena",
  valorPlantilla: "Plantillaren balioa",
  jugadores: (n: number) => `${n} jokalari`,
  evolucionValorPlantilla: "Plantillaren balioaren bilakaera",
  evolucionVacia: "Oraindik ez dago behar adina egunetako historiarik bilakaera marrazteko.",
  pts: (n: number) => `${n} puntu`,
  cargandoJornadas: "Jardunaldiak kargatzen…",
  sinJornadas:
    "Oraindik ez dago plantillarik erregistratuta. Plantillak automatikoki gordetzen dira larunbatetan 16:00etan.",
  finDeSemana: (fecha: string) => `Asteburua: ${fecha}`,
  pendiente: "Larunbateko 16:00etako plantilla · oraindik emaitzarik gabe",
  cerrada: "Larunbateko 16:00etako plantilla · txapelketa guztiak batera",
  saldoNegativoJornada:
    "Saldoa negatiboan zegoen jardunaldia hasi zenean: talde honek 0 puntu egiten ditu asteburu honetan.",
  habriaSumado: (n: number) => `${n} puntu batuko zituen`,
  descanso: "Atsedena",
  victoria: "Garaipena",
  tablas: "Berdinketa",
  derrota: "Porrota",
  sinResultado: "Emaitzarik gabe",
  categoriaCorta: (n: number) => `${n}. kat.`,
  ronda: (n: number) => ` · ${n}. txanda`,
  capitanCorto: "K",
};

export default eu;
