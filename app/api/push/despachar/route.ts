import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminClient } from "@/lib/recuperacion";

export const runtime = "nodejs";

// Despacha las notificaciones push pendientes. Lo llama un cron (Vercel Cron con
// Authorization: Bearer CRON_SECRET, o pg_cron + pg_net con cabecera
// x-cron-secret). NO es público: sin el secreto correcto responde 401.
//
// Flujo: pide a la BD lo pendiente (notificaciones_push_pendientes, 0114), manda
// cada push con la clave privada VAPID y marca lo enviado. Las suscripciones
// caducadas (404/410) se borran.

interface FilaPendiente {
  notif_id: string;
  suscripcion_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  titulo: string;
  cuerpo: string;
  url: string;
  tag: string;
}

function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secreto}`) return true;
  if (request.headers.get("x-cron-secret") === secreto) return true;
  return false;
}

async function despachar(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ ok: false, mensaje: "No autorizado." }, { status: 401 });
  }

  const publica = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const asunto = process.env.VAPID_SUBJECT || "mailto:fantasyberaun@gmail.com";
  const admin = adminClient();

  if (!admin || !publica || !privada) {
    console.error("Push sin configurar: faltan VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o service role.");
    return NextResponse.json({ ok: false, mensaje: "Push no configurado." }, { status: 500 });
  }

  webpush.setVapidDetails(asunto, publica, privada);

  const { data, error } = await admin.rpc("notificaciones_push_pendientes");
  if (error) {
    console.error("Push: no se pudo leer lo pendiente:", error.message);
    return NextResponse.json({ ok: false, mensaje: "Error al leer pendientes." }, { status: 500 });
  }

  const filas = (data ?? []) as FilaPendiente[];
  const notifIds = new Set<string>();
  let enviados = 0;
  let fallidos = 0;

  await Promise.all(
    filas.map(async (f) => {
      notifIds.add(f.notif_id);
      const payload = JSON.stringify({
        titulo: f.titulo,
        cuerpo: f.cuerpo,
        url: f.url,
        tag: f.tag,
      });
      try {
        await webpush.sendNotification(
          { endpoint: f.endpoint, keys: { p256dh: f.p256dh, auth: f.auth } },
          payload
        );
        enviados++;
      } catch (e: unknown) {
        fallidos++;
        const codigo = (e as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) {
          // Suscripción caducada: se borra para no reintentarla.
          await admin.from("push_suscripciones").delete().eq("endpoint", f.endpoint);
        }
      }
    })
  );

  if (notifIds.size > 0) {
    await admin.rpc("marcar_push_despachada", { p_ids: Array.from(notifIds) });
  }

  return NextResponse.json({ ok: true, enviados, fallidos, notificaciones: notifIds.size });
}

export async function GET(request: Request) {
  return despachar(request);
}

export async function POST(request: Request) {
  return despachar(request);
}
