/* Sintetizador de la música del Arcade (sin dependencias: lo usan musica.js y tests/revisar-musica.mjs).
   El formato de las canciones está explicado en musica.js. */
const WAVES = {};
function pulse(c, duty) {
  const key = 'p' + duty;
  if (!WAVES[key] || WAVES[key].ctx !== c) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    WAVES[key] = { ctx: c, w: c.createPeriodicWave(re, im) };
  }
  return WAVES[key].w;
}
let NOISE = null;
function noiseBuf(c) {
  if (!NOISE || NOISE.sampleRate !== c.sampleRate || NOISE.ctx !== c) {
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    NOISE = b; NOISE.ctx = c;
  }
  return NOISE;
}

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function freq(tok, oct = 0) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return 0;
  const midi = 12 * (+m[3] + 1 + oct) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convierte el texto de un canal en una lista de eventos { paso, largo, ficha }.
export function parse(ch) {
  const toks = ch.notas.split(/\s+/).filter(t => t && t !== '|');
  const ev = [];
  toks.forEach((t, i) => {
    if (t === '-') { if (ev.length && ev[ev.length - 1].fin === i) { ev[ev.length - 1].largo++; ev[ev.length - 1].fin++; } return; }
    if (t === '.') return;
    ev.push({ paso: i, largo: 1, fin: i + 1, ficha: t });
  });
  return { largo: toks.length, ev, toks };
}

// Programa una nota o golpe de tambor en el contexto de audio `c` (sirve también para OfflineAudioContext).
export function nota(c, dest, ch, e, t, dur) {
  if (ch.onda === 'ruido') {
    const d = { k: .16, s: .14, h: .04, o: .22, x: .06 }[e.ficha] || .05;
    const f = { k: 150, s: 1800, h: 8000, o: 7000, x: 3000 }[e.ficha] || 3000;
    const src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf(c); fl.type = e.ficha === 'k' ? 'lowpass' : e.ficha === 'h' || e.ficha === 'o' ? 'highpass' : 'bandpass';
    fl.frequency.value = f;
    const v = ch.vol * (e.ficha === 'k' ? 2.2 : 1);
    g.gain.value = 0; // si no, el primer instante suena a volumen 1 (un chasquido)
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    src.connect(fl).connect(g).connect(dest); src.start(t, Math.random() * .5); src.stop(t + d + .02);
    if (e.ficha === 'k') { // bombo: además un golpe grave que baja de tono
      const o = c.createOscillator(), g2 = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
      g2.gain.value = 0; g2.gain.setValueAtTime(ch.vol * 3, t); g2.gain.exponentialRampToValueAtTime(.0001, t + .15);
      o.connect(g2).connect(dest); o.start(t); o.stop(t + .17);
    }
    return;
  }
  const f = freq(e.ficha, ch.oct || 0); if (!f) return;
  const o = c.createOscillator(), g = c.createGain();
  if (ch.onda === 'pulso25') o.setPeriodicWave(pulse(c, .25));
  else if (ch.onda === 'pulso12') o.setPeriodicWave(pulse(c, .125));
  else o.type = ch.onda || 'square';
  o.frequency.setValueAtTime(f, t);
  if (ch.ar && ch.ar.length > 1) { // arpegio rápido estilo consola (un paso cada 1/60 s)
    for (let k = 0, tt = t; tt < t + dur; k++, tt += 1 / 60) o.frequency.setValueAtTime(f * Math.pow(2, ch.ar[k % ch.ar.length] / 12), tt);
  }
  if (ch.vib) {
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = ch.vib;
    lfo.connect(lg).connect(o.detune); lfo.start(t + Math.min(.12, dur / 2)); lfo.stop(t + dur + .05);
  }
  const v = ch.vol, a = .006;
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a);
  if (ch.env === 'punteado') g.gain.exponentialRampToValueAtTime(Math.max(.0001, v * .08), t + Math.max(a + .01, dur));
  else { g.gain.setValueAtTime(v, t + Math.max(a, dur - .03)); }
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + .02);
}

// Duración (en segundos) del paso i, con swing aplicado.
export function tiempoPaso(song, i) {
  const st = 60 / song.bpm / (song.pasos || 4), sw = song.swing || 0;
  return i * st + (i % 2 ? sw * st : 0);
}

// Ganancia general de la música: los `vol` de las canciones van en la misma escala que los efectos de SFX
// (0.03–0.1), y esto la sube hasta sonar parecido a la música del menú.
export const MEZCLA = 3;

// Programa `segundos` de la canción en el contexto `c` (para revisarla fuera de tiempo real).
export function renderizar(c, dest, song, segundos) {
  const mix = c.createGain(); mix.gain.value = MEZCLA; mix.connect(dest); dest = mix;
  const st = 60 / song.bpm / (song.pasos || 4), n = Math.ceil(segundos / st);
  song.canales.forEach(ch => {
    const p = parse(ch);
    for (let i = 0; i < n; i++) {
      const e = p.ev.find(x => x.paso === i % p.largo);
      if (e) nota(c, dest, ch, e, tiempoPaso(song, i), e.largo * st * .98);
    }
  });
}
