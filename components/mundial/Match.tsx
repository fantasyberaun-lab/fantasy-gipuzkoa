"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIdioma } from "@/components/IdiomaProvider";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMatch,
  guardarPronosticoMundial,
  guardarVotoFinalMundial,
  type EntradaCalendario,
  type EstadoMatch,
  type ResultadoPartida,
  type VotosPartida,
} from "@/lib/supabase/mundialQueries";
import {
  cuentaAtras,
  fechaCalendario,
  fechaLarga,
  horaMadrid,
  marcadorTexto,
  proximaPartida,
} from "@/lib/mundial";

const OPCIONES: ResultadoPartida[] = ["gukesh", "tablas", "sindarov"];

function Tarjeta({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      {titulo && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h2>}
      {children}
    </section>
  );
}

// Porcentajes de la comunidad (solo se pintan cuando el servidor los envía, tras el cierre).
function BarrasVotos({
  votos,
  etiquetas,
  claves,
}: {
  votos: { total: number } & Partial<VotosPartida>;
  etiquetas: Record<string, string>;
  claves: string[];
}) {
  const { t } = useIdioma();
  if (!votos.total) return <p className="text-xs text-neutral-500">{t.mundial.sinVotos}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {claves.map((c) => {
        const n = (votos as Record<string, number>)[c] ?? 0;
        const pct = Math.round((n / votos.total) * 100);
        return (
          <li key={c} className="text-xs">
            <div className="mb-0.5 flex justify-between">
              <span>{etiquetas[c]}</span>
              <span className="text-neutral-500">
                {pct}% · {t.mundial.votos(n)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Marcador({ estado }: { estado: EstadoMatch }) {
  const { t } = useIdioma();
  const m = t.mundial;
  const { gukesh, sindarov, jugadas } = estado.marcador;
  const campeon = estado.final.resultado;
  return (
    <Tarjeta titulo={m.marcadorTitulo}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <Image src="/avatares/gukesh.webp" alt="" width={64} height={64} className="h-16 w-16 rounded-full" />
          <span className="text-sm font-semibold">{m.gukesh}</span>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold tabular-nums">
            {marcadorTexto(gukesh)} – {marcadorTexto(sindarov)}
          </p>
          <p className="text-xs text-neutral-500">{m.partidasJugadas(jugadas)}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <Image src="/avatares/sindarov.webp" alt="" width={64} height={64} className="h-16 w-16 rounded-full" />
          <span className="text-sm font-semibold">{m.sindarov}</span>
        </div>
      </div>
      {campeon && (
        <p className="mt-3 rounded-lg bg-gold/20 px-3 py-2 text-center text-sm font-semibold">
          {m.campeon(campeon === "gukesh" ? m.gukesh : m.sindarov)}
        </p>
      )}
    </Tarjeta>
  );
}

function Selector({
  valor,
  deshabilitado,
  onElegir,
  etiquetas,
  opciones = OPCIONES,
}: {
  valor: string | null;
  deshabilitado: boolean;
  onElegir: (v: ResultadoPartida) => void;
  etiquetas: Record<string, string>;
  opciones?: ResultadoPartida[];
}) {
  return (
    <div role="radiogroup" className={`grid gap-2 ${opciones.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {opciones.map((o) => {
        const activo = valor === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={deshabilitado}
            onClick={() => onElegir(o)}
            className={`rounded-lg border-2 px-2 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              activo
                ? "border-gold bg-gold/15 text-neutral-900 dark:text-neutral-100"
                : "border-neutral-200 hover:border-accent dark:border-neutral-700"
            }`}
          >
            {etiquetas[o]}
          </button>
        );
      })}
    </div>
  );
}

export default function Match() {
  const { t, locale } = useIdioma();
  const m = t.mundial;
  const supabase = useMemo(() => createClient(), []);
  // undefined = cargando, null = evento inactivo o error.
  const [estado, setEstado] = useState<EstadoMatch | null | undefined>(undefined);
  const [offset, setOffset] = useState(0); // reloj del servidor - reloj de la pantalla
  const [ahora, setAhora] = useState(() => Date.now());
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const recargadoPor = useRef<string | null>(null);

  const cargar = useCallback(async () => {
    const e = await fetchMatch(supabase);
    setEstado(e);
    if (e) setOffset(Date.parse(e.ahora) - Date.now());
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ahoraServidor = ahora + offset;
  const situacion = estado ? proximaPartida(estado.calendario, ahoraServidor) : null;
  const proxima = situacion?.proxima ?? null;
  const final = estado?.final;

  // Al llegar a cero la cuenta atrás se vuelve a pedir el estado (salen ya los % de la comunidad).
  useEffect(() => {
    if (!estado) return;
    const claves: [string, string | null, boolean][] = [];
    if (proxima) claves.push([proxima.id, proxima.cierre, proxima.cerrada]);
    if (estado.final.desempateActivo)
      claves.push(["final", estado.final.cierre, estado.final.cerrada]);
    for (const [clave, cierre, cerrada] of claves) {
      if (!cerrada && cierre && ahoraServidor >= Date.parse(cierre) && recargadoPor.current !== clave) {
        recargadoPor.current = clave;
        cargar();
      }
    }
  }, [ahoraServidor, estado, proxima, cargar]);

  const etiquetas = { gukesh: m.gukesh, sindarov: m.sindarov, tablas: m.tablas };
  const etiquetasGana: Record<string, string> = {
    gukesh: m.gana(m.gukesh),
    sindarov: m.gana(m.sindarov),
    tablas: m.tablas,
  };

  async function pronosticar(p: EntradaCalendario, v: ResultadoPartida) {
    if (guardando || p.miPronostico === v) return;
    setGuardando(true);
    setMensaje(null);
    const r = await guardarPronosticoMundial(supabase, p.id, v);
    setGuardando(false);
    if (r.ok) {
      setMensaje({ ok: true, texto: m.guardado });
      setEstado((e) =>
        e
          ? { ...e, calendario: e.calendario.map((x) => (x.id === p.id ? { ...x, miPronostico: v } : x)) }
          : e
      );
    } else {
      setMensaje({ ok: false, texto: r.mensaje });
      cargar();
    }
  }

  async function votarCampeon(v: "gukesh" | "sindarov") {
    if (guardando || final?.miVoto === v) return;
    setGuardando(true);
    setMensaje(null);
    const r = await guardarVotoFinalMundial(supabase, v);
    setGuardando(false);
    if (r.ok) {
      setMensaje({ ok: true, texto: m.guardado });
      setEstado((e) => (e ? { ...e, final: { ...e.final, miVoto: v } } : e));
    } else {
      setMensaje({ ok: false, texto: r.mensaje });
      cargar();
    }
  }

  if (estado === undefined) return <p className="text-sm text-neutral-500">{m.cargando}</p>;
  if (estado === null) return <p className="py-6 text-center text-sm text-neutral-500">{m.inactivo}</p>;

  const finalAbierta = !!final && final.desempateActivo && !final.cerrada && final.resultado === null;
  const abierta = !!proxima && !proxima.cerrada && !!proxima.cierre && ahoraServidor < Date.parse(proxima.cierre);
  const finalVotosPct = final?.votos;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{estado.nombre || m.eventoTitulo}</h2>
        <p className="text-sm text-neutral-500">{m.intro}</p>
      </div>

      <Marcador estado={estado} />

      {/* Votación final (solo si hay desempate): sustituye a la predicción de partida. */}
      {final?.desempateActivo ? (
        <Tarjeta titulo={m.finalTitulo}>
          <p className="mb-3 text-sm text-neutral-500">{m.finalDescripcion}</p>
          {final.inicio && !final.cerrada && final.cierre && (
            <p className="mb-3 text-sm">
              {m.finalCierraEn}{" "}
              <strong className="tabular-nums">{cuentaAtras(Date.parse(final.cierre) - ahoraServidor)}</strong>
            </p>
          )}
          <Selector
            valor={final.miVoto}
            deshabilitado={!finalAbierta || guardando}
            onElegir={(v) => v !== "tablas" && votarCampeon(v)}
            etiquetas={etiquetas}
            opciones={["gukesh", "sindarov"]}
          />
          {final.acierto !== null && (
            <p className="mt-3 text-sm font-medium">{final.acierto ? m.finalAcertaste : m.finalFallaste}</p>
          )}
          {final.cerrada && finalVotosPct && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-neutral-500">{m.finalVotos}</p>
              <BarrasVotos votos={finalVotosPct} etiquetas={etiquetas} claves={["gukesh", "sindarov"]} />
            </div>
          )}
        </Tarjeta>
      ) : (
        <Tarjeta titulo={m.proxima}>
          {!proxima ? (
            <p className="text-sm text-neutral-500">{m.noQuedan}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-base font-semibold">{m.partidaN(proxima.numero ?? 0)}</p>
                <p className="text-sm text-neutral-500">
                  {fechaLarga(proxima.fecha, locale)}
                  {proxima.inicio && ` · ${m.horaMadrid(horaMadrid(proxima.inicio, locale))}`}
                </p>
              </div>
              {abierta && proxima.cierre ? (
                <p className="text-sm">
                  {m.cierraEn}{" "}
                  <strong className="tabular-nums">{cuentaAtras(Date.parse(proxima.cierre) - ahoraServidor)}</strong>
                </p>
              ) : (
                <p className="text-sm text-neutral-500">
                  {m.cerrada}. {m.esperandoResultado}
                </p>
              )}
              <Selector
                valor={proxima.miPronostico}
                deshabilitado={!abierta || guardando}
                onElegir={(v) => pronosticar(proxima, v)}
                etiquetas={etiquetas}
              />
              {!abierta && !proxima.miPronostico && (
                <p className="text-xs text-neutral-500">{m.sinPronostico}</p>
              )}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-neutral-500">{m.comunidadTitulo}</p>
                {proxima.votos ? (
                  <BarrasVotos votos={proxima.votos} etiquetas={etiquetas} claves={OPCIONES} />
                ) : (
                  <p className="text-xs text-neutral-500">{m.comunidadOculta}</p>
                )}
              </div>
            </div>
          )}
        </Tarjeta>
      )}

      {mensaje && (
        <p
          role="status"
          className={`text-sm ${mensaje.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {mensaje.texto}
        </p>
      )}

      <Tarjeta titulo={m.puntuacionTitulo}>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Cifra etiqueta={m.puntos} valor={String(estado.misPuntos)} />
          <Cifra etiqueta={m.aciertos} valor={m.deResueltas(estado.misAciertos, estado.misResueltas)} />
          <Cifra etiqueta={m.racha} valor={String(estado.racha)} />
          <Cifra etiqueta={m.mejorRacha} valor={String(estado.mejorRacha)} />
        </div>
      </Tarjeta>

      <Tarjeta titulo={m.calendarioTitulo}>
        {estado.calendario.length === 0 ? (
          <p className="text-sm text-neutral-500">{m.vacio}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {estado.calendario.map((e) => (
              <FilaCalendario key={e.id} e={e} etiquetasGana={etiquetasGana} etiquetas={etiquetas} />
            ))}
          </ul>
        )}
      </Tarjeta>

      <Link
        href="/clasificacion?historico=mundial"
        className="text-center text-sm font-medium text-accent underline underline-offset-2"
      >
        {m.verClasificacion}
      </Link>
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-1 py-2 dark:bg-neutral-900">
      <p className="text-base font-semibold">{valor}</p>
      <p className="text-[11px] text-neutral-500">{etiqueta}</p>
    </div>
  );
}

function FilaCalendario({
  e,
  etiquetas,
  etiquetasGana,
}: {
  e: EntradaCalendario;
  etiquetas: Record<string, string>;
  etiquetasGana: Record<string, string>;
}) {
  const { t, locale } = useIdioma();
  const m = t.mundial;
  const fecha = fechaCalendario(e.fecha, locale);

  if (e.tipo === "descanso") {
    return (
      <li className="flex items-center justify-between py-2 text-sm text-neutral-400">
        <span>{fecha}</span>
        <span>{m.descanso}</span>
      </li>
    );
  }
  if (e.tipo === "desempate") {
    return (
      <li className="flex items-center justify-between py-2 text-sm text-neutral-500">
        <span>{fecha}</span>
        <span>{m.desempate}</span>
      </li>
    );
  }
  return (
    <li className="py-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {m.partidaN(e.numero ?? 0)} <span className="font-normal text-neutral-500">· {fecha}</span>
        </span>
        <span className={e.resultado ? "font-semibold" : "text-neutral-500"}>
          {e.resultado ? etiquetasGana[e.resultado] : e.inicio ? horaMadrid(e.inicio, locale) : m.pendiente}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span>
          {m.tuPronostico}: {e.miPronostico ? etiquetas[e.miPronostico] : m.sinPronostico}
        </span>
        {e.acierto !== null && (
          <span className={e.acierto ? "font-semibold text-green-600 dark:text-green-400" : "font-semibold text-red-600 dark:text-red-400"}>
            {e.acierto ? `✓ ${m.acertaste}` : `✗ ${m.fallaste}`}
          </span>
        )}
      </div>
      {e.votos && e.votos.total > 0 && (
        <p className="mt-0.5 text-[11px] text-neutral-400">
          {OPCIONES.map((o) => `${etiquetas[o]} ${Math.round((e.votos![o] / e.votos!.total) * 100)}%`).join(" · ")}
        </p>
      )}
    </li>
  );
}
