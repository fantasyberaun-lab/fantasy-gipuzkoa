// Efectos de sonido del juego. No hay ficheros de audio: cada efecto es una
// "receta" de notas que el navegador sintetiza con Web Audio al momento. Así no
// pesan nada, no tienen licencia de terceros (ver LICENCIAS-RECURSOS.md) y se
// pueden retocar editando números.
//
// - Nada se crea hasta que hace falta: el AudioContext nace en el primer toque
//   o pulsación (los navegadores no dejan sonar antes de un gesto del usuario).
// - La preferencia (activado + volumen) se guarda en localStorage("sonido"),
//   como el tema; si no hay nada guardado, suena a volumen medio.

export type EfectoSonido =
  | "clic" // pujar, ofertar: confirmación discreta
  | "pestana" // "blup" al cambiar de pestaña
  | "fichar" // fichaje o clausulazo
  | "vender" // venta: monedas
  | "cofre-abrir" // crujido al tocar el cofre
  | "cofre-premio" // chispas y monedas al ver el premio
  | "acierto" // minijuegos: respuesta correcta
  | "fallo" // minijuegos: respuesta incorrecta
  | "fin" // fin de partida
  | "perfecta"; // fin de partida sin fallos

export type EstiloSonido = "suave" | "arcade";

export interface PreferenciaSonido {
  activo: boolean;
  volumen: number; // 0 a 1
  estilo: EstiloSonido;
}

const CLAVE = "sonido";
const POR_DEFECTO: PreferenciaSonido = { activo: true, volumen: 0.6, estilo: "suave" };

let cache: PreferenciaSonido | null = null;

export function leerPreferenciaSonido(): PreferenciaSonido {
  if (cache) return cache;
  cache = { ...POR_DEFECTO };
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (bruto) {
      const p = JSON.parse(bruto) as Partial<PreferenciaSonido>;
      if (typeof p.activo === "boolean") cache.activo = p.activo;
      if (typeof p.volumen === "number" && p.volumen >= 0 && p.volumen <= 1) {
        cache.volumen = p.volumen;
      }
      if (p.estilo === "suave" || p.estilo === "arcade") cache.estilo = p.estilo;
    }
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.): valores por defecto.
  }
  return cache;
}

export function guardarPreferenciaSonido(p: PreferenciaSonido): void {
  cache = {
    activo: p.activo,
    volumen: Math.min(1, Math.max(0, p.volumen)),
    estilo: p.estilo,
  };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cache));
  } catch {
    // No es crítico: la preferencia vale igualmente durante esta visita.
  }
}

// ─── Motor ───────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let maestro: GainNode | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    // Un compresor suave evita chasquidos si suenan varias notas a la vez.
    const compresor = ctx.createDynamicsCompressor();
    maestro = ctx.createGain();
    maestro.connect(compresor);
    compresor.connect(ctx.destination);
  } catch {
    ctx = null;
    maestro = null;
  }
  return ctx;
}

// Una nota: frecuencia (Hz), inicio y duración (s), forma de onda, volumen
// relativo y, si se indica, frecuencia final (deslizamiento).
interface Nota {
  f: number;
  t: number;
  d: number;
  tipo?: OscillatorType;
  v?: number;
  hasta?: number;
  ruido?: boolean; // soplo de ruido filtrado alrededor de f (en vez de una nota)
}

// Frecuencias de las notas usadas (Hz).
const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880;
const C6 = 1046.5, E6 = 1318.5, G6 = 1568, B6 = 1975.5;
const C7 = 2093, E7 = 2637;

// Moneda metálica: tres parciales no armónicos (como un metal golpeado) y un
// soplo de ruido agudo. Con varias seguidas suena a monedas cayendo.
function clink(t: number, f: number, v = 0.3): Nota[] {
  return [
    { f, t, d: 0.22, v },
    { f: f * 2.76, t, d: 0.12, v: v * 0.7 },
    { f: f * 5.4, t, d: 0.07, v: v * 0.4 },
    { f: 7000, t, d: 0.03, v: v * 0.8, ruido: true },
  ];
}

