// Tipos del importador de torneos (Chess-Results e Info64).
//
// Ninguna de las dos webs "contamina" el resto de la app: cada una tiene su
// lector (chessResults.ts / info64.ts) y los dos devuelven estas mismas
// estructuras ya normalizadas.

export type FuenteTorneo = "chess-results" | "info64";

// ---------- Lo que sale de leer una página HTML (sin interpretar) ----------

export interface CeldaTabla {
  texto: string;
  href: string | null;
}
export interface FilaTabla {
  celdas: CeldaTabla[];
  // true si la fila es de cabecera (<th>)
  cabecera: boolean;
}
export interface Tabla {
  filas: FilaTabla[];
}
export interface Pagina {
  titulo: string;
  tablas: Tabla[];
  // Texto de la página en líneas (los <br> y los bloques cuentan como salto)
  lineas: string[];
  // Todos los href de la página
  enlaces: string[];
}

// ---------- Datos normalizados ----------

export interface JugadorOrigen {
  // Número en el ranking inicial (clave para enlazar emparejamientos con jugadores)
  rank: number | null;
  nombre: string;
  fideId: string | null;
  elo: number | null;
  club: string | null;
}

export interface TorneoOrigen {
  fuente: FuenteTorneo;
  // Enlace limpio y estable al torneo (es el que se guarda en web_url)
  url: string;
  nombre: string;
  organizador: string | null;
  federacion: string | null;
  director: string | null;
  arbitroPrincipal: string | null;
  lugar: string | null;
  fechaInicio: string | null; // YYYY-MM-DD
  fechaFin: string | null;
  numeroRondas: number | null;
  sistema: string | null;
  ritmoJuego: string | null;
  computoElo: string | null;
  // Solo Chess-Results la indica; sirve para saber si ha habido cambios.
  ultimaActualizacion: string | null;
  jugadores: JugadorOrigen[];
  // Solo Info64: rondas que ya aparecen en su menú.
  rondasPublicadas: number[];
  avisos: string[];
}

// "pendiente": emparejada pero sin resultado todavía.
// "incomparecencia": resultado por no presentación (+/-): no se aplica solo.
// "desconocido": texto que no sabemos interpretar.
export type ResultadoOrigen =
  | "blancas"
  | "negras"
  | "tablas"
  | "pendiente"
  | "incomparecencia"
  | "desconocido";

export interface PartidaOrigen {
  tablero: number | null;
  blancas: JugadorOrigen;
  negras: JugadorOrigen;
  resultado: ResultadoOrigen;
  textoResultado: string;
}

// descanso: sin jugar por bye (1 punto) o por bye pedido (medio punto): ambos
// puntúan igual en el Fantasy · ausente: 0 puntos sin jugar · otro: no se sabe.
export type TipoSinRival = "descanso" | "ausente" | "otro";

export interface SinRivalOrigen {
  jugador: JugadorOrigen;
  tipo: TipoSinRival;
  textoResultado: string;
}

export interface RondaOrigen {
  fuente: FuenteTorneo;
  numero: number;
  fecha: string | null; // YYYY-MM-DD
  hora: string | null; // HH:MM
  partidas: PartidaOrigen[];
  sinRival: SinRivalOrigen[];
  avisos: string[];
}