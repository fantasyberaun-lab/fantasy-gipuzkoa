import type { Textos } from "@/lib/i18n/textos";

// Catálogo de avatares de perfil: piezas, Ruy López, Morphy y los campeones del
// mundo. Se desbloquearán por nivel (pendiente de diseñar); de momento es una
// prueba solo para root y todos están disponibles. La base de datos
// (cambiar_avatar, 0081) valida los ids: si añades uno aquí, añádelo también
// allí con una migración nueva.
//
// Imágenes en public/avatares, en WebP, en tres versiones:
//   <id>.webp        256 px sin marco (cabecera, perfil...)
//   <id>-marco.webp  256 px con marco (selector y, más adelante, desbloqueo)
//   <id>-grande.webp 800 px con marco, solo se descarga al ampliar el avatar
// Se generan desde los PNG de 800 px de Canva: el marco ocupa 82 px por lado.

export interface Avatar {
  id: string;
  // Nombre propio. Las piezas no lo llevan: su nombre se traduce
  // (t.avatares.piezas), ver nombreAvatar().
  nombre?: string;
  src: string;
  srcMarco: string;
  srcGrande: string;
  // Nivel a partir del que se desbloqueará (sin definir todavía).
  nivel: number;
}

function avatar(id: string, nombre?: string): Avatar {
  return {
    id,
    nombre,
    src: `/avatares/${id}.webp`,
    srcMarco: `/avatares/${id}-marco.webp`,
    srcGrande: `/avatares/${id}-grande.webp`,
    nivel: 1,
  };
}

export const AVATARES: Avatar[] = [
  avatar("peon"),
  avatar("caballo"),
  avatar("alfil"),
  avatar("torre"),
  avatar("dama"),
  avatar("rey"),
  avatar("ruy-lopez", "Ruy López"),
  avatar("morphy", "Paul Morphy"),
  // Campeones del mundo, por orden.
  avatar("steinitz", "Wilhelm Steinitz"),
  avatar("lasker", "Emanuel Lasker"),
  avatar("capablanca", "José Raúl Capablanca"),
  avatar("alekhine", "Alexander Alekhine"),
  avatar("euwe", "Max Euwe"),
  avatar("botvinnik", "Mikhail Botvinnik"),
  avatar("smyslov", "Vasily Smyslov"),
  avatar("tal", "Mikhail Tal"),
  avatar("petrosian", "Tigran Petrosian"),
  avatar("spassky", "Boris Spassky"),
  avatar("fischer", "Bobby Fischer"),
  avatar("karpov", "Anatoly Karpov"),
  avatar("kasparov", "Garry Kasparov"),
  avatar("kramnik", "Vladimir Kramnik"),
  avatar("anand", "Viswanathan Anand"),
  avatar("carlsen", "Magnus Carlsen"),
  avatar("ding", "Ding Liren"),
  avatar("gukesh", "Gukesh Dommaraju"),
];

export function buscarAvatar(id: string | null | undefined): Avatar | null {
  return AVATARES.find((a) => a.id === id) ?? null;
}

export function nombreAvatar(a: Avatar, t: Textos): string {
  return a.nombre ?? t.avatares.piezas[a.id as keyof Textos["avatares"]["piezas"]] ?? a.id;
}
