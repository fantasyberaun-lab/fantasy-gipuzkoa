"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import type { Textos } from "@/lib/i18n/textos";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import HistorialValorChart from "@/components/HistorialValorChart";
import HistorialEloChart from "@/components/HistorialEloChart";
import {
  fetchHistorialElo,
  fetchHistorialValor,
  fetchPerfilJugador,
  type PerfilJugador,
  type PuntoElo,
  type PuntoValor,
  type TorneoPerfil,
} from "@/lib/supabase/jugadoresQueries";
import { estadoTorneo, formatearPuntos, MARCADOR, rangoFechas } from "@/lib/torneos";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null }) {
  if (valor === null || valor === "") return null;
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-neutral-500">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

// "1990 (▲ 12)" respecto al mes anterior; "debut" si antes no tenía Elo.
function textoElo(
  elo: number,
  anterior: number | null,
  tj: Textos["jugadores"]
): string | number {
  if (anterior === null || anterior === elo) return elo;
  if (anterior === 0) return tj.eloDebut(elo);
  const d = elo - anterior;
  return `${elo} (${d > 0 ? "▲" : "▼"} ${Math.abs(d)})`;
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{etiqueta}</p>
      <p className="text-base font-semibold">{valor}</p>
    </div>
  );
}

// Una fila del historial del torneo: una partida o un descanso.
type FilaHistorial =
  | { tipo: "partida"; jornada: number; partida: TorneoPerfil["partidas"][number] }
  | { tipo: "descanso"; jornada: number };

