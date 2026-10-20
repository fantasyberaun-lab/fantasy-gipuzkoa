"use client";

import { useT } from "@/components/IdiomaProvider";
import type { Ronda } from "./usePartida";

// Repaso de una partida terminada: cada ronda con lo que se preguntaba, lo que
// respondiste, la solución y los puntos. Todo sale de lo que ya devolvió el servidor.
export default function RepasoPartida({ rondas }: { rondas: Ronda[] }) {
  const t = useT().minijuegos;
  return (
    <section aria-label={t.repasoTitulo} className="space-y-2">
      <h4 className="font-display text-lg font-semibold">{t.repasoTitulo}</h4>
      <ol className="space-y-2">
        {rondas.map((r, i) => (
          <li
            key={i}
            className={`rounded-xl border px-3 py-2.5 text-sm ${
              r.resultado.correcta ? "border-positive/50" : "border-negative/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span>
                <span aria-hidden="true">{r.resultado.correcta ? "✓" : "✗"}</span>{" "}
                {t.repasoRonda(i + 1)}
              </span>
              <span className={r.resultado.correcta ? "text-positive" : "text-negative"}>
                {t.puntos(r.resultado.puntosRonda)}
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              <Detalle ronda={r} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Detalle({ ronda }: { ronda: Ronda }) {
  const t = useT().minijuegos;
  const q = ronda.pregunta;
  const v = ronda.resultado.revelado;
  const ok = ronda.resultado.correcta;
  const pts = ronda.resultado.puntosRonda;
  const L = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;

  switch (q.tipo) {
    case "hol": {
      const eligio = ronda.enviada.dir === "mas" ? t.holMas : t.holMenos;
      return (
        <>
          <L>
            {q.actual.nombre} ({q.actual.elo}) → {q.siguiente.nombre} ({v.elo})
          </L>
          <L>{t.repasoTu(eligio)}</L>
        </>
      );
    }
    case "elo": {
      const real = v.elo === 0 ? t.eloSinElo : String(v.elo ?? "");
      const tu = v.respuesta == null ? t.eloSinRespuesta : v.respuesta === 0 ? t.eloSinElo : String(v.respuesta);
      return <L>{t.eloUltimo(v.nombre ?? q.nombre, real, tu, pts)}</L>;
    }
    case "orden": {
      const real = (v.jugadores ?? []).map((j) => `${j.nombre} (${j.elo})`).join(" < ");
      const tuyo = (v.orden ?? []).map((idx) => q.jugadores[idx]).join(" < ");
      return (
        <>
          <L>{t.ordenUltimo(real, pts)}</L>
          <L>{t.repasoTu(tuyo || t.eloSinRespuesta)}</L>
        </>
      );
    }
    case "adivina": {
      const tu = v.elegida == null ? t.eloSinRespuesta : q.opciones[v.elegida];
      return (
        <>
          <L>
            {t.eloEtiqueta} {q.pista.elo > 0 ? q.pista.elo : "—"} · {q.pista.club ?? t.fichaSinClub}
            {q.pista.categoria ? ` · ${t.categoriaEtiqueta} ${q.pista.categoria}` : ""}
            {q.pista.valor != null ? ` · ${q.pista.valor} M` : ""}
          </L>
          <L>{t.opcionUltimo(ok, v.nombre ?? "", pts)}</L>
          {!ok && <L>{t.repasoTu(tu)}</L>}
        </>
      );
    }
    case "acierta": {
      const tu = v.elegida == null ? t.eloSinRespuesta : q.opciones[v.elegida];
      return (
        <>
          <L>«{q.descripcion}»</L>
          <L>{t.opcionUltimo(ok, v.nombre ?? "", pts)}</L>
          {!ok && <L>{t.repasoTu(tu)}</L>}
        </>
      );
    }
    case "precio": {
      const detalle = (v.jugadores ?? []).map((j) => `${j.nombre} ${j.valor} M`).join(" + ");
      return <L>{t.precioUltimo(detalle, v.total ?? 0, v.respuesta ?? null, pts)}</L>;
    }
    case "impostor": {
      const regla =
        v.regla === "club"
          ? t.impostorReglaClub(v.clave ?? "")
          : v.regla === "categoria"
            ? t.impostorReglaCategoria(v.clave ?? "")
            : t.impostorReglaElo;
      const tu = v.elegida == null ? t.eloSinRespuesta : q.jugadores[v.elegida]?.nombre;
      return (
        <>
          <L>{q.jugadores.map((j) => j.nombre).join(" · ")}</L>
          <L>{t.impostorUltimo(v.nombre ?? "", regla, pts)}</L>
          {!ok && <L>{t.repasoTu(tu ?? t.eloSinRespuesta)}</L>}
        </>
      );
    }
    case "parejas": {
      const nombres = (v.cartas ?? []).map((c) => c.nombre);
      const sol = (v.soluciones ?? [])
        .map((s) => `${nombres[s.a]} + ${nombres[s.b]} (${t.parejasRelacion[s.regla]})`)
        .join(" · ");
      const tuyas = (v.enviadas ?? []).map(([a, b]) => `${nombres[a]} + ${nombres[b]}`).join(" · ");
      return (
        <>
          <L>{t.parejasUltimo(v.validas ?? 0, pts)}</L>
          <L>{t.repasoTu(tuyas || t.eloSinRespuesta)}</L>
          {!ok && <L>{t.parejasSolucion(sol)}</L>}
        </>
      );
    }
  }
}
