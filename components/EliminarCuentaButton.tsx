"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { eliminarMiCuentaDB } from "@/lib/supabase/queries";

const PALABRA_CONFIRMACION = "eliminar";

export default function EliminarCuentaButton() {
  const router = useRouter();
  const supabase = createClient();

  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeConfirmar =
    confirmacion.trim().toLowerCase() === PALABRA_CONFIRMACION;

  function cerrar() {
    if (enviando) return;
    setAbierto(false);
    setConfirmacion("");
    setError(null);
  }

  async function eliminar() {
    setEnviando(true);
    setError(null);

    const resultado = await eliminarMiCuentaDB(supabase);
    if (!resultado.ok) {
      setEnviando(false);
      setError(resultado.mensaje);
      return;
    }

    // La cuenta ya no existe: limpiamos la sesión local y volvemos al
    // registro, para poder crear una nueva.
    await supabase.auth.signOut();
    router.push("/registro");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="text-negative underline underline-offset-2 hover:opacity-80"
      >
        Eliminar cuenta
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={cerrar} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <p className="text-base font-semibold">Eliminar tu cuenta</p>
            <p className="mt-1 text-sm text-neutral-500">
              Se borrarán tu cuenta, tu equipo, tu saldo y tu plantilla. Tus
              jugadores volverán al mercado. No se puede deshacer.
            </p>

            <label className="mt-4 block text-sm text-neutral-600 dark:text-neutral-400">
              Escribe <span className="font-semibold">{PALABRA_CONFIRMACION}</span>{" "}
              para confirmar
            </label>
            <input
              type="text"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              disabled={enviando}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />

            {error && <p className="mt-2 text-xs text-negative">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={cerrar}
                disabled={enviando}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                disabled={!puedeConfirmar || enviando}
                className="flex-1 rounded-lg bg-negative py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {enviando ? "Eliminando…" : "Eliminar cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
