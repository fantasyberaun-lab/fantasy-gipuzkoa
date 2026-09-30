import TabNav from "@/components/TabNav";
import { GameStateProvider } from "@/components/GameStateProvider";
import EquipoHeader, { EquipoAcciones } from "@/components/EquipoHeader";
import LigaGate from "@/components/LigaGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GameStateProvider>
      <LigaGate>
        <header className="banner-tablero">
          <div className="mx-auto max-w-5xl px-4 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <EquipoHeader />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:pb-16">
          <EquipoAcciones />

          <TabNav />

          <main className="mt-6">{children}</main>
        </div>
      </LigaGate>
    </GameStateProvider>
  );
}
