"use client";

import { useEffect, useState } from "react";
import Segmentado from "@/components/Segmentado";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_SUGERENCIA,
  TIPOS_SUGERENCIA,
  enviarSugerenciaDB,
  type TipoSugerencia,
} from "@/lib/supabase/sugerenciasQueries";

const INPUT =
  "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const BOTON =
  "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50";

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

function fecha(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { dateStyle: "medium" });
}

// Formulario para mandar una sugerencia a los admins + historial con el check
// de leída. Vive en el menú de ajustes (MenuAjustes, "Enviar sugerencia").
export default function BuzonSugerencias() {
  const supabase = createClient();
  const { t: textos, locale } = useIdioma();
  const t = textos.sugerencias;
  const { sugerencias, recargarSugerencias } = useGameState();

  const [tipo, setTipo] = useState<TipoSugerencia>("sugerencia");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  // Al abrir el apartado, por si un admin la ha leído hace un momento.
  useEffect(() => {
    recargarSugerencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const limpio = texto.trim();
    if (!limpio) {
      setAviso({ tipo: "error", texto: t.errores.vacia });
      return;
    }

    setEnviando(true);
    const r = await enviarSugerenciaDB(supabase, tipo, limpio);
    setEnviando(false);

    if (!r.ok) {
      setAviso({ tipo: "error", texto: t.errores[r.codigo] });
      return;
    }
    setTexto("");
    setAviso({ tipo: "ok", texto: t.enviada });
    await recargarSugerencias();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{t.intro}</p>

        <div>
          <span className="text-xs font-medium text-neutral-500">{t.tipo}</span>
          <div className="mt-1">
            <Segmentado
              etiqueta={t.tipo}
              valor={tipo}
              onCambiar={setTipo}
              opciones={TIPOS_SUGERENCIA.map((v) => ({ valor: v, texto: t.tipos[v] }))}
            />
          </div>
        </div>

        <label className="flex flex-col">
          <span className="text-xs font-medium text-neutral-500">{t.mensaje}</span>
          <textarea
            value={texto}
            maxLength={MAX_SUGERENCIA}
            rows={5}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t.placeholder[tipo]}
            className={`${INPUT} resize-y`}
          />
          <span className="mt-1 flex justify-between gap-3 text-xs text-neutral-500">
            <span>{t.sinDatosPersonales}</span>
            <span className="shrink-0 tabular-nums">
              {t.caracteres(texto.length, MAX_SUGERENCIA)}
            </span>
          </span>
        </label>

        {aviso && (
          <p
            role="status"
            className={`text-sm ${
              aviso.tipo === "ok" ? "text-green-600 dark:text-green-400" : "text-negative"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        <div>
          <button type="submit" disabled={enviando || !texto.trim()} className={BOTON}>
            {enviando ? t.enviando : t.enviar}
          </button>
        </div>
      </form>

      <section className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t.historial}
        </h3>
        {sugerencias.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.sinHistorial}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sugerencias.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-neutral-500">
                    {t.tipos[s.tipo]} · {fecha(s.creada, locale)}
                  </span>
                  {s.leidaEn ? (
                    <span
                      title={t.leidaEl(fecha(s.leidaEn, locale))}
                      className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {t.leida}
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {t.pendiente}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-sm">{s.texto}</p>
                {s.respuesta && (
                  <p className="mt-2 rounded-lg bg-accent/10 px-2.5 py-2 text-sm">
                    <span className="font-semibold">{t.respuesta}</span>{" "}
                    <span className="whitespace-pre-line">{s.respuesta}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
