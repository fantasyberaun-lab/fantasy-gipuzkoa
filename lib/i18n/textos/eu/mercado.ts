import type { Seccion } from "../es/mercado";

const eu: Seccion = {
  cargando: "Merkatua kargatzen…",
  titulo: "Merkatua",
  tuSaldo: "Zure saldoa:",
  pujaRegistrada: "Poxa erregistratu da.",
  pujaCancelada: "Poxa bertan behera utzi da. Zure saldoak ez du aldaketarik izan.",
  pujasOcultas: "Poxak ezkutuan",
  pujasSeOcultanEn: "Poxak ezkutatu arte",
  ocultas: "Ezkutuan",
  seActualizaEn: "Merkatua eguneratu arte",
  jugadoresEnTanda: (n: number) => `${n} jokalari gaurko txandan.`,
  avisoOcultas:
    "Azken 2 orduetan zenbat jendek poxatu duen bakarrik ikusten duzu, ez zenbatekoak.",
  avisoAntesOcultar:
    "Merkatua eguneratu baino 2 ordu lehenago, besteen poxak ez dira gehiago ikusiko: zenbat jendek poxatu duen bakarrik ikusiko duzu, ez prezioa.",
  buscarJugador: "Bilatu jokalaria izenez...",
  ordenarValor: "Ordenatu balioaren arabera",
  ordenarElo: "Ordenatu Eloaren arabera",
  ordenarPuntos: "Ordenatu puntuen arabera",
  ordenarPujas: "Ordenatu poxa kopuruaren arabera",
  ordenarNombre: "Ordenatu izenaren arabera",
  ordenarCategoria: "Ordenatu kategoriaren arabera",
  sinJugadores: "Une honetan ez dago jokalaririk merkatuan.",
  sinCoincidencias: (busqueda: string) =>
    `Ez dago "${busqueda}" bilaketarekin bat datorren jokalaririk.`,
  ptsTemporada: (n: number) => `${n} puntu denboraldi honetan`,
  numPujas: (n: number) => `${n} poxa`,
  tuPujaImporte: (importe: number) => `Zure poxa: ${importe} M`,
  ocultarPuntos: "Ezkutatu puntuak",
  verPuntosJornada: "Ikusi puntuak jardunaldika",
  verPuntos: "Ikusi puntuak",
  pujasPorEsteJugador: "Jokalari honen poxak",
  nadiePorAhora: "Oraingoz inork ez du poxatu.",
  resumenPujasOcultas: (total: number, conMiPuja: boolean, otras: number) =>
    `Guztira ${total} poxa${
          conMiPuja ? ` (${otras === 0 ? "zurea bakarrik" : `zurea eta beste ${otras}`})` : ""
        }. Zenbatekoak ezkutuan daude merkatua eguneratu arte.`,
  nadieTodavia: (minimo: number) =>
    `Oraindik inork ez du poxatu. Gutxieneko poxarekin (${minimo} M) zuretzat izango litzateke, inork gehiago poxatzen ez badu.`,
  tuPuja: "Zure poxa",
  laMasAlta: "altuena",
  valorSubio: (valor: number, miImporte: number) =>
    `Jokalariaren balioa ${valor} M-ra igo da, baina zure ${miImporte} M-ko poxak bere horretan jarraitzen du. Bere zenbatekoarekin lehiatzen da: orain norbaitek poxatzen badu, egungo baliora iritsi beharko du.`,
  etiquetaImporte: (mejorar: boolean, minimo: number) =>
    `${mejorar ? "Hobetu zure poxa" : "Poxaren zenbatekoa"} (M) — gutxienez ${minimo} M`,
  pujar: "Poxatu",
  cancelarMiPuja: (importe: number) => `Kendu nire poxa (${importe} M)`,
  saldoYPlantilla: (saldo: number, n: number, max: number) =>
    `Saldoa: ${saldo} M · Plantilla: ${n}/${max}`,
  explicacionPublica:
    "Liga publikoa: jokalari guztiak beti daude eskuragarri, eta edonork izan dezake jokalari bera. Erostea eta saltzea berehalakoa da, merkatu-balioan.",
  buscarJugadorClub: "Bilatu jokalaria edo kluba...",
  valorDesc: "Balioa: handienetik txikienera",
  valorAsc: "Balioa: txikienetik handienera",
  eloDesc: "Elo: handienetik txikienera",
  eloAsc: "Elo: txikienetik handienera",
  todasCategorias: "Kategoria guztiak",
  todosTorneos: "Txapelketa guztiak",
  torneoAria: "Txapelketa",
  categoriaN: (n: number) => `${n}. kategoria`,
  todosJugadores: "Jokalari guztiak",
  soloMiPlantilla: "Nire plantilla bakarrik",
  soloAsequibles: "Ordain ditzakedanak bakarrik",
  sinJugadoresLiga: "Oraindik ez dago jokalaririk kargatuta ligan.",
  sinCoincidenciasFiltros: "Ez dago iragazkiekin bat datorren jokalaririk.",
  plantillaLlena: (max: number) =>
    `Zure plantillak baimendutako ${max} jokalariak ditu dagoeneko: saldu bat lehenik.`,
  teFaltan: (falta: number) => `${falta} M falta zaizkizu fitxatu ahal izateko.`,
  enTuPlantilla: "Zure plantillan",
  fichadoPor: (valor: number) => `Fitxatuta, ${valor} M-tan.`,
  vendidoPor: (valor: number) => `Salduta, ${valor} M-tan.`,
  vendiendo: "Saltzen…",
  siVenderPor: (valor: number) => `Bai, saldu ${valor} M-tan`,
  venderPor: (valor: number) => `Saldu ${valor} M-tan`,
  fichando: "Fitxatzen…",
  ficharPor: (valor: number) => `Fitxatu ${valor} M-tan`,
  mostrarMas: (restantes: number) => `Erakutsi gehiago (${restantes} falta)`,
  clausulazosCerrados:
    "Klausulazoak itxita daude: ezin dira egin ostiraleko 16:00etatik larunbateko 18:00ak arte.",
  buscar: "Bilatu…",
  sinResultados: "Emaitzarik ez",
  yMas: (n: number) => `Eta beste ${n} — jarraitu idazten zehazteko.`,
};

export default eu;
