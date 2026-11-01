// Service worker de Fantassy Gipuzkoa - Beraun
//
// Objetivo: habilitar la instalación como PWA y dar una pequeña
// resiliencia offline (icono, manifest y una página de "sin conexión"
// básica). Deliberadamente NO cachea rutas dinámicas ni llamadas a la
// API/Supabase: siempre van a red para no servir datos desactualizados
// (saldo, mercado, clasificación...).

// Subir la versión borra las cachés anteriores al activarse (v2: se dejan de
// cachear las respuestas de navegación interna de Next, ver más abajo).
const CACHE_VERSION = "fantassy-gipuzkoa-v2";
const APP_SHELL = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET, y solo mismo origen.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Nunca tocar llamadas a la API: siempre red, sin caché.
  if (request.url.includes("/api/")) {
    return;
  }

  // Navegaciones (cargar una página): red primero, con caché/página
  // offline como último recurso si no hay conexión.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => caches.match(request).then((cached) => cached || caches.match("/offline.html"))
      )
    );
    return;
  }

  // Solo se cachean archivos que no cambian sin cambiar de nombre: los de
  // _next/static (llevan un hash en el nombre), iconos, avatares y manifest.
  // Todo lo demás va a red sin tocar; en especial las peticiones de
  // navegación interna de Next (?_rsc=...): si se sirvieran de caché, tras un
  // despliegue podrían apuntar a archivos JS que ya no existen.
  const { pathname } = new URL(request.url);
  const esEstatico =
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/avatares/") ||
    pathname === "/manifest.json";
  if (!esEstatico) {
    return;
  }

  // Caché primero, y se actualiza en segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// --- Notificaciones push (ver 0113/0114 y /api/push/despachar) --------------
// El servidor manda un JSON { titulo, cuerpo, url, tag }. Se muestra como
// notificación del sistema; al tocarla se abre (o enfoca) la app en esa ruta.
self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : "" };
  }

  const titulo = datos.titulo || "Fantasy Beraun";
  const opciones = {
    body: datos.cuerpo || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: datos.tag || undefined,
    data: { url: datos.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientes) => {
      for (const cliente of clientes) {
        if ("focus" in cliente) {
          cliente.navigate(destino).catch(() => {});
          return cliente.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
