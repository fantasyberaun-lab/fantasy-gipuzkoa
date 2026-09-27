import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Los enlaces de confirmación de email (y de "olvidé mi contraseña") de
// Supabase, con el flujo PKCE que usa @supabase/ssr, llegan aquí con un
// "code" en la query string. Hay que cambiarlo por una sesión real
// (cookies incluidas) antes de mandar al usuario a la app; si no, se
// queda con el email verificado en Supabase pero sin sesión iniciada
// en el navegador.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/plantilla";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmacion`);
}
