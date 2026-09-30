"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VERSION_CONDICIONES, VERSION_PRIVACIDAD } from "@/lib/legal/config";
import AceptacionLegalFields, {
  ACEPTACION_INICIAL,
  aceptacionCompleta,
  type AceptacionLegal,
} from "@/components/legal/AceptacionLegalFields";
import InfoBasicaRGPD from "@/components/legal/InfoBasicaRGPD";

type Estado = "cargando" | "ok" | "pendiente" | "error";

// Bloquea la app hasta que el usuario haya aceptado las versiones vigentes de
// las Condiciones de Uso y la Política de Privacidad. Cubre a los usuarios que
// se registraron antes de que existieran estos textos y los cambios de versión.
export default function LegalGate({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [aceptacion, setAceptacion] = useState<AceptacionLegal>(ACEPTACION_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comprobar = useCallback(async () => {
    setEstado("cargando");
    const { data, error } = await supabase
      .from("consentimientos")
      .select("tipo, version, aceptado")
      .eq("aceptado", true);

    if (error || !data) {
      setEstado("error");
      return;
    }

    const tiene = (tipo: string, version?: string) =>
      data.some((c: any) => c.tipo === tipo && (!version || c.version === version));

    const al_dia =
      tiene("condiciones", VERSION_CONDICIONES) &&
      tiene("privacidad", VERSION_PRIVACIDAD) &&
      tiene("mayor_14");

    setEstado(al_dia ? "ok" : "pendiente");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    comprobar();
  }, [comprobar]);

  async function aceptar() {
    setError(null);
    setEnviando(true);
    const { data, error } = await supabase.rpc("registrar_aceptacion_legal", {
      p_version_condiciones: VERSION_CONDICIONES,
      p_version_privacidad: VERSION_PRIVACIDAD,
      p_comunicaciones: aceptacion.comunicaciones,
    });
    setEnviando(false);

    if (error || (data && data.ok === false)) {
      setError(error?.message ?? data?.mensaje ?? "No se ha podido guardar la aceptación.");
      return;
    }
    setEstado("ok");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (estado === "ok") return <>{children}</>;

  if (estado === "cargando") {
    return (
      <div className="mx-auto max-w-sm px-4 pt-24 text-center text-sm text-neutral-500">
        Cargando…
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="mx-auto max-w-sm px-4 pt-24 text-center text-sm">
        <p className="text-negative">No se ha podido comprobar la aceptación de las condiciones.</p>
        <button onClick={comprobar} className="mt-3 font-medium text-accent">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold">Antes de continuar</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Hemos incorporado unas Condiciones de Uso y una Política de Privacidad. Para seguir
          usando Fantasy Beraun Bera necesitamos que las leas y las aceptes.
        </p>
      </div>

      <InfoBasicaRGPD conEnlace />

      <AceptacionLegalFields valor={aceptacion} onChange={setAceptacion} disabled={enviando} />

      {error && <p className="text-sm text-negative">{error}</p>}

      <button
        onClick={aceptar}
        disabled={!aceptacionCompleta(aceptacion) || enviando}
        className="rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {enviando ? "Guardando…" : "Aceptar y continuar"}
      </button>

      <button onClick={cerrarSesion} className="text-xs text-neutral-500 underline underline-offset-2">
        No acepto — cerrar sesión
      </button>
    </div>
  );
}
