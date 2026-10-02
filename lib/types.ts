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

// Próxima partida de un jugador según los emparejamientos publicados de la
// última jornada de su torneo (matchday_pairings) que aún no tiene resultado.
// Si "descansa" es true, el jugador queda sin emparejar esa jornada.
export interface ProximoRival {
  jornada: number;
  torneo: string | null;
  tablero: number | null;
  descansa: boolean;
  rivalId: string | null; // null = rival que no está en la base
  rivalNombre: string;
  rivalElo: number | null;
  color: "blancas" | "negras" | null; // color del jugador, no del rival
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
  // Torneos en los que está inscrito el jugador (para el límite de titulares
  // por torneo).
  torneos?: { id: string; nombre: string }[];
  // Próximo rival (uno por torneo en el que tenga partida pendiente).
  proximosRivales?: ProximoRival[];
}

export interface MercadoListing {
  jugador: Jugador;
  rival?: Pick<Jugador, "nombre" | "elo">;
  numeroPujas: number;
  historialPuntos: PuntosJornada[];
}

export interface ClasificacionEntry {
  posicion: number;
  // Id del equipo (opcional para no romper los datos de prueba de mockData).
  equipoId?: string;
  nombreEquipo: string;
  // Nombre de usuario del manager (profiles.nombre).
  nombreManager?: string;
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
  // Inscrito en algún torneo. Solo los inscritos salen en el mercado de la
  // liga pública (false = no se puede fichar; undefined se trata como true).
  inscrito?: boolean;
  proximosRivales?: ProximoRival[];
  historialPuntos: PuntosJornada[];
}

export interface MercadoDelDia extends Jugador {
  listingId: string;
  puntosTotales: number;
  historialPuntos: PuntosJornada[];
  numeroPujas: number;
  proximosRivales?: ProximoRival[];
}

// Puja de un equipo por un jugador de la tanda de mercado abierta.
export interface PujaMercado {
  listingId: string;
  equipoId: string;
  nombreEquipo: string;
  importe: number;
  esMia: boolean;
}

export interface OfertaPendiente {
  id: string;
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
  | "oferta_rechazada"
  | "venta";

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

// "privada": liga de amigos (máx. 9, plantilla inicial, mercado por tandas,
// clausulazos). "publica": liga abierta "todos contra todos" (mismo
// presupuesto para todos, sin plantilla inicial, todos los jugadores siempre
// disponibles y compra/venta instantánea).
export type TipoLiga = "privada" | "publica";

// Resumen de una liga en la que el usuario tiene equipo (para el
// selector de "liga activa" y la pantalla de crear/unirse).
export interface LigaResumen {
  ligaId: string;
  tipo: TipoLiga;
  nombre: string;
  codigo: string;
  miembros: number;
  maxMiembros: number;
  equipoId: string;
  nombreEquipo: string;
  saldo: number;
}

// Perfil de un manager, visto a través de su equipo en una liga.
export interface PerfilManager {
  equipoId: string;
  nombreEquipo: string;
  nombreManager: string;
  ligaNombre: string;
  ligaPublica: boolean;
  miembroDesde: string; // ISO
  ligasGanadas: number;
  ligasJugadas: number;
  puntosTotales: number;
  mejorJornada: number;
  esMio: boolean;
}

// Un día de la evolución del valor de una plantilla.
export interface PuntoValorPlantilla {
  dia: string; // YYYY-MM-DD
  valor: number; // en M
  jugadores: number;
}