function TarjetaTorneo({
  torneo,
  destacado,
}: {
  torneo: TorneoPerfil;
  destacado: boolean;
}) {
  const { t, locale } = useIdioma();
  const tj = t.jugadores;
  const estado = estadoTorneo(torneo);
  const fechas = rangoFechas(torneo, locale);
  const { estadisticas } = torneo;

  const filas: FilaHistorial[] = [
    ...torneo.partidas.map((partida) => ({
      tipo: "partida" as const,
      jornada: partida.jornada,
      partida,
    })),
    ...torneo.descansos.map((jornada) => ({ tipo: "descanso" as const, jornada })),
  ].sort((a, b) => a.jornada - b.jornada);

  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        destacado ? "border-accent" : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href={`/torneos/${torneo.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {torneo.nombre}
          </Link>
          <p className="text-xs text-neutral-500">
            {[torneo.categoria ? tj.categoria(torneo.categoria) : null, fechas]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {estado && (
          <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
            {t.torneos.estados[estado]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Cifra
          etiqueta={tj.puntos}
          valor={
            estadisticas.partidas > 0
              ? `${formatearPuntos(estadisticas.puntos)} / ${estadisticas.partidas}`
              : "–"
          }
        />
        <Cifra
          etiqueta={tj.performanceElo}
          valor={estadisticas.rendimiento != null ? String(estadisticas.rendimiento) : "–"}
        />
        <Cifra etiqueta={tj.ptsFantasy} valor={String(torneo.puntosFantasy)} />
      </div>

      {filas.length === 0 ? (
        <p className="text-xs text-neutral-500">{tj.sinPartidas}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {filas.map((fila) =>
            fila.tipo === "descanso" ? (
              <li key={`d-${fila.jornada}`} className="flex gap-3 py-2 text-neutral-500">
                <span className="w-8 font-medium">{t.graficas.jornadaCorta(fila.jornada)}</span>
                <span>{tj.sinEmparejar}</span>
              </li>
            ) : (
              <li key={`p-${fila.jornada}`} className="flex items-center gap-3 py-2">
                <span className="w-8 font-medium text-neutral-500">{t.graficas.jornadaCorta(fila.jornada)}</span>
                <span className="w-12 text-center font-semibold">
                  {MARCADOR[fila.partida.resultado]}
                </span>
                <span className="flex-1">
                  {fila.partida.rivalId ? (
                    <Link
                      href={`/jugadores/${fila.partida.rivalId}?torneo=${torneo.id}`}
                      className="hover:underline"
                    >
                      {fila.partida.rivalNombre ?? tj.rival}
                    </Link>
                  ) : (
                    tj.rivalExterno
                  )}
                  {fila.partida.rivalElo != null && (
                    <span className="text-neutral-500"> ({fila.partida.rivalElo})</span>
                  )}
                </span>
                <span className="text-xs text-neutral-500">{tj.pts(fila.partida.puntosFantasy)}</span>
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
}

function PerfilJugadorContenido() {
  const { id } = useParams<{ id: string }>();
  const torneoContexto = useSearchParams().get("torneo");
  const router = useRouter();
  const supabase = createClient();
  const { jugadoresLiga } = useGameState();
  const t = useT();
  const tj = t.jugadores;

  const [perfil, setPerfil] = useState<PerfilJugador | null>(null);
  const [historialValor, setHistorialValor] = useState<PuntoValor[]>([]);
  const [historialElo, setHistorialElo] = useState<PuntoElo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      setCargando(true);
      const [p, hv, he] = await Promise.all([
        fetchPerfilJugador(supabase, id),
        fetchHistorialValor(supabase, id),
        fetchHistorialElo(supabase, id),
      ]);
      setPerfil(p);
      setHistorialValor(hv);
      setHistorialElo(he);
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Si se llega desde un torneo, ese va primero; el resto, del más
  // reciente al más antiguo.
  const torneos = useMemo(() => {
    if (!perfil) return [];
    return [...perfil.torneos].sort((a, b) => {
      if (a.id === torneoContexto) return -1;
      if (b.id === torneoContexto) return 1;
      return (b.fechaInicio ?? "").localeCompare(a.fechaInicio ?? "");
    });
  }, [perfil, torneoContexto]);

  const enLiga = jugadoresLiga.find((j) => j.id === id) ?? null;

  if (cargando) {
    return <p className="text-sm text-neutral-500">{tj.cargandoJugador}</p>;
  }

  if (!perfil) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">{tj.noEncontrado}</p>
        <button
          onClick={() => router.back()}
          className="w-fit text-sm text-accent underline underline-offset-2"
        >
          ← {t.comun.volver}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => router.back()}
        className="w-fit text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
      >
        ← {t.comun.volver}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800">
          {iniciales(perfil.nombre)}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{perfil.nombre}</h2>
          <p className="text-sm text-neutral-500">
            {[perfil.club, tj.categoria(perfil.categoria), `Elo ${perfil.elo}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800 sm:grid-cols-3">
        <Dato etiqueta={tj.club} valor={perfil.club} />
        <Dato etiqueta={tj.categoriaEtiqueta} valor={tj.categoriaValor(perfil.categoria)} />
        <Dato etiqueta={tj.elo} valor={textoElo(perfil.elo, perfil.eloAnterior, tj)} />
        <Dato etiqueta={tj.nacimiento} valor={perfil.nacimiento} />
        <Dato etiqueta={tj.sexo} valor={perfil.sexo === "F" ? tj.mujer : perfil.sexo === "M" ? tj.hombre : null} />
        <Dato etiqueta={tj.idFantasy} valor={perfil.fideId} />
        <Dato etiqueta={tj.valorMercado} valor={`${perfil.valorMercado} M`} />
        {enLiga && (
          <>
            <Dato
              etiqueta={tj.enTuLiga}
              valor={
                enLiga.esMiEquipo
                  ? tj.enTuPlantilla
                  : enLiga.propietario
                    ? tj.fichadoPor(enLiga.propietario)
                    : tj.libre
              }
            />
            <Dato etiqueta={tj.puntosFantasy} valor={enLiga.puntosTotales} />
          </>
        )}
      </dl>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <HistorialValorChart historial={historialValor} />
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <HistorialEloChart historial={historialElo} />
      </div>

      {enLiga && enLiga.historialPuntos.length > 0 && (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <HistorialPuntosChart historial={enLiga.historialPuntos} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{tj.torneos}</h3>

        {torneos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {tj.sinTorneos}
          </p>
        ) : (
          <>
            {torneos.map((t) => (
              <TarjetaTorneo key={t.id} torneo={t} destacado={t.id === torneoContexto} />
            ))}
            <p className="text-xs text-neutral-500">
              {tj.notaPerformance}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PerfilJugadorPage() {
  const tj = useT().jugadores;
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">{tj.cargandoJugador}</p>}>
      <PerfilJugadorContenido />
    </Suspense>
  );
}
