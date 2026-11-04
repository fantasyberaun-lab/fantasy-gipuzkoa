// Los tres idiomas juntos. SOLO para servidor (lib/i18n/server.ts): los componentes
// de cliente reciben únicamente su idioma (ver components/idioma/).
import type { Idioma } from "../config";
import type { Textos } from ".";
import es from "./es";
import eu from "./eu";
import en from "./en";

export const TEXTOS: Record<Idioma, Textos> = { es, eu, en };
