import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          {/* TODO: sustituir por el nombre real del equipo del usuario logueado */}
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Tu equipo
          </p>
          <h1 className="text-2xl font-semibold">Ostadar taldea</h1>
        </div>
        <ThemeToggle />
      </header>

      <TabNav />

      <main className="mt-6">{children}</main>
    </div>
  );
}
