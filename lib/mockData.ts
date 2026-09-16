import type {
  ClasificacionEntry,
  EquipoManager,
  JugadorLiga,
  MercadoListing,
  PlantillaSlot,
} from "./types";

// Datos ficticios solo para desarrollar la interfaz mientras no hay
// conexión real a Supabase. Sustituir por llamadas a la base de datos
// (ver lib/supabase/client.ts) en cuanto exista el esquema.

export const mockEquipo: EquipoManager = {
  nombreEquipo: "Ostadar taldea",
  saldo: 18,
};

export const mockPlantilla: PlantillaSlot[] = [
  {
    jugador: {
      id: "1",
      nombre: "Asier Corral",
      club: "Berain Bera B",
      categoria: 1,
      elo: 2050,
      valorMercado: 32,
      activo: true,
    },
    puntosJornada: 7,
    valorMercadoDelta: 2,
    resultadosRecientes: ["victoria", "victoria", "victoria"],
  },
  {
    jugador: {
      id: "2",
      nombre: "Ekaitz Mendizabal Guridi",
      club: "Arrasate-Arlutz C",
      categoria: 1,
      elo: 1985,
      valorMercado: 28,
      activo: true,
    },
    puntosJornada: 4,
    valorMercadoDelta: 1,
    resultadosRecientes: ["victoria", "victoria", "victoria", "tablas"],
  },
];

export const mockMercado: MercadoListing[] = [
  {
    jugador: {
      id: "10",
      nombre: "Peio Urrutia",
      club: "",
      categoria: 1,
      elo: 2210,
      valorMercado: 47,
      activo: true,
    },
    rival: { nombre: "Nagore Etxarri", elo: 1990 },
    numeroPujas: 6,
  },
];

export const mockClasificacion: ClasificacionEntry[] = [
  { posicion: 1, nombreEquipo: "Haizea BT", puntos: 268 },
  { posicion: 2, nombreEquipo: "Zurriola FC", puntos: 249 },
  { posicion: 3, nombreEquipo: "Ostadar taldea", puntos: 231, esMiEquipo: true },
  { posicion: 4, nombreEquipo: "Amaraberri", puntos: 219 },
  { posicion: 5, nombreEquipo: "Kresala AE", puntos: 204 },
];

export const mockJugadoresLiga: JugadorLiga[] = [
  {
    id: "1",
    nombre: "Asier Corral",
    club: "Berain Bera B",
    categoria: 1,
    elo: 2050,
    valorMercado: 32,
    activo: true,
    puntosTotales: 156,
    propietario: "Ostadar taldea",
    esMiEquipo: true,
  },
  {
    id: "2",
    nombre: "Ekaitz Mendizabal Guridi",
    club: "Arrasate-Arlutz C",
    categoria: 1,
    elo: 1985,
    valorMercado: 28,
    activo: true,
    puntosTotales: 141,
    propietario: "Ostadar taldea",
    esMiEquipo: true,
  },
  {
    id: "10",
    nombre: "Peio Urrutia",
    club: "Arrasate-Arlutz B",
    categoria: 1,
    elo: 2210,
    valorMercado: 47,
    activo: true,
    puntosTotales: 198,
    propietario: null,
  },
  {
    id: "11",
    nombre: "Xabier Garmendia Díaz",
    club: "Santikutz A",
    categoria: 1,
    elo: 1990,
    valorMercado: 33,
    activo: true,
    puntosTotales: 133,
    propietario: "Haizea BT",
  },
  {
    id: "12",
    nombre: "Agustin Mazkiaran Navarro",
    club: "Agustin de Leiza B",
    categoria: 2,
    elo: 1870,
    valorMercado: 21,
    activo: true,
    puntosTotales: 98,
    propietario: "Zurriola FC",
  },
  {
    id: "13",
    nombre: "Illart Alcorta Andoaga",
    club: "Agustin de Leiza C",
    categoria: 3,
    elo: 1640,
    valorMercado: 14,
    activo: true,
    puntosTotales: 62,
    propietario: null,
  },
];