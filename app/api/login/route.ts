import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

// Inicio de sesión con email O nombre de usuario en el mismo campo.
//
// Si lo escrito contiene "@" se trata como email. Si no, se busca el email
// de ese nombre de usuario (función SQL email_por_nombre_usuario, solo
// accesible con la service role key) y se inicia sesión con él. Todo ocurre
// aquí, en el servidor: el email nunca llega al navegador, y el mensaje de
// error es el mismo si falla el usuario o si falla la contraseña.

const ERROR_CREDENCIALES = "Usuario/email o contraseña incorrectos.";

// Email que no existe, para que "usuario inexistente" tarde lo mismo que
// "contraseña incorrecta" y no se pueda averiguar qué usuarios existen.
const EMAIL_FICTICIO = "usuario-inexistente@example.invalid";

function respuestaError(mensaje: string, status: number) {
  return NextResponse.json({ ok: false, mensaje }, { status });
}

export async function POST(request: Request) {
  let body: { identificador?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return respuestaError("Petición no válida.", 400);
  }

  const identificador =
    typeof body.identificador === "string" ? body.identificador.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!identificador || !password) {
    return respuestaError("Rellena todos los campos.", 400);
  }

  let email = identificador;

  if (!identificador.includes("@")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      console.error(
        "Falta SUPABASE_SERVICE_ROLE_KEY: no se puede iniciar sesión con nombre de usuario."
      );
      return respuestaError(
        "Ahora mismo solo se puede iniciar sesión con el email.",
        500
      );
    }

    const admin = createAdminClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc("email_por_nombre_usuario", {
      p_nombre: identificador,
    });

    if (error) {
      console.error("Error buscando el email del usuario:", error.message);
      return respuestaError("No se ha podido iniciar sesión. Inténtalo de nuevo.", 500);
    }

    email = typeof data === "string" && data ? data : EMAIL_FICTICIO;
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return respuestaError(
        "Tienes que confirmar tu email antes de iniciar sesión.",
        401
      );
    }
    if (error.status === 429) {
      return respuestaError("Demasiados intentos. Espera un momento.", 429);
    }
    return respuestaError(ERROR_CREDENCIALES, 401);
  }

  return NextResponse.json({ ok: true });
}
