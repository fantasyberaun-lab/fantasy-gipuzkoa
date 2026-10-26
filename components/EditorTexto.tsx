"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma } from "@/components/IdiomaProvider";
import AvatarPerfil from "@/components/AvatarPerfil";
import InsigniaNivel from "@/components/InsigniaNivel";
import { buscarManagersChat, type ManagerMencionable } from "@/lib/supabase/chatQueries";

const EMOJIS = [
  "😀", "😂", "😅", "🙂", "😉", "😍", "🤔", "😮", "😢", "😡", "😎", "🥲",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👀", "🤞", "🎉", "🔥", "🏆", "❤️",
  "♟️", "♞", "♝", "♜", "♛", "♚", "⏱️", "💀",
];

const D_EMOJI =
  "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z";

// Caja de texto con selector de @ (a quién mencionar) y emojis. Es la misma mecánica del
// chat: el texto lleva "@Alias" y los ids de los mencionados viajan aparte (los alias
// pueden llevar espacios). El padre guarda `menciones` (id -> alias) y decide cuándo enviar.
export default function EditorTexto({
  ligaId,
  esPublica,
  valor,
  onCambiar,
  menciones,
  onMenciones,
  max,
  placeholder,
  filas = 1,
  alturaMaxima = 96,
  onEnviar,
  acciones,
  areaRef,
  autoFocus = false,
}: {
  ligaId: string;
  esPublica: boolean;
  valor: string;
  onCambiar: (texto: string) => void;
  menciones: Record<string, string>;
  onMenciones: (m: Record<string, string>) => void;
  max: number;
  placeholder: string;
  filas?: number;
  alturaMaxima?: number;
  // Si se pasa, Enter envía (Mayús+Enter salta de línea). Si no, Enter salta de línea.
  onEnviar?: () => void;
  acciones?: ReactNode;
  areaRef?: RefObject<HTMLTextAreaElement>;
  autoFocus?: boolean;
}) {
  const tf = useIdioma().t.foros;
  const supabase = useRef(createClient()).current;
  const propia = useRef<HTMLTextAreaElement>(null);
  const area = areaRef ?? propia;
  const [emojis, setEmojis] = useState(false);
  const [consulta, setConsulta] = useState<{ inicio: number; texto: string } | null>(null);
  const [candidatos, setCandidatos] = useState<ManagerMencionable[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!consulta || !ligaId) {
      setCandidatos([]);
      setBuscando(false);
      return;
    }
    // En la pública hace falta al menos una letra (no se lista a toda la liga).
    if (esPublica && consulta.texto.length === 0) {
      setCandidatos([]);
      setBuscando(false);
      return;
    }
    let vigente = true;
    setBuscando(true);
    const espera = window.setTimeout(async () => {
      const r = await buscarManagersChat(supabase, ligaId, consulta.texto);
      if (!vigente) return;
      setCandidatos(r);
      setIndice(0);
      setBuscando(false);
    }, 150);
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [consulta, ligaId, esPublica, supabase]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, alturaMaxima)}px`;
  }, [valor, area, alturaMaxima]);

  function detectar(texto: string, cursor: number) {
    const m = /(?:^|\s)@([^\s@]{0,24})$/.exec(texto.slice(0, cursor));
    setConsulta(m ? { inicio: cursor - m[1].length - 1, texto: m[1] } : null);
  }

  function elegir(c: ManagerMencionable) {
    const el = area.current;
    if (!consulta || !el) return;
    const cursor = el.selectionStart ?? valor.length;
    const nuevo = `${valor.slice(0, consulta.inicio)}@${c.nombre} ${valor.slice(cursor)}`;
    const posicion = consulta.inicio + c.nombre.length + 2;
    onCambiar(nuevo);
    onMenciones({ ...menciones, [c.userId]: c.nombre });
    setConsulta(null);
    setCandidatos([]);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(posicion, posicion);
    });
  }

  function insertarEmoji(e: string) {
    const el = area.current;
    const ini = el?.selectionStart ?? valor.length;
    const fin = el?.selectionEnd ?? valor.length;
    const nuevo = valor.slice(0, ini) + e + valor.slice(fin);
    if (nuevo.length > max) return;
    onCambiar(nuevo);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(ini + e.length, ini + e.length);
    });
  }

  function alTeclear(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (candidatos.length > 0 && consulta) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndice((i) => (i + 1) % candidatos.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndice((i) => (i - 1 + candidatos.length) % candidatos.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        elegir(candidatos[indice]);
        return;
      }
    }
    if (e.key === "Escape") {
      setConsulta(null);
      setEmojis(false);
      return;
    }
    if (onEnviar && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onEnviar();
    }
  }

  return (
    <div className="relative">
      {consulta && (buscando || candidatos.length > 0 || consulta.texto.length > 0) && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-30 mb-2 w-64 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {candidatos.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-500">
              {buscando ? tf.mencionBuscando : tf.mencionSinResultados}
            </p>
          ) : (
            candidatos.map((c, i) => (
              <button
                key={c.userId}
                type="button"
                role="option"
                aria-selected={i === indice}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(c);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                  i === indice ? "bg-brand-50 dark:bg-neutral-800" : ""
                }`}
              >
                <AvatarPerfil avatar={c.avatar} nombre={c.nombre} tamano={24} />
                <span className="min-w-0 flex-1 truncate font-medium">{c.nombre}</span>
                <InsigniaNivel nivel={c.nivel} className="!px-1.5 !text-[9px]" />
              </button>
            ))
          )}
        </div>
      )}

      {emojis && (
        <div className="mb-2 grid grid-cols-8 gap-0.5 rounded-xl border border-neutral-200 p-1.5 dark:border-neutral-700 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => insertarEmoji(e)}
              className="flex h-8 items-center justify-center rounded-lg text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setEmojis((v) => !v)}
          aria-label={tf.emojis}
          aria-pressed={emojis}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            emojis
              ? "bg-accent/15 text-accent"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-accent dark:hover:bg-neutral-800"
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={D_EMOJI} />
          </svg>
        </button>
        <textarea
          ref={area}
          value={valor}
          rows={filas}
          maxLength={max}
          autoFocus={autoFocus}
          enterKeyHint={onEnviar ? "send" : "enter"}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => {
            onCambiar(e.target.value);
            detectar(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onClick={(e) => detectar(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
          onKeyDown={alTeclear}
          onBlur={() => window.setTimeout(() => setConsulta(null), 150)}
          className="min-h-[2.5rem] min-w-0 flex-1 resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-snug dark:border-neutral-700 dark:bg-neutral-950"
          style={{ maxHeight: alturaMaxima }}
        />
        {acciones}
      </div>
    </div>
  );
}
