import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Registro de actividad con ubicación aproximada.
//
// ActividadTracker llama aquí (en vez de llamar directamente a Supabase) porque
// solo las peticiones que pasan por Vercel llevan las cabeceras de geolocalización:
//   x-vercel-ip-country         -> "ES"
//   x-vercel-ip-country-region  -> código ISO 3166-2 de la región (p. ej. "PV")
//   x-vercel-ip-city            -> "San Sebastián" (puede llegar codificada en URL)
//
// Solo se guardan país, región y ciudad. La IP no se lee ni se guarda. Vercel
// sobrescribe estas cabeceras, así que el navegador no puede falsearlas por aquí.
// En local (next dev) no existen: se registra la pantalla sin ubicación.
//
// Siempre responde 204: si algo falla, el manager no debe notarlo.

function cabecera(request: Request, nombre: string): string | null {
  const valor = request.headers.get(nombre);
  if (!valor) return null;
  try {
    return decodeURIComponent(valor).slice(0, 80);
  } catch {
    return valor.slice(0, 80);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ruta = typeof body?.ruta === "string" ? body.ruta : "/";

    const supabase = createClient();
    await supabase.rpc("registrar_actividad", {
      p_ruta: ruta,
      p_pais: cabecera(request, "x-vercel-ip-country"),
      p_region: cabecera(request, "x-vercel-ip-country-region"),
      p_ciudad: cabecera(request, "x-vercel-ip-city"),
    });
  } catch {
    // Sin ruido: es solo una métrica.
  }
  return new NextResponse(null, { status: 204 });
}
