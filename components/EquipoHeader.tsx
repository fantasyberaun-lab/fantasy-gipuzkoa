"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGameState } from "@/components/GameStateProvider";
import CambiarLigaModal from "@/components/CambiarLigaModal";
import SaldoConPujas from "@/components/SaldoConPujas";
import MenuAjustes from "@/components/MenuAjustes";
import InstallPwaButton from "@/components/InstallPwaButton";
import InfoReglasButton from "@/components/InfoReglasButton";
import AvatarPerfil from "@/components/AvatarPerfil";
import { useT } from "@/components/IdiomaProvider";

// Contenido de la cabecera morada: escudo, nombre del equipo, liga y saldo.
export default function EquipoHeader() {
  const { equipo, cargando, misLigas, comprometidoEnPujas, esRoot, avatar } = useGameState();
  // Avatares en prueba: solo root, y solo si ha elegido uno (ver 0077).
  const conAvatar = !cargando && esRoot && avatar !== null;
  const t = useT();
  const ligaActiva = misLigas.find((l) => l.ligaId === equipo.leagueId);

  return (
    <div className="flex flex-col gap-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/icon-192.png"
            alt={t.ajustes.escudoAlt}
            width={36}
            height={36}
            className="rounded-full"
            priority
          />
          <span className="hidden text-sm font-medium text-white/70 sm:inline">
            Beraun Fantasy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <InstallPwaButton onDark />
          <InfoReglasButton onDark />
          <MenuAjustes />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {conAvatar && (
            <AvatarPerfil
              avatar={avatar}
              nombre={equipo.nombreEquipo}
              tamano={64}
              ampliable
              className="ring-1 ring-white/25"
            />
          )}
          <div className="min-w-0">
            <h1 className="break-words font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {cargando ? t.comun.cargando : equipo.nombreEquipo}
            </h1>
            {!cargando && ligaActiva && (
              <p className="mt-0.5 truncate text-sm text-white/70">
                {ligaActiva.nombre}
                {ligaActiva.tipo === "publica" ? t.ajustes.todosContraTodos : ""}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
          <p className="text-xs font-medium text-white/70">{t.ajustes.saldo}</p>
          <p className="font-display text-2xl font-semibold leading-tight text-gold [&_span]:text-red-300">
            {cargando ? (
              "…"
            ) : (
              <SaldoConPujas saldo={equipo.saldo} comprometido={comprometidoEnPujas} />
            )}
          </p>
          {!cargando && equipo.saldo < 0 && (
            <p
              role="status"
              title={t.ajustes.saldoNegativoTitle}
              className="mt-1 flex max-w-[11.5rem] items-start gap-1 text-[10.5px] leading-snug text-red-200/90"
            >
              <svg
                className="mt-[1px] h-3 w-3 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 2 1 18h18L10 2Zm-1 6h2v5H9V8Zm0 6h2v2H9v-2Z" />
              </svg>
              <span>{t.ajustes.saldoNegativo}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Icono de trazo (heroicons) para las tarjetas de acciones.
function Icono({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const D_USUARIO =
  "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z";
const D_CAMBIAR = "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5";
const D_FLECHA = "M8.25 4.5l7.5 7.5-7.5 7.5";

// Mismo estilo que las filas del menú de ajustes (MenuAjustes).
const TARJETA =
  "group flex min-w-0 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-accent dark:hover:bg-neutral-800 sm:gap-3";

function ContenidoTarjeta({
  icono,
  titulo,
  detalle,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <>
      {icono}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100 sm:text-[15px]">
          {titulo}
        </span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500">{detalle}</span>
      </span>
      <Icono
        d={D_FLECHA}
        className="hidden h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-accent sm:block"
      />
    </>
  );
}

// Fila de acciones justo debajo de la cabecera: dos tarjetas, "Mi perfil" y
// "Cambiar o crear liga". Lo de la cuenta (cerrar sesión, eliminarla,
// admin...) está en el menú de ajustes (MenuAjustes).
export function EquipoAcciones() {
  const { equipo, cargando, esRoot, avatar } = useGameState();
  const t = useT();
  const [mostrarModalLiga, setMostrarModalLiga] = useState(false);
  // Avatares en prueba: solo root, y solo si ha elegido uno (ver 0077).
  const conAvatar = !cargando && esRoot && avatar !== null;
  const circulo =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white";

  return (
    <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3">
      {!cargando && equipo.id ? (
        <Link href={`/managers/${equipo.id}`} className={TARJETA}>
          <ContenidoTarjeta
            icono={
              conAvatar ? (
                <AvatarPerfil avatar={avatar} nombre={equipo.nombreEquipo} tamano={36} />
              ) : (
                <span className={circulo}>
                  <Icono d={D_USUARIO} />
                </span>
              )
            }
            titulo={t.ajustes.miPerfil}
            detalle={t.ajustes.miPerfilDetalle}
          />
        </Link>
      ) : (
        // Hueco del mismo tamaño mientras carga, para que no salte la fila.
        <div className={`${TARJETA} opacity-50`} aria-hidden="true">
          <ContenidoTarjeta
            icono={
              <span className={circulo}>
                <Icono d={D_USUARIO} />
              </span>
            }
            titulo={t.ajustes.miPerfil}
            detalle={t.ajustes.miPerfilDetalle}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setMostrarModalLiga(true)}
        disabled={cargando}
        className={TARJETA}
      >
        <ContenidoTarjeta
          icono={
            <span className={circulo}>
              <Icono d={D_CAMBIAR} />
            </span>
          }
          titulo={t.ajustes.cambiarLigaCorto}
          detalle={t.ajustes.cambiarLigaDetalle}
        />
      </button>

      {mostrarModalLiga && (
        <CambiarLigaModal onCerrar={() => setMostrarModalLiga(false)} />
      )}
    </div>
  );
}
