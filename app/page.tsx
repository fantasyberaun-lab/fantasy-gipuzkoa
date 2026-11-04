import Image from "next/image";
import Link from "next/link";
import EnlacesLegales from "@/components/legal/EnlacesLegales";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fantasy.beraunberaxake.com";

// Portada pública: es lo que ven los buscadores. Quien ya tiene sesión nunca
// llega aquí, el middleware lo manda a /plantilla.
const PASOS = [
  {
    titulo: "Monta tu plantilla",
    texto:
      "Ficha ajedrecistas de los Campeonatos de Gipuzkoa con tu presupuesto inicial y elige a quién alinear en cada jornada.",
  },
  {
    titulo: "Puja en el mercado",
    texto:
      "Haz pujas, paga cláusulas de rescisión y vende para mejorar tu equipo antes de que lo haga tu rival.",
  },
  {
    titulo: "Suma puntos con las partidas reales",
    texto:
      "Tus jugadores puntúan según sus resultados y su Elo en cada ronda. Cuanto mejor jueguen, más sube tu equipo.",
  },
  {
    titulo: "Compite en ligas",
    texto:
      "Crea una liga privada con tus amigos o juega en la pública, sube de nivel y desbloquea avatares.",
  },
];

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
  return (
    <div lang="es" className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="banner-tablero px-4 pb-14 pt-[calc(env(safe-area-inset-top)+3rem)] text-center text-white">
        <Image
          src="/icons/icon-192.png"
          alt="Escudo de Beraun Fantasy"
          width={96}
          height={96}
          className="mx-auto mb-4 rounded-full"
          priority
        />
        <h1 className="font-display text-4xl font-semibold">Beraun Fantasy</h1>
        <p className="mx-auto mt-2 max-w-md text-base text-white/80">
          El fantasy de ajedrez de los Campeonatos de Gipuzkoa.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/40 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h2 className="font-display text-2xl font-semibold">
          ¿Qué es Beraun Fantasy?
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-neutral-300">
          Beraun Fantasy es un juego gratuito de fantasy de ajedrez. Eliges
          ajedrecistas reales que juegan los Campeonatos de Gipuzkoa, formas tu
          plantilla y ganas puntos según lo que ocurre en el tablero: resultados,
          rendimiento y variación de Elo.
        </p>

        <h2 className="mt-10 font-display text-2xl font-semibold">
          Cómo se juega
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {PASOS.map((p, i) => (
            <li
              key={p.titulo}
              className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <span className="text-xs font-medium text-accent">Paso {i + 1}</span>
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
          Preguntas frecuentes
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium">¿Es gratis?</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">
              Sí. Se juega con dinero ficticio del propio juego.
            </dd>
          </div>
          <div>
            <dt className="font-medium">¿Qué campeonatos incluye?</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">
              Los Campeonatos de Gipuzkoa de ajedrez, con sus jugadores y rondas
              reales.
            </dd>
          </div>
          <div>
            <dt className="font-medium">¿Se puede jugar desde el móvil?</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">
              Sí, funciona en el navegador y se puede instalar como app.
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
