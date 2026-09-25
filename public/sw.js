// Service worker de Fantassy Gipuzkoa - Beraun
//
// Objetivo: habilitar la instalación como PWA y dar una pequeña
// resiliencia offline (icono, manifest y una página de "sin conexión"
// básica). Deliberadamente NO cachea rutas dinámicas ni llamadas a la
// API/Supabase: siempre van a red para no servir datos desactualizados
// (saldo, mercado, clasificación...).

const CACHE_VERSION = "fantassy-gipuzkoa-v1";
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

  // Estáticos (iconos, manifest, _next/static, etc.): caché primero,
  // y se actualiza en segundo plano.
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
