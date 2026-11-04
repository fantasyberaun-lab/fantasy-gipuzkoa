import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import PwaProvider from "@/components/PwaProvider";
import { IdiomaProvider } from "@/components/IdiomaProvider";
import { getIdioma } from "@/lib/i18n/server";

const fontSans = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Para títulos y cifras grandes (nombre del equipo, saldo).
const fontDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fantasy.beraunberaxake.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beraun Fantasy · Fantasy de ajedrez de los Campeonatos de Gipuzkoa",
    template: "%s · Beraun Fantasy",
  },
  description:
    "Beraun Fantasy es el fantasy de ajedrez de los Campeonatos de Gipuzkoa: crea tu plantilla, ficha jugadores en el mercado y compite en ligas con tus amigos.",
  applicationName: "Beraun Fantasy",
  keywords: [
    "Beraun Fantasy",
    "fantasy de ajedrez",
    "fantasy ajedrez Gipuzkoa",
    "Campeonatos de Gipuzkoa de ajedrez",
    "ajedrez Gipuzkoa",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Beraun Fantasy",
    locale: "es_ES",
    title: "Beraun Fantasy · Fantasy de ajedrez de Gipuzkoa",
    description:
      "Crea tu plantilla, ficha ajedrecistas y compite en ligas con tus amigos durante los Campeonatos de Gipuzkoa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beraun Fantasy · Fantasy de ajedrez de Gipuzkoa",
    description:
      "Crea tu plantilla, ficha ajedrecistas y compite en ligas con tus amigos durante los Campeonatos de Gipuzkoa.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Beraun Fantasy",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1E0D55", // morado de la cabecera
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const idioma = getIdioma();
  return (
    // suppressHydrationWarning: la clase "dark" la añade el ThemeToggle
    // en cliente a partir de localStorage / prefers-color-scheme.
    <html
      lang={idioma}
      className={`${fontSans.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <IdiomaProvider idiomaInicial={idioma}>
          <PwaProvider>{children}</PwaProvider>
        </IdiomaProvider>
        {/* Visitas, páginas, país y dispositivo (sin cookies). Se ve en Vercel > Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}
