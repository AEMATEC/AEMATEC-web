// Núcleo compartido del Arcade AEMATEC: Firebase (proyecto arcade-matec), utilidades genéricas,
// sonido, tabla de puntajes, sprites base y el ajuste de tamaño de pantalla.
// Cada juego que se separe a su propio archivo importa de aquí lo que necesite. Los juegos que
// todavía viven dentro del <script> de arcade.html también importan de aquí (ver ese archivo).
//
// Requisitos en la consola de Firebase (proyecto arcade-matec):
// 1) Authentication > Método de acceso > activar "Anónimo"
// 2) Firestore Database creada
// 3) Publicar las reglas de firestore.rules (ver docs/arcade-firebase-cambios.md)

const firebaseConfig = {
  apiKey: "AIzaSyAuzcpEMIEupO2DV6ERt4ydTzkeo15-N38",
  authDomain: "arcade-matec.firebaseapp.com",
  projectId: "arcade-matec",
  storageBucket: "arcade-matec.firebasestorage.app",
  messagingSenderId: "565626556618",
  appId: "1:565626556618:web:138e123f64765e849fa433"
};
const FB_VER = '10.12.2';

export let db = null, fs = null, UID = null;
export const fbReady = (async () => {
  if (window.__FB_MOCK__) { const m = await window.__FB_MOCK__(); fs = m.fs; db = m.db; UID = m.uid; return true; }
  try {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appMod, fsMod, auMod] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-auth.js')
    ]);
    const app = appMod.initializeApp(firebaseConfig);
    fs = fsMod; db = fs.getFirestore(app);
    const cred = await auMod.signInAnonymously(auMod.getAuth(app));
    UID = cred.user.uid;
    // Sin Google Analytics a propósito: pondría cookies de rastreo sin consentimiento (Ley 8968 Art. 5). Ver legal.html#cookies.
    return true;
  } catch (e) { console.warn('Firebase no disponible, modo local:', e); return false; }
})();

/* ---------- utilidades ---------- */
import { filtrarTexto } from './filtro.js';
export { filtrarTexto };
export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const nameIn = $('#name'), nameWarn = $('#name-warn');
nameIn.value = store.get('pa_name', '');
// El filtro revisa groserías/teléfonos/correos (las reglas de Firestore solo pueden revisar tamaño
// y caracteres). Si el texto no pasa, no se guarda y se avisa — pero no se le borra lo que escribió.
nameIn.addEventListener('input', () => {
  const v = nameIn.value.trim().toUpperCase();
  const r = filtrarTexto(v);
  nameWarn.hidden = r.ok; nameWarn.textContent = r.ok ? '' : r.motivo;
  if (r.ok) store.set('pa_name', v);
});
export const playerName = () => (nameIn.value.trim().toUpperCase() || 'JUGADOR').slice(0, 10);
// Salas en línea: no se puede crear ni unirse sin nombre. El campo tiembla, "JUGADOR" se pone rojo
// y en celular la página sube hasta el campo. Aplica a todos los botones *-create y *-join de los juegos.
const nameLabel = document.querySelector('label[for="name"]');
export function nameMissing() {
  [nameIn, nameLabel].forEach(el => el.classList.add('falta'));
  nameIn.classList.remove('tiembla'); void nameIn.offsetWidth; nameIn.classList.add('tiembla');
  nameIn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  nameIn.focus({ preventScroll: true });
}
nameIn.addEventListener('animationend', () => nameIn.classList.remove('tiembla'));
nameIn.addEventListener('input', () => { if (nameIn.value.trim()) [nameIn, nameLabel].forEach(el => el.classList.remove('falta')); });
document.addEventListener('click', e => {
  const b = e.target.closest('.game button[id$="-create"], .game button[id$="-join"]');
  if (!b || nameIn.value.trim()) return;
  e.preventDefault(); e.stopImmediatePropagation();
  nameMissing();
}, true);
export const fmtT = s => { const m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ':' + (r < 10 ? '0' : '') : '') + r.toFixed(m ? 1 : 2) + (m ? '' : 's'); };
export function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[(Math.random() * A.length) | 0]; return s; }

