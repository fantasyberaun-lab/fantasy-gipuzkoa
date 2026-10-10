// Catálogo de avatares de perfil (retratos de campeones del mundo). Se
// desbloquearán por nivel; de momento es una prueba solo para root y todos
// están disponibles. La base de datos (cambiar_avatar, 0077) valida los ids:
// si añades uno aquí, añádelo también allí.
//
// Imágenes en public/avatares, cuadradas de 256 px en WebP, en dos versiones:
// sin marco (cabecera, perfil...) y con marco (-marco, solo en el selector y,
// más adelante, en la pantalla de desbloqueo). Además, -grande: el original de
// 800 px con marco, que solo se descarga al ampliar el avatar.

export interface Avatar {
  id: string;
  nombre: string;
  src: string;
  srcMarco: string;
  srcGrande: string;
  // Nivel a partir del que se desbloqueará (sin uso todavía).
  nivel: number;
}

export const AVATARES: Avatar[] = [
  { id: "morphy", nombre: "Paul Morphy", src: "/avatares/morphy.webp", srcMarco: "/avatares/morphy-marco.webp", srcGrande: "/avatares/morphy-grande.webp", nivel: 1 },
  { id: "anand", nombre: "Viswanathan Anand", src: "/avatares/anand.webp", srcMarco: "/avatares/anand-marco.webp", srcGrande: "/avatares/anand-grande.webp", nivel: 1 },
];

export function buscarAvatar(id: string | null | undefined): Avatar | null {
  return AVATARES.find((a) => a.id === id) ?? null;
}
