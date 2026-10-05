"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecuperarPage() {
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
      resultado = { ok: false, mensaje: "No se ha podido conectar. Inténtalo de nuevo." };
    }

    setCargando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje ?? "No se ha podido enviar el correo.");
      return;
    }
    setEnviado(resultado.mensaje ?? "Revisa tu correo.");
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm font-medium">Revisa tu correo</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{enviado}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Entra con la contraseña temporal y, una vez dentro, cámbiala desde Mi perfil.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-accent py-2.5 text-center text-sm font-medium text-white hover:bg-accent-hover"
        >
          Ir a iniciar sesión
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
        Escribe el email con el que te registraste y te enviaremos tu nombre de usuario y una
        contraseña temporal para entrar.
      </p>

      <div>
        <label className="text-xs font-medium text-neutral-500">Email</label>
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
        {cargando ? "Enviando..." : "Enviarme el correo"}
      </button>

      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-accent">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
