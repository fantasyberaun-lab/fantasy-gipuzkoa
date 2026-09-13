import { mockMercado } from "@/lib/mockData";

export default function MercadoPage() {
  // TODO: sustituir mockMercado por la consulta real (tabla market_listings
  // + bids), y conectar el botón "Fichar" con la mutación correspondiente.
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mercado</h2>
        <span className="text-sm text-neutral-500">
          nueva tanda en 4h 20m {/* TODO: countdown real a partir de matchdays.mercado_cierra */}
        </span>
      </div>

      {mockMercado.map(({ jugador, rival, numeroPujas }) => (
        <div
          key={jugador.id}
          className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div>
            <p className="font-medium">{jugador.nombre}</p>
            <p className="text-sm text-neutral-500">
              {jugador.categoria}ª cat. · Elo {jugador.elo}
              {rival ? ` · Rival: ${rival.nombre} (${rival.elo})` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-semibold">{jugador.valorMercado} M</p>
              <p className="text-neutral-500">{numeroPujas} pujas</p>
            </div>
            <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
              Fichar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
