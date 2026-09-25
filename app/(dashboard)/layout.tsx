import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import { GameStateProvider } from "@/components/GameStateProvider";
import EquipoHeader from "@/components/EquipoHeader";
import LigaGate from "@/components/LigaGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GameStateProvider>
      <LigaGate>
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
          <header className="mb-6 flex items-start justify-between gap-4">
            <EquipoHeader />
            <ThemeToggle />
          </header>

          <TabNav />

          <main className="mt-6">{children}</main>
        </div>
      </LigaGate>
    </GameStateProvider>
  );
}