"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AjustesCuenta from "@/components/AjustesCuenta";
import HistorialValorChart from "@/components/HistorialValorChart";
import {
  fetchEvolucionValorPlantilla,
  fetchPerfilManager,
} from "@/lib/supabase/queries";
import type { PerfilManager, PuntoValorPlantilla } from "@/lib/types";
import type { PuntoValor } from "@/lib/supabase/jugadoresQueries";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{etiqueta}</p>
      <p className="text-base font-semibold">{valor}</p>
      {detalle && <p className="text-[11px] text-neutral-400">{detalle}</p>}
    </div>
  );
}

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Perfil de un manager. El id de la ruta es el del EQUIPO (así se sabe en qué
// liga se mira), y solo se abre si compartes liga con él (lo comprueba la base
// de datos en perfil_manager).
export default function PerfilManagerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [perfil, setPerfil] = useState<PerfilManager | null>(null);
  const [evolucion, setEvolucion] = useState<PuntoValorPlantilla[]>([]);
  const [cargando, setCargando] = useState(true);

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
    return <p className="text-sm text-neutral-500">Cargando perfil…</p>;
  }

  if (!perfil) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          No se ha encontrado este manager (o no compartís liga).
        </p>
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
          {iniciales(perfil.nombreManager)}
        </div>
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {perfil.nombreManager}
            {perfil.esMio && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                Tu perfil
              </span>
            )}
          </h2>
          <p className="text-sm text-neutral-500">
            {perfil.nombreEquipo} · {perfil.ligaNombre}
            {perfil.ligaPublica ? " · Todos contra todos" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-3">
        <Cifra etiqueta="Manager desde" valor={fechaLarga(perfil.miembroDesde)} />
        <Cifra
          etiqueta="Ligas ganadas"
          valor={String(perfil.ligasGanadas)}
          detalle={perfil.ligasGanadas === 0 ? "Todavía ninguna" : undefined}
        />
        <Cifra etiqueta="Ligas en las que juega" valor={String(perfil.ligasJugadas)} />
        <Cifra etiqueta="Puntos en esta liga" valor={String(perfil.puntosTotales)} />
        <Cifra
          etiqueta="Mejor jornada"
          valor={perfil.puntosTotales > 0 ? `${perfil.mejorJornada} pts` : "–"}
        />
        <Cifra
          etiqueta="Valor de la plantilla"
          valor={valorActual ? `${valorActual.valor} M` : "–"}
          detalle={valorActual ? `${valorActual.jugadores} jugadores` : undefined}
        />
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <HistorialValorChart
          historial={puntos}
          titulo="Evolución del valor de la plantilla"
          textoVacio="Todavía no hay suficientes días de historial para dibujar la evolución."
        />
      </div>

      {perfil.esMio && (
        <AjustesCuenta
          nombreActual={perfil.nombreManager}
          onNombreCambiado={(nuevo) =>
            setPerfil((prev) => (prev ? { ...prev, nombreManager: nuevo } : prev))
          }
        />
      )}
    </div>
  );
}
