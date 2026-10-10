// Idiomas de la interfaz. El castellano es el idioma por defecto y el de
// referencia: los textos se escriben primero en castellano y euskera e
// inglés tienen que tener exactamente las mismas claves (lo comprueba TypeScript).

export const IDIOMAS = ["es", "eu", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

// Cookie (y no solo localStorage) para que los Server Components también
// sepan en qué idioma pintar.
export const COOKIE_IDIOMA = "idioma";

// Nombre de cada idioma en su propio idioma, para el selector.
export const NOMBRES_IDIOMA: Record<Idioma, string> = {
  es: "Castellano",
  eu: "Euskara",
  en: "English",
};

// Locale para Intl (fechas, números, tiempo relativo).
export const LOCALE_INTL: Record<Idioma, string> = {
  es: "es-ES",
  eu: "eu-ES",
  en: "en-GB",
};

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}
