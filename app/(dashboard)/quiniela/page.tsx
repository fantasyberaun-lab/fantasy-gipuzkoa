"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import {
  fetchQuinielaActual,
  guardarPrediccion,
  type MesaQuiniela,
  type Pronostico,
} from "@/lib/supabase/quinielaQueries";

// Quiniela de emparejamientos (Fase 2): pronostica cada mesa de la última ronda
// publicada; al entrar el resultado se resuelve sola y paga saldo (0119).
export default function QuinielaPage() {
  const supabase = createClient();
  const t = useT();
  const [mesas, setMesas] = useState<MesaQuiniela[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const guardandoRef = useRef(false);

  const cargar = useCallback(async () => {
    setMesas(await fetchQuinielaActual(supabase));
  }, [supabase]);

  useEffect(() => {
    cargar();
    // Al entrar los resultados, las mesas se bloquean y muestran el acierto.
    const canal = supabase
      .channel(`quiniela-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => cargar())
      .subscribe();
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(id);
  }, [aviso]);

  async function pronosticar(mesa: MesaQuiniela, valor: Pronostico) {
    if (mesa.resultado != null || guardandoRef.current) return;
    guardandoRef.current = true;
    const previo = mesa.miPronostico;
    // Optimista.
    setMesas((ms) =>
      ms?.map((m) => (m.pairingId === mesa.pairingId ? { ...m, miPronostico: valor } : m)) ?? ms
    );
    const r = await guardarPrediccion(supabase, mesa.pairingId, valor);
    guardandoRef.current = false;
    if (r.ok) {
      setAviso(t.quiniela.guardado);
    } else {
      // Revertir.
      setMesas((ms) =>
        ms?.map((m) => (m.pairingId === mesa.pairingId ? { ...m, miPronostico: previo } : m)) ?? ms
      );
      setAviso(r.mensaje || t.quiniela.error);
    }
  }

  if (mesas === null) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  if (mesas.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">{t.quiniela.titulo}</h1>
        <p className="mt-3 text-sm text-neutral-500">{t.quiniela.sin}</p>
      </div>
    );
  }

  const cabecera = mesas[0];

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold">{t.quiniela.titulo}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {cabecera.jornada != null
          ? t.quiniela.jornadaTorneo(cabecera.jornada, cabecera.torneo ?? "")
          : t.quiniela.intro}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">{t.quiniela.intro}</p>

      <div className="mt-5 flex flex-col gap-3">
        {mesas.map((m) => {
          const bloqueada = m.resultado != null;
          const opciones: { valor: Pronostico; texto: string }[] = [
            { valor: "blancas", texto: t.quiniela.blancas },
            { valor: "tablas", texto: t.quiniela.tablas },
            { valor: "negras", texto: t.quiniela.negras },
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
                {bloqueada && m.miPronostico != null && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      m.acertada
                        ? "bg-positive/15 text-positive"
                        : "bg-negative/15 text-negative"
                    }`}
                  >
                    {m.acertada ? t.quiniela.acierto : t.quiniela.fallo}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {opciones.map((o) => {
                  const elegido = m.miPronostico === o.valor;
                  const esResultado = m.resultado === o.valor;
                  let clase =
                    "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ";
                  if (bloqueada) {
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
                      disabled={bloqueada}
                      onClick={() => pronosticar(m, o.valor)}
                      className={clase}
                    >
                      {o.texto}
                    </button>
                  );
                })}
              </div>
              {bloqueada && (
                <p className="mt-1.5 text-center text-[11px] text-neutral-400">{t.quiniela.jugada}</p>
              )}
            </div>
          );
        })}
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