/* ---------- presencia en línea (detectar desconexiones) ---------- */
const HEARTBEAT_MS = 5000, STALE_MS = 13000;
export function presenceLoop(writeFn) {
  writeFn();
  const id = setInterval(writeFn, HEARTBEAT_MS);
  return () => clearInterval(id);
}
export function tsMillis(ts) { return ts ? (ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : 0)) : 0; }
export function isStale(ts, now) { const t = tsMillis(ts); return t > 0 && now - t > STALE_MS; }
export async function liveRooms(coll, limit = 12) {
  if (!(await fbReady)) return [];
  try {
    const q = fs.query(fs.collection(db, coll), fs.orderBy('created', 'desc'), fs.limit(limit));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d => ({ code: d.id, data: d.data() }));
  } catch (e) { console.warn(e); return null; }
}

fbReady.then(ok => {
  const n = $('#net');
  n.textContent = ok ? '● ONLINE' : '● LOCAL';
  n.classList.toggle('on', ok);
  n.title = ok ? 'Conectado a Firebase' : 'Sin conexión a Firebase: récords guardados solo en este navegador';
});

/* ---------- sonido 8-bit (sintetizado, sin archivos) ---------- */
export const SFX = {
  on: store.get('pa_snd', true), ctx: null,
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, d, type = 'square', vol = .07, slide = 0, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .03);
  },
  noise(d, vol = .12, freq = 1200, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, buf = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), a = buf.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  seq(notes, step = .09, type = 'square', vol = .07) { notes.forEach((f, i) => f && this.tone(f, step * .95, type, vol, 0, i * step)); },
  play(n) {
    if (!this.on) return;
    this.init(); if (!this.ctx) return;
    switch (n) {
      case 'click': this.tone(660, .05, 'square', .05); break;
      case 'flag': this.tone(880, .06); this.tone(1320, .06, 'square', .06, 0, .05); break;
      case 'open': this.tone(440, .05, 'triangle', .09, 200); break;
      case 'boom': this.noise(.6, .3, 300); this.tone(160, .5, 'sawtooth', .08, -120); break;
      case 'win': this.seq([523, 659, 784, 1047, 0, 784, 1047], .1); break;
      case 'lose': this.seq([392, 330, 262, 196], .16, 'triangle', .1); break;
      case 'start': this.seq([392, 523, 659, 784], .07); break;
      case 'splash': this.noise(.25, .12, 2400); break;
      case 'hitship': this.noise(.3, .22, 500); this.tone(220, .25, 'square', .06, -120); break;
      case 'sunk': this.noise(.5, .25, 350); this.seq([330, 262, 196, 131], .1, 'sawtooth', .06); break;
      case 'spit': this.noise(.12, .14, 3000); this.tone(300, .08, 'triangle', .05, 300); break;
      case 'throw': this.tone(1200, .09, 'square', .04, -600); break;
      case 'hit': this.tone(988, .08); this.tone(1319, .1, 'square', .06, 0, .06); break;
      case 'bull': this.seq([1047, 1319, 1568, 2093], .06); break;
      case 'pop': this.tone(500, .06, 'triangle', .08, 500); break;
      case 'miss': this.tone(300, .15, 'triangle', .08, -150); break;
      case 'beep': this.tone(440, .15, 'square', .07); break;
      case 'go': this.tone(880, .35, 'square', .08); break;
      case 'lap': this.seq([659, 988], .08); break;
      case 'bump': this.noise(.08, .1, 800); break;
      case 'coin': this.tone(988, .08, 'square', .08); this.tone(1319, .35, 'square', .08, 0, .08); break;
      case 'egg': this.seq([196, 0, 196, 233, 262, 0, 196, 175, 196], .11, 'sawtooth', .07); break;
    }
  }
};
function sndBtn() { const b = $('#snd'); b.querySelector('.lbl').textContent = SFX.on ? 'SÍ' : 'NO'; b.classList.toggle('off', !SFX.on); b.setAttribute('aria-pressed', String(SFX.on)); }
$('#snd').onclick = () => { SFX.on = !SFX.on; store.set('pa_snd', SFX.on); sndBtn(); SFX.play('click'); updateMenuMusicHook(); };
sndBtn();
$('#arcade-volver').onclick = () => window.arcadeTransition('index.html');
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => SFX.on && SFX.init(), { once: true }));
// arcade.html define la música del menú (depende de qué pestaña está activa); este gancho evita que
// core.js necesite saber nada de la navegación entre juegos.
let updateMenuMusicHook = () => {};
export function setUpdateMenuMusicHook(fn) { updateMenuMusicHook = fn; }

