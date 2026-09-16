export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-center text-xs uppercase tracking-wide text-neutral-500">
          Fantasy
        </p>
        <h1 className="mb-6 text-center text-xl font-semibold">
          Campeonatos de Gipuzkoa
        </h1>
        {children}
      </div>
    </div>
  );
}
