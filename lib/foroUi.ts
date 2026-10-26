import type { Textos } from "@/lib/i18n/textos";
import type { EstadoForo, FalloForo } from "@/lib/supabase/foroQueries";

// Texto de error para un fallo devuelto por las funciones de foros. Los códigos con un
// dato (máximos, mínimos) usan su frase con el número; el resto, la tabla de errores.
export function textoError(tf: Textos["foros"], f: FalloForo, estado: EstadoForo | null, inicial = false): string {
  switch (f.codigo) {
    case "larga":
      return tf.errorLarga(f.maximo ?? (inicial ? estado?.maxInicial : estado?.maxRespuesta) ?? 300);
    case "titulo_corto":
      return tf.errorTituloCorto(f.minimo ?? estado?.tituloMin ?? 5);
    case "titulo_largo":
      return tf.errorTituloLargo(f.maximo ?? estado?.tituloMax ?? 80);
    case "limite_dia":
      return tf.errorLimiteDia(f.maximo ?? estado?.maxTemasDia ?? 2);
    case "plazo":
      return tf.errores.plazo;
    default:
      return (tf.errores as Record<string, string>)[f.codigo] ?? tf.errores.red;
  }
}

// ids de los mencionados cuyo "@alias" sigue en el texto.
export function idsMencionados(texto: string, menciones: Record<string, string>): string[] {
  const minusculas = texto.toLowerCase();
  return Object.entries(menciones)
    .filter(([, nombre]) => minusculas.includes(`@${nombre.toLowerCase()}`))
    .map(([id]) => id);
}

// Título que se enseña: el de los hilos del sistema depende del idioma.
export function tituloTema(
  tf: Textos["foros"],
  t: { titulo: string | null; sistema: boolean; jornada: number | null; eliminado: boolean }
): string {
  if (t.eliminado) return tf.temaEliminado;
  if (t.sistema) return tf.jornadaTitulo(t.jornada);
  return t.titulo ?? tf.temaEliminado;
}
