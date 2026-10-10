"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/IdiomaProvider";

export default function RecuperarPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    let resultado: { ok: boolean; mensaje?: string } = { ok: false };
    try {
      const respuesta = await fetch("/api/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      resultado = await respuesta.json();
    } catch {
      resultado = { ok: false, mensaje: t.auth.errorConexion };
    }

    setCargando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje ?? t.auth.errorEnvio);
      return;
    }
    setEnviado(resultado.mensaje ?? t.auth.revisaCorreoFrase);
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm font-medium">{t.auth.revisaCorreo}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{enviado}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t.auth.instruccionesTemporal}
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-accent py-2.5 text-center text-sm font-medium text-white hover:bg-accent-hover"
        >
          {t.auth.irALogin}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t.auth.recuperarIntro}
      </p>

      <div>
        <label className="text-xs font-medium text-neutral-500">{t.auth.email}</label>
        <input
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {cargando ? t.auth.enviando : t.auth.enviarCorreo}
      </button>

      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-accent">
          {t.auth.volverLogin}
        </Link>
      </p>
    </form>
  );
}
