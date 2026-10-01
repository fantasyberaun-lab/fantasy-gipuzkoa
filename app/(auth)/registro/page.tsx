"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import AceptacionLegalFields, {
  ACEPTACION_INICIAL,
  aceptacionCompleta,
  type AceptacionLegal,
} from "@/components/legal/AceptacionLegalFields";
import InfoBasicaRGPD from "@/components/legal/InfoBasicaRGPD";
import { FORMATO_NOMBRE_USUARIO, MENSAJE_FORMATO_NOMBRE_USUARIO, MIN_PASSWORD } from "@/lib/cuenta";
import { VERSION_CONDICIONES, VERSION_PRIVACIDAD } from "@/lib/legal/config";


export default function RegistroPage() {
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const [aceptacion, setAceptacion] = useState<AceptacionLegal>(ACEPTACION_INICIAL);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!aceptacionCompleta(aceptacion)) {
      setError(
        "Para registrarte tienes que aceptar las Condiciones de Uso, leer la Política de Privacidad y confirmar que tienes 14 años o más."
      );
      return;
    }

    const nombreLimpio = nombre.trim();
    if (!FORMATO_NOMBRE_USUARIO.test(nombreLimpio)) {
      setError(MENSAJE_FORMATO_NOMBRE_USUARIO);
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
          // Aceptaciones: el trigger handle_new_user() las guarda en la tabla
          // `consentimientos` con la fecha/hora del servidor (ver 0045).
          acepta_legal: true,
          version_condiciones: VERSION_CONDICIONES,
          version_privacidad: VERSION_PRIVACIDAD,
          acepta_comunicaciones: aceptacion.comunicaciones,
        },
        // Sin esto, Supabase usa el "Site URL" configurado en el
        // dashboard del proyecto (que en producción debe apuntar al
        // dominio de Vercel, no a localhost) para el enlace del email
        // de confirmación. Lo fijamos explícitamente aquí para que
        // apunte siempre a donde se está sirviendo la app ahora mismo.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <InfoBasicaRGPD conEnlace />

      <AceptacionLegalFields valor={aceptacion} onChange={setAceptacion} disabled={cargando} />

      {error && <p className="text-sm text-negative">{error}</p>}

      <button
        type="submit"
        disabled={cargando || !aceptacionCompleta(aceptacion)}
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