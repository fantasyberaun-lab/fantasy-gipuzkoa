import Link from "next/link";
import LegalGate from "@/components/legal/LegalGate";
import { getT } from "@/lib/i18n/server";

// Minijuegos: página aparte, sin las pestañas de la app (como las páginas
// legales), pero solo para usuarios con sesión (ver middleware) y que hayan
// aceptado los textos legales vigentes.
export default function JuegosLayout({ children }: { children: React.ReactNode }) {
  const t = getT();
  return (
    <LegalGate>
      <div className="flex min-h-screen flex-col">
        <header className="banner-tablero">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
            <h1 className="font-display text-2xl font-semibold">
              <span aria-hidden="true">🎮 </span>
              {t.minijuegos.titulo}
            </h1>
            <Link
              href="/plantilla"
              className="shrink-0 rounded-full border border-white/25 px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:border-gold hover:text-gold"
            >
              ← {t.minijuegos.volver}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5">
          {children}
        </main>
      </div>
    </LegalGate>
  );
}
