import Link from "next/link";

export default function EnlacesLegales({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Información legal"
      className={`flex items-center justify-center gap-4 text-xs text-neutral-500 ${className}`}
    >
      <Link href="/privacidad" className="underline-offset-2 hover:underline">
        Política de privacidad
      </Link>
      <Link href="/condiciones" className="underline-offset-2 hover:underline">
        Condiciones de uso
      </Link>
    </nav>
  );
}
