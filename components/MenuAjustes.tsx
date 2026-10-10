"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import AjustesCuenta from "@/components/AjustesCuenta";
import { EliminarCuentaConfirmacion } from "@/components/EliminarCuentaButton";
import SelectorIdioma from "@/components/SelectorIdioma";
import Segmentado from "@/components/Segmentado";
import { useT } from "@/components/IdiomaProvider";
import { createClient } from "@/lib/supabase/client";
import { fetchPerfilManager } from "@/lib/supabase/queries";
import { RESPONSABLE } from "@/lib/legal/config";
import {
  aplicarTema,
  guardarPreferenciaTema,
  leerPreferenciaTema,
  sistemaEsOscuro,
  type PreferenciaTema,
} from "@/lib/tema";

type Vista = "inicio" | "cuenta" | "configuracion" | "legal" | "eliminar";

// Iconos de trazo 24x24, como los de la barra de pestañas.
const icono = (d: string, clase = "h-5 w-5") => (
  <svg
    className={clase}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const D_ENGRANAJE =
  "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z";
const D_USUARIO =
  "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z";
const D_AJUSTES =
  "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75";
const D_ESCUDO =
  "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z";
const D_LLAVE =
  "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z";
const D_SALIR =
  "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9";
const D_DOCUMENTO =
  "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z";
const D_SOBRE =
  "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75";
const D_FLECHA = "M8.25 4.5l7.5 7.5-7.5 7.5";

const FILA =
  "group flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-left transition-colors hover:border-accent hover:bg-brand-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-accent dark:hover:bg-neutral-800";

// Una "píldora" del menú: icono, texto y flecha. Si lleva href es un enlace.
function Fila({
  d,
  titulo,
  detalle,
  onClick,
  href,
  externo = false,
  flecha = true,
}: {
  d: string;
  titulo: string;
  detalle?: string;
  onClick?: () => void;
  href?: string;
  externo?: boolean;
  flecha?: boolean;
}) {
  const contenido = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icono(d)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight">{titulo}</span>
        {detalle && (
          <span className="mt-0.5 block truncate text-xs text-neutral-500">{detalle}</span>
        )}
      </span>
      {flecha &&
        icono(D_FLECHA, "h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-accent")}
    </>
  );

  if (href && externo) {
    return (
      <a href={href} className={FILA}>
        {contenido}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={FILA}>
        {contenido}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={FILA}>
      {contenido}
    </button>
  );
}

function Apartado({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function VistaCuenta({ equipoId }: { equipoId: string }) {
  const supabase = createClient();
  const t = useT();
  const [nombre, setNombre] = useState<string | null>(null);

  useEffect(() => {
    if (!equipoId) return;
    (async () => {
      const perfil = await fetchPerfilManager(supabase, equipoId);
      setNombre(perfil?.nombreManager ?? "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoId]);

  if (nombre === null) {
    return <p className="text-sm text-neutral-500">{t.comun.cargando}</p>;
  }
  return <AjustesCuenta sinMarco nombreActual={nombre} onNombreCambiado={setNombre} />;
}

function VistaConfiguracion({
  tema,
  onTema,
}: {
  tema: PreferenciaTema;
  onTema: (t: PreferenciaTema) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-6">
      <Apartado titulo={t.idioma.titulo}>
        <SelectorIdioma />
      </Apartado>

      <Apartado titulo={t.ajustes.tema}>
        <Segmentado
          etiqueta={t.ajustes.tema}
          valor={tema}
          onCambiar={onTema}
          opciones={[
            { valor: "claro", texto: t.ajustes.temaClaro },
            { valor: "oscuro", texto: t.ajustes.temaOscuro },
            { valor: "sistema", texto: t.ajustes.temaAuto },
          ]}
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          {t.ajustes.temaAutoAyuda}
        </p>
      </Apartado>
    </div>
  );
}

function VistaLegal({ onNavegar }: { onNavegar: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <Fila d={D_ESCUDO} titulo={t.ajustes.privacidad} href="/privacidad" onClick={onNavegar} />
      <Fila d={D_DOCUMENTO} titulo={t.ajustes.condiciones} href="/condiciones" onClick={onNavegar} />
      <Fila
        d={D_SOBRE}
        titulo={t.ajustes.contactar}
        detalle={RESPONSABLE.email}
        href={`mailto:${RESPONSABLE.email}?subject=${encodeURIComponent(RESPONSABLE.aplicacion)}`}
        externo
      />
      <p className="mt-3 text-center text-xs text-neutral-500">
        {RESPONSABLE.aplicacion} · {RESPONSABLE.nombreComercial}
      </p>
    </div>
  );
}

// Botón de engranaje de la cabecera + menú de ajustes: cuenta, idioma, tema,
// textos legales, cerrar sesión y eliminar cuenta. También aplica el tema
// guardado al cargar (antes lo hacía el botón de claro/oscuro de la cabecera).
export default function MenuAjustes() {
  const { equipo, esRoot } = useGameState();
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const TITULOS: Record<Vista, string> = t.ajustes.titulos;

  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("inicio");
  const [tema, setTema] = useState<PreferenciaTema>("sistema");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const preferencia = leerPreferenciaTema();
    setTema(preferencia);
    aplicarTema(preferencia);
  }, []);

  // En "Automático", si el dispositivo cambia de modo, la app lo sigue.
  useEffect(() => {
    if (tema !== "sistema") return;
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () =>
      document.documentElement.classList.toggle("dark", sistemaEsOscuro());
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, [tema]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        setVista("inicio");
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    setVista("inicio");
  }

  function cambiarTema(nuevo: PreferenciaTema) {
    setTema(nuevo);
    guardarPreferenciaTema(nuevo);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const menu = (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={cerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITULOS[vista]}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-board-light shadow-xl dark:bg-board-dark sm:rounded-2xl"
      >
        <div className="banner-tablero shrink-0 px-4 pb-3 pt-3 text-white">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30 sm:hidden" />
          <div className="flex items-center gap-2">
            {vista !== "inicio" && (
              <button
                type="button"
                onClick={() => setVista("inicio")}
                aria-label={t.comun.volver}
                className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-gold"
              >
                {icono("M15.75 19.5L8.25 12l7.5-7.5")}
              </button>
            )}
            <h2 className="flex-1 font-display text-xl font-semibold">{TITULOS[vista]}</h2>
            <button
              type="button"
              onClick={cerrar}
              aria-label={t.comun.cerrar}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-gold"
            >
              {icono("M6 18L18 6M6 6l12 12")}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
          {vista === "inicio" && (
            <div className="flex flex-col gap-2">
              <Fila
                d={D_USUARIO}
                titulo={t.ajustes.titulos.cuenta}
                detalle={t.ajustes.miCuentaDetalle}
                onClick={() => setVista("cuenta")}
              />
              <Fila
                d={D_AJUSTES}
                titulo={t.ajustes.titulos.configuracion}
                detalle={t.ajustes.configuracionDetalle}
                onClick={() => setVista("configuracion")}
              />
              <Fila
                d={D_ESCUDO}
                titulo={t.ajustes.titulos.legal}
                detalle={t.ajustes.legalDetalle}
                onClick={() => setVista("legal")}
              />
              {esRoot && (
                <Fila
                  d={D_LLAVE}
                  titulo={t.ajustes.panelAdmin}
                  href="/admin"
                  onClick={cerrar}
                />
              )}
              <Fila d={D_SALIR} titulo={t.ajustes.cerrarSesion} onClick={cerrarSesion} flecha={false} />

              <button
                type="button"
                onClick={() => setVista("eliminar")}
                className="mx-auto mt-3 text-xs text-negative underline underline-offset-2 hover:opacity-80"
              >
                {t.ajustes.eliminarCuenta}
              </button>
            </div>
          )}

          {vista === "cuenta" && <VistaCuenta equipoId={equipo.id} />}

          {vista === "configuracion" && <VistaConfiguracion tema={tema} onTema={cambiarTema} />}

          {vista === "legal" && <VistaLegal onNavegar={cerrar} />}

          {vista === "eliminar" && (
            <EliminarCuentaConfirmacion onCancelar={() => setVista("inicio")} />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={t.ajustes.boton}
        title={t.ajustes.boton}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-gold hover:text-gold"
      >
        {icono(D_ENGRANAJE)}
      </button>
      {/* En un portal: la cabecera (banner-tablero) crea su propio contexto
          de apilado y la barra inferior del móvil quedaría por encima. */}
      {montado && abierto && createPortal(menu, document.body)}
    </>
  );
}
