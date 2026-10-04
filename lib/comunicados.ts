import type { Comunicado, EtiquetaComunicado } from "@/lib/types";

// Aspecto de cada etiqueta. "destacada" pinta la tarjeta entera con el color
// de acento (como el aviso de actualización de Elo).
export const ETIQUETAS_COMUNICADO: Record<
  EtiquetaComunicado,
  { texto: string; chip: string; destacada: boolean }
> = {
  importante: { texto: "Importante", chip: "bg-accent text-white", destacada: true },
  actualizacion: {
    texto: "Actualización",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    destacada: false,
  },
  novedad: {
    texto: "Novedad",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    destacada: false,
  },
  aviso: {
    texto: "Aviso",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    destacada: false,
  },
  mercado: {
    texto: "Mercado",
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    destacada: false,
  },
  torneo: {
    texto: "Torneo",
    chip: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    destacada: false,
  },
};

export const LISTA_ETIQUETAS = Object.keys(ETIQUETAS_COMUNICADO) as EtiquetaComunicado[];

// Duraciones que se pueden elegir al publicar. dias = null: sin caducidad.
export const DURACIONES_COMUNICADO: { valor: string; etiqueta: string; dias: number | null }[] = [
  { valor: "1", etiqueta: "1 día", dias: 1 },
  { valor: "3", etiqueta: "3 días", dias: 3 },
  { valor: "7", etiqueta: "1 semana", dias: 7 },
  { valor: "14", etiqueta: "2 semanas", dias: 14 },
  { valor: "30", etiqueta: "1 mes", dias: 30 },
  { valor: "siempre", etiqueta: "Sin caducidad", dias: null },
];

export function caducaEnDias(dias: number | null, desde: Date = new Date()): string | null {
  if (dias === null) return null;
  return new Date(desde.getTime() + dias * 86400 * 1000).toISOString();
}

export function estaVigente(c: Pick<Comunicado, "caduca">, ahora = Date.now()): boolean {
  return c.caduca === null || Date.parse(c.caduca) > ahora;
}

// Fijados primero; dentro de cada grupo, el más reciente antes.
export function ordenarComunicados<T extends Comunicado>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) => Number(b.fijado) - Number(a.fijado) || Date.parse(b.creado) - Date.parse(a.creado)
  );
}

export function textoCaducidad(caduca: string | null, ahora = Date.now()): string {
  if (caduca === null) return "Sin caducidad";
  const ms = Date.parse(caduca) - ahora;
  if (ms <= 0) return "Caducado";
  const horas = Math.ceil(ms / 3600000);
  if (horas < 24) return `Caduca en ${horas} h`;
  const dias = Math.ceil(horas / 24);
  return `Caduca en ${dias} día${dias === 1 ? "" : "s"}`;
}