// Lluvia de monedas: n clics encadenados desde t0.
function lluvia(t0: number, n: number, paso: number): Nota[] {
  const graves = [2000, 2600, 2300, 2900, 2200, 3100, 2500, 2700, 2100, 3000];
  return Array.from({ length: n }, (_, i) => clink(t0 + i * paso, graves[i % graves.length], 0.28)).flat();
}

// Estilo "suave": campanitas y tonos redondeados.
const SUAVE: Record<EfectoSonido, Nota[]> = {
  clic: [{ f: 660, t: 0, d: 0.09, v: 0.5 }],
  acierto: [
    { f: C6, t: 0, d: 0.2, v: 0.5 },
    { f: E6, t: 0.09, d: 0.35, v: 0.5 },
  ],
  pestana: [
    { f: 260, hasta: 620, t: 0, d: 0.11, v: 0.55 },
    { f: 520, hasta: 1240, t: 0, d: 0.08, v: 0.12 },
  ],
  fallo: [{ f: 220, hasta: 140, t: 0, d: 0.3, tipo: "triangle", v: 0.6 }],
  // Pagar: "cha-ching" de caja registradora.
  fichar: [
    { f: 3000, t: 0, d: 0.08, v: 0.25, ruido: true },
    { f: 110, t: 0.02, d: 0.14, v: 0.6 },
    ...clink(0.1, 2200),
    ...clink(0.17, 2600),
    { f: C7, t: 0.26, d: 0.7, v: 0.3 },
    { f: E7, t: 0.26, d: 0.7, v: 0.15 },
  ],
  // Cobrar: cascada de monedas que termina en campanilla.
  vender: [
    { f: 110, t: 0, d: 0.1, v: 0.5 },
    ...lluvia(0.04, 6, 0.06),
    { f: G6, t: 0.42, d: 0.5, v: 0.25 },
  ],
  "cofre-abrir": [
    { f: 90, t: 0, d: 0.22, v: 0.7 },
    { f: 140, hasta: 320, t: 0.02, d: 0.34, tipo: "triangle", v: 0.35 },
  ],
  "cofre-premio": [
    { f: C5, t: 0, d: 0.9, tipo: "triangle", v: 0.2 },
    { f: E5, t: 0, d: 0.9, tipo: "triangle", v: 0.2 },
    { f: G5, t: 0, d: 0.9, tipo: "triangle", v: 0.2 },
    { f: C6, t: 0.0, d: 0.35, v: 0.3 },
    { f: E6, t: 0.07, d: 0.35, v: 0.3 },
    { f: G6, t: 0.14, d: 0.35, v: 0.3 },
    { f: C7, t: 0.21, d: 0.5, v: 0.3 },
    ...lluvia(0.25, 10, 0.07),
  ],
  fin: [
    { f: C5, t: 0, d: 0.25, tipo: "triangle", v: 0.6 },
    { f: E5, t: 0.12, d: 0.25, tipo: "triangle", v: 0.6 },
    { f: G5, t: 0.24, d: 0.25, tipo: "triangle", v: 0.6 },
    { f: C6, t: 0.36, d: 0.8, tipo: "triangle", v: 0.6 },
  ],
  perfecta: [
    { f: C5, t: 0, d: 0.25, tipo: "triangle", v: 0.6 },
    { f: E5, t: 0.12, d: 0.25, tipo: "triangle", v: 0.6 },
    { f: G5, t: 0.24, d: 0.25, tipo: "triangle", v: 0.6 },
    { f: C6, t: 0.36, d: 0.8, tipo: "triangle", v: 0.6 },
    { f: G6, t: 0.55, d: 0.3, v: 0.35 },
    { f: C7, t: 0.65, d: 0.3, v: 0.35 },
    { f: E7, t: 0.75, d: 0.6, v: 0.35 },
  ],
};