/* ---------- easter egg ---------- */
export const EGG = {
  src: 'data:image/png;base64,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',
  busy: false,
  show() {
    if (this.busy) return;
    this.busy = true;
    $('#egg-img').src = this.src;
    $('#egg').hidden = false;
    SFX.play('egg');
    setTimeout(() => { $('#egg').hidden = true; this.busy = false; }, 5000);
  }
};
(() => {
  // 1) Código Konami en el teclado: ↑ ↑ ↓ ↓ ← → ← → B A
  const K = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let ki = 0, typed = '';
  window.addEventListener('keydown', e => {
    ki = e.code === K[ki] ? ki + 1 : (e.code === K[0] ? 1 : 0);
    if (ki === K.length) { ki = 0; EGG.show(); }
    // 2) Escribir "gorila" en cualquier parte (fuera de los campos de texto)
    if (e.target.tagName !== 'INPUT' && e.key.length === 1) { typed = (typed + e.key.toLowerCase()).slice(-6); if (typed === 'gorila') EGG.show(); }
  });
  // 3) Tocar/clicar el título 7 veces seguidas, o mantenerlo presionado 2 segundos
  const h1 = document.querySelector('h1');
  let taps = [], press = null;
  h1.addEventListener('pointerdown', () => {
    const now = Date.now(); taps = taps.filter(t => now - t < 2500); taps.push(now);
    if (taps.length >= 7) { taps = []; EGG.show(); }
    press = setTimeout(() => EGG.show(), 2000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h1.addEventListener(ev, () => clearTimeout(press)));
  // 4) Entrar con #gorila en la dirección, o poner GORILA como nombre de jugador
  const chk = () => { if (/gorila/i.test(location.hash)) EGG.show(); };
  window.addEventListener('hashchange', chk); setTimeout(chk, 600);
  nameIn.addEventListener('input', () => { if (nameIn.value.trim().toUpperCase() === 'GORILA') EGG.show(); });
  // 5) En celular: tocar la pantalla con 3 dedos a la vez
  window.addEventListener('touchstart', e => { if (e.touches.length >= 3) EGG.show(); }, { passive: true });
})();

/* ---------- tabla de clasificación (Top 10, una marca por jugador) ---------- */
export const LB = {
  async submit(key, score, asc, extra = '') {
    const name = playerName();
    extra = String(extra).slice(0, 24);
    if (await fbReady) {
      try {
        const ref = fs.doc(db, 'leaderboards', key, 'scores', UID);
        const cur = await fs.getDoc(ref);
        if (cur.exists()) { const s = cur.data().score; if (asc ? s <= score : s >= score) return false; }
        await fs.setDoc(ref, { name, score, extra, ts: fs.serverTimestamp() });
        return true;
      } catch (e) { console.warn('No se pudo guardar online:', e); return false; }
    }
    const arr = store.get('lb_' + key, []);
    const i = arr.findIndex(r => r.name === name);
    if (i >= 0) { if (asc ? arr[i].score <= score : arr[i].score >= score) return false; arr.splice(i, 1); }
    arr.push({ name, score, extra });
    arr.sort((a, b) => asc ? a.score - b.score : b.score - a.score);
    store.set('lb_' + key, arr.slice(0, 10));
    return true;
  },
  async increment(key, extra = '') {
    const name = playerName();
    extra = String(extra).slice(0, 24);
    if (await fbReady) {
      try {
        const ref = fs.doc(db, 'leaderboards', key, 'scores', UID), cur = await fs.getDoc(ref);
        const n = cur.exists() ? cur.data().score + 1 : 1;
        await fs.setDoc(ref, { name, score: n, extra, ts: fs.serverTimestamp() });
        return n;
      } catch (e) { console.warn('No se pudo guardar online:', e); return 0; }
    }
    const arr = store.get('lb_' + key, []), r = arr.find(r => r.name === name);
    if (r) { r.score++; r.extra = extra; } else arr.push({ name, score: 1, extra });
    arr.sort((a, b) => b.score - a.score);
    store.set('lb_' + key, arr.slice(0, 10));
    return r ? r.score : 1;
  },
  async top(key, asc) {
    if (await fbReady) {
      try {
        const q = fs.query(fs.collection(db, 'leaderboards', key, 'scores'), fs.orderBy('score', asc ? 'asc' : 'desc'), fs.limit(10));
        const snap = await fs.getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), me: d.id === UID }));
      } catch (e) { console.warn(e); return null; }
    }
    return store.get('lb_' + key, []);
  },
  async render(el, key, asc, fmt) {
    el.innerHTML = '<li class="muted">CARGANDO…</li>';
    const rows = await LB.top(key, asc);
    if (!rows) { el.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
    el.innerHTML = rows.length
      ? rows.map((r, i) => `<li class="${r.me ? 'me' : ''}"><span class="rk">${i + 1}.</span><span class="nm">${esc(r.name)}</span><span class="sc">${fmt(r)}</span></li>`).join('')
      : '<li class="muted">SIN RÉCORDS AÚN</li>';
  }
};

