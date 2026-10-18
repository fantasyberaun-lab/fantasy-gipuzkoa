"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import AvatarPerfil from "@/components/AvatarPerfil";
import SelectorAvatar from "@/components/SelectorAvatar";
import { EVENTO_XP } from "@/components/RachaDiaria";
import { AVATARES, nombreAvatar } from "@/lib/avatares";
import { XP_COFRE, XP_LOGIN, XP_POR_PUNTO } from "@/lib/niveles";
import { fetchEstadoNivel, type EstadoNivel } from "@/lib/supabase/nivelesQueries";
import Image from "next/image";

// Pestaña "Niveles" del perfil propio: nivel y experiencia, el siguiente icono
// por desbloquear y todos los iconos (elegibles o bloqueados). Ver 0086_niveles.sql.
export default function PestanaNiveles({ nombreManager }: { nombreManager: string }) {
  const supabase = createClient();
  const t = useT();
  const tn = t.niveles;
  const { locale } = useIdioma();
  const { avatar } = useGameState();
  const [estado, setEstado] = useState<EstadoNivel | null>(null);
  const [error, setError] = useState(false);

  async function cargar() {
    const e = await fetchEstadoNivel(supabase);
    if (e) {
      setEstado(e);
      setError(false);
    } else {
      setError(true);
    }
  }

  useEffect(() => {
    cargar();
    // La XP cambia al registrar la entrada del día o al abrir el cofre (RachaDiaria).
    window.addEventListener(EVENTO_XP, cargar);
    return () => window.removeEventListener(EVENTO_XP, cargar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!estado) {
    return (
      <p className={`text-sm ${error ? "text-negative dark:text-red-400" : "text-neutral-500"}`}>
        {error ? tn.error : tn.cargando}
      </p>
    );
  }

  const f = (n: number) => n.toLocaleString(locale);
  const { xp, nivel, xpNivelActual, xpNivelSiguiente } = estado;
  const rango = Math.max(1, xpNivelSiguiente - xpNivelActual);
  const progreso = Math.min(1, Math.max(0, (xp - xpNivelActual) / rango));
  const siguiente = AVATARES.find((a) => a.nivel === nivel + 1) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecera: icono, nivel, XP total y barra hasta el siguiente nivel */}
      <div data-tutorial="nivel-cabecera" className="overflow-hidden rounded-2xl border-b-4 border-gold bg-gradient-to-br from-brand-800 to-brand-950 p-4 text-white shadow-md">
        <div className="flex items-center gap-4">
          <AvatarPerfil avatar={avatar} nombre={nombreManager} tamano={88} ampliable />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">{tn.nivel(nivel)}</p>
            <p className="font-display text-3xl font-semibold leading-none">{tn.xpTotal(f(xp))}</p>
            <p className="mt-1 truncate text-sm text-white/70">{nombreManager}</p>
          </div>
        </div>

        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-black/40"
          role="progressbar"
          aria-valuemin={xpNivelActual}
          aria-valuemax={xpNivelSiguiente}
          aria-valuenow={xp}
          aria-label={tn.faltan(f(xpNivelSiguiente - xp), nivel + 1)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-300 to-gold transition-[width] duration-700"
            style={{ width: `${progreso * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between gap-2 text-xs text-white/70">
          <span>{f(xpNivelActual)}</span>
          <span className="font-medium text-white">{tn.faltan(f(xpNivelSiguiente - xp), nivel + 1)}</span>
          <span>{f(xpNivelSiguiente)}</span>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 p-2.5 text-sm">
          {siguiente ? (
            <>
              <Image
                src={siguiente.srcMarco}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-lg brightness-50 grayscale"
              />
              <p className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wide text-white/60">
                  {tn.siguienteIcono}
                </span>
                <span className="block truncate font-semibold">{nombreAvatar(siguiente, t)}</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-white/80">{tn.todosDesbloqueados}</p>
          )}
        </div>
      </div>

      <SelectorAvatar nivel={nivel} />

      <div className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{tn.comoGanar}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          <li>{tn.ganarLogin(XP_LOGIN)}</li>
          <li>{tn.ganarCofre(XP_COFRE)}</li>
          <li>{tn.ganarJornada(XP_POR_PUNTO)}</li>
          <li className="text-neutral-500">{tn.ganarPronto}</li>
        </ul>
      </div>
    </div>
  );
}
