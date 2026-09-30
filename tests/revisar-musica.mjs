// Revisa las canciones del Arcade (assets/js/arcade/musica/*.js): que las notas estén bien escritas, cuánto dura
// cada vuelta y qué tan fuerte suena comparada con la música del menú (assets/audio/arcade-menu.mp3).
// Uso (desde la raíz del repositorio):
//   node tests/revisar-musica.mjs            revisa todas (solo formato, sin navegador)
//   node tests/revisar-musica.mjs golf       además mide el volumen y guarda un .wav de muestra (necesita Playwright)
//   node tests/revisar-musica.mjs golf --wav ruta/salida.wav
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "../assets/js/arcade/sinte.js";

const DIR = "assets/js/arcade/musica";
const ONDAS = ["square", "pulso25", "pulso12", "triangle", "sawtooth", "ruido"];
const NOTA = /^[A-G][#b]?-?\d$/, TAMBOR = /^[kshox]$/;
const args = process.argv.slice(2);
const solo = args.find(a => !a.startsWith("--") && !a.endsWith(".wav"));
const wavArg = args.includes("--wav") ? args[args.indexOf("--wav") + 1] : null;
const gcd = (a, b) => (b ? gcd(b, a % b) : a), lcm = (a, b) => (a * b) / gcd(a, b);
let errores = 0;

const archivos = readdirSync(DIR).filter(f => f.endsWith(".js") && (!solo || f === solo + ".js"));
if (solo && !archivos.length) { console.error(`✖ No existe ${DIR}/${solo}.js`); process.exit(1); }
for (const f of archivos) {
  const mal = m => { errores++; console.error(`✖ ${f}: ${m}`); };
  let song;
  try { song = (await import(pathToFileURL(join(DIR, f)).href)).default; } catch (e) { mal(e.message); continue; }
  if (!song || !Array.isArray(song.canales) || !song.canales.length) { mal("falta 'canales'"); continue; }
  if (!(song.bpm >= 40 && song.bpm <= 240)) mal("bpm fuera de 40–240");
  const pasos = song.pasos || 4, st = 60 / song.bpm / pasos;
  let vuelta = 1, volTotal = 0;
  song.canales.forEach((ch, k) => {
    if (!ONDAS.includes(ch.onda)) mal(`canal ${k}: onda '${ch.onda}' no existe`);
    if (!(ch.vol > 0 && ch.vol <= .12)) mal(`canal ${k}: vol debe estar entre 0 y 0.12`);
    const p = parse(ch);
    p.toks.forEach((t, i) => {
      if (t === "-" || t === ".") return;
      if (ch.onda === "ruido" ? !TAMBOR.test(t) : !NOTA.test(t)) mal(`canal ${k}, paso ${i}: ficha '${t}' no válida`);
    });
    if (p.largo % pasos) mal(`canal ${k}: ${p.largo} pasos no es múltiplo de ${pasos} (compases incompletos)`);
    vuelta = lcm(vuelta, p.largo); volTotal += ch.vol;
  });
  console.log(`✔ ${f}: "${song.titulo || "sin título"}", ${song.bpm} bpm, ${song.canales.length} canales, vuelta completa ${(vuelta * st).toFixed(1)} s, suma de volúmenes ${volTotal.toFixed(3)}`);
}
if (errores) { console.error(`\n${errores} problema(s).`); process.exit(1); }
if (!solo) process.exit(0);

// Medición real: se renderiza la canción en Chromium (OfflineAudioContext) y se compara con el mp3 del menú.
const { chromium } = await import("playwright").catch(async () => {
  const { createRequire } = await import("node:module");
  const { execSync } = await import("node:child_process");
  return createRequire(join(execSync("npm root -g").toString().trim(), "x"))("playwright");
});
const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const TIPOS = { ".js": "text/javascript", ".mp3": "audio/mpeg", ".html": "text/html" };
await page.route("http://arcade.local/**", r => {
  const ruta = decodeURIComponent(new URL(r.request().url()).pathname).slice(1) || "x.html";
  if (ruta === "x.html") return r.fulfill({ contentType: "text/html", body: "<!doctype html><title>x</title>" });
  try { r.fulfill({ contentType: TIPOS[extname(ruta)] || "application/octet-stream", body: readFileSync(ruta) }); }
  catch { r.fulfill({ status: 404 }); }
});
await page.goto("http://arcade.local/x.html");
const res = await page.evaluate(async g => {
  const { renderizar } = await import("/assets/js/arcade/sinte.js");
  const song = (await import(`/assets/js/arcade/musica/${g}.js`)).default;
  const SR = 44100, seg = 30;
  const c = new OfflineAudioContext(2, SR * seg, SR);
  renderizar(c, c.destination, song, seg);
  const buf = await c.startRendering(), a = buf.getChannelData(0);
  const rms = x => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
  let pico = 0; for (const v of a) pico = Math.max(pico, Math.abs(v));
  const mp3 = await (await fetch("/assets/audio/arcade-menu.mp3")).arrayBuffer();
  const ref = await new OfflineAudioContext(2, SR, SR).decodeAudioData(mp3);
  const r = ref.getChannelData(0).subarray(0, SR * 30);
  return { rms: rms(a), pico, ref: rms(r) * 0.45, wav: Array.from(a) };
}, solo);
await browser.close();
const db = x => (20 * Math.log10(x)).toFixed(1);
console.log(`  volumen (RMS): ${db(res.rms)} dB; música del menú (con su volumen 0.45): ${db(res.ref)} dB; diferencia ${(20 * Math.log10(res.rms / res.ref)).toFixed(1)} dB; pico ${res.pico.toFixed(2)}`);
console.log("  Meta: entre -4 y +1 dB respecto al menú, y pico por debajo de 0.9 (si no, se distorsiona).");
// WAV de 16 bits mono para escucharla.
const out = wavArg || join(process.env.TMPDIR || "/tmp", `musica-${solo}.wav`), n = res.wav.length, SR = 44100;
const b = Buffer.alloc(44 + n * 2);
b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write("data", 36); b.writeUInt32LE(n * 2, 40);
res.wav.forEach((v, i) => b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
writeFileSync(out, b);
console.log(`  Muestra de 30 s guardada en ${out}`);
