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
  // Jornada en la que el jugador quedó sin emparejar: puntúa gameConfig.puntosPorDescanso.
  descanso?: boolean;
}

export interface PlantillaSlot {
  jugador: Jugador;
  puntosJornada: number;
  valorMercadoDelta: number;
  clausula: number;
  resultadosRecientes: ResultadoPartida[];
  esJugadorDeLaJornada?: boolean;
  historialPuntos: PuntosJornada[];
  // Fichado por clausulazo o mercado en la jornada actual: no se le puede
  // hacer un clausulazo hasta que empiece la siguiente jornada.
  candado?: boolean;
  // Blindado (pagado por su dueño): no se le puede hacer un clausulazo
  // hasta que empiece la siguiente jornada.
  blindado?: boolean;
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
  clausula: number;
  // Fichado por clausulazo o mercado en la jornada actual: no se le puede
  // hacer un clausulazo hasta que empiece la siguiente jornada.
  candado?: boolean;
  blindado?: boolean;
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

// Oferta directa que ha recibido uno de TUS jugadores (jugador de otro
// equipo en tu plantilla). Distinto de OfertaPendiente, que es al revés:
// una oferta que TÚ has hecho por un jugador ajeno.
export interface OfertaRecibida {
  id: string;
  jugadorId: string;
  jugadorNombre: string;
  equipoOferenteId: string;
  equipoOferenteNombre: string;
  importe: number;
  creada: string;
}

export type TipoNotificacion =
  | "oferta_recibida"
  | "fichaje"
  | "clausulazo"
  | "clausula_subida"
  | "oferta_rechazada";

// Un aviso del panel de notificaciones (ver 0022_notificaciones.sql).
// "actor" es quien hace la acción (ofertar, fichar, pagar cláusula);
// "objetivo" es el otro equipo implicado: el dueño del jugador en una
// oferta, o a quien se le ha quitado el jugador en un clausulazo.
export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  actorId: string | null;
  actorNombre: string;
  objetivoId: string | null;
  objetivoNombre: string | null;
  jugadorId: string | null;
  jugadorNombre: string;
  importe: number | null;
  creada: string;
}

// Resumen de una liga en la que el usuario tiene equipo (para el
// selector de "liga activa" y la pantalla de crear/unirse).
export interface LigaResumen {
  ligaId: string;
  nombre: string;
  codigo: string;
  miembros: number;
  maxMiembros: number;
  equipoId: string;
  nombreEquipo: string;
  saldo: number;
}