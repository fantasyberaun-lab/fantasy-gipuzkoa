"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import {
  cambiarNombreUsuarioDB,
  cambiarPasswordDB,
  fetchProximoCambioNombre,
} from "@/lib/supabase/queries";
import {
  DIAS_ENTRE_CAMBIOS_DE_NOMBRE,
  FORMATO_NOMBRE_USUARIO,
  MENSAJE_FORMATO_NOMBRE_USUARIO,
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

function fechaHora(d: Date) {
  return d.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
}

// Cambio de nombre de usuario y de contraseña. Solo se enseña en el perfil
// propio; la base de datos (cambiar_nombre_usuario, 0050) es la que de verdad
// impone el formato, la unicidad y el máximo de un cambio por semana.
export default function AjustesCuenta({
  nombreActual,
  onNombreCambiado,
}: {
  nombreActual: string;
  onNombreCambiado: (nuevo: string) => void;
}) {
  const supabase = createClient();

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
      setAvisoNombre({ tipo: "error", texto: MENSAJE_FORMATO_NOMBRE_USUARIO });
      return;
    }
    if (limpio === nombreActual) {
      setAvisoNombre({ tipo: "error", texto: "Ese ya es tu nombre de usuario." });
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

    setAvisoNombre({ tipo: "ok", texto: "Nombre de usuario actualizado." });
    setPuedeCambiarDesde(r.puede_cambiar_desde ? new Date(r.puede_cambiar_desde) : null);
    onNombreCambiado(r.nombre ?? limpio);
  }

  async function guardarPassword(e: React.FormEvent) {
    e.preventDefault();
    setAvisoPassword(null);

    if (nueva.length < MIN_PASSWORD) {
      setAvisoPassword({ tipo: "error", texto: `La contraseña nueva debe tener al menos ${MIN_PASSWORD} caracteres.` });
      return;
    }
    if (nueva !== repetida) {
      setAvisoPassword({ tipo: "error", texto: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (nueva === actual) {
      setAvisoPassword({ tipo: "error", texto: "La contraseña nueva tiene que ser distinta de la actual." });
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
    setAvisoPassword({ tipo: "ok", texto: "Contraseña actualizada." });
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-sm font-semibold">Ajustes de la cuenta</h3>

      <form onSubmit={guardarNombre} className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-500">Nombre de usuario</label>
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
          Puedes cambiarlo una vez cada {DIAS_ENTRE_CAMBIOS_DE_NOMBRE} días y no puede coincidir con el de otro usuario.
          {bloqueadoPorSemana && puedeCambiarDesde && (
            <> Podrás volver a cambiarlo el {fechaHora(puedeCambiarDesde)}.</>
          )}
        </p>
        <MensajeAviso aviso={avisoNombre} />
        <div>
          <button
            type="submit"
            disabled={guardandoNombre || bloqueadoPorSemana || nombre.trim() === nombreActual}
            className={BOTON}
          >
            {guardandoNombre ? "Guardando…" : "Cambiar nombre"}
          </button>
        </div>
      </form>

      <form onSubmit={guardarPassword} className="flex flex-col gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <p className="text-xs font-medium text-neutral-500">Cambiar contraseña</p>
        <div>
          <label className="text-xs text-neutral-500">Contraseña actual</label>
          <PasswordInput required autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Contraseña nueva</label>
          <PasswordInput required minLength={MIN_PASSWORD} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Repite la contraseña nueva</label>
          <PasswordInput required minLength={MIN_PASSWORD} autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </div>
        <MensajeAviso aviso={avisoPassword} />
        <div>
          <button type="submit" disabled={guardandoPassword || !actual || !nueva || !repetida} className={BOTON}>
            {guardandoPassword ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
