"use client";

import { useEffect, useRef, useState } from "react";

interface Opcion {
  id: string;
  etiqueta: string;
}

// Combobox sencillo: un input de texto que filtra una lista de opciones
// mientras escribes, en vez de un <select> largo donde solo puedes saltar
// por la primera letra. Pensado para listas de ~100-300 elementos (no
// para miles: no hay virtualización, solo se recorta a MAX_VISIBLE).
const MAX_VISIBLE = 30;

export default function BuscadorSelect({
  opciones,
  valor,
  onSeleccionar,
  placeholder = "Buscar…",
}: {
  opciones: Opcion[];
  valor: string;
  onSeleccionar: (id: string) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const seleccionada = opciones.find((o) => o.id === valor);

  useEffect(() => {
    function alClicarFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicarFuera);
    return () => document.removeEventListener("mousedown", alClicarFuera);
  }, []);

  const filtradas = texto.trim()
    ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(texto.trim().toLowerCase()))
    : opciones;

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={abierto ? texto : (seleccionada?.etiqueta ?? "")}
        onFocus={() => {
          setAbierto(true);
          setTexto("");
        }}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      {abierto && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {filtradas.length === 0 && (
            <p className="px-3 py-2 text-sm text-neutral-500">Sin resultados</p>
          )}
          {filtradas.slice(0, MAX_VISIBLE).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onSeleccionar(o.id);
                setTexto("");
                setAbierto(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {o.etiqueta}
            </button>
          ))}
          {filtradas.length > MAX_VISIBLE && (
            <p className="px-3 py-1.5 text-xs text-neutral-400">
              Y {filtradas.length - MAX_VISIBLE} más — sigue escribiendo para acotar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
