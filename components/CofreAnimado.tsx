"use client";

import { useId, type CSSProperties } from "react";

// Cofre dibujado en SVG y animado con CSS (las animaciones están en
// globals.css, bloque "Cofre animado"). Dibujo propio: sin librerías ni imágenes.
//   cerrado  → se menea de vez en cuando
//   abriendo → tiembla (esperando la respuesta del servidor)
//   abierto  → salta la tapa, rayos de luz, monedas y destellos
//   vacio    → ya abierto, tapa levantada y sin brillo (cofres ya reclamados)
export type EstadoCofre = "cerrado" | "abriendo" | "abierto" | "vacio";

// Trayectoria de cada moneda al salir: desplazamiento final y retardo (s).
const MONEDAS = [
  { dx: -46, dy: -92, delay: 0 },
  { dx: -28, dy: -110, delay: 0.05 },
  { dx: -10, dy: -100, delay: 0.1 },
  { dx: 12, dy: -112, delay: 0.03 },
  { dx: 30, dy: -98, delay: 0.12 },
  { dx: 48, dy: -88, delay: 0.07 },
  { dx: -38, dy: -66, delay: 0.16 },
  { dx: 40, dy: -70, delay: 0.2 },
  { dx: 0, dy: -118, delay: 0.18 },
  { dx: -18, dy: -84, delay: 0.24 },
];

const ESTRELLAS = [
  { x: 24, y: 34, delay: 0.3 },
  { x: 136, y: 30, delay: 0.55 },
  { x: 112, y: 6, delay: 0.8 },
  { x: 44, y: 10, delay: 1.0 },
];

const ESTRELLA = "M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2Z";

export default function CofreAnimado({
  estado,
  tam,
  className = "",
}: {
  estado: EstadoCofre;
  tam?: number; // en píxeles; sin él, ocupa el ancho que le dé className
  className?: string;
}) {
  // useId devuelve ":r0:"; los dos puntos molestan dentro de url(#...).
  const id = useId().replace(/:/g, "");
  const madera = `${id}-madera`;
  const oro = `${id}-oro`;
  const rayo = `${id}-rayo`;
  const brillo = `${id}-brillo`;

  return (
    <svg
      className={`cofre ${className}`}
      data-estado={estado}
      width={tam}
      height={tam ? Math.round((tam * 150) / 160) : undefined}
      viewBox="0 0 160 150"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={madera} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a35a26" />
          <stop offset="1" stopColor="#5e2f10" />
        </linearGradient>
        <linearGradient id={oro} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe36b" />
          <stop offset="1" stopColor="#d9a400" />
        </linearGradient>
        <linearGradient id={rayo} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd426" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd426" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={brillo}>
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.6" stopColor="#ffd426" />
          <stop offset="1" stopColor="#ffd426" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="cofre-todo">
        {/* Rayos de luz detrás del cofre */}
        <g className="cofre-rayos">
          {Array.from({ length: 8 }).map((_, i) => (
            <path
              key={i}
              d="M80 74 L69 4 L91 4Z"
              fill={`url(#${rayo})`}
              transform={`rotate(${i * 45} 80 74)`}
            />
          ))}
        </g>

        {/* Cuerpo */}
        <rect x="22" y="72" width="116" height="60" rx="7" fill={`url(#${madera})`} />
        <path d="M22 92H138M22 112H138" stroke="#000" strokeOpacity="0.22" strokeWidth="1.5" />
        <rect x="38" y="72" width="12" height="60" fill={`url(#${oro})`} />
        <rect x="110" y="72" width="12" height="60" fill={`url(#${oro})`} />
        <rect x="18" y="124" width="124" height="10" rx="4" fill={`url(#${oro})`} />
        {/* Cerradura del cuerpo */}
        <rect x="70" y="84" width="20" height="22" rx="4" fill={`url(#${oro})`} stroke="#8a6a00" strokeWidth="1" />
        <circle cx="80" cy="93" r="3.2" fill="#3b2a00" />
        <rect x="78.8" y="94" width="2.4" height="7" rx="1" fill="#3b2a00" />

        {/* Boca del cofre y luz de dentro */}
        <ellipse cx="80" cy="73" rx="57" ry="7" fill="#2b1206" />
        <ellipse className="cofre-brillo" cx="80" cy="72" rx="52" ry="6" fill={`url(#${brillo})`} />

        {/* Monedas que salen */}
        {MONEDAS.map((m, i) => (
          <g
            key={i}
            className="cofre-moneda"
            style={
              {
                "--dx": `${m.dx}px`,
                "--dy": `${m.dy}px`,
                animationDelay: `${m.delay}s`,
              } as CSSProperties
            }
          >
            <circle cx="80" cy="72" r="7" fill={`url(#${oro})`} stroke="#a88300" strokeWidth="1" />
            <circle cx="80" cy="72" r="4" fill="none" stroke="#a88300" strokeWidth="1" />
          </g>
        ))}

        {/* Tapa */}
        <g className="cofre-tapa">
          <path d="M18 78 V52 Q18 24 80 24 Q142 24 142 52 V78 Z" fill={`url(#${madera})`} />
          <path d="M38 33 Q44 31 50 30 V78 H38Z" fill={`url(#${oro})`} />
          <path d="M110 30 Q116 31 122 33 V78 H110Z" fill={`url(#${oro})`} />
          <rect x="14" y="70" width="132" height="9" rx="3.5" fill={`url(#${oro})`} />
          <path
            d="M30 50 Q34 35 68 31"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.35"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Cierre de la tapa */}
          <rect x="74" y="64" width="12" height="15" rx="3" fill={`url(#${oro})`} stroke="#8a6a00" strokeWidth="1" />
        </g>

        {/* Destellos */}
        {ESTRELLAS.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y})`}>
            <path
              className="cofre-estrella"
              d={ESTRELLA}
              fill="#fff6c2"
              style={{ animationDelay: `${s.delay}s` }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
