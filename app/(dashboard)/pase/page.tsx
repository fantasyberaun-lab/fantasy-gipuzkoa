"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import {
  fetchEstadoPase,
  reclamarEscalonPase,
  type EscalonPase,
  type EstadoPase,
  type TipoEscalon,
} from "@/lib/supabase/paseQueries";

const ICONO: Record<TipoEscalon, string> = {
  saldo: "💰",
  xp: "⭐",
  proteccion: "🛡️",
  insignia: "🏅",
};

// Pase de temporada (Fase 2): barra de progreso propia que sube con la actividad
// y escalones de recompensa reclamables (0120).
export default function PasePage() {
  const supabase = createClient();
  const t = useT();
  const { recargarSaldo } = useGameState();
  const [estado, setEstado] = useState<EstadoPase | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reclamando, setReclamando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setEstado(await fetchEstadoPase(supabase));
  }, [supabase]);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(id);
  }, [aviso]);

  async function reclamar(e: EscalonPase) {
    setReclamando(e.nivel);
    const r = await reclamarEscalonPase(supabase, e.nivel);
    setReclamando(null);
    if (r.ok) {
      setAviso(t.pase.reclamadoOk);
      await Promise.all([cargar(), recargarSaldo()]);
    } else {
      setAviso(r.mensaje || t.pase.error);
    }
  }

  if (estado === null) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  if (!estado.hay) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">{t.pase.titulo}</h1>
        <p className="mt-3 text-sm text-neutral-500">{t.pase.sin}</p>
      </div>
    );
  }

  const puntos = estado.puntos ?? 0;
  const maxUmbral = Math.max(1, ...estado.escalones.map((e) => e.umbral));
  const progreso = Math.min(100, (puntos / maxUmbral) * 100);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold">{t.pase.titulo}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {estado.temporada ? `${estado.temporada} · ` : ""}
        {t.pase.intro}
      </p>

      <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="font-display text-3xl font-bold text-accent">{puntos}</p>
        <p className="text-xs text-neutral-500">{t.pase.puntos(puntos)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      <ol className="mt-5 flex flex-col gap-2">
        {estado.escalones.map((e) => (
          <li
            key={e.nivel}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              e.reclamado
                ? "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50"
                : e.alcanzado
                  ? "border-accent bg-brand-50 dark:bg-neutral-800"
                  : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg">
              {ICONO[e.tipo]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">{e.etiqueta}</p>
              <p className="text-xs text-neutral-500">{t.pase.bloqueado(e.umbral)}</p>
            </div>
            {e.reclamado ? (
              <span className="shrink-0 text-xs font-semibold text-neutral-400">
                ✓ {t.pase.reclamado}
              </span>
            ) : e.alcanzado ? (
              <button
                type="button"
                onClick={() => reclamar(e)}
                disabled={reclamando === e.nivel}
                className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {t.pase.reclamar}
              </button>
            ) : (
              <span className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden="true">
                🔒
              </span>
            )}
          </li>
        ))}
      </ol>

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
