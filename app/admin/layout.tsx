import Link from "next/link";
import AdminNav from "@/components/AdminNav";

// Nota: este layout NO reutiliza app/(dashboard)/layout.tsx a propósito
// — el panel de admin es una zona aparte, sin las pestañas de manager ni
// el GameStateProvider (que carga equipo/plantilla, algo que aquí no
// hace falta). El middleware (lib/supabase/middleware.ts) ya bloquea
// /admin a quien no tenga rol "root" en profiles, así que llegar hasta
// aquí ya implica que la sesión es válida y es root.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Panel de administración
          </p>
          <h1 className="text-2xl font-semibold">Administración</h1>
        </div>
        <Link
          href="/plantilla"
          className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
        >
          ← Volver a la app
        </Link>
      </header>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
