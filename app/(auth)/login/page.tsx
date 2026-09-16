"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message
      );
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
        <label className="text-xs font-medium text-neutral-500">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500">
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
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
