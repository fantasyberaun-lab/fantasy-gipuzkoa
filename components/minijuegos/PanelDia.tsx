"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { EVENTO_XP } from "@/components/RachaDiaria";
import { formatoMillones, JUEGOS } from "@/lib/minijuegos";
import {
  abrirCofreMinijuegosDB,
  repararRachaDB,
  type EstadoMinijuegos,
  type ResultadoCofreMj,
} from "@/lib/supabase/minijuegosQueries";

function Barra({
  etiqueta,
  valor,
  tope,
  texto,
}: {
  etiqueta: string;
  valor: number;
  tope: number;
  texto: string;
}) {
  const t = useT().minijuegos;
  const lleno = tope > 0 && valor >= tope;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{etiqueta}</span>
        <span className={`font-display text-lg font-semibold ${lleno ? "text-gold-dark" : "text-accent"}`}>{texto}</span>
      </div>
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={tope}
        aria-valuenow={Math.min(valor, tope)}
        className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      >
        <div
          className={`h-full transition-all ${lleno ? "bg-gold" : "bg-accent"}`}
          style={{ width: `${tope > 0 ? Math.min(100, (valor / tope) * 100) : 0}%` }}
        />
      </div>
      {lleno && <p className="mt-0.5 text-xs font-semibold text-gold-dark">{t.maximoAlcanzado}</p>}
    </div>
  );
}

// Panel del día: techos de monedas y XP, partidas completadas, cofre y objetos.
export default function PanelDia({
  estado,
  onCambio,
}: {
  estado: EstadoMinijuegos;
  onCambio: () => void;
}) {
  const supabase = createClient();
  const t = useT().minijuegos;
  const { locale } = useIdioma();
  const [abriendo, setAbriendo] = useState(false);
  const [cofre, setCofre] = useState<Extract<ResultadoCofreMj, { ok: true }> | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const m = (n: number) => formatoMillones(n, locale);

  async function abrir() {
    if (abriendo) return;
    setAbriendo(true);
    setAviso(null);
    const r = await abrirCofreMinijuegosDB(supabase);
    setAbriendo(false);
    if (r.ok) {
      setCofre(r);
      window.dispatchEvent(new Event(EVENTO_XP));
    } else {
      setAviso(r.mensaje);
    }
    onCambio();
  }

  async function reparar() {
    setAviso(null);
    const r = await repararRachaDB(supabase);
    setAviso(r.ok ? t.reparada(r.racha) : r.mensaje);
    onCambio();
  }

  const premio = cofre ?? (estado.cofrePremio ? { ok: true as const, premio: estado.cofrePremio.tipo, ...estado.cofrePremio } : null);
  const textoPremio = (p: NonNullable<typeof premio>) =>
    p.premio === "monedas" ? t.premioMonedas(m(p.monedas)) : p.premio === "reparador" ? t.premioReparador : t.premioReintento;

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800" aria-label={t.hoy}>
      <h2 className="font-display text-xl font-semibold">{t.hoy}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Barra
          etiqueta={t.monedasHoy}
          valor={estado.monedasHoy}
          tope={estado.topeMonedas}
          texto={`${m(estado.monedasHoy)} / ${m(estado.topeMonedas)} M`}
        />
        <Barra
          etiqueta={t.xpHoy}
          valor={estado.xpHoy}
          tope={estado.topeXp}
          texto={`${estado.xpHoy} / ${estado.topeXp} XP`}
        />
      </div>
      <p className="text-xs text-neutral-500">
        {t.topeAyuda(m(estado.topeMonedas), estado.topeXp)}{" "}
        {t.monedasLigas(m(estado.monedasPorJuego), m(estado.monedasPorJuegoPublica))}
      </p>

      <div>
        <p className="text-sm font-medium">
          {t.misiones} · <span className="text-neutral-500">{t.misionesCompletadas(estado.completados, estado.totalJuegos)}</span>
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {JUEGOS.map((j) => {
            const e = estado.juegos.find((x) => x.id === j.id);
            const hecho = !!e?.recompensa;
            return (
              <li
                key={j.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  hecho
                    ? "border-positive/50 bg-green-50 text-positive dark:bg-green-950/30"
                    : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
                }`}
              >
                <span aria-hidden="true">{hecho ? "✓" : j.icono}</span>
                {t.juegos[j.id].corto}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t.cofreTitulo}</p>
            <p className="text-xs text-neutral-500">
              {estado.cofreAbierto && premio
                ? `${t.cofreAbierto}: ${textoPremio(premio)}`
                : estado.cofreDisponible
                  ? t.cofreListo
                  : t.cofreBloqueado}
            </p>
          </div>
          <span className="text-3xl" aria-hidden="true">
            {estado.cofreAbierto ? "📭" : "🎁"}
          </span>
        </div>
        {estado.cofreDisponible && (
          <button
            type="button"
            onClick={abrir}
            disabled={abriendo}
            className="mt-2 w-full rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-dark disabled:opacity-60"
          >
            {abriendo ? t.abriendo : t.abrirCofre}
          </button>
        )}
      </div>

      {(estado.reparadores > 0 || estado.reintentos > 0 || estado.rachaReparable) && (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{t.objetos}</p>
          <p className="text-neutral-600 dark:text-neutral-300">
            {t.reparadores(estado.reparadores)} · {t.reintentos(estado.reintentos)}
          </p>
          {estado.rachaReparable && (
            <div className="rounded-lg border border-gold/60 p-3 dark:border-gold/40">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                {t.reparableAviso(estado.rachaReparable.racha, estado.rachaReparable.rachaNueva)}
              </p>
              {estado.reparadores > 0 && (
                <button
                  type="button"
                  onClick={reparar}
                  className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  {t.reparar}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {aviso && (
        <p role="status" className="rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
          {aviso}
        </p>
      )}

      {cofre && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.cofreTitulo}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100">
            <p className="text-6xl" aria-hidden="true">
              🎁
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-gold-dark">{textoPremio(cofre)}</p>
            {cofre.xp > 0 && <p className="mt-1 text-sm text-neutral-500">{t.masXp(cofre.xp)}</p>}
            <button
              type="button"
              onClick={() => setCofre(null)}
              className="mt-5 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {t.cerrar}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
