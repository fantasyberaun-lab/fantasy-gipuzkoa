import TabNav from "@/components/TabNav";
import { GameStateProvider } from "@/components/GameStateProvider";
import EquipoHeader, { EquipoAcciones } from "@/components/EquipoHeader";
import LigaGate from "@/components/LigaGate";
import LegalGate from "@/components/legal/LegalGate";
import ActividadTracker from "@/components/ActividadTracker";
import RachaDiaria from "@/components/RachaDiaria";
import EnlacesLegales from "@/components/legal/EnlacesLegales";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LegalGate>
    <GameStateProvider>
      <ActividadTracker />
      <LigaGate>
        <header className="banner-tablero">
          <div className="mx-auto max-w-5xl px-4 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <EquipoHeader />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:pb-16">
          <EquipoAcciones />

          <RachaDiaria />

          <TabNav />

          <main className="mt-6">{children}</main>

          <EnlacesLegales className="mt-10" />
        </div>
      </LigaGate>
    </GameStateProvider>
    </LegalGate>
  );
}
