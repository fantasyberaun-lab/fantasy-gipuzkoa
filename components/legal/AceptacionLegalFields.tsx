"use client";

import Link from "next/link";
import { useT } from "@/components/IdiomaProvider";

export interface AceptacionLegal {
  condiciones: boolean;
  privacidad: boolean;
  mayor14: boolean;
  comunicaciones: boolean;
}

export const ACEPTACION_INICIAL: AceptacionLegal = {
  condiciones: false,
  privacidad: false,
  mayor14: false,
  comunicaciones: false,
};

// La casilla de comunicaciones es opcional: no cuenta.
export const aceptacionCompleta = (a: AceptacionLegal) =>
  a.condiciones && a.privacidad && a.mayor14;

const enlace = "text-accent underline underline-offset-2";

function Casilla({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span>{children}</span>
    </label>
  );
}

// Las cuatro casillas del apartado 10 de la Política de Privacidad, siempre
// desmarcadas al principio.
export default function AceptacionLegalFields({
  valor,
  onChange,
  disabled,
}: {
  valor: AceptacionLegal;
  onChange: (v: AceptacionLegal) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const set = (campo: keyof AceptacionLegal) => (v: boolean) =>
    onChange({ ...valor, [campo]: v });

  return (
    <div className="flex flex-col gap-3">
      <Casilla checked={valor.condiciones} onChange={set("condiciones")} disabled={disabled}>
        {t.legal.condicionesAntes}
        <Link href="/condiciones" target="_blank" rel="noopener noreferrer" className={enlace}>
          {t.legal.condicionesEnlace}
        </Link>
        {t.legal.condicionesDespues}
      </Casilla>

      <Casilla checked={valor.privacidad} onChange={set("privacidad")} disabled={disabled}>
        {t.legal.privacidadAntes}
        <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className={enlace}>
          {t.legal.privacidadEnlace}
        </Link>
        {t.legal.privacidadDespues}
      </Casilla>

      <Casilla checked={valor.mayor14} onChange={set("mayor14")} disabled={disabled}>
        {t.legal.mayor14}
      </Casilla>

      <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Casilla
          checked={valor.comunicaciones}
          onChange={set("comunicaciones")}
          disabled={disabled}
        >
          <span className="text-neutral-600 dark:text-neutral-400">
            {t.legal.comunicaciones}
          </span>
        </Casilla>
      </div>
    </div>
  );
}
