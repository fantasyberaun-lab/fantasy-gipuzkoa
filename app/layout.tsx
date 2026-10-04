import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import PwaProvider from "@/components/PwaProvider";

const fontSans = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Para títulos y cifras grandes (nombre del equipo, saldo).
const fontDisplay = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beraun Fantasy",
  description:
    "Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa",
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
  return (
    // suppressHydrationWarning: la clase "dark" la añade el ThemeToggle
    // en cliente a partir de localStorage / prefers-color-scheme.
    <html
      lang="es"
      className={`${fontSans.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <PwaProvider>{children}</PwaProvider>
        {/* Visitas, páginas, país y dispositivo (sin cookies). Se ve en Vercel > Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}
