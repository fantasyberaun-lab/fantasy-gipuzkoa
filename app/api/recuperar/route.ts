import { NextResponse } from "next/server";
import {
  adminClient,
  generarClave,
  hashClave,
  MAX_POR_DIA_TOTAL,
  MAX_POR_HORA_Y_USUARIO,
  MINUTOS_VALIDEZ,
} from "@/lib/recuperacion";
import { construirCorreo, enviarCorreo } from "@/lib/emailRecuperacion";
import { RESPONSABLE } from "@/lib/legal/config";

export const runtime = "nodejs";

// "He olvidado la contraseña": manda al email un correo con el nombre de usuario
// y una contraseña temporal. La contraseña real NO se cambia aquí: solo cuando
// se inicia sesión con la temporal (ver canjearClaveTemporal en lib/recuperacion
// y app/api/login/route.ts).
//
// La respuesta es la misma exista o no el email, y siempre tarda lo mismo como
// mínimo, para que no se pueda averiguar qué emails están registrados.

const MENSAJE_OK =
  "Si ese email está registrado, te hemos enviado un correo con tu nombre de usuario y una contraseña temporal. Si no lo ves en unos minutos, mira en spam.";
const MENSAJE_NO_DISPONIBLE =
  "La recuperación de cuenta no está disponible ahora mismo. Inténtalo más tarde.";
const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RESPUESTA_MINIMA_MS = 1200;
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

async function responder(inicio: number, cuerpo: Record<string, unknown>, status = 200) {
  const falta = RESPUESTA_MINIMA_MS - (Date.now() - inicio);
  if (falta > 0) await new Promise((r) => setTimeout(r, falta));
  return NextResponse.json(cuerpo, { status });
}

export async function POST(request: Request) {
  const inicio = Date.now();

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return responder(inicio, { ok: false, mensaje: "Petición no válida." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_VALIDO.test(email) || email.length > 254) {
    return responder(inicio, { ok: false, mensaje: "Escribe un email válido." }, 400);
  }

  const admin = adminClient();
  if (!admin || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.error(
      "Recuperación de cuenta sin configurar: faltan SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY o EMAIL_FROM."
    );
    return responder(inicio, { ok: false, mensaje: MENSAJE_NO_DISPONIBLE }, 500);
  }

  try {
    const ahora = Date.now();

    // Limpieza de peticiones antiguas (más de un día).
    await admin
      .from("recuperaciones_cuenta")
      .delete()
      .lt("creada_en", new Date(ahora - DIA_MS).toISOString());

    // Tope global diario: Resend gratis tiene cuota y también se usa para los registros.
    const { count: hoy } = await admin
      .from("recuperaciones_cuenta")
      .select("id", { count: "exact", head: true })
      .gte("creada_en", new Date(ahora - DIA_MS).toISOString());
    if ((hoy ?? 0) >= MAX_POR_DIA_TOTAL) {
      return responder(
        inicio,
        {
          ok: false,
          mensaje: `Hay demasiadas solicitudes hoy. Inténtalo más tarde o escribe a ${RESPONSABLE.email}.`,
        },
        429
      );
    }

    const { data: usuarios } = await admin.rpc("usuario_por_email", { p_email: email });
    const usuario = Array.isArray(usuarios) ? usuarios[0] : null;
    if (!usuario) return responder(inicio, { ok: true, mensaje: MENSAJE_OK });

    // Límite por manager: evita que alguien le llene el buzón a otro.
    const { count: recientes } = await admin
      .from("recuperaciones_cuenta")
      .select("id", { count: "exact", head: true })
      .eq("user_id", usuario.id)
      .gte("creada_en", new Date(ahora - HORA_MS).toISOString());
    if ((recientes ?? 0) >= MAX_POR_HORA_Y_USUARIO) {
      return responder(inicio, { ok: true, mensaje: MENSAJE_OK });
    }

    const clave = generarClave();
    const { data: fila, error: errorGuardar } = await admin
      .from("recuperaciones_cuenta")
      .insert({
        user_id: usuario.id,
        clave_hash: hashClave(clave),
        caduca_en: new Date(ahora + MINUTOS_VALIDEZ * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (errorGuardar || !fila) {
      console.error("Recuperación: no se pudo guardar:", errorGuardar?.message);
      return responder(inicio, { ok: false, mensaje: MENSAJE_NO_DISPONIBLE }, 500);
    }

    const urlBase = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const correo = construirCorreo({
      nombre: usuario.nombre,
      clave,
      urlLogin: `${urlBase}/login`,
      minutos: MINUTOS_VALIDEZ,
    });
    const enviado = await enviarCorreo({ a: email, ...correo });

    if (!enviado) {
      // Sin correo, la contraseña temporal no sirve de nada: se descarta.
      await admin.from("recuperaciones_cuenta").delete().eq("id", fila.id);
      return responder(
        inicio,
        { ok: false, mensaje: "No hemos podido enviar el correo. Inténtalo de nuevo en unos minutos." },
        502
      );
    }

    return responder(inicio, { ok: true, mensaje: MENSAJE_OK });
  } catch (e) {
    console.error("Recuperación de cuenta: error inesperado:", e);
    return responder(inicio, { ok: false, mensaje: MENSAJE_NO_DISPONIBLE }, 500);
  }
}
