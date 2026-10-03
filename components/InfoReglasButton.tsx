"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gameConfig } from "@/lib/gameConfig";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="font-display text-base font-semibold">{titulo}</h3>
      <div className="mt-1.5 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
        {children}
      </div>
    </section>
  );
}

function Fila({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-neutral-200 py-1 last:border-0 dark:border-neutral-800">
      <span>{a}</span>
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{b}</span>
    </div>
  );
}

// Botón "i" de la cabecera + ventana con las reglas del juego.
export default function InfoReglasButton({ onDark = false }: { onDark?: boolean }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const estilo = onDark
    ? "border-white/25 text-white/80 hover:border-gold hover:text-gold"
    : "border-neutral-300 text-neutral-600 hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-300";

  const mult = gameConfig.capitan.multiplicador;
  const pctBlindaje = Math.round(gameConfig.blindaje.porcentaje * 100);
  const pctClausula = Math.round(gameConfig.clausula.porcentaje * 100);
  const multClausula = gameConfig.subidaClausula.multiplicador;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Cómo funciona el juego"
        title="Cómo funciona el juego"
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${estilo}`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Cómo funciona el juego"
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-2xl sm:pb-5"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">Cómo funciona el juego</h2>
                <button
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar"
                  className="-mr-1 -mt-1 rounded-full p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <Seccion titulo="Puntos">
                <p>
                  Cada jornada puntúan tus 6 titulares (los suplentes
                  no suman). Los puntos de cada partida dependen del resultado y de la
                  diferencia de Elo con el rival (Elo del rival − tu Elo):
                </p>
                <div className="rounded-lg bg-neutral-50 px-3 py-1 dark:bg-neutral-800/60">
                  <div className="flex justify-between gap-3 border-b border-neutral-200 py-1 text-xs text-neutral-500 dark:border-neutral-700">
                    <span>Diferencia de Elo</span>
                    <span>Victoria · Tablas · Derrota</span>
                  </div>
                  <Fila a="29 o menos (incluye rivales con menos Elo)" b="3 · 1 · 0" />
                  <Fila a="De 30 a 99" b="4 · 2 · 0" />
                  <Fila a="De 100 a 199" b="5 · 3 · 0" />
                  <Fila a="De 200 a 299" b="7 · 4 · 0" />
                  <Fila a="300 o más" b="9 · 5 · 0" />
                </div>
                <p>
                  <span className="font-medium">Bonus por victoria.</span> Según el torneo, ganar da
                  puntos extra: Tercera y Cadete, <span className="font-medium">+1</span>;
                  Segunda, Open de Gros y Superveteranos, <span className="font-medium">+2</span>;
                  Absoluto, <span className="font-medium">+3</span>. Solo se aplica a las victorias
                  (no a tablas ni derrotas). Los jugadores con 0 de Elo puntúan siempre 3 puntos por
                  victoria (más el bonus del torneo).
                </p>
                <p>
                  <span className="font-medium">Descanso.</span> Si tu jugador queda sin emparejar en
                  una jornada, suma {gameConfig.puntosPorDescanso} punto. Cuenta igual si tiene un
                  bye (no le toca rival) que si ha pedido que no le emparejen.
                </p>
                <p>
                  <span className="font-medium">Tu plantilla del fin de semana.</span> El sábado a las
                  16:00 se guardan tus titulares y tu capitán. Esa plantilla vale para todas las
                  rondas que se jueguen ese fin de semana, en cualquier torneo (aunque un torneo vaya
                  por la ronda 1 y otro por la 2). Cuando acaba el fin de semana, tus puntos son la
                  suma de lo que ha hecho cada titular.
                </p>
                <p>
                  <span className="font-medium">Un jugador, un torneo.</span> Si un titular tuyo juega
                  en más de un torneo el mismo fin de semana, solo te puntúa en el torneo donde más
                  puntos haya hecho; en el otro suma 0. Por ejemplo: si saca 5 puntos en Segunda y 3 en
                  el Open de Gros, te suma 5.
                </p>
                <p>
                  Límite de titulares: como máximo {gameConfig.plantilla.maximoTitularesPorTorneo} de tus
                  titulares pueden estar inscritos en el mismo torneo. En Plantilla ves cuántos llevas
                  por torneo. Con el saldo en negativo no puntúas.
                </p>
                <p>
                  <span className="font-medium">Titular automático.</span> Si tienes menos de{" "}
                  {gameConfig.plantilla.maximoTitulares} titulares, los jugadores que fiches entran
                  de titular directamente (si no se supera el límite por torneo). Puedes pasarlos a
                  suplente cuando quieras.
                </p>
              </Seccion>

              <Seccion titulo="Mercado y pujas (ligas privadas)">
                <p>
                  El mercado se renueva a las 8:00, 17:00 y 23:00 (hora de España); el contador de la pantalla Mercado te dice
                  cuánto falta. Al resolverse, el jugador es para quien haya hecho la puja más alta,
                  que paga lo que pujó. Si hay empate, gana quien pujó antes.
                </p>
                <p>
                  <span className="font-medium">Pujas ocultas.</span> Durante las 2 últimas horas
                  antes de que se actualice el mercado dejan de verse las pujas de los demás: solo ves
                  cuánta gente ha pujado por cada jugador, no el precio ni quién. Tu propia puja sí la ves.
                  En el Mercado hay un contador que te dice cuánto falta para que se oculten.
                </p>
              </Seccion>

              <Seccion titulo="Capitán">
                <p>
                  Elige a uno de tus titulares como capitán: todo lo que consiga esa jornada
                  (puntos de la partida, bonus por victoria o punto de descanso) se multiplica por{" "}
                  <span className="font-medium">{mult}</span>.
                </p>
                <p>
                  Solo puede haber un capitán por equipo y tiene que ser titular: si lo pasas a
                  suplente o lo vendes, pierde la capitanía.
                </p>
              </Seccion>

              <Seccion titulo="Clausulazos (ligas privadas)">
                <p>
                  Cada jugador tiene una cláusula: el {pctClausula} % de su valor de mercado,
                  redondeada al millón superior. Si la pagas, el jugador pasa a tu plantilla sin
                  que el dueño pueda negarse (siempre que tengas saldo suficiente).
                </p>
                <p>
                  <span className="font-medium">Subir la cláusula.</span> Puedes pagar una cantidad
                  por uno de tus jugadores para protegerlo: cada M que pagas sube su cláusula{" "}
                  {multClausula} M. Ese extra se pierde si el jugador sale de tu plantilla.
                </p>
                <p>
                  <span className="font-medium">Candado.</span> Un jugador recién fichado (por puja o
                  por clausulazo) no se puede clausular hasta que empiece la siguiente jornada.
                </p>
                <p>
                  <span className="font-medium">Cierre de clausulazos.</span> No se pueden hacer
                  desde el viernes a las 16:00 hasta el sábado a las 18:00 (hora de España). Si lo
                  intentas en ese tramo, la app te avisa y no se paga nada.
                </p>
                <p>En la liga pública no hay clausulazos: fichas y vendes al instante en el Mercado.</p>
              </Seccion>

              <Seccion titulo="Blindaje (ligas privadas)">
                <p>
                  Blindar a un jugador impide que le hagan un clausulazo hasta que empiece la
                  siguiente jornada. Cuesta el {pctBlindaje} % de su valor de mercado, redondeado al
                  millón superior.
                </p>
                <p>Solo puedes blindar a un jugador por jornada.</p>
              </Seccion>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
