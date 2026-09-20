// Tipos de dominio, alineados con supabase/migrations/0001_init.sql
// y con el Reglamento V3.1. Cuando conectemos Supabase de verdad,
// estos tipos pueden sustituirse/complementarse con los generados por
// `npm run supabase:types`.

export type Categoria = 1 | 2 | 3;

export interface Jugador {
  id: string;
  nombre: string;
  club: string;
  categoria: Categoria;
  elo: number;
  valorMercado: number; // en millones
  activo: boolean;
}

export type ResultadoPartida = "victoria" | "tablas" | "derrota";

export interface PuntosJornada {
  jornada: number;
  puntos: number;
}

export interface PlantillaSlot {
  jugador: Jugador;
  puntosJornada: number;
  valorMercadoDelta: number; // variación (+1M, -2M, ...) de la última jornada
  resultadosRecientes: ResultadoPartida[]; // para las bolitas de forma
  esJugadorDeLaJornada?: boolean;
  historialPuntos: PuntosJornada[];
}

export interface MercadoListing {
  jugador: Jugador;
  rival?: Pick<Jugador, "nombre" | "elo">;
  numeroPujas: number;
  historialPuntos: PuntosJornada[];
}

export interface ClasificacionEntry {
  posicion: number;
  nombreEquipo: string;
  puntos: number;
  esMiEquipo?: boolean;
  historialPuntos: PuntosJornada[];
}

export interface EquipoManager {
  id: string;
  nombreEquipo: string;
  saldo: number;
}

export interface JugadorLiga extends Jugador {
  puntosTotales: number;
  propietario: string | null;
  esMiEquipo?: boolean;
  historialPuntos: PuntosJornada[];
}

// Un jugador dentro de la tanda diaria del mercado: los mismos datos que
// JugadorLiga (siempre libre, así que propietario/esMiEquipo no aplican),
// más el id del listing (necesario para pujar_mercado, distinto del id
// del jugador) y el número de pujas actuales sobre ese listing.
export interface MercadoDelDia extends Jugador {
  listingId: string;
  puntosTotales: number;
  historialPuntos: PuntosJornada[];
  numeroPujas: number;
}

export interface OfertaPendiente {
  jugadorId: string;
  importe: number;
}