// Estilo "arcade": pitidos de onda cuadrada, como un videojuego clásico de 8 bits.
const Q: OscillatorType = "square";
const ARCADE: Record<EfectoSonido, Nota[]> = {
  clic: [{ f: 880, t: 0, d: 0.06, tipo: Q, v: 0.2 }],
  acierto: [
    { f: 988, t: 0, d: 0.08, tipo: Q, v: 0.22 },
    { f: 1319, t: 0.08, d: 0.2, tipo: Q, v: 0.22 },
  ],
  pestana: [{ f: 300, hasta: 700, t: 0, d: 0.07, tipo: Q, v: 0.15 }],
  fallo: [{ f: 330, hasta: 90, t: 0, d: 0.32, tipo: "sawtooth", v: 0.22 }],
  fichar: [
    { f: C5, t: 0, d: 0.07, tipo: Q, v: 0.22 },
    { f: E5, t: 0.07, d: 0.07, tipo: Q, v: 0.22 },
    { f: G5, t: 0.14, d: 0.07, tipo: Q, v: 0.22 },
    { f: C6, t: 0.21, d: 0.3, tipo: Q, v: 0.22 },
  ],
  vender: [
    { f: 988, t: 0, d: 0.07, tipo: Q, v: 0.22 },
    { f: E6, t: 0.07, d: 0.12, tipo: Q, v: 0.22 },
    { f: 988, t: 0.18, d: 0.07, tipo: Q, v: 0.22 },
    { f: E6, t: 0.25, d: 0.12, tipo: Q, v: 0.22 },
    { f: 988, t: 0.36, d: 0.07, tipo: Q, v: 0.22 },
    { f: E6, t: 0.43, d: 0.4, tipo: Q, v: 0.22 },
  ],
  "cofre-abrir": [{ f: 100, hasta: 420, t: 0, d: 0.32, tipo: Q, v: 0.18 }],
  "cofre-premio": [
    { f: C5, t: 0, d: 0.06, tipo: Q, v: 0.2 },
    { f: E5, t: 0.06, d: 0.06, tipo: Q, v: 0.2 },
    { f: G5, t: 0.12, d: 0.06, tipo: Q, v: 0.2 },
    { f: C6, t: 0.18, d: 0.06, tipo: Q, v: 0.2 },
    { f: E6, t: 0.24, d: 0.06, tipo: Q, v: 0.2 },
    { f: G6, t: 0.3, d: 0.06, tipo: Q, v: 0.2 },
    { f: C7, t: 0.36, d: 0.1, tipo: Q, v: 0.2 },
    { f: C6, t: 0.5, d: 0.5, tipo: Q, v: 0.12 },
    { f: E6, t: 0.5, d: 0.5, tipo: Q, v: 0.12 },
    { f: G6, t: 0.5, d: 0.5, tipo: Q, v: 0.12 },
    { f: 988, t: 0.6, d: 0.07, tipo: Q, v: 0.18 },
    { f: E6, t: 0.67, d: 0.12, tipo: Q, v: 0.18 },
    { f: 988, t: 0.8, d: 0.07, tipo: Q, v: 0.18 },
    { f: E6, t: 0.87, d: 0.25, tipo: Q, v: 0.18 },
  ],
  fin: [
    { f: C5, t: 0, d: 0.1, tipo: Q, v: 0.22 },
    { f: E5, t: 0.1, d: 0.1, tipo: Q, v: 0.22 },
    { f: G5, t: 0.2, d: 0.1, tipo: Q, v: 0.22 },
    { f: C6, t: 0.3, d: 0.5, tipo: Q, v: 0.22 },
  ],
  perfecta: [
    { f: C5, t: 0, d: 0.1, tipo: Q, v: 0.22 },
    { f: E5, t: 0.1, d: 0.1, tipo: Q, v: 0.22 },
    { f: G5, t: 0.2, d: 0.1, tipo: Q, v: 0.22 },
    { f: C6, t: 0.3, d: 0.1, tipo: Q, v: 0.22 },
    { f: E6, t: 0.4, d: 0.1, tipo: Q, v: 0.22 },
    { f: G6, t: 0.5, d: 0.1, tipo: Q, v: 0.22 },
    { f: C7, t: 0.6, d: 0.6, tipo: Q, v: 0.22 },
  ],
};

