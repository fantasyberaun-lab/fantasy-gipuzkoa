"use client";

import Link from "next/link";
import { useT } from "@/components/IdiomaProvider";

// Primera capa informativa (art. 13 RGPD): se enseña en el registro y al
// principio de la Política de Privacidad. En castellano son las filas de
// lib/legal/privacidad.ts (INFO_BASICA); en otros idiomas, su traducción.
export default function InfoBasicaRGPD({ conEnlace = false }: { conEnlace?: boolean }) {
  const t = useT();
  const filas = t.legal.infoBasica;
  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      <p className="mb-2 font-semibold">{t.legal.infoBasicaTitulo}</p>
      <dl className="flex flex-col gap-1.5">
        {filas.map((fila, i) => (
          <div key={fila.etiqueta} className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="shrink-0 font-medium sm:w-28">{fila.etiqueta}</dt>
            <dd className="text-neutral-600 dark:text-neutral-400">
              {/* La última fila es "Más información": con enlace si se pide. */}
              {i === filas.length - 1 && conEnlace ? (
                <>
                  {t.legal.masInfoAntes}
                  <Link
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    {t.legal.masInfoEnlace}
                  </Link>
                  {t.legal.masInfoDespues}
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
