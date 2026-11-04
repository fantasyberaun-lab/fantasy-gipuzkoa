import type { Ancho } from "../../definir";

// Pantalla de clasificación.

const es = {
  cargando: "Cargando clasificación…",
  titulo: "Clasificación general",
  managersPublica: (n: number) => `${n} ${n === 1 ? "manager" : "managers"} en la liga pública`,
  jornadaAria: "Jornada",
  puntosTotales: "Puntos totales",
  jornadaFecha: (n: number, fecha: string) => `Jornada ${n} · ${fecha}`,
  enJuego: "en juego",
  enJornada: (n: number) => `en la jornada ${n}`,
  esteAno: "este año",
  tuPosicion: "Tu posición:",
  posicionDe: (pos: number, total: number) => [`${pos}º`, ` de ${total}`] as const,
  irAMiEquipo: "Ir a mi equipo",
  buscar: "Buscar por equipo o usuario…",
  vacia: "Todavía no hay equipos en la clasificación.",
  sinCoincidencias: (q: string) => `Ningún equipo coincide con «${q}».`,
  verPerfil: "Ver perfil del manager",
  verJornadasTitle: "Ver plantilla y puntos de cada jornada",
  jornadas: "Jornadas",
  pts: (n: number) => `${n} pts`,
  plantilla: "Plantilla",
  mostrarMas: (n: number) => `Mostrar más (${n} restantes)`,
  cerrar: "Cerrar",
  cargandoPlantilla: "Cargando plantilla…",
  errorPlantilla: "No se ha podido cargar la plantilla.",
  sinFichajes: "Este manager todavía no ha fichado a nadie.",
  categoriaCorta: (n: number | string) => `${n}ª cat.`,
  ocultarPuntos: "Ocultar puntos",
  verPuntos: "Ver puntos",
  importeOferta: "Importe de la oferta (M)",
  hacerOferta: "Hacer oferta",
  pagarClausula: (m: number) => `Pagar cláusula (${m} M)`,
  cancelarOferta: (m: number) => `Cancelar mi oferta (${m} M)`,
  tuSaldo: (m: number) => `Tu saldo: ${m} M`,
  ofertaEnviada: "Oferta enviada.",
  ofertaCancelada: "Oferta cancelada. Tu saldo no se ha visto afectado.",
  clausulaPagada: "Cláusula pagada — el jugador ya es tuyo.",
  // Plantilla de un rival (liga privada)
  numJugadores: (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"}`,
  clausulaCorta: (m: number) => `Cláusula ${m} M`,
  protegidos: (n: number) =>
    n === 1
      ? "1 jugador está blindado o con candado: no se le puede hacer un clausulazo ahora."
      : `${n} jugadores están blindados o con candado: no se les puede hacer un clausulazo ahora.`,
  teFaltan: (m: number) => `Te faltan ${m} M para pagar la cláusula.`,
  sancion: (n: number) => `incluye −${n} de sanción`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
