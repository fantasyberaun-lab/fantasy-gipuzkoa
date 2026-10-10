import Link from "next/link";
import EnlacesLegales from "@/components/legal/EnlacesLegales";
import { getT } from "@/lib/i18n/server";

// Páginas legales: públicas (sin sesión) porque hay que poder leerlas antes de
// registrarse. No usan GameStateProvider.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = getT();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="banner-tablero">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
          <span className="font-display text-xl font-semibold">Beraun Fantasy</span>
          <Link href="/" className="text-sm text-white/80 underline-offset-2 hover:underline">
            {t.legal.irALaApp}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>

      <footer className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
        <EnlacesLegales />
      </footer>
    </div>
  );
}