/* ---------- sprites pixel art ---------- */
export function sprite(rows, pal, s = 1) {
  const c = document.createElement('canvas');
  c.width = rows[0].length * s; c.height = rows.length * s;
  const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, X) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(X * s, y * s, s, s); } }));
  return c;
}
export function scaled(src, s) {
  const c = document.createElement('canvas'); c.width = src.width * s; c.height = src.height * s;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height); return c;
}
export function pxCircle(ctx, cx0, cy0, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * .6) ctx.fillRect(cx0 + x, cy0 + y, 1, 1);
}
export const SPR = {
  flag: sprite([
    "..11....",
    "..1111..",
    "..11111.",
    "..1111..",
    "..2.....",
    "..2.....",
    ".2222...",
    "222222..",
  ], { 1: '#b13e53', 2: '#1a1c2c' }),
  mine: sprite([
    "....2....",
    ".2.222.2.",
    "..22222..",
    ".2233222.",
    "222332222",
    ".2222222.",
    "..22222..",
    ".2.222.2.",
    "....2....",
  ], { 2: '#1a1c2c', 3: '#f4f4f4' }),
  boom: sprite([
    "..1..1..",
    ".1211.1.",
    "..2332..",
    "1233321.",
    ".123321.",
    "..2332.1",
    ".1.21.1.",
    "..1..1..",
  ], { 1: '#b13e53', 2: '#ef7d57', 3: '#ffcd75' }),
  splash: sprite([
    "........",
    "..1..1..",
    "...11...",
    ".1.22.1.",
    ".1.22.1.",
    "...11...",
    "..1..1..",
    "........",
  ], { 1: '#f4f4f4', 2: '#73eff7' }),
  llama: sprite([
    ".........1.1....",
    ".........1.1....",
    "........11111...",
    "........11311...",
    "........1111144.",
    "........11111...",
    "........1111....",
    "........1111....",
    "........1111....",
    ".111111111111...",
    ".1115555511111..",
    "11115555511111..",
    ".1111111111111..",
    "..11.11...11.11.",
    "..11.11...11.11.",
    "..22.22...22.22.",
  ], { 1: '#f0dcb4', 2: '#5d275d', 3: '#1a1c2c', 4: '#d98a8a', 5: '#b13e53' }, 2),
  erizo: sprite([
    "................",
    "....2.2.2.......",
    "...2626262......",
    "..262626262.....",
    ".2626262621.....",
    "262626262111....",
    ".26262621131....",
    "2626262621111114",
    ".2626262111111..",
    "..26262611111...",
    "....55....55....",
    "................",
  ], { 1: '#e8c39e', 2: '#5a3a22', 3: '#1a1c2c', 4: '#1a1c2c', 5: '#c28866', 6: '#8a5a38' }, 2),
};
for (const k of ['flag', 'mine', 'boom', 'splash'])
  document.documentElement.style.setProperty('--' + k, `url(${SPR[k].toDataURL()})`);

