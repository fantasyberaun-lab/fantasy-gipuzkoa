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
  valorMercado: number;
  activo: boolean;
}

export type ResultadoPartida = "victoria" | "tablas" | "derrota";

// Puntos de un jugador (o de un equipo) en una jornada. "jornada" es el
// número DENTRO de su torneo, así que se repite entre torneos: para
// distinguir jornadas usa "id". Los campos opcionales los rellena la base
// de datos (ver 0020_*.sql); pueden faltar en datos de prueba.
export interface PuntosJornada {
  jornada: number;
  puntos: number;
  id?: string;
  torneo?: string | null;
  creada?: string;
}

export interface PlantillaSlot {
  jugador: Jugador;
  puntosJornada: number;
  valorMercadoDelta: number;
  resultadosRecientes: ResultadoPartida[];
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
  leagueId: string;
  nombreEquipo: string;
  saldo: number;
}

export interface JugadorLiga extends Jugador {
  puntosTotales: number;
  propietario: string | null;
  esMiEquipo?: boolean;
  historialPuntos: PuntosJornada[];
}

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