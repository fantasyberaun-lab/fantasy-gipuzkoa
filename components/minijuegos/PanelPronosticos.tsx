"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import {
  fetchMesasPronostico,
  fetchResumenPronosticos,
  fetchTorneosPronostico,
  guardarPronostico,
  type MesaPronostico,
  type Pronostico,
  type ResumenPronosticos,
  type TorneoPronostico,
} from "@/lib/supabase/pronosticosQueries";

// Pronósticos de partidas (0118): categoría aparte dentro de Minijuegos. Sin
// recompensas ni ranking. Se elige un torneo y se pronostican las mesas que se
// quiera; el pronóstico se puede cambiar o quitar hasta que empiece la ronda.
export default function PanelPronosticos() {
  const supabase = createClient();
  const t = useT().pronosticos;
  const [torneos, setTorneos] = useState<TorneoPronostico[] | null>(null);
  const [resumen, setResumen] = useState<ResumenPronosticos | null>(null);
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [mesas, setMesas] = useState<MesaPronostico[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const guardandoRef = useRef(false);

  const cargarTorneos = useCallback(async () => {
    const [ts, rs] = await Promise.all([
      fetchTorneosPronostico(supabase),
      fetchResumenPronosticos(supabase),
    ]);
    setTorneos(ts);
    setResumen(rs);
  }, [supabase]);

  useEffect(() => {
    cargarTorneos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!torneoId) {
      setMesas(null);
      return;
    }
    fetchMesasPronostico(supabase, torneoId).then(setMesas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneoId]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2300);
    return () => clearTimeout(id);
  }, [aviso]);

  async function pronosticar(mesa: MesaPronostico, valor: Pronostico) {
    if (!mesa.abierta || guardandoRef.current) return;
    guardandoRef.current = true;
    const previo = mesa.miPronostico;
    // Tocar de nuevo la opción elegida la quita.
    const nuevo = previo === valor ? null : valor;
    setMesas((ms) =>
      ms?.map((m) => (m.pairingId === mesa.pairingId ? { ...m, miPronostico: nuevo } : m)) ?? ms
    );
    const r = await guardarPronostico(supabase, mesa.pairingId, nuevo);
    guardandoRef.current = false;
    if (r.ok) {
      setAviso(nuevo ? t.guardado : t.quitado);
      cargarTorneos();
    } else {
      setMesas((ms) =>
        ms?.map((m) => (m.pairingId === mesa.pairingId ? { ...m, miPronostico: previo } : m)) ?? ms
      );
      setAviso(r.mensaje || t.error);
    }
  }

  if (torneos === null) {
    return <p className="py-6 text-center text-sm text-neutral-500">…</p>;
  }

  const torneo = torneos.find((x) => x.tournamentId === torneoId) ?? null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">{t.intro}</p>
      {resumen && resumen.resueltos > 0 && (
        <p className="text-xs font-semibold text-accent">
          {t.resumen(resumen.aciertos, resumen.resueltos)}
        </p>
      )}

      {torneos.length === 0 && <p className="text-sm text-neutral-500">{t.sin}</p>}

      {!torneo &&
        torneos.map((x) => (
          <button
            key={x.tournamentId}
            type="button"
            onClick={() => setTorneoId(x.tournamentId)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-accent dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{x.torneo}</span>
              <span className="block text-xs text-neutral-500">
                {t.jornadaFecha(x.jornada, x.fechaInicio ?? "")} · {t.haciendo(x.misPronosticos, x.mesas)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                x.abierta ? "bg-positive/15 text-positive" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {x.abierta ? t.abiertaEtiqueta : t.cerradaEtiqueta}
            </span>
          </button>
        ))}

      {torneo && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTorneoId(null)}
            className="text-xs font-semibold text-accent underline underline-offset-2"
          >
            {t.volver}
          </button>
          <div>
            <h3 className="font-display text-xl font-semibold">{torneo.torneo}</h3>
            <p className="text-xs text-neutral-500">
              {t.jornadaFecha(torneo.jornada, torneo.fechaInicio ?? "")}
            </p>
            {!torneo.abierta && (
              <p className="mt-1 text-xs text-neutral-500">{t.cerradaAviso}</p>
            )}
          </div>

          {mesas === null && <p className="text-sm text-neutral-500">…</p>}
          {mesas?.map((m) => {
            const opciones: { valor: Pronostico; texto: string }[] = [
              { valor: "blancas", texto: t.blancas },
              { valor: "tablas", texto: t.tablas },
              { valor: "negras", texto: t.negras },
            ];
            return (
              <div
                key={m.pairingId}
                className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold">
                    {m.blancoNombre}
                    <span className="text-neutral-400"> {m.blancoElo ?? "—"}</span>
                    <span className="mx-1.5 text-xs text-neutral-400">vs</span>
                    {m.negroNombre}
                    <span className="text-neutral-400"> {m.negroElo ?? "—"}</span>
                  </p>
                  {m.acertada != null && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        m.acertada ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
                      }`}
                    >
                      {m.acertada ? t.acierto : t.fallo}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {opciones.map((o) => {
                    const elegido = m.miPronostico === o.valor;
                    const esResultado = m.resultado === o.valor;
                    let clase = "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ";
                    if (m.resultado != null) {
                      if (esResultado) clase += "border-positive bg-positive/10 text-positive";
                      else if (elegido) clase += "border-negative bg-negative/10 text-negative";
                      else clase += "border-neutral-200 text-neutral-400 dark:border-neutral-800";
                    } else if (elegido) {
                      clase += "border-accent bg-accent text-white";
                    } else {
                      clase +=
                        "border-neutral-300 text-neutral-700 hover:border-accent dark:border-neutral-700 dark:text-neutral-200";
                    }
                    return (
                      <button
                        key={o.valor}
                        type="button"
                        disabled={!m.abierta}
                        onClick={() => pronosticar(m, o.valor)}
                        className={clase}
                      >
                        {o.texto}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
