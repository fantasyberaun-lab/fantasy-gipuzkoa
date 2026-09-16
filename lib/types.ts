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

export interface PlantillaSlot {
  jugador: Jugador;
  puntosJornada: number;
  valorMercadoDelta: number; // variación (+1M, -2M, ...) de la última jornada
  resultadosRecientes: ResultadoPartida[]; // para las bolitas de forma
  esJugadorDeLaJornada?: boolean;
}

export interface MercadoListing {
  jugador: Jugador;
  rival?: Pick<Jugador, "nombre" | "elo">;
  numeroPujas: number;
}

export interface ClasificacionEntry {
  posicion: number;
  nombreEquipo: string;
  puntos: number;
  esMiEquipo?: boolean;
}

export interface EquipoManager {
  nombreEquipo: string;
  saldo: number; // presupuesto disponible para fichajes, en millones
}