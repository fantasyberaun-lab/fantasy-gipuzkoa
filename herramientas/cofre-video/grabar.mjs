// Exporta las animaciones del cofre a PNG con transparencia (fotograma a
// fotograma, determinista) y las convierte a vídeo con ffmpeg.
// Uso:  node grabar.mjs [fps=30] [escala=1]
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const fps = Number(process.argv[2] ?? 30);
const escala = Number(process.argv[3] ?? 1); // 1 = 960x1040 px; 2 = el doble
const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.join(aqui, "salida");

// segundos por clip. "cerrado" dura un ciclo completo del meneo (2,8 s).
const CLIPS = [
  { nombre: "1-cofre-cerrado", estado: "cerrado", dur: 2.8 },
  { nombre: "2-cofre-abriendo", estado: "abriendo", dur: 1.5 },
  { nombre: "3-cofre-abierto-recompensa", estado: "abierto", dur: 3.6 },
];

const ffmpeg = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

rmSync(salida, { recursive: true, force: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 960, height: 1040 },
  deviceScaleFactor: escala,
});
const page = await ctx.newPage();

for (const c of CLIPS) {
  const dir = path.join(salida, "png", c.nombre);
  mkdirSync(dir, { recursive: true });
  await page.goto(pathToFileURL(path.join(aqui, "cofre.html")).href + `?estado=${c.estado}`);
  const n = Math.round(c.dur * fps);
  for (let i = 0; i < n; i++) {
    const t = (i / fps) * 1000;
    await page.evaluate((t) => {
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
    }, t);
    await page.screenshot({
      path: path.join(dir, `${String(i).padStart(4, "0")}.png`),
      omitBackground: true,
    });
  }
  const entrada = ["-framerate", String(fps), "-i", path.join(dir, "%04d.png")];
  // WebM con transparencia (VP9) y MP4 con fondo verde croma (#00b140), válido en cualquier editor.
  ffmpeg(...entrada, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "20", path.join(salida, `${c.nombre}-transparente.webm`));
  ffmpeg("-f", "lavfi", "-i", `color=c=0x00b140:s=${960 * escala}x${1040 * escala}:r=${fps}`, ...entrada,
    "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p", "-c:v", "libx264", "-crf", "16", path.join(salida, `${c.nombre}-fondo-verde.mp4`));
  ffmpeg("-f", "lavfi", "-i", `color=c=0x1a1a2e:s=${960 * escala}x${1040 * escala}:r=${fps}`, ...entrada,
    "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p", "-c:v", "libx264", "-crf", "16", path.join(salida, `${c.nombre}-fondo-oscuro.mp4`));
  console.log("listo:", c.nombre);
}

// Cofre ya reclamado (tapa levantada, sin brillo): una imagen fija.
await page.goto(pathToFileURL(path.join(aqui, "cofre.html")).href + "?estado=vacio");
await page.screenshot({ path: path.join(salida, "4-cofre-vacio.png"), omitBackground: true });
await browser.close();
console.log("Todo en:", salida);
