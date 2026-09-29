import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import { GameStateProvider } from "@/components/GameStateProvider";
import EquipoHeader from "@/components/EquipoHeader";
import LigaGate from "@/components/LigaGate";
import InstallPwaButton from "@/components/InstallPwaButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GameStateProvider>
      <LigaGate>
        <div className="mx-auto max-w-5xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:pb-16">
          <header className="mb-6 flex items-start justify-between gap-4">
            <EquipoHeader />
            <div className="flex items-center gap-3">
              <InstallPwaButton />
              <ThemeToggle />
            </div>
          </header>

          <TabNav />

          <main className="mt-6">{children}</main>
        </div>
      </LigaGate>
    </GameStateProvider>
  );
}