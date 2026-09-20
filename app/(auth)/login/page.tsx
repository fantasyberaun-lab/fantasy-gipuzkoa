"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();

  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    let resultado: { ok: boolean; mensaje?: string } = { ok: false };
    try {
      const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, password }),
      });
      resultado = await respuesta.json();
    } catch {
      resultado = { ok: false, mensaje: "No se ha podido conectar. Inténtalo de nuevo." };
    }

    setCargando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje ?? "No se ha podido iniciar sesión.");
      return;
    }

    router.push("/plantilla");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
    >
      <div>
        <label className="text-xs font-medium text-neutral-500">
          Email o nombre de usuario
        </label>
        <input
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500">
          Contraseña
        </label>
        <PasswordInput
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {cargando ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-neutral-500">
        ¿No tienes cuenta todavía?{" "}
        <Link href="/registro" className="font-medium text-accent">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
