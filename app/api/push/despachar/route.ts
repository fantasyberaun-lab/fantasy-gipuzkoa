import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminClient } from "@/lib/recuperacion";

export const runtime = "nodejs";

// Despacha los avisos push pendientes. Lo llama un cron (pg_cron + pg_net con
// cabecera x-cron-secret, o Vercel Cron con Authorization: Bearer CRON_SECRET).
// NO es público: sin el secreto correcto responde 401.
//
// Flujo: pide a la BD lo pendiente (notificaciones_push_pendientes, 0116: una fila
// por aviso y suscripción), manda cada push con la clave privada VAPID y marca como
// enviado SOLO lo que ha salido bien o ha fallado de forma definitiva. Lo que falla
// por un error pasajero queda sin marcar y se reintenta en la siguiente pasada.
// Las suscripciones caducadas (404/410) se borran.

interface FilaPendiente {
  origen: "notificacion" | "difusion";
  ref_id: string;
  suscripcion_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  titulo: string;
  cuerpo: string;
  url: string;
  tag: string;
}

interface Marca {
  origen: string;
  ref_id: string;
  suscripcion_id: string;
  estado: "ok" | "descartado";
}

// Cuántos push se mandan a la vez.
const LOTE = 50;

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
  const marcas: Marca[] = [];
  let enviados = 0;
  let reintentar = 0;

  for (let i = 0; i < filas.length; i += LOTE) {
    await Promise.all(
      filas.slice(i, i + LOTE).map(async (f) => {
        const marca = (estado: Marca["estado"]) =>
          marcas.push({ origen: f.origen, ref_id: f.ref_id, suscripcion_id: f.suscripcion_id, estado });
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
          marca("ok");
        } catch (e: unknown) {
          const codigo = (e as { statusCode?: number }).statusCode;
          if (codigo === 404 || codigo === 410) {
            // Suscripción caducada: se borra (y con ella sus registros de envío).
            await admin.from("push_suscripciones").delete().eq("id", f.suscripcion_id);
          } else if (codigo && codigo >= 400 && codigo < 500 && codigo !== 408 && codigo !== 429) {
            // Rechazo definitivo (p. ej. aviso demasiado grande): no se reintenta.
            marca("descartado");
          } else {
            // Error pasajero (sin red, servicio caído, límite): sin marcar, se
            // reintenta en la siguiente pasada.
            reintentar++;
          }
        }
      })
    );
  }

  if (marcas.length > 0) {
    const { error: errorMarca } = await admin.rpc("marcar_push_enviados", { p_items: marcas });
    if (errorMarca) {
      // Sin marcar se reenviarían en la siguiente pasada: se avisa en los logs.
      console.error("Push: no se pudieron marcar los envíos:", errorMarca.message);
    }
  }

  return NextResponse.json({ ok: true, enviados, reintentar, pendientes: filas.length });
}

export async function GET(request: Request) {
  return despachar(request);
}

export async function POST(request: Request) {
  return despachar(request);
}
