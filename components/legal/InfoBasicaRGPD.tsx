import Link from "next/link";
import { INFO_BASICA } from "@/lib/legal/privacidad";

// Primera capa informativa (art. 13 RGPD): se enseña en el registro y al
// principio de la Política de Privacidad.
export default function InfoBasicaRGPD({ conEnlace = false }: { conEnlace?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      <p className="mb-2 font-semibold">Información básica sobre protección de datos</p>
      <dl className="flex flex-col gap-1.5">
        {INFO_BASICA.map((fila) => (
          <div key={fila.etiqueta} className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="shrink-0 font-medium sm:w-28">{fila.etiqueta}</dt>
            <dd className="text-neutral-600 dark:text-neutral-400">
              {fila.etiqueta === "Más información" && conEnlace ? (
                <>
                  En la{" "}
                  <Link
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    Política de Privacidad
                  </Link>{" "}
                  completa.
                </>
              ) : (
                fila.texto
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
