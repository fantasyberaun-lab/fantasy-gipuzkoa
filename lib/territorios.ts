// Territorios del selector de ligas (LigaForm). Cada territorio (una provincia o
// una comunidad autónoma) tiene SU PROPIA liga pública, al mismo nivel que las
// demás (0095). De momento solo el País Vasco, y solo Gipuzkoa está en juego: es
// la única con jugadores y torneos. Las demás son ligas de prueba (0093/0095) que
// únicamente puede abrir root, con el código fijo de la migración.
//
// Una comunidad con UNA sola provincia (p. ej. Cantabria) se trata como
// comunidad: aparece solo en "Comunidad autónoma", no en "Provincia". Se
// deduce de los datos: basta añadirla con una única provincia.

export type AmbitoTerritorio = "comunidad" | "provincia";
type Nombre = Record<"es" | "eu" | "en", string>;

export interface Territorio {
  id: string;
  ambito: AmbitoTerritorio;
  nombre: Nombre;
  // Gipuzkoa es el juego de siempre; el resto aún no tiene jugadores ni torneos.
  funcional: boolean;
  // Código de la liga pública del territorio (leagues.codigo).
  codigoLiga: string;
  // Valor de leagues.region de sus ligas.
  region: string;
}

interface ProvinciaDef {
  id: string;
  region: string;
  nombre: Nombre;
  funcional: boolean;
  codigoLiga: string;
}

interface ComunidadDef {
  id: string;
  region: string;
  nombre: Nombre;
  codigoLiga: string;
  provincias: ProvinciaDef[];
}

const COMUNIDADES: ComunidadDef[] = [
  {
    id: "euskadi",
    region: "Euskadi",
    nombre: { es: "País Vasco", eu: "Euskadi", en: "Basque Country" },
    codigoLiga: "TERR-EUSKADI",
    provincias: [
      {
        id: "gipuzkoa",
        region: "Gipuzkoa",
        nombre: { es: "Gipuzkoa", eu: "Gipuzkoa", en: "Gipuzkoa" },
        funcional: true,
        codigoLiga: "PUBLICA",
      },
      {
        id: "bizkaia",
        region: "Bizkaia",
        nombre: { es: "Bizkaia", eu: "Bizkaia", en: "Biscay" },
        funcional: false,
        codigoLiga: "TERR-BIZKAIA",
      },
      {
        id: "araba",
        region: "Araba",
        nombre: { es: "Araba", eu: "Araba", en: "Álava" },
        funcional: false,
        codigoLiga: "TERR-ARABA",
      },
    ],
  },
];

// Territorio cuya liga pública tiene este código (para preseleccionar el de la liga activa).
export function territorioPorCodigo(codigo: string): Territorio | undefined {
  return [...territoriosDeAmbito("provincia"), ...territoriosDeAmbito("comunidad")].find(
    (x) => x.codigoLiga === codigo
  );
}

// Territorios que se ofrecen en un ámbito. Las comunidades de una sola provincia
// no repiten la provincia en el ámbito "provincia".
export function territoriosDeAmbito(ambito: AmbitoTerritorio): Territorio[] {
  if (ambito === "comunidad") {
    return COMUNIDADES.map((c) => ({
      id: c.id,
      region: c.region,
      ambito,
      nombre: c.nombre,
      // Las comunidades de varias provincias aún no tienen juego propio; una
      // comunidad de una sola provincia es esa provincia.
      funcional: c.provincias.length === 1 ? c.provincias[0].funcional : false,
      codigoLiga: c.provincias.length === 1 ? c.provincias[0].codigoLiga : c.codigoLiga,
    }));
  }
  return COMUNIDADES.filter((c) => c.provincias.length > 1)
    .flatMap((c) => c.provincias)
    .map((p) => ({ id: p.id, region: p.region, ambito, nombre: p.nombre, funcional: p.funcional, codigoLiga: p.codigoLiga }));
}
