import Image from "next/image";
import EnlacesLegales from "@/components/legal/EnlacesLegales";
import { getT } from "@/lib/i18n/server";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = getT();
  return (
    <div className="flex min-h-screen flex-col">
      <div className="banner-tablero px-4 pb-16 pt-[calc(env(safe-area-inset-top)+2.5rem)] text-center text-white">
        <Image
          src="/icons/icon-192.png"
          alt={t.auth.altEscudo}
          width={72}
          height={72}
          className="mx-auto mb-3 rounded-full"
          priority
        />
        <h1 className="font-display text-3xl font-semibold">
          Beraun Fantasy
        </h1>
        <p className="mt-1 text-sm text-white/70">{t.auth.subtituloCabecera}</p>
      </div>

      {/* El formulario ya trae borde y esquinas redondeadas; aquí solo se
          le añade sombra. "relative z-10" hace que quede POR ENCIMA de la
          cabecera (que es relative) y no se le corte el borde de arriba. */}
      <div className="relative z-10 -mt-10 flex-1 px-4 pb-10">
        <div className="mx-auto w-full max-w-sm [&_form]:shadow-xl [&_form]:shadow-black/10">
          {children}
        </div>
        <EnlacesLegales className="mt-6" />
      </div>
    </div>
  );
}
