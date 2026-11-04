import type { Ancho } from "../../definir";

// Pronósticos de partidas (dentro de Minijuegos, sin recompensas).

const es = {
  pestana: "Pronósticos",
  titulo: "Pronósticos",
  intro:
    "Opina sobre cómo acabará cada partida antes de que empiece la ronda. Es opcional, solo juegas las mesas que quieras y no da premios ni puntos.",
  sin: "Ahora mismo no hay ninguna ronda publicada para pronosticar.",
  volver: "Volver a los torneos",
  jornadaFecha: (n: number, fecha: string) => (fecha ? `Jornada ${n} · ${fecha}` : `Jornada ${n}`),
  abiertaEtiqueta: "Abierto",
  cerradaEtiqueta: "Cerrado",
  cerradaAviso: "Esta ronda ya ha empezado o no tiene fecha: los pronósticos están cerrados.",
  haciendo: (hechos: number, total: number) => `${hechos} de ${total} mesas pronosticadas`,
  blancas: "Blancas",
  tablas: "Tablas",
  negras: "Negras",
  acierto: "Acierto",
  fallo: "Fallo",
  quitar: "Quitar pronóstico",
  guardado: "Pronóstico guardado",
  quitado: "Pronóstico quitado",
  error: "No se ha podido guardar el pronóstico.",
  resumen: (aciertos: number, resueltos: number) =>
    `Tus aciertos: ${aciertos} de ${resueltos} partidas jugadas`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
