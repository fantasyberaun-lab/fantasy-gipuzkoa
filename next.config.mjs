// Configuración base de Next.js.
//
// El PWA instalable está montado a mano (sin next-pwa) para no añadir
// dependencias: ver public/manifest.json, public/sw.js, public/offline.html
// y components/PwaProvider.tsx (registro del service worker + gestión del
// evento beforeinstallprompt).

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