const RECETAS: Record<EstiloSonido, Record<EfectoSonido, Nota[]>> = {
  suave: SUAVE,
  arcade: ARCADE,
};

let bufferRuido: AudioBuffer | null = null;

function fuenteRuido(c: AudioContext, f: number): AudioNode & { start(t: number): void; stop(t: number): void } {
  if (!bufferRuido) {
    bufferRuido = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const datos = bufferRuido.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  }
  const fuente = c.createBufferSource();
  fuente.buffer = bufferRuido;
  const filtro = c.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.value = f;
  filtro.Q.value = 4;
  fuente.connect(filtro);
  // Se devuelve el filtro como "salida" y la fuente para arrancar/parar.
  return Object.assign(filtro, {
    start: (t: number) => fuente.start(t),
    stop: (t: number) => fuente.stop(t),
  });
}

function tocarNota(c: AudioContext, destino: AudioNode, inicio: number, n: Nota) {
  const gan = c.createGain();
  const t0 = inicio + n.t;
  const t1 = t0 + n.d;
  let osc: AudioNode & { start(t: number): void; stop(t: number): void };
  if (n.ruido) {
    osc = fuenteRuido(c, n.f);
  } else {
    const o = c.createOscillator();
    o.type = n.tipo ?? "sine";
    o.frequency.setValueAtTime(n.f, t0);
    if (n.hasta) o.frequency.exponentialRampToValueAtTime(n.hasta, t1);
    osc = o;
  }
  // Ataque corto y caída exponencial: suena a "campanita", sin chasquidos.
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(Math.max(n.v ?? 0.5, 0.0002), t0 + 0.012);
  gan.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gan);
  gan.connect(destino);
  osc.start(t0);
  osc.stop(t1 + 0.05);
}

export function sonar(efecto: EfectoSonido): void {
  try {
    const p = leerPreferenciaSonido();
    if (!p.activo || p.volumen <= 0) return;
    if (document.visibilityState === "hidden") return;
    const c = contexto();
    if (!c || !maestro) return;
    if (c.state === "suspended") void c.resume();
    // La sensación de volumen es curva: elevar al cuadrado hace el control más natural.
    maestro.gain.value = p.volumen * p.volumen;
    const inicio = c.currentTime + 0.02;
    for (const nota of RECETAS[p.estilo][efecto]) tocarNota(c, maestro, inicio, nota);
  } catch {
    // El sonido es un extra: nunca debe romper el juego.
  }
}

// Desbloqueo: el navegador solo permite sonar tras un gesto. Con el primer
// toque o tecla (si el sonido está activo) se crea y despierta el AudioContext,
// de modo que los sonidos que llegan después de una espera (la respuesta del
// servidor al abrir un cofre, por ejemplo) ya puedan oírse.
function desbloquear() {
  if (!leerPreferenciaSonido().activo) return;
  const c = contexto();
  if (!c) return;
  const listo = () => {
    if (c.state === "running") quitarEscuchas();
  };
  if (c.state === "running") listo();
  else c.resume().then(listo, () => {});
}

const EVENTOS_GESTO = ["pointerup", "touchend", "keydown"] as const;

function quitarEscuchas() {
  for (const e of EVENTOS_GESTO) window.removeEventListener(e, desbloquear);
}

if (typeof window !== "undefined") {
  for (const e of EVENTOS_GESTO) window.addEventListener(e, desbloquear, { passive: true });
}
