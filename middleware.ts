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
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icons/).*)",
  ],
};
