import type { Ancho } from "../../definir";

// Mercado (por tandas con pujas y el de la liga pública) y el buscador
// desplegable (BuscadorSelect).

const es = {
  cargando: "Cargando el mercado…",
  titulo: "Mercado",
  tuSaldo: "Tu saldo:",
  pujaRegistrada: "Puja registrada.",
  pujaCancelada: "Puja cancelada. Tu saldo no se ha visto afectado.",
  pujasOcultas: "Pujas ocultas",
  pujasSeOcultanEn: "Las pujas se ocultan en",
  ocultas: "Ocultas",
  seActualizaEn: "El mercado se actualiza en",
  jugadoresEnTanda: (n: number) => `${n} jugadores en la tanda de hoy.`,
  avisoOcultas: "En las últimas 2 horas solo ves cuánta gente ha pujado, no los importes.",
  avisoAntesOcultar:
    "2 horas antes de que se actualice el mercado dejarán de verse las pujas de los demás: solo verás cuánta gente ha pujado, no el precio.",
  buscarJugador: "Buscar jugador por nombre...",
  ordenarValor: "Ordenar por valor",
  ordenarElo: "Ordenar por Elo",
  ordenarPuntos: "Ordenar por puntos",
  ordenarPujas: "Ordenar por número de pujas",
  ordenarNombre: "Ordenar por nombre",
  ordenarCategoria: "Ordenar por categoría",
  sinJugadores: "No hay jugadores en el mercado ahora mismo.",
  sinCoincidencias: (busqueda: string) => `No hay jugadores que coincidan con "${busqueda}".`,
  ptsTemporada: (n: number) => `${n} pts esta temporada`,
  numPujas: (n: number) => `${n} pujas`,
  tuPujaImporte: (importe: number) => `Tu puja: ${importe} M`,
  ocultarPuntos: "Ocultar puntos",
  verPuntosJornada: "Ver puntos por jornada",
  verPuntos: "Ver puntos",
  pujasPorEsteJugador: "Pujas por este jugador",
  nadiePorAhora: "Nadie ha pujado por ahora.",
  resumenPujasOcultas: (total: number, conMiPuja: boolean, otras: number) =>
    `${total} ${total === 1 ? "puja" : "pujas"} en total${
        conMiPuja ? ` (${otras === 0 ? "solo la tuya" : `la tuya y ${otras} más`})` : ""
      }. Los importes están ocultos hasta que se actualice el mercado.`,
  nadieTodavia: (minimo: number) =>
    `Nadie ha pujado todavía. Con la puja mínima (${minimo} M) te lo llevarías si nadie puja más.`,
  tuPuja: "Tu puja",
  laMasAlta: "la más alta",
  valorSubio: (valor: number, miImporte: number) =>
    `El valor del jugador ha subido a ${valor} M, pero tu puja de ${miImporte} M se mantiene. Compite con su importe: si alguien puja ahora, tendrá que llegar al valor actual.`,
  etiquetaImporte: (mejorar: boolean, minimo: number) =>
    `${mejorar ? "Mejorar tu puja" : "Importe de la puja"} (M) — mínimo ${minimo} M`,
  pujar: "Pujar",
  cancelarMiPuja: (importe: number) => `Cancelar mi puja (${importe} M)`,
  // Liga pública
  saldoYPlantilla: (saldo: number, n: number, max: number) =>
    `Saldo: ${saldo} M · Plantilla: ${n}/${max}`,
  explicacionPublica:
    "Liga pública: todos los jugadores están siempre disponibles y cualquiera puede tener al mismo jugador. Comprar y vender es inmediato, al valor de mercado.",
  buscarJugadorClub: "Buscar jugador o club...",
  valorDesc: "Valor: de mayor a menor",
  valorAsc: "Valor: de menor a mayor",
  eloDesc: "Elo: de mayor a menor",
  eloAsc: "Elo: de menor a mayor",
  todasCategorias: "Todas las categorías",
  todosTorneos: "Todos los torneos",
  torneoAria: "Torneo",
  categoriaN: (n: number) => `${n}ª categoría`,
  todosJugadores: "Todos los jugadores",
  soloMiPlantilla: "Solo mi plantilla",
  soloAsequibles: "Solo los que puedo pagar",
  sinJugadoresLiga: "Todavía no hay jugadores cargados en la liga.",
  sinCoincidenciasFiltros: "No hay jugadores que coincidan con los filtros.",
  plantillaLlena: (max: number) =>
    `Tu plantilla ya tiene los ${max} jugadores permitidos: vende a alguno primero.`,
  teFaltan: (falta: number) => `Te faltan ${falta} M para poder ficharlo.`,
  enTuPlantilla: "En tu plantilla",
  fichadoPor: (valor: number) => `Fichado por ${valor} M.`,
  vendidoPor: (valor: number) => `Vendido por ${valor} M.`,
  vendiendo: "Vendiendo…",
  siVenderPor: (valor: number) => `Sí, vender por ${valor} M`,
  venderPor: (valor: number) => `Vender por ${valor} M`,
  fichando: "Fichando…",
  ficharPor: (valor: number) => `Fichar por ${valor} M`,
  mostrarMas: (restantes: number) => `Mostrar más (${restantes} restantes)`,
  // Mismo texto que MENSAJE_CLAUSULAZOS_CERRADOS de lib/mercadoCountdown.ts.
  clausulazosCerrados:
    "Los clausulazos están cerrados: no se pueden hacer desde el viernes a las 16:00 hasta el sábado a las 18:00.",
  // BuscadorSelect
  buscar: "Buscar…",
  sinResultados: "Sin resultados",
  yMas: (n: number) => `Y ${n} más — sigue escribiendo para acotar.`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
