"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/IdiomaProvider";

// Invita a un amigo: copiar o compartir el enlace de la web. Sin códigos ni
// recompensas.
const ENLACE = process.env.NEXT_PUBLIC_SITE_URL || "https://fantasy.beraunberaxake.com";

export default function InvitarPage() {
  const t = useT();
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(id);
  }, [aviso]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(ENLACE);
      setAviso(t.invitar.copiado);
    } catch {
      setAviso(ENLACE);
    }
  }

  async function compartir() {
    const nav = navigator as Navigator & {
      share?: (d: { text?: string; url?: string }) => Promise<void>;
    };
    try {
      if (nav.share) await nav.share({ text: t.invitar.compartirTexto, url: ENLACE });
      else await copiar();
    } catch {
      /* el usuario canceló */
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-semibold">{t.invitar.titulo}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t.invitar.intro}</p>

      <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{t.invitar.enlace}</p>
        <p className="mt-1 break-all font-display text-lg font-semibold text-accent">{ENLACE}</p>
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={copiar}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold transition-colors hover:border-accent dark:border-neutral-700"
          >
            {t.invitar.copiar}
          </button>
          <button
            type="button"
            onClick={compartir}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            {t.invitar.compartir}
          </button>
        </div>
      </div>

      {aviso && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        >
          <p className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/15">
            {aviso}
          </p>
        </div>
      )}
    </div>
  );
}
