import type { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export type Rareza = "legendario" | "epico" | "raro" | "comun";

// Álbum de cromos (ver 0123). Cosmético; "conseguido" = ha estado en tu plantilla.
export interface CartaAlbum {
  playerId: string;
  nombre: string;
  club: string | null;
  elo: number;
  categoria: string;
  rareza: Rareza;
  conseguido: boolean;
}

export async function fetchAlbum(supabase: Supabase): Promise<CartaAlbum[]> {
  const { data, error } = await supabase.rpc("album_coleccion");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    playerId: String(r.player_id),
    nombre: String(r.nombre),
    club: r.club != null ? String(r.club) : null,
    elo: Number(r.elo ?? 0),
    categoria: String(r.categoria ?? ""),
    rareza: (r.rareza as Rareza) ?? "comun",
    conseguido: Boolean(r.conseguido),
  }));
}
