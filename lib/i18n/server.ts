// Solo para servidor: usa next/headers.
import { cookies } from "next/headers";
import { COOKIE_IDIOMA, IDIOMA_POR_DEFECTO, LOCALE_INTL, esIdioma, type Idioma } from "./config";
import { TEXTOS, type Textos } from "./textos";

// Idioma de la petición actual (Server Components y route handlers).
export function getIdioma(): Idioma {
  const valor = cookies().get(COOKIE_IDIOMA)?.value;
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

// Textos en el idioma de la petición: const t = getT(); t.comun.guardar
export function getT(): Textos {
  return TEXTOS[getIdioma()];
}

export function getLocale(): string {
  return LOCALE_INTL[getIdioma()];
}
