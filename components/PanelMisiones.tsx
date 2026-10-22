"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { EVENTO_XP } from "@/components/RachaDiaria";
import {
  EVENTO_MISIONES,
  fetchEstadoMisiones,
  reclamarMisionDB,
  type AmbitoMision,
  type EstadoMisiones,
  type GrupoMision,
  type Mision,
} from "@/lib/supabase/misionesQueries";

const PESTANAS: AmbitoMision[] = ["pub", "pri", "gen", "mj"];

// Un icono por familia (sin el sufijo _pub / _pri).
const ICONO: Record<string, string> = {
  caz100: "⚔️", caz200: "⚔️", caz300: "⚔️", capitan: "👑", oro: "🥇", regular: "📈",
  victorias: "🏅", capgig: "🛡️", cuatro: "4️⃣", pleno: "💯", fiel: "🤝",
  pujas: "🔨", fichajes: "✍️", blindaje: "🔒", subircl: "⬆️", clausulazo: "🔓",
  plusvalia: "💹", mejorop: "💰", mercader: "🏪",
  top10: "🔟", podio: "🥉", primero: "🏆", lider: "🚩", presencia: "📊", ganajor: "👑",
  valorplantilla: "🏦", caja: "💶", estrella: "⭐", lujo: "💎",
  rachadiaria: "🔥", nivel: "🎓", veterano: "🧓", cofres: "🎁", semana: "🗓️",
  diacompleto: "✅", seguidos: "🔗", cadena: "⛓️", cadenaperf: "🎯", m900v: "🔥",
  m900j: "🌟", perfn: "✨", perfleyj: "🏛️", perfleyv: "🏛️", rankmj: "🥇",
  primerodia: "☀️", maraton: "🏃", cofresmj: "📦", m500x8: "⚖️", tt4: "🎪",
  tt8: "🎡", puntosmj: "🎮", alinea120: "🌌", sinelo: "🕵️", sinelov: "🥷",
};

