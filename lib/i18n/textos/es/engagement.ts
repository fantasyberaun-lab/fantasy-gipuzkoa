import type { Ancho } from "../../definir";

// Textos de las funciones de enganche de la Fase 0: compartir en redes y
// resumen semanal.

const es = {
  compartir: "Compartir",
  compartirCopiado: "¡Imagen copiada! Ya puedes pegarla en tu story.",
  compartirError: "No se ha podido compartir. Inténtalo de nuevo.",
  compartirPreparando: "Preparando imagen…",
  resumenTitulo: "Tu semana",
  resumenJornada: (n: number) => `Jornada ${n}`,
  resumenPuntos: (n: number) => `${n} ${n === 1 ? "punto" : "puntos"} esta semana`,
  resumenPuntosEtiqueta: (n: number) => `${n === 1 ? "punto" : "puntos"} esta semana`,
  resumenSube: (n: number) => `Has subido ${n} ${n === 1 ? "puesto" : "puestos"}`,
  resumenBaja: (n: number) => `Has bajado ${n} ${n === 1 ? "puesto" : "puestos"}`,
  resumenIgual: "Mantienes tu puesto",
  resumenOrdinal: (n: number) => `${n}.º`,
  resumenDe: (n: number) => `de ${n}`,
  resumenPosicionEtiqueta: "Posición",
  resumenAcumulado: "Acumulado",
  resumenGanado: "Ganado",
  resumenPts: (n: number) => `${n} pts`,
  resumenMejor: "Tu mejor jugador",
  resumenLigas: "Tus ligas",
  resumenAnterior: "Liga anterior",
  resumenSiguiente: "Liga siguiente",
  resumenCerrar: "Cerrar",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
