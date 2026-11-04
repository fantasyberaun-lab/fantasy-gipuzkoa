import type { Ancho } from "../../definir";

// Invita a un amigo: solo copiar o compartir el enlace de la web. No hay código
// ni recompensa; si algún día la hubiera (p. ej. con la app en Play Store) se
// plantearía de nuevo.

const es = {
  abrir: "Invitar a un amigo",
  titulo: "Invita a un amigo",
  intro: "Comparte el enlace de Beraun Fantasy con quien quieras.",
  enlace: "Enlace de la web",
  copiar: "Copiar enlace",
  copiado: "¡Enlace copiado!",
  compartir: "Compartir",
  compartirTexto: "Únete a Beraun Fantasy, el fantasy del ajedrez guipuzcoano.",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
