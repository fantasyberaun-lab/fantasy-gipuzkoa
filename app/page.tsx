import Image from "next/image";
import Link from "next/link";
import EnlacesLegales from "@/components/legal/EnlacesLegales";
import { getT } from "@/lib/i18n/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fantasy.beraunberaxake.com";

// Portada pública: es lo que ven los buscadores. Quien ya tiene sesión nunca
// llega aquí, el middleware lo manda a /plantilla.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Beraun Fantasy",
      alternateName: "Fantasy Beraun",
      inLanguage: "es",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Beraun Fantasy",
      url: SITE_URL,
      description:
        "Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa: plantillas, mercado, ligas y clasificaciones.",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      inLanguage: "es",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
  ],
};

export default function PortadaPage() {
  const t = getT().inicio;
  const jsonLdLocal = {
    ...jsonLd,
    "@graph": jsonLd["@graph"].map((item, index) =>
      index === 1 ? { ...item, description: t.lema, inLanguage: "es" } : item
    ),
  };
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLocal) }}
      />
      <header className="banner-tablero px-4 pb-14 pt-[calc(env(safe-area-inset-top)+3rem)] text-center text-white">
        <Image
          src="/icons/icon-192.png"
          alt={t.altEscudo}
          width={96}
          height={96}
          className="mx-auto mb-4 rounded-full"
          priority
        />
        <h1 className="font-display text-4xl font-semibold">Beraun Fantasy</h1>
        <p className="mx-auto mt-2 max-w-md text-base text-white/80">
          {t.lema}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {t.crearCuenta}
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/40 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            {t.entrar}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h2 className="font-display text-2xl font-semibold">
          {t.queEs}
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-neutral-300">
          {t.queEsTexto}
        </p>

        <h2 className="mt-10 font-display text-2xl font-semibold">
          {t.comoSeJuega}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {t.pasos.map((p, i) => (
            <li
              key={p.titulo}
              className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <span className="text-xs font-medium text-accent">{t.paso(i + 1)}</span>
              <h3 className="mt-1 font-display text-lg font-semibold">
                {p.titulo}
              </h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                {p.texto}
              </p>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 font-display text-2xl font-semibold">
          {t.preguntas}
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium">{t.gratis}</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">
              {t.gratisRespuesta}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t.campeonatos}</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">
              {t.campeonatosRespuesta}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t.movil}</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">
              {t.movilRespuesta}
            </dd>
          </div>
        </dl>
      </main>

      <footer className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
        <EnlacesLegales />
      </footer>
    </div>
  );
}
