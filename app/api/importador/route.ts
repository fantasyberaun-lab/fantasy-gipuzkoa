import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leerRonda, leerTorneo } from "@/lib/importador/fuente";
import { ErrorImportador } from "@/lib/importador/texto";

// Solo el administrador (rol "root") puede usar el importador. El middleware
// no protege /api, así que se comprueba aquí.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const error = (mensaje: string, status: number) =>
  NextResponse.json({ ok: false, mensaje }, { status });

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return error("Tienes que iniciar sesión.", 401);

  const { data: esRoot } = await supabase.rpc("es_root");
  if (esRoot !== true) return error("Solo el administrador puede importar torneos.", 403);

  let cuerpo: { accion?: string; url?: string; ronda?: number };
  try {
    cuerpo = await request.json();
  } catch {
    return error("Petición no válida.", 400);
  }
  if (typeof cuerpo.url !== "string" || cuerpo.url.length > 500) {
    return error("Falta el enlace del torneo.", 400);
  }

  try {
    if (cuerpo.accion === "torneo") {
      return NextResponse.json({ ok: true, datos: await leerTorneo(cuerpo.url) });
    }
    if (cuerpo.accion === "ronda") {
      return NextResponse.json({
        ok: true,
        datos: await leerRonda(cuerpo.url, Number(cuerpo.ronda)),
      });
    }
    return error("Acción no válida.", 400);
  } catch (e) {
    if (e instanceof ErrorImportador) return error(e.message, 422);
    console.error("Error en el importador:", e);
    return error("Error inesperado al importar. Inténtalo de nuevo.", 500);
  }
}
