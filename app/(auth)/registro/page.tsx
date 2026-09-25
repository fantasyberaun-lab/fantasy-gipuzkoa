"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

// Letras, números, punto, guion y guion bajo; sin espacios ni "@" (así se
// distingue de un email en el login).
const FORMATO_NOMBRE_USUARIO = /^[A-Za-z0-9_.-]{3,20}$/;

export default function RegistroPage() {
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [registrado, setRegistrado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nombreLimpio = nombre.trim();
    if (!FORMATO_NOMBRE_USUARIO.test(nombreLimpio)) {
      setError(
        "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios)."
      );
      return;
    }

    setCargando(true);

    const { data: disponible, error: errorDisponible } = await supabase.rpc(
      "nombre_usuario_disponible",
      { p_nombre: nombreLimpio }
    );

    if (errorDisponible) {
      setCargando(false);
      setError("No se ha podido comprobar el nombre de usuario. Inténtalo de nuevo.");
      return;
    }

    if (disponible === false) {
      setCargando(false);
      setError("Ese nombre de usuario ya está en uso.");
      return;
    }

    // "nombre" viaja en los metadatos del usuario; el trigger
    // handle_new_user() (ver supabase/migrations/0025_*.sql) lo lee de
    // ahí para crear su fila en profiles. Ya no se crea ningún equipo
    // aquí: eso pasa después, al crear o unirse a una liga desde la
    // pantalla que aparece nada más iniciar sesión (LigaGate).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombreLimpio,
        },
      },
    });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setRegistrado(true);
  }

  if (registrado) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-6 text-center dark:border-neutral-800">
        <p className="font-medium">Revisa tu email</p>
        <p className="mt-2 text-sm text-neutral-500">
          Te hemos enviado un enlace de confirmación a <b>{email}</b>. Una vez
          confirmes la cuenta, ya puedes iniciar sesión.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-accent"
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
      <div>
        <label className="text-xs font-medium text-neutral-500">
          Nombre de usuario
        </label>
        <input
          type="text"
          required
          minLength={3}
          maxLength={20}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

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
        <PasswordInput
          required
          minLength={6}
          autoComplete="new-password"
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
        {cargando ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}