/* ---------- ajustar tamaño según pantalla ----------
   FIT_EXTRAS: los juegos con un tamaño propio que ajustar (que no sea el genérico .stage > canvas)
   agregan aquí su propia función, en vez de que este archivo tenga que conocerlos a todos. */
export const FIT_EXTRAS = [];
export function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }
export function fitAll() {
  const vh = window.innerHeight, sec = document.querySelector('.game.on');
  if (!sec) return;
  document.querySelectorAll('.over').forEach(fitOver);
  const main = sec.querySelector('.main');
  sec.querySelectorAll('.stage').forEach(st => {
    if (!st.offsetParent) return;
    const c = st.querySelector('canvas'), asp = c.width / c.height;
    const below = main.getBoundingClientRect().bottom - st.getBoundingClientRect().bottom;
    const maxH = Math.max(170, vh - docTop(st) - below - 10);
    st.style.maxWidth = Math.floor(maxH * asp + 8) + 'px';
  });
  const bo = document.querySelector('.boards');
  if (bo.offsetParent) {
    const W = bo.clientWidth, H = vh - docTop(bo) - 16;
    let side = Math.min(Math.floor((W - 40) / 2 / 10.3), Math.floor((H - 110) / 10.3));
    let stack = Math.min(Math.floor((W - 12) / 10.3), Math.floor((H - 200) / 2 / 10.3));
    const bc = side >= 20 ? side : Math.max(side, stack);
    bo.style.setProperty('--bc', Math.max(14, Math.min(36, bc)) + 'px');
  }
  FIT_EXTRAS.forEach(fn => fn());
}
export function fitOver(o) {
  const inn = o.firstElementChild; if (!inn || o.hidden || !o.clientHeight) return;
  inn.style.transform = '';
  const k = Math.min(1, (o.clientWidth - 12) / inn.scrollWidth, (o.clientHeight - 12) / inn.scrollHeight);
  inn.style.transform = k < 1 ? `scale(${k})` : '';
}
document.querySelectorAll('.over').forEach(o => {
  const inn = document.createElement('div'); inn.className = 'over-in';
  while (o.firstChild) inn.appendChild(o.firstChild);
  o.appendChild(inn);
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => fitOver(o)); ro.observe(o); ro.observe(inn); }
  new MutationObserver(() => fitOver(o)).observe(o, { attributes: true, attributeFilter: ['hidden'] });
});
export function fitSoon() { requestAnimationFrame(() => requestAnimationFrame(fitAll)); }
window.addEventListener('resize', fitSoon);
window.addEventListener('orientationchange', fitSoon);
document.fonts && document.fonts.ready.then(fitSoon);
