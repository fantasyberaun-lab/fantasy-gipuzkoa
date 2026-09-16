import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren sesión iniciada. Todo lo que no esté aquí (login,
// registro, y cualquier página pública futura) queda accesible sin login.
const RUTAS_PROTEGIDAS = ["/plantilla", "/mercado", "/jugadores", "/clasificacion"];
const RUTAS_SOLO_SIN_SESION = ["/login", "/registro"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no quitar esta llamada. Es la que de verdad refresca el
  // token de sesión si está a punto de caducar; sin ella la gente se
  // quedaría deslogueada sin avisar en mitad del uso de la app.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaProtegida = RUTAS_PROTEGIDAS.some((r) => pathname.startsWith(r));
  const esRutaSoloSinSesion = RUTAS_SOLO_SIN_SESION.some((r) =>
    pathname.startsWith(r)
  );

  if (!user && esRutaProtegida) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && esRutaSoloSinSesion) {
    const url = request.nextUrl.clone();
    url.pathname = "/plantilla";
    return NextResponse.redirect(url);
  }

  return response;
}
