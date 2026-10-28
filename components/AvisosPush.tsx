"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import { VAPID_PUBLICA, base64UrlAUint8Array, soportaPush } from "@/lib/push";

type Estado =
  | "comprobando"
  | "listo"
  | "activado"
  | "trabajando"
  | "no-soportado"
  | "bloqueado"
  | "sin-config"
  | "error";

// Activar/desactivar las notificaciones push en ESTE navegador. La suscripción
// se guarda en push_suscripciones (RLS: cada manager la suya). El envío lo hace
// el servidor (/api/push/despachar). En desarrollo no hay service worker
// (PwaProvider solo lo registra en producción), así que allí no se puede probar.
export default function AvisosPush() {
  const supabase = createClient();
  const t = useT();
  const [estado, setEstado] = useState<Estado>("comprobando");

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!soportaPush()) return vivo && setEstado("no-soportado");
      if (!VAPID_PUBLICA) return vivo && setEstado("sin-config");
      if (Notification.permission === "denied") return vivo && setEstado("bloqueado");
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (vivo) setEstado(sub ? "activado" : "listo");
      } catch {
        if (vivo) setEstado("listo");
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activar() {
    setEstado("trabajando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "listo");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlAUint8Array(VAPID_PUBLICA),
        }));

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setEstado("error");
        return;
      }

      const json = sub.toJSON();
      const keys = (json.keys ?? {}) as { p256dh?: string; auth?: string };
      const { error } = await supabase.from("push_suscripciones").upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          usada_en: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
      setEstado(error ? "error" : "activado");
    } catch {
      setEstado("error");
    }
  }

  async function desactivar() {
    setEstado("trabajando");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
      }
      setEstado("listo");
    } catch {
      setEstado("error");
    }
  }

  const BOTON =
    "mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60";

  return (
    <div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.avisosPush.intro}</p>

      {estado === "no-soportado" && (
        <p className="mt-2 text-xs text-neutral-500">{t.avisosPush.noSoportado}</p>
      )}
      {estado === "sin-config" && (
        <p className="mt-2 text-xs text-neutral-500">{t.avisosPush.sinConfigurar}</p>
      )}
      {estado === "bloqueado" && (
        <p className="mt-2 text-xs text-negative">{t.avisosPush.bloqueado}</p>
      )}
      {estado === "error" && <p className="mt-2 text-xs text-negative">{t.avisosPush.error}</p>}

      {(estado === "listo" || estado === "error") && (
        <button
          type="button"
          onClick={activar}
          className={`${BOTON} bg-accent text-white hover:opacity-90`}
        >
          {t.avisosPush.activar}
        </button>
      )}

      {estado === "trabajando" && (
        <button type="button" disabled className={`${BOTON} bg-accent text-white`}>
          {t.avisosPush.activando}
        </button>
      )}

      {estado === "activado" && (
        <button
          type="button"
          onClick={desactivar}
          className={`${BOTON} border border-neutral-300 text-neutral-700 hover:border-negative hover:text-negative dark:border-neutral-700 dark:text-neutral-300`}
        >
          {t.avisosPush.desactivar}
        </button>
      )}
    </div>
  );
}
