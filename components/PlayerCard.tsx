import type { PlantillaSlot } from "@/lib/types";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const puntoColor: Record<string, string> = {
  victoria: "bg-positive",
  tablas: "bg-neutral-400",
  derrota: "bg-negative",
};

export default function PlayerCard({ jugador, puntosJornada, valorMercadoDelta, resultadosRecientes }: PlantillaSlot) {
  const deltaColor =
    valorMercadoDelta > 0
      ? "text-positive"
      : valorMercadoDelta < 0
        ? "text-negative"
        : "text-neutral-500";

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800">
          {iniciales(jugador.nombre)}
        </div>
        <div className="flex-1">
          <p className="font-medium">{jugador.nombre}</p>
          <p className="text-sm text-neutral-500">
            {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex gap-1">
          {resultadosRecientes.map((r, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${puntoColor[r]}`} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span>{puntosJornada} pts</span>
          <span className="font-medium">{jugador.valorMercado} M</span>
          <span className={deltaColor}>
            {valorMercadoDelta > 0 ? `+${valorMercadoDelta}` : valorMercadoDelta}
          </span>
        </div>
      </div>

      <button className="mt-3 w-full rounded-lg border border-neutral-300 py-2 text-sm dark:border-neutral-700">
        Vender
      </button>
    </div>
  );
}
