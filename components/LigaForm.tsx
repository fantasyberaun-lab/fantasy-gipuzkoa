"use client";

import { useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import CopiarCodigoButton from "@/components/CopiarCodigoButton";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { territorioPorCodigo, territoriosDeAmbito, type AmbitoTerritorio } from "@/lib/territorios";

type Modo = "elegir" | "crear" | "unirse" | "publica";

export default function LigaForm({
  onExito,
  onCancelar,
}: {
  onExito?: () => void;
  onCancelar?: () => void;
}) {
  const t = useT();
  const { idioma } = useIdioma();
  const { crearLiga, unirseLiga, unirseLigaPublica, misLigas, esRoot, equipo } = useGameState();
  // Root empieza en el territorio de la liga en la que está, para no crear en otro sin querer.
  const ligaActiva = misLigas.find((l) => l.ligaId === equipo.leagueId);
  const inicial = esRoot && ligaActiva ? territorioPorCodigo(ligaActiva.codigo) : undefined;

  const [modo, setModo] = useState<Modo>("elegir");
  const [ambito, setAmbito] = useState<AmbitoTerritorio>(inicial?.ambito ?? "provincia");
  const [territorioId, setTerritorioId] = useState(inicial?.id ?? "gipuzkoa");
  const territorios = territoriosDeAmbito(ambito);
  const territorio = territorios.find((x) => x.id === territorioId) ?? territorios[0];
  // Una liga pública por territorio: se oculta el botón si ya estás en la de este.
  const yaEnLigaPublica = misLigas.some((l) => l.tipo === "publica" && l.codigo === territorio.codigoLiga);
  const [nombreLiga, setNombreLiga] = useState("");
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null);

  async function handleCrear() {
    setEnviando(true);
    setError(null);
    // Fuera de Gipuzkoa solo root llega aquí: liga privada de prueba de ese territorio (0095).
    const resultado = await crearLiga(
      nombreLiga,
      nombreEquipo,
      territorio.funcional ? undefined : { ambito: territorio.ambito, region: territorio.region }
    );
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    if (resultado.codigo) setCodigoCreado(resultado.codigo);
  }

  async function handleUnirse() {
    setEnviando(true);
    setError(null);
    const resultado = await unirseLiga(codigo, nombreEquipo);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    onExito?.();
  }

  // Liga territorial de prueba (0093): solo root puede entrar; la base de datos lo fuerza.
  async function handleEntrarPrueba() {
    setEnviando(true);
    setError(null);
    const resultado = await unirseLiga(territorio.codigoLiga, nombreEquipo);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    onExito?.();
  }

  async function handleUnirsePublica() {
    setEnviando(true);
    setError(null);
    const resultado = await unirseLigaPublica(nombreEquipo);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    onExito?.();
  }

  if (codigoCreado) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">{t.liga.ligaCreada}</p>
        <p className="mt-2 text-sm text-neutral-500">
          {t.liga.compartirCodigo}
        </p>
        <p className="mt-4 rounded-xl border border-neutral-200 py-4 text-3xl font-bold tracking-widest dark:border-neutral-800">
          {codigoCreado}
        </p>
        <CopiarCodigoButton codigo={codigoCreado} className="mt-3" />
        <button
          onClick={() => onExito?.()}
          className="mt-6 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {t.liga.entrarMiLiga}
        </button>
      </div>
    );
  }

  return (
    <div>
      {modo === "elegir" && (
        <div className="flex flex-col gap-3">
          {/* Los demás territorios solo se ven para root mientras estén en pruebas (0095). */}
          {esRoot && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-neutral-500">
                {t.liga.ambito}
                <select
                  value={ambito}
                  onChange={(e) => {
                    const nuevo = e.target.value as AmbitoTerritorio;
                    setAmbito(nuevo);
                    setTerritorioId(territoriosDeAmbito(nuevo)[0]?.id ?? "");
                    setError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm font-normal text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  <option value="provincia">{t.liga.provincia}</option>
                  <option value="comunidad">{t.liga.comunidad}</option>
                </select>
              </label>
              <label className="text-xs font-medium text-neutral-500">
                {ambito === "comunidad" ? t.liga.comunidad : t.liga.provincia}
                <select
                  value={territorio.id}
                  onChange={(e) => {
                    setTerritorioId(e.target.value);
                    setError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm font-normal text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  {territorios.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre[idioma]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {!territorio.funcional && (
            <div className="flex flex-col gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
              <p className="text-sm text-neutral-500">{t.liga.provinciaProximamente}</p>
              {esRoot && (
                <>
                  <p className="text-xs text-neutral-400">{t.liga.ligaDePrueba}</p>
                  <input
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                    placeholder={t.liga.nombreEquipo}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  {error && <p className="text-xs text-negative">{error}</p>}
                  <button
                    onClick={handleEntrarPrueba}
                    disabled={!nombreEquipo || enviando}
                    className="rounded-lg border border-accent py-2.5 text-sm font-medium text-accent disabled:opacity-40"
                  >
                    {enviando ? t.liga.entrando : t.liga.entrarPrueba}
                  </button>
                </>
              )}
            </div>
          )}

          {(territorio.funcional || esRoot) && (
          <>
          <button
            onClick={() => setModo("crear")}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            {t.liga.crearNueva}
          </button>
          <button
            onClick={() => setModo("unirse")}
            className="rounded-lg border border-neutral-300 py-2.5 text-sm font-medium dark:border-neutral-700"
          >
            {t.liga.unirmeCodigo}
          </button>
          {territorio.funcional && !yaEnLigaPublica && (
            <button
              onClick={() => setModo("publica")}
              className="rounded-lg border border-accent py-2.5 text-sm font-medium text-accent"
            >
              {t.liga.unirmePublica}
            </button>
          )}
          </>
          )}
          {onCancelar && (
            <button
              onClick={onCancelar}
              className="text-xs text-neutral-500 underline underline-offset-2"
            >
              {t.comun.cancelar}
            </button>
          )}
        </div>
      )}

      {modo === "crear" && (
        <div className="flex flex-col gap-3">
          {esRoot && (
            <p className="text-xs text-neutral-500">
              {t.liga.seCreaEn} <strong>{territorio.nombre[idioma]}</strong>
            </p>
          )}
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreLiga}</label>
            <input
              type="text"
              value={nombreLiga}
              onChange={(e) => setNombreLiga(e.target.value)}
              placeholder={t.liga.placeholderLiga}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreEquipo}</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ostadar taldea"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            onClick={handleCrear}
            disabled={!nombreLiga || !nombreEquipo || enviando}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {t.liga.crearLiga}
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            {t.comun.volver}
          </button>
        </div>
      )}

      {modo === "publica" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            {t.liga.publicaDescripcion}
          </p>
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreEquipo}</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ostadar taldea"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            onClick={handleUnirsePublica}
            disabled={!nombreEquipo || enviando}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {enviando ? t.liga.entrando : t.liga.entrarPublica}
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            {t.comun.volver}
          </button>
        </div>
      )}

      {modo === "unirse" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.codigoLiga}</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">{t.liga.nombreEquipo}</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ostadar taldea"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            onClick={handleUnirse}
            disabled={!codigo || !nombreEquipo || enviando}
            className="rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {t.liga.unirme}
          </button>
          <button
            onClick={() => {
              setModo("elegir");
              setError(null);
            }}
            className="text-xs text-neutral-500 underline underline-offset-2"
          >
            {t.comun.volver}
          </button>
        </div>
      )}
    </div>
  );
}