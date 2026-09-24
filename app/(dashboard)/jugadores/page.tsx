"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";
import {
  fetchPerfilJugador,
  type PerfilJugador,
  type TorneoPerfil,
} from "@/lib/supabase/jugadoresQueries";
import { estadoTorneo, formatearPuntos, MARCADOR, rangoFechas } from "@/lib/torneos";
import { gameConfig } from "@/lib/gameConfig";

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
  const estado = estadoTorneo(torneo);
  const fechas = rangoFechas(torneo);
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
            {[torneo.categoria ? `${torneo.categoria}ª categoría` : null, fechas]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {estado && (
          <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
            {estado}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Cifra
          etiqueta="Puntos"
          valor={
            estadisticas.partidas > 0
              ? `${formatearPuntos(estadisticas.puntos)} / ${estadisticas.partidas}`
              : "–"
          }
        />
        <Cifra
          etiqueta="Performance Elo"
          valor={estadisticas.rendimiento != null ? String(estadisticas.rendimiento) : "–"}
        />
        <Cifra etiqueta="Pts Fantasy" valor={String(torneo.puntosFantasy)} />
      </div>

      {filas.length === 0 ? (
        <p className="text-xs text-neutral-500">Todavía no ha jugado ninguna partida.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {filas.map((fila) =>
            fila.tipo === "descanso" ? (
              <li key={`d-${fila.jornada}`} className="flex gap-3 py-2 text-neutral-500">
                <span className="w-8 font-medium">J{fila.jornada}</span>
                <span>Sin emparejar (descansa) · +{gameConfig.puntosPorDescanso} pt</span>
              </li>
            ) : (
              <li key={`p-${fila.jornada}`} className="flex items-center gap-3 py-2">
                <span className="w-8 font-medium text-neutral-500">J{fila.jornada}</span>
                <span className="w-12 text-center font-semibold">
                  {MARCADOR[fila.partida.resultado]}
                </span>
                <span className="flex-1">
                  {fila.partida.rivalId ? (
                    <Link
                      href={`/jugadores/${fila.partida.rivalId}?torneo=${torneo.id}`}
                      className="hover:underline"
                    >
                      {fila.partida.rivalNombre ?? "Rival"}
                    </Link>
                  ) : (
                    "Rival externo"
                  )}
                  {fila.partida.rivalElo != null && (
                    <span className="text-neutral-500"> ({fila.partida.rivalElo})</span>
                  )}
                </span>
                <span className="text-xs text-neutral-500">{fila.partida.puntosFantasy} pts</span>
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

  const [perfil, setPerfil] = useState<PerfilJugador | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      setCargando(true);
      setPerfil(await fetchPerfilJugador(supabase, id));
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
    return <p className="text-sm text-neutral-500">Cargando jugador…</p>;
  }

  if (!perfil) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">No se ha encontrado este jugador.</p>
        <button
          onClick={() => router.back()}
          className="w-fit text-sm text-accent underline underline-offset-2"
        >
          ← Volver
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
        ← Volver
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800">
          {iniciales(perfil.nombre)}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{perfil.nombre}</h2>
          <p className="text-sm text-neutral-500">
            {[perfil.club, `${perfil.categoria}ª categoría`, `Elo ${perfil.elo}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800 sm:grid-cols-3">
        <Dato etiqueta="Club" valor={perfil.club} />
        <Dato etiqueta="Categoría" valor={`${perfil.categoria}ª`} />
        <Dato etiqueta="Elo" valor={perfil.elo} />
        <Dato etiqueta="Año de nacimiento" valor={perfil.anioNacimiento} />
        <Dato etiqueta="ID FIDE" valor={perfil.fideId} />
        <Dato etiqueta="Valor de mercado" valor={`${perfil.valorMercado} M`} />
        {enLiga && (
          <>
            <Dato
              etiqueta="En tu liga"
              valor={
                enLiga.esMiEquipo
                  ? "En tu plantilla"
                  : enLiga.propietario
                    ? `Fichado por ${enLiga.propietario}`
                    : "Libre"
              }
            />
            <Dato etiqueta="Puntos Fantasy" valor={enLiga.puntosTotales} />
          </>
        )}
      </dl>

      {enLiga && (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <HistorialPuntosChart historial={enLiga.historialPuntos} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Torneos</h3>

        {torneos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no está inscrito en ningún torneo.
          </p>
        ) : (
          <>
            {torneos.map((t) => (
              <TarjetaTorneo key={t.id} torneo={t} destacado={t.id === torneoContexto} />
            ))}
            <p className="text-xs text-neutral-500">
              Performance Elo: media del Elo de los rivales más la diferencia que da la
              tabla de la FIDE según el porcentaje de puntos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PerfilJugadorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Cargando jugador…</p>}>
      <PerfilJugadorContenido />
    </Suspense>
  );
}
