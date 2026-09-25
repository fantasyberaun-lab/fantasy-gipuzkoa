import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaProvider from "@/components/PwaProvider";

export const metadata: Metadata = {
  title: "Fantassy Gipuzkoa - Beraun",
  description:
    "Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa Individual.",
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
    title: "Fantassy Gipuzkoa",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDEAE3" },
    { media: "(prefers-color-scheme: dark)", color: "#141416" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: la clase "dark" la añade el ThemeToggle
    // en cliente a partir de localStorage / prefers-color-scheme.
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
