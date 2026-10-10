"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import { useIdioma } from "@/components/IdiomaProvider";
import {
  cambiarNombreUsuarioDB,
  cambiarPasswordDB,
  fetchProximoCambioNombre,
} from "@/lib/supabase/queries";
import {
  DIAS_ENTRE_CAMBIOS_DE_NOMBRE,
  FORMATO_NOMBRE_USUARIO,
  MIN_PASSWORD,
} from "@/lib/cuenta";

const INPUT =
  "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const BOTON =
  "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50";

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

function MensajeAviso({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
    <p className={`text-sm ${aviso.tipo === "ok" ? "text-green-600 dark:text-green-400" : "text-negative"}`}>
      {aviso.texto}
    </p>
  );
}

function fechaHora(d: Date, locale: string) {
  return d.toLocaleString(locale, { dateStyle: "long", timeStyle: "short" });
}

// Cambio de nombre de usuario y de contraseña. Vive en el menú de ajustes
// (MenuAjustes, apartado "Mi cuenta"); la base de datos
// (cambiar_nombre_usuario, 0050) es la que de verdad
// impone el formato, la unicidad y el máximo de un cambio por semana.
export default function AjustesCuenta({
  nombreActual,
  onNombreCambiado,
  sinMarco = false,
}: {
  nombreActual: string;
  onNombreCambiado: (nuevo: string) => void;
  // Dentro del menú de ajustes ya hay título y fondo: sin tarjeta ni título.
  sinMarco?: boolean;
}) {
  const supabase = createClient();
  const { t: textos, locale } = useIdioma();
  const t = textos.cuenta;

  // Nombre de usuario
  const [nombre, setNombre] = useState(nombreActual);
  const [puedeCambiarDesde, setPuedeCambiarDesde] = useState<Date | null>(null);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [avisoNombre, setAvisoNombre] = useState<Aviso>(null);

  // Contraseña
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [avisoPassword, setAvisoPassword] = useState<Aviso>(null);

  useEffect(() => {
    (async () => setPuedeCambiarDesde(await fetchProximoCambioNombre(supabase)))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bloqueadoPorSemana = puedeCambiarDesde !== null && puedeCambiarDesde.getTime() > Date.now();

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    setAvisoNombre(null);
    const limpio = nombre.trim();

    if (!FORMATO_NOMBRE_USUARIO.test(limpio)) {
      setAvisoNombre({ tipo: "error", texto: t.formatoNombre });
      return;
    }
    if (limpio === nombreActual) {
      setAvisoNombre({ tipo: "error", texto: t.yaEsTuNombre });
      return;
    }

    setGuardandoNombre(true);
    const r = await cambiarNombreUsuarioDB(supabase, limpio);
    setGuardandoNombre(false);

    if (!r.ok) {
      setAvisoNombre({ tipo: "error", texto: r.mensaje });
      setPuedeCambiarDesde(await fetchProximoCambioNombre(supabase));
      return;
    }

    setAvisoNombre({ tipo: "ok", texto: t.nombreActualizado });
    setPuedeCambiarDesde(r.puede_cambiar_desde ? new Date(r.puede_cambiar_desde) : null);
    onNombreCambiado(r.nombre ?? limpio);
  }

  async function guardarPassword(e: React.FormEvent) {
    e.preventDefault();
    setAvisoPassword(null);

    if (nueva.length < MIN_PASSWORD) {
      setAvisoPassword({ tipo: "error", texto: t.passwordCorta(MIN_PASSWORD) });
      return;
    }
    if (nueva !== repetida) {
      setAvisoPassword({ tipo: "error", texto: t.noCoinciden });
      return;
    }
    if (nueva === actual) {
      setAvisoPassword({ tipo: "error", texto: t.igualQueActual });
      return;
    }

    setGuardandoPassword(true);
    const r = await cambiarPasswordDB(supabase, actual, nueva);
    setGuardandoPassword(false);

    if (!r.ok) {
      setAvisoPassword({ tipo: "error", texto: r.mensaje });
      return;
    }
    setActual("");
    setNueva("");
    setRepetida("");
    setAvisoPassword({ tipo: "ok", texto: t.passwordActualizada });
  }

  return (
    <div
      className={
        sinMarco
          ? "flex flex-col gap-6"
          : "flex flex-col gap-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
      }
    >
      {!sinMarco && <h3 className="text-sm font-semibold">{t.tituloAjustes}</h3>}

      <form onSubmit={guardarNombre} className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-500">{t.nombreUsuario}</label>
        <input
          type="text"
          minLength={3}
          maxLength={20}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={bloqueadoPorSemana}
          className={`${INPUT} disabled:opacity-60`}
        />
        <p className="text-xs text-neutral-500">
          {t.ayudaNombre(DIAS_ENTRE_CAMBIOS_DE_NOMBRE)}
          {bloqueadoPorSemana &&
            puedeCambiarDesde &&
            t.podrasCambiarlo(fechaHora(puedeCambiarDesde, locale))}
        </p>
        <MensajeAviso aviso={avisoNombre} />
        <div>
          <button
            type="submit"
            disabled={guardandoNombre || bloqueadoPorSemana || nombre.trim() === nombreActual}
            className={BOTON}
          >
            {guardandoNombre ? textos.comun.guardando : t.cambiarNombre}
          </button>
        </div>
      </form>

      <form onSubmit={guardarPassword} className="flex flex-col gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <p className="text-xs font-medium text-neutral-500">{t.cambiarPassword}</p>
        <div>
          <label className="text-xs text-neutral-500">{t.passwordActual}</label>
          <PasswordInput required autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">{t.passwordNueva}</label>
          <PasswordInput required minLength={MIN_PASSWORD} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">{t.repitePassword}</label>
          <PasswordInput required minLength={MIN_PASSWORD} autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </div>
        <MensajeAviso aviso={avisoPassword} />
        <div>
          <button type="submit" disabled={guardandoPassword || !actual || !nueva || !repetida} className={BOTON}>
            {guardandoPassword ? textos.comun.guardando : t.cambiarPassword}
          </button>
        </div>
      </form>
    </div>
  );
}
