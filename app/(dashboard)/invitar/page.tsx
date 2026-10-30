"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import {
  canjearReferido,
  fetchMiCodigo,
  fetchMisReferidosTotal,
} from "@/lib/supabase/referidosQueries";

// Invita a un amigo (Fase 3): comparte tu código; al canjearlo un amigo nuevo,
// ganáis saldo los dos (0121).
export default function InvitarPage() {
  const supabase = createClient();
  const t = useT();
  const { recargarSaldo } = useGameState();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [entrada, setEntrada] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [canjeando, setCanjeando] = useState(false);

  const cargar = useCallback(async () => {
    const [c, n] = await Promise.all([
      fetchMiCodigo(supabase),
      fetchMisReferidosTotal(supabase),
    ]);
    setCodigo(c);
    setTotal(n);
  }, [supabase]);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(id);
  }, [aviso]);

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setAviso(t.invitar.copiado);
    } catch {
      setAviso(codigo);
    }
  }

  async function compartir() {
    if (!codigo) return;
    const texto = t.invitar.compartirTexto(codigo);
    const nav = navigator as Navigator & { share?: (d: { text?: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        setAviso(t.invitar.copiado);
      }
    } catch {
      /* el usuario canceló */
    }
  }

  async function canjear() {
    const cod = entrada.trim();
    if (!cod || canjeando) return;
    setCanjeando(true);
    const r = await canjearReferido(supabase, cod);
    setCanjeando(false);
    if (r.ok) {
      setEntrada("");
      setAviso(t.invitar.canjeadoOk(r.recompensa ?? 0));
      await Promise.all([cargar(), recargarSaldo()]);
    } else {
      setAviso(r.mensaje || t.invitar.error);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-semibold">{t.invitar.titulo}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t.invitar.intro}</p>

      <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{t.invitar.tuCodigo}</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-widest text-accent">
          {codigo ?? "…"}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={copiar}
            disabled={!codigo}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold transition-colors hover:border-accent disabled:opacity-60 dark:border-neutral-700"
          >
            {t.invitar.copiar}
          </button>
          <button
            type="button"
            onClick={compartir}
            disabled={!codigo}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {t.invitar.compartir}
          </button>
        </div>
        {total > 0 && (
          <p className="mt-3 text-sm font-semibold text-positive">{t.invitar.invitados(total)}</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-semibold">{t.invitar.canjearTitulo}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{t.invitar.canjearIntro}</p>
        <div className="mt-3 flex gap-2">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value.toUpperCase())}
            placeholder={t.invitar.canjearPlaceholder}
            maxLength={12}
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="button"
            onClick={canjear}
            disabled={canjeando || entrada.trim() === ""}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {t.invitar.canjearBoton}
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
