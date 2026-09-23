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
  const lugar = [t.lugar, t.ciudad, t.provincia, t.pais].filter(Boolean).join(", ");

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <Dato etiqueta="Fechas" valor={rangoFechas(t)} />
      <Dato etiqueta="Lugar de juego" valor={lugar || null} />
      <Dato etiqueta="Dirección" valor={t.direccion} />
      <Dato etiqueta="Organizador" valor={t.organizador} />
      <Dato etiqueta="Federación" valor={t.federacion} />
      <Dato etiqueta="Director del torneo" valor={t.director} />
      <Dato etiqueta="Árbitro principal" valor={t.arbitroPrincipal} />
      <Dato etiqueta="Árbitros adjuntos" valor={t.arbitrosAdjuntos} />
      <Dato
        etiqueta="Rondas"
        valor={t.numeroRondas != null ? String(t.numeroRondas) : null}
      />
      <Dato etiqueta="Sistema" valor={t.sistema} />
      <Dato etiqueta="Ritmo de juego" valor={t.ritmoJuego} />
      <Dato etiqueta="Cómputo de Elo" valor={t.computoElo} />
      <Dato etiqueta="Desempates" valor={t.desempates} />
      <Dato etiqueta="Email de contacto" valor={t.emailContacto} />
      {t.webUrl && (
        <div className="flex flex-col">
          <dt className="text-xs text-neutral-500">Web</dt>
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
      <Dato etiqueta="Observaciones" valor={t.observaciones} />
    </dl>
  );
}
