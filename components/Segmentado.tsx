"use client";

// Grupo de botones excluyentes, uno activo (tema, idioma en MenuAjustes).
export default function Segmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="grid gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambiar(o.valor)}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              activo
                ? "bg-accent text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
