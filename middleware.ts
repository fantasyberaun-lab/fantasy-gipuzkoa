import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todo salvo archivos estáticos y de Next.js,
     * para no gastar una llamada a Supabase en cada imagen o asset.
     * /.well-known/ (assetlinks.json para la app de Google Play) se sirve tal
     * cual, sin pasar por Supabase.
     * /api/actividad tampoco lo necesita: el cliente de Supabase del route
     * handler ya refresca la sesión si hace falta, y se llama en cada cambio
     * de pestaña.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|robots.txt|sitemap.xml|opengraph-image|google[a-z0-9]+\\.html|\\.well-known/|icons/|avatares/|api/actividad|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
