"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import { sonar } from "@/lib/sonido";
import { esJuego, JUEGOS } from "@/lib/minijuegos";
import {
  EVENTO_MINIJUEGOS,
  fetchEstadoMinijuegos,
  type EstadoMinijuegos,
  type JuegoId,
} from "@/lib/supabase/minijuegosQueries";
import JuegoEloExacto from "./JuegoEloExacto";
import JuegoHigherLower from "./JuegoHigherLower";
import JuegoImpostor from "./JuegoImpostor";
import JuegoOpciones from "./JuegoOpciones";
import JuegoParejas from "./JuegoParejas";
import JuegoPrecio from "./JuegoPrecio";
import JuegoOrdenElo from "./JuegoOrdenElo";
import PanelDia from "./PanelDia";
import RankingMinijuegos from "./RankingMinijuegos";

// Contenido de /minijuegos: panel del día y una pestaña por minijuego (cada una
// con su partida y sus rankings de hoy y general) más la del ranking total.
export default function MinijuegosApp() {
  const supabase = createClient();
  const t = useT().minijuegos;
  const router = useRouter();
  const params = useSearchParams();
  const pestana = params.get("tab");
  const activa: JuegoId | "ranking" = pestana === "ranking" ? "ranking" : esJuego(pestana) ? pestana : JUEGOS[0].id;

  const [estado, setEstado] = useState<EstadoMinijuegos | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    const e = await fetchEstadoMinijuegos(supabase);
    if (e) {
      setEstado(e);
      setError(false);
    } else {
      setError(true);
    }
    // La cabecera de la app y los rankings también se refrescan.
    window.dispatchEvent(new Event(EVENTO_MINIJUEGOS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function irA(tab: string) {
    if (tab !== activa) sonar("pestana");
    router.replace(`/minijuegos?tab=${tab}`, { scroll: false });
  }

  if (!estado) {
    return error ? (
      <div className="py-10 text-center">
        <p className="text-sm text-neutral-500">{t.error}</p>
        <button
          type="button"
          onClick={cargar}
          className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t.reintentar}
        </button>
      </div>
    ) : (
      <p className="py-10 text-center text-sm text-neutral-500">{t.cargando}</p>
    );
  }

  if (!estado.activo) {
    return <p className="py-10 text-center text-sm text-neutral-500">{t.desactivado}</p>;
  }

  const hecho = (id: JuegoId) => estado.juegos.find((j) => j.id === id)?.jugada ?? false;

  return (
    <div className="space-y-5">
      <PanelDia estado={estado} onCambio={cargar} />

      {/* Los 8 juegos siempre a la vista (4 + 4) y el ranking total aparte. */}
      <nav role="tablist" aria-label={t.titulo} className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {JUEGOS.map((j) => {
            const seleccionada = activa === j.id;
            return (
              <button
                key={j.id}
                role="tab"
                type="button"
                aria-selected={seleccionada}
                onClick={() => irA(j.id)}
                className={`relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-colors ${
                  seleccionada
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-neutral-200 text-neutral-600 hover:border-accent dark:border-neutral-800 dark:text-neutral-300"
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {j.icono}
                </span>
                <span className="text-[11px] font-semibold leading-tight">{t.juegos[j.id].corto}</span>
                {hecho(j.id) && (
                  <span
                    className="absolute right-1 top-1 text-[11px] font-bold text-positive"
                    title={t.partidaHecha}
                    aria-label={t.partidaHecha}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          role="tab"
          type="button"
          aria-selected={activa === "ranking"}
          onClick={() => irA("ranking")}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[15px] font-semibold transition-colors ${
            activa === "ranking"
              ? "border-gold bg-gold/10 text-gold-dark"
              : "border-neutral-200 text-neutral-600 hover:border-gold dark:border-neutral-800 dark:text-neutral-300"
          }`}
        >
          <span aria-hidden="true">🏆</span>
          {t.rankingTotalTitulo}
        </button>
      </nav>

      {activa === "ranking" ? (
        <RankingMinijuegos juego="total" titulo={t.rankingTotalTitulo} ayuda={t.rankingTotalAyuda} />
      ) : (
        <>
          <h2 className="font-display text-2xl font-semibold">{t.juegos[activa].nombre}</h2>
          {/* key: al cambiar de pestaña se descarta la partida en pantalla. */}
          {activa === "hol" && <JuegoHigherLower key="hol" estado={estado} recargar={cargar} />}
          {activa === "elo" && <JuegoEloExacto key="elo" estado={estado} recargar={cargar} />}
          {activa === "orden" && <JuegoOrdenElo key="orden" estado={estado} recargar={cargar} />}
          {(activa === "adivina" || activa === "acierta") && (
            <JuegoOpciones key={activa} juego={activa} estado={estado} recargar={cargar} />
          )}
          {activa === "precio" && <JuegoPrecio key="precio" estado={estado} recargar={cargar} />}
          {activa === "impostor" && <JuegoImpostor key="impostor" estado={estado} recargar={cargar} />}
          {activa === "parejas" && <JuegoParejas key="parejas" estado={estado} recargar={cargar} />}
          <RankingMinijuegos key={`rk-${activa}`} juego={activa} titulo={t.juegos[activa].corto} />
        </>
      )}
    </div>
  );
}
