import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy Campeonatos de Gipuzkoa",
  description:
    "Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa Individual.",
  manifest: "/manifest.json",
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
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
