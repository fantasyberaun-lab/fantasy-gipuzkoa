"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// Campo de contraseña con botón de ojo para mostrarla/ocultarla.
export default function PasswordInput({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-lg border border-neutral-300 py-2 pl-3 pr-10 text-sm dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
