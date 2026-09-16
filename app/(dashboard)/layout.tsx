import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import { GameStateProvider } from "@/components/GameStateProvider";
import EquipoHeader from "@/components/EquipoHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // GameStateProvider vive aquí porque Next.js mantiene este layout montado
  // al navegar entre pestañas: así el estado (saldo, plantilla, ofertas...)
  // no se pierde al cambiar de pestaña. Sigue viviendo solo en memoria del
  // navegador hasta que se conecte Supabase de verdad (ver comentarios en
  // components/GameStateProvider.tsx).
  return (
    <GameStateProvider>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <EquipoHeader />
          <ThemeToggle />
        </header>

        <TabNav />

        <main className="mt-6">{children}</main>
      </div>
    </GameStateProvider>
  );
}
