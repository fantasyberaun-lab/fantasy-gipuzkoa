import { mockClasificacion } from "@/lib/mockData";

export default function ClasificacionPage() {
  // TODO: sustituir mockClasificacion por la vista/consulta real
  // (suma de puntos por equipo y jornada).
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clasificación general</h2>
        <span className="text-sm text-neutral-500">Jornada 9</span>
      </div>

      <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {mockClasificacion.map((entry) => (
          <li
            key={entry.posicion}
            className={`flex items-center justify-between py-3 ${
              entry.esMiEquipo ? "rounded-lg bg-accent/10 px-3" : ""
            }`}
          >
            <span>
              {entry.posicion}. {entry.nombreEquipo}
            </span>
            <span className="font-medium">
              {entry.puntos} pts <span className="text-neutral-500">este año</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
