// Utilidades de notificaciones push (Web Push / PWA). Lado cliente.
//
// La clave pública VAPID es pública por diseño (va en el navegador). La privada
// solo vive en el servidor (/api/push/despachar). Ver 0113/0114 y CLAUDE.md.

export const VAPID_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// ¿Soporta este navegador las notificaciones push?
export function soportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// La applicationServerKey de pushManager.subscribe debe ser un Uint8Array.
export function base64UrlAUint8Array(base64: string): Uint8Array {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(normal);
  const salida = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    salida[i] = binario.charCodeAt(i);
  }
  return salida;
}
