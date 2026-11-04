// Configuración base de Next.js.
//
// El PWA instalable está montado a mano (sin next-pwa) para no añadir
// dependencias: ver public/manifest.json, public/sw.js, public/offline.html
// y components/PwaProvider.tsx (registro del service worker + gestión del
// evento beforeinstallprompt).

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // La dirección antigua (vercel.app) redirige al dominio propio. Solo ese
  // host exacto: las vistas previas de las ramas usan otros hosts y no se
  // tocan. 308 = permanente y conserva el método y la query.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "fantasy-gipuzkoa.vercel.app" }],
        destination: "https://fantasy.beraunberaxake.com/:path*",
        permanent: true,
      },
    ];
  },

  // Cabeceras de seguridad básicas (auditoría 17-10-2026). No se pone una CSP
  // estricta: Next.js y Vercel Analytics usan scripts en línea y habría que
  // probarla con cuidado antes de activarla.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
      // Digital Asset Links (app de Google Play / TWA): Google exige respuesta
      // 200 directa con JSON, sin redirecciones.
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
