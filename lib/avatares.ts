import type { Textos } from "@/lib/i18n/textos";

// Catálogo de avatares de perfil: piezas, Ruy López, Morphy y los campeones del
// mundo. Se desbloquean por nivel: el nivel de cada uno es su posición en
// AVATARES (Peón = 1 ... Carlsen = 26). La base de datos
// (avatares_por_nivel() y cambiar_avatar, 0086) valida los ids y el nivel: si
// añades o reordenas uno aquí, hazlo también allí con una migración nueva.
//
// Imágenes en public/avatares, en WebP, en tres versiones:
//   <id>.webp        256 px sin marco (cabecera, perfil...)
//   <id>-marco.webp  256 px con marco (selector y pestaña de niveles)
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
  // Nivel a partir del que se desbloquea (su posición en AVATARES, desde 1).
  // Los iconos especiales (ESPECIALES) no se desbloquean por nivel: nivel 0.
  nivel: number;
  // Icono de premio (fin de liga, evento...): se consigue, no se desbloquea por nivel.
  especial?: boolean;
}

function avatar(id: string, nivel: number, nombre?: string): Avatar {
  return {
    id,
    nombre,
    src: `/avatares/${id}.webp`,
    srcMarco: `/avatares/${id}-marco.webp`,
    srcGrande: `/avatares/${id}-grande.webp`,
    nivel,
  };
}

// Orden de desbloqueo (el nivel es la posición + 1).
const ORDEN: [id: string, nombre?: string][] = [
  ["peon"],
  ["caballo"],
  ["alfil"],
  ["torre"],
  ["dama"],
  ["rey"],
  ["gukesh", "Gukesh Dommaraju"],
  ["smyslov", "Vasily Smyslov"],
  ["ding", "Ding Liren"],
  ["euwe", "Max Euwe"],
  ["ruy-lopez", "Ruy López"],
  ["petrosian", "Tigran Petrosian"],
  ["kramnik", "Vladimir Kramnik"],
  ["steinitz", "Wilhelm Steinitz"],
  ["anand", "Viswanathan Anand"],
  ["tal", "Mikhail Tal"],
  ["morphy", "Paul Morphy"],
  ["spassky", "Boris Spassky"],
  ["alekhine", "Alexander Alekhine"],
  ["karpov", "Anatoly Karpov"],
  ["lasker", "Emanuel Lasker"],
  ["botvinnik", "Mikhail Botvinnik"],
  ["capablanca", "José Raúl Capablanca"],
  ["fischer", "Bobby Fischer"],
  ["kasparov", "Garry Kasparov"],
  ["carlsen", "Magnus Carlsen"],
];

export const AVATARES: Avatar[] = ORDEN.map(([id, nombre], i) => avatar(id, i + 1, nombre));

// Iconos especiales de premio: se entregan desde la base de datos
// (entregar_iconos_liga, 0140) y viven en iconos_especiales. Mismas tres
// imágenes que el resto. Si añades una edición nueva, añádela aquí, en
// iconos_especiales y en los textos (avatares.especiales).
export const ESPECIALES: Avatar[] = [
  "liga1-campeon",
  "liga1-subcampeon",
  "liga1-tercero",
  "liga1-participacion",
  "sindarov", // evento Mundial 2026 (0141): se concede a quien pronosticó
].map((id) => ({ ...avatar(id, 0), especial: true }));

export function buscarAvatar(id: string | null | undefined): Avatar | null {
  return AVATARES.find((a) => a.id === id) ?? ESPECIALES.find((a) => a.id === id) ?? null;
}

type TextoEspecial = { nombre: string; descripcion: string };

function textoEspecial(a: Avatar, t: Textos): TextoEspecial | undefined {
  return (t.avatares.especiales as Record<string, TextoEspecial>)[a.id];
}

export function nombreAvatar(a: Avatar, t: Textos): string {
  if (a.especial) return textoEspecial(a, t)?.nombre ?? a.id;
  return a.nombre ?? t.avatares.piezas[a.id as keyof Textos["avatares"]["piezas"]] ?? a.id;
}

// Mini descripción que se ve al ampliar el avatar.
export function descripcionAvatar(a: Avatar, t: Textos): string {
  if (a.especial) return textoEspecial(a, t)?.descripcion ?? "";
  return t.avatares.descripciones[a.id as keyof Textos["avatares"]["descripciones"]] ?? "";
}
