import type { JuegoId } from "@/lib/supabase/minijuegosQueries";

// Minijuegos disponibles, en el orden de las pestañas. Mantener igual que
// mj_juegos_activos() en la base de datos (0099_minijuegos_resto.sql): si añades uno
// aquí, añádelo allí (con su generador y su evaluación) en una migración nueva.
export const JUEGOS: { id: JuegoId; icono: string }[] = [
  { id: "hol", icono: "↕️" },
  { id: "elo", icono: "🎯" },
  { id: "orden", icono: "📊" },
  { id: "adivina", icono: "🕵️" },
  { id: "acierta", icono: "🖼️" },
  { id: "precio", icono: "💰" },
  { id: "impostor", icono: "🚨" },
  { id: "parejas", icono: "🧩" },
];

export function esJuego(id: string | null | undefined): id is JuegoId {
  return JUEGOS.some((j) => j.id === id);
}

// Importes en millones, como el saldo: 0,4 -> "0,4"; 3 -> "3".
export function formatoMillones(n: number, locale: string): string {
  return n.toLocaleString(locale, { maximumFractionDigits: 2 });
}
