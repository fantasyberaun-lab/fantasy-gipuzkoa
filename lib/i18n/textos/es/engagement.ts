import type { Ancho } from "../../definir";

// Textos de las funciones de enganche de la Fase 0: compartir en redes y
// resumen semanal.

const es = {
  compartir: "Compartir",
  compartirCopiado: "¡Imagen copiada! Ya puedes pegarla en tu story.",
  compartirError: "No se ha podido compartir. Inténtalo de nuevo.",
  compartirPreparando: "Preparando imagen…",
  resumenTitulo: "Tu semana",
  resumenEquipo: "Equipo",
  resumenLiga: "Liga",
  resumenPuntos: (n: number) => `${n} ${n === 1 ? "punto" : "puntos"} esta semana`,
  resumenPosicion: (n: number) => `Vas ${n}.º en tu liga`,
  resumenSube: (n: number) => `Has subido ${n} ${n === 1 ? "puesto" : "puestos"}`,
  resumenBaja: (n: number) => `Has bajado ${n} ${n === 1 ? "puesto" : "puestos"}`,
  resumenIgual: "Mantienes tu puesto",
  resumenCerrar: "Cerrar",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