// Pestaña "Misiones" de Mi perfil (/misiones redirige allí): pestañas por ámbito (liga pública, ligas privadas, cuenta,
// minijuegos) y, dentro, una tarjeta por serie con su siguiente misión por reclamar.
export default function PanelMisiones({ onVerNiveles }: { onVerNiveles?: () => void }) {
  const supabase = createClient();
  const t = useT().misiones;
  const { locale } = useIdioma();
  const { equipo } = useGameState();
  const [estado, setEstado] = useState<EstadoMisiones | null>(null);
  const [error, setError] = useState(false);
  const [pestana, setPestana] = useState<AmbitoMision>("pub");
  const [soloListas, setSoloListas] = useState(false);
  const [reclamando, setReclamando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const e = await fetchEstadoMisiones(supabase);
    setEstado(e);
    setError(!e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_MISIONES, cargar);
    return () => window.removeEventListener(EVENTO_MISIONES, cargar);
  }, [cargar]);

  // El aviso de "+40 XP" se quita solo.
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(id);
  }, [aviso]);

  async function reclamar(m: Mision) {
    if (reclamando) return;
    setReclamando(m.serie);
    const r = await reclamarMisionDB(supabase, m.serie);
    setReclamando(null);
    if (r.ok) {
      setAviso(t.reclamada(r.xp));
      window.dispatchEvent(new Event(EVENTO_XP));
    } else {
      setAviso(r.mensaje);
    }
    window.dispatchEvent(new Event(EVENTO_MISIONES));
  }

  if (!estado) {
    return error ? (
      <div className="text-sm">
        <p className="text-negative dark:text-red-400">{t.error}</p>
        <button onClick={cargar} className="mt-2 font-semibold text-accent hover:underline">
          {t.reintentar}
        </button>
      </div>
    ) : (
      <p className="text-sm text-neutral-500">{t.cargando}</p>
    );
  }

  // Redondea hacia abajo: 299,9 M no es 300 M.
  const f = (n: number) => Math.floor(n).toLocaleString(locale);
  const textos = t.series as Record<string, { titulo: string; texto: (n: number, f: string) => string }>;

  const listasPorPestana = (a: AmbitoMision) =>
    estado.misiones.filter((m) => m.ambito === a && m.lista).length;

  const visibles = estado.misiones.filter((m) => m.ambito === pestana && (!soloListas || m.lista));
  // Mantiene el orden del servidor y agrupa por sección.
  const grupos: GrupoMision[] = [];
  for (const m of visibles) if (!grupos.includes(m.grupo)) grupos.push(m.grupo);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">{t.titulo}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t.intro}</p>
        <p className="mt-2 text-sm font-semibold text-accent">
          {estado.pendientes > 0 ? t.listas(estado.pendientes) : t.ningunaLista}
        </p>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
        {PESTANAS.map((a) => {
          const activa = a === pestana;
          const n = listasPorPestana(a);
          return (
            <button
              key={a}
              role="tab"
              aria-selected={activa}
              onClick={() => setPestana(a)}
              className={`relative flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                activa
                  ? "bg-white text-accent shadow-sm dark:bg-neutral-800"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {t.pestanas[a]}
              {n > 0 && (
                <span
                  className="ml-1.5 inline-block h-2 w-2 rounded-full bg-gold align-middle"
                  aria-label={t.listas(n)}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs text-neutral-500">{t.ayudaPestana[pestana]}</p>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={soloListas}
            onChange={(e) => setSoloListas(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          {t.soloListas}
        </label>
      </div>

      {visibles.length === 0 && <p className="text-sm text-neutral-500">{t.nadaAqui}</p>}

      {grupos.map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t.grupos[g]}</h3>
          <ul className="flex flex-col gap-3">
            {visibles
              .filter((m) => m.grupo === g)
              .map((m, idx) => {
                const serie = textos[m.base];
                const titulo = serie?.titulo ?? m.base;
                const descripcion = serie ? serie.texto(m.objetivo, f(m.objetivo)) : "";
                const min = m.sentido === "min";
                const fraccion = m.terminada
                  ? 1
                  : min
                    ? m.progreso
                      ? Math.min(1, m.objetivo / m.progreso)
                      : 0
                    : m.objetivo > 0
                      ? Math.min(1, (m.progreso ?? 0) / m.objetivo)
                      : 0;
                const marcador = min
                  ? `${m.progreso ? t.puesto(m.progreso) : t.sinPuesto} / ${t.puesto(m.objetivo)}`
                  : `${f(Math.min(m.progreso ?? 0, m.objetivo))} / ${f(m.objetivo)}`;
                return (
                  <li
                    key={m.serie}
                    data-tutorial={g === grupos[0] && idx === 0 ? "misiones-serie" : undefined}
                    className={`rounded-xl border bg-white p-4 dark:bg-neutral-900 ${
                      m.lista
                        ? "border-gold ring-1 ring-gold/60"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none" aria-hidden="true">
                        {ICONO[m.base] ?? "🎯"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="font-semibold">{titulo}</p>
                          <p className="text-xs text-neutral-500">
                            {m.terminada ? t.completada : t.escalon(m.nivel, m.niveles)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{descripcion}</p>

                        <div className="mt-3 flex items-center gap-3">
                          <div
                            role="progressbar"
                            aria-label={titulo}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(fraccion * 100)}
                            className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                          >
                            <div
                              className={`h-full transition-all ${m.lista || m.terminada ? "bg-gold" : "bg-accent"}`}
                              style={{ width: `${fraccion * 100}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-neutral-500">{marcador}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-gold-dark">
                            {m.terminada ? "✓" : t.recompensa(m.xp)}
                          </span>
                          {m.lista && (
                            <button
                              onClick={() => reclamar(m)}
                              disabled={reclamando !== null}
                              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                            >
                              {reclamando === m.serie ? t.reclamando : t.reclamar(m.xp)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      {onVerNiveles ? (
        <button
          type="button"
          onClick={onVerNiveles}
          className="text-center text-sm font-semibold text-accent hover:underline"
        >
          {t.verNiveles}
        </button>
      ) : equipo.id && (
        <Link
          href={`/managers/${equipo.id}?tab=niveles`}
          className="text-center text-sm font-semibold text-accent hover:underline"
        >
          {t.verNiveles}
        </Link>
      )}

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
