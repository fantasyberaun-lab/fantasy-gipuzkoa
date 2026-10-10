"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import AlineacionesJornadas from "@/components/AlineacionesJornadas";
import HistorialValorChart from "@/components/HistorialValorChart";
import AvatarPerfil from "@/components/AvatarPerfil";
import { useGameState } from "@/components/GameStateProvider";
import {
  fetchEvolucionValorPlantilla,
  fetchPerfilManager,
} from "@/lib/supabase/queries";
import type { PerfilManager, PuntoValorPlantilla } from "@/lib/types";
import type { PuntoValor } from "@/lib/supabase/jugadoresQueries";

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{etiqueta}</p>
      <p className="text-base font-semibold">{valor}</p>
      {detalle && <p className="text-[11px] text-neutral-400">{detalle}</p>}
    </div>
  );
}

function fechaLarga(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Perfil de un manager. El id de la ruta es el del EQUIPO (así se sabe en qué
// liga se mira), y solo se abre si compartes liga con él (lo comprueba la base
// de datos en perfil_manager).
function PerfilManagerContenido() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const tm = t.managers;
  const { locale } = useIdioma();
  // Avatares en prueba: solo root, y solo en su propio perfil (ver 0077).
  const { esRoot, avatar } = useGameState();

  const [perfil, setPerfil] = useState<PerfilManager | null>(null);
  const [evolucion, setEvolucion] = useState<PuntoValorPlantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  // Si se llega desde el botón "Jornadas" de Clasificación (?tab=jornadas).
  const searchParams = useSearchParams();
  const [pestana, setPestana] = useState<"resumen" | "jornadas">(
    searchParams.get("tab") === "jornadas" ? "jornadas" : "resumen"
  );

  useEffect(() => {
    (async () => {
      setCargando(true);
      const [p, e] = await Promise.all([
        fetchPerfilManager(supabase, id),
        fetchEvolucionValorPlantilla(supabase, id),
      ]);
      setPerfil(p);
      setEvolucion(e);
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // La gráfica de valor sirve tal cual para la plantilla: un punto por día.
  const puntos: PuntoValor[] = useMemo(
    () =>
      evolucion.map((d) => ({
        fecha: `${d.dia}T12:00:00`,
        valor: d.valor,
        cambioPct: null,
        motivo: "diaria" as const,
      })),
    [evolucion]
  );

  const valorActual = evolucion.length > 0 ? evolucion[evolucion.length - 1] : null;

  if (cargando) {
    return <p className="text-sm text-neutral-500">{tm.cargando}</p>;
  }

  if (!perfil) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          {tm.noEncontrado}
        </p>
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
        <AvatarPerfil
          avatar={esRoot && perfil.esMio ? avatar : null}
          nombre={perfil.nombreManager}
          tamano={perfil.esMio && esRoot && avatar ? 80 : 48}
          ampliable
        />
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {perfil.nombreManager}
            {perfil.esMio && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                {tm.tuPerfil}
              </span>
            )}
          </h2>
          <p className="text-sm text-neutral-500">
            {perfil.nombreEquipo} · {perfil.ligaNombre}
            {perfil.ligaPublica ? tm.todosContraTodos : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(
          [
            ["resumen", tm.resumen],
            ["jornadas", tm.jornadas],
          ] as const
        ).map(([clave, etiqueta]) => (
          <button
            key={clave}
            onClick={() => setPestana(clave)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              pestana === clave
                ? "border-accent text-accent"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === "resumen" && (
        <>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-3">
          <Cifra etiqueta={tm.managerDesde} valor={fechaLarga(perfil.miembroDesde, locale)} />
          <Cifra
            etiqueta={tm.ligasGanadas}
            valor={String(perfil.ligasGanadas)}
            detalle={perfil.ligasGanadas === 0 ? tm.todaviaNinguna : undefined}
          />
          <Cifra etiqueta={tm.ligasJugadas} valor={String(perfil.ligasJugadas)} />
          <Cifra etiqueta={tm.puntosLiga} valor={String(perfil.puntosTotales)} />
          <Cifra
            etiqueta={tm.mejorJornada}
            valor={perfil.puntosTotales > 0 ? tm.pts(perfil.mejorJornada) : "–"}
          />
          <Cifra
            etiqueta={tm.valorPlantilla}
            valor={valorActual ? `${valorActual.valor} M` : "–"}
            detalle={valorActual ? tm.jugadores(valorActual.jugadores) : undefined}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <HistorialValorChart
            historial={puntos}
            titulo={tm.evolucionValorPlantilla}
            textoVacio={tm.evolucionVacia}
          />
        </div>
        </>
      )}

      {pestana === "jornadas" && <AlineacionesJornadas equipoId={id} />}
    </div>
  );
}

export default function PerfilManagerPage() {
  const tm = useT().managers;
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">{tm.cargando}</p>}>
      <PerfilManagerContenido />
    </Suspense>
  );
}
