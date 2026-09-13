// Configuración base de Next.js.
//
// Para el PWA instalable, la vía más sencilla es añadir el paquete
// `next-pwa` cuando toque esa fase del proyecto:
//
//   npm install next-pwa
//
// y envolver esta config así:
//
//   import withPWA from "next-pwa";
//   export default withPWA({ dest: "public", disable: process.env.NODE_ENV === "development" })(nextConfig);
//
// De momento dejamos el manifest.json en /public listo (ver public/manifest.json)
// y el config sin la dependencia, para no arrastrar paquetes que aún no usamos.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
