import type { Ancho } from "../../definir";

// Lista de jugadores de la liga y perfil de un jugador.

const es = {
  // Comunes
  categoriaCorta: (n: number) => `${n}ª cat.`,
  categoria: (n: number) => `${n}ª categoría`,
  categoriaValor: (n: number) => `${n}ª`,
  pts: (n: number) => `${n} pts`,
  enTuPlantilla: "En tu plantilla",
  fichadoPor: (manager: string) => `Fichado por ${manager}`,
  libre: "Libre",
  // Lista
  cargando: "Cargando jugadores…",
  clausulaPagada: "Cláusula pagada. El jugador ya está en tu plantilla.",
  ofertaCancelada: "Oferta cancelada. Tu saldo no se ha visto afectado.",
  ofertaEnviada: (importe: number) => `Oferta de ${importe} M enviada al manager.`,
  buscar: "Buscar jugador o club...",
  orden: {
    puntos: "Ordenar por puntos",
    nombre: "Ordenar por nombre",
    categoria: "Ordenar por categoría",
    valorDesc: "Valor: de mayor a menor",
    valorAsc: "Valor: de menor a mayor",
    eloDesc: "Elo: de mayor a menor",
    eloAsc: "Elo: de menor a mayor",
    clubAsc: "Club: A → Z",
    clubDesc: "Club: Z → A",
  },
  sinJugadoresLiga: "Todavía no hay jugadores cargados en la liga.",
  sinCoincidencias: (busqueda: string) => `No hay jugadores que coincidan con "${busqueda}".`,
  verMas: (n: number, quedan: number) => `Ver ${n} más (quedan ${quedan})`,
  valor: (v: number) => `Valor ${v} M`,
  disponible: "Disponible",
  ofertaEnviadaLinea: (importe: number) => ` · Oferta enviada: ${importe} M`,
  blindado: "Blindado",
  blindadoTitulo: "Blindado: no se le puede hacer un clausulazo durante una semana",
  candado: "Candado",
  candadoTitulo: "Con candado: no se le puede hacer un clausulazo durante una semana",
  clausulable: "Clausulable",
  clausulableTitulo: "Clausulable: se le puede hacer un clausulazo ahora mismo",
  blindadoJornadaTitulo: "Blindado: no se le puede hacer un clausulazo durante una semana",
  ocultarPuntos: "Ocultar puntos",
  verPuntos: "Ver puntos por jornada",
  yaEnPlantilla: "Ya lo tienes en tu plantilla.",
  libreFichalo: "Está libre — fíchalo desde la pestaña Mercado.",
  importeOferta: "Importe de la oferta (M)",
  hacerOferta: "Hacer oferta",
  pagarClausula: (clausula: number) => `Pagar cláusula (${clausula} M)`,
  cancelarMiOferta: (importe: number) => `Cancelar mi oferta (${importe} M)`,
  notaBlindado:
    "Este jugador está blindado: su dueño ha pagado para que no se le pueda hacer un clausulazo durante una semana.",
  notaCandado:
    "Este jugador tiene un candado: se acaba de fichar y no se le puede hacer un clausulazo durante una semana.",
  // Perfil
  cargandoJugador: "Cargando jugador…",
  noEncontrado: "No se ha encontrado este jugador.",
  eloDebut: (elo: number) => `${elo} (debut)`,
  puntos: "Puntos",
  performanceElo: "Performance Elo",
  ptsFantasy: "Pts Fantasy",
  sinPartidas: "Todavía no ha jugado ninguna partida.",
  sinEmparejar: "Sin emparejar (descansa)",
  rival: "Rival",
  rivalExterno: "Rival externo",
  club: "Club",
  categoriaEtiqueta: "Categoría",
  elo: "Elo",
  nacimiento: "Año de nacimiento",
  sexo: "Sexo",
  mujer: "Mujer",
  hombre: "Hombre",
  idFantasy: "ID Fantasy",
  valorMercado: "Valor de mercado",
  enTuLiga: "En tu liga",
  puntosFantasy: "Puntos Fantasy",
  torneos: "Torneos",
  sinTorneos: "Todavía no está inscrito en ningún torneo.",
  notaPerformance:
    "Performance Elo: media del Elo de los rivales más la diferencia que da la tabla de la FIDE según el porcentaje de puntos.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
