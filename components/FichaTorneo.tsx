"use client";

import { useIdioma } from "@/components/IdiomaProvider";
import { rangoFechas, type Torneo } from "@/lib/torneos";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-neutral-500">{etiqueta}</dt>
      <dd className="whitespace-pre-line break-words">{valor}</dd>
    </div>
  );
}

// Ficha con toda la información del torneo (estilo chess-results). Solo
// enseña los campos que tienen contenido.
export default function FichaTorneo({ torneo: t }: { torneo: Torneo }) {
  const { t: textos, locale } = useIdioma();
  const f = textos.torneos;
  const lugar = [t.lugar, t.ciudad, t.provincia, t.pais].filter(Boolean).join(", ");

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <Dato etiqueta={f.fichaFechas} valor={rangoFechas(t, locale)} />
      <Dato etiqueta={f.fichaLugar} valor={lugar || null} />
      <Dato etiqueta={f.fichaDireccion} valor={t.direccion} />
      <Dato etiqueta={f.fichaOrganizador} valor={t.organizador} />
      <Dato etiqueta={f.fichaFederacion} valor={t.federacion} />
      <Dato etiqueta={f.fichaDirector} valor={t.director} />
      <Dato etiqueta={f.fichaArbitro} valor={t.arbitroPrincipal} />
      <Dato etiqueta={f.fichaArbitros} valor={t.arbitrosAdjuntos} />
      <Dato
        etiqueta={f.fichaRondas}
        valor={t.numeroRondas != null ? String(t.numeroRondas) : null}
      />
      <Dato etiqueta={f.fichaSistema} valor={t.sistema} />
      <Dato etiqueta={f.fichaRitmo} valor={t.ritmoJuego} />
      <Dato etiqueta={f.fichaElo} valor={t.computoElo} />
      <Dato etiqueta={f.fichaDesempates} valor={t.desempates} />
      <Dato etiqueta={f.fichaEmail} valor={t.emailContacto} />
      {t.webUrl && (
        <div className="flex flex-col">
          <dt className="text-xs text-neutral-500">{f.fichaWeb}</dt>
          <dd className="truncate">
            <a
              href={/^https?:\/\//i.test(t.webUrl) ? t.webUrl : `https://${t.webUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              {t.webUrl}
            </a>
          </dd>
        </div>
      )}
      <Dato
        etiqueta={f.fichaBonus}
        valor={t.bonusVictoria > 0 ? f.fichaBonusValor(t.bonusVictoria) : null}
      />
      <Dato etiqueta={f.fichaObservaciones} valor={t.observaciones} />
    </dl>
  );
}
