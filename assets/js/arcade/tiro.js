// ANIMAL AL TIRO
import { $, esc, store, SFX, LB, EGG, sprite, scaled, pxCircle, SPR, fitSoon } from './core.js';

const ANIMALS = {
  llama: { n: 'LLAMA', spr: SPR.llama, mouth: { x: 30, y: 9 } },
  erizo: { n: 'ERIZO', spr: SPR.erizo, mouth: { x: 31, y: 14 } },
};
/* Modo interno 'cont' = "DIANA CONTINUA". Su puntaje es ACIERTOS × PRECISIÓN%, con la precisión redondeada a
   entero (la misma que se ve en el HUD): p. ej. 30 aciertos en 40 disparos → 75% → 30 × 75 = 2250 puntos.
   Como cambió la escala, usa la clave de tabla 'tiro_diana' (la vieja 'tiro' ya no se muestra). */
const MODES = {
  cont: { n: 'DIANA CONTINUA', key: 'tiro_diana', help: 'EL BLANCO SE MUEVE SIN PARAR Y CADA VEZ MÁS RÁPIDO.<br>PUNTOS = ACIERTOS × PRECISIÓN % (SE REDONDEA A ENTERO)' },
  uno:  { n: 'UNO A UNO', key: 'tiro_uno', help: 'APARECEN BLANCOS AL AZAR QUE SE MUEVEN CADA VEZ MÁS RÁPIDO: DESAPARECEN SI LOS ACIERTAS O SI SE ACABA SU TIEMPO.<br>AMARILLO 10 · ROJO 5 · BLANCO 3 · BORDE 1' },
};
const cv = $('#ll-cv'), cx = cv.getContext('2d');
cx.imageSmoothingEnabled = false;
const DUR = 45, GRAV = 150, SPEED = 235, SUN = { x: 272, y: 32 };
/* Velocidad de la diana según el tiempo restante: vel = velBase × (1 + (1 − restante/total) × 2), x1 al inicio y x3 al final.
   DIANA CONTINUA: velBase es la rapidez de la trayectoria (0.9 → 2.7 al final; antes iba de 1 a 2.7), siempre dentro de la pantalla.
   UNO A UNO: velBase en px/s del blanco que se desliza y rebota dentro de su zona (22 → 66 px/s). */
const VEL_CONT = .9, VEL_UNO = 22;
const velMult = () => 1 + (T.running ? (1 - T.time / DUR) * 2 : 0);
const llAcc = () => T.shots ? Math.round(T.hits / T.shots * 100) : 0;
export const T = {
  W: 320, H: 200, ground: 176, running: false, score: 0, time: DUR, shots: 0, hits: 0,
  animal: store.get('pa_animal', 'llama'), mode: store.get('pa_mode', 'cont'), lbMode: null,
  spits: [], pops: [], splats: [], aim: { x: 230, y: 70 }, cd: 0, phase: 0, t: 0, tx: 240, ty: 90, recoil: 0,
  tg: null, wait: 0, made: 0, sunHits: 0
};
if (!ANIMALS[T.animal]) T.animal = 'llama';
if (!MODES[T.mode]) T.mode = 'cont';
T.lbMode = T.mode;
const animalPos = () => { const s = ANIMALS[T.animal].spr; return { x: 14, y: T.ground - s.height }; };
const mouth = () => { const p = animalPos(), m = ANIMALS[T.animal].mouth; return { x: p.x + m.x - Math.round(T.recoil * 2), y: p.y + m.y }; };

const bg = document.createElement('canvas'); bg.width = T.W; bg.height = T.H;
(() => {
  const b = bg.getContext('2d');
  ['#29366f', '#3b5dc9', '#41a6f6', '#73eff7'].forEach((c, k) => { b.fillStyle = c; b.fillRect(0, k * 44, T.W, 44); });
  pxCircle(b, SUN.x, SUN.y, 13, '#ffcd75'); pxCircle(b, SUN.x, SUN.y, 10, '#fff1c4');
  const cloud = (x, y) => { b.fillStyle = '#f4f4f4'; b.fillRect(x, y, 30, 6); b.fillRect(x + 6, y - 4, 16, 4); b.fillRect(x + 4, y + 6, 24, 3); };
  cloud(40, 30); cloud(140, 18); cloud(200, 56);
  for (let x = 0; x < T.W; x++) {
    const h = 18 + Math.round(10 * Math.sin(x / 23) + 6 * Math.sin(x / 9 + 1));
    b.fillStyle = '#257179'; b.fillRect(x, T.ground - h, 1, h);
    const h2 = 8 + Math.round(5 * Math.sin(x / 15 + 2));
    b.fillStyle = '#38b764'; b.fillRect(x, T.ground - h2, 1, h2);
  }
  b.fillStyle = '#38b764'; b.fillRect(0, T.ground, T.W, T.H - T.ground);
  b.fillStyle = '#a7f070'; b.fillRect(0, T.ground, T.W, 2);
  b.fillStyle = '#257179'; for (let x = 3; x < T.W; x += 7) b.fillRect(x, T.ground + 6 + (x % 3) * 4, 2, 2);
})();
export const tgt = document.createElement('canvas'); tgt.width = 29; tgt.height = 29;
(() => {
  const t = tgt.getContext('2d');
  pxCircle(t, 14, 14, 14, '#1a1c2c');
  pxCircle(t, 14, 14, 13, '#b13e53');
  pxCircle(t, 14, 14, 10, '#f4f4f4');
  pxCircle(t, 14, 14, 7, '#b13e53');
  pxCircle(t, 14, 14, 3, '#ffcd75');
})();

function llPickRender() {
  $('#ll-pick').innerHTML = '';
  for (const [k, a] of Object.entries(ANIMALS)) {
    const b = document.createElement('button');
    b.className = 'btn' + (k === T.animal ? ' on' : '');
    b.appendChild(scaled(a.spr, 2));
    b.append(a.n);
    b.onclick = () => { SFX.play('click'); T.animal = k; store.set('pa_animal', k); llPickRender(); };
    $('#ll-pick').appendChild(b);
  }
  $('#ll-mode').innerHTML = '';
  for (const [k, m] of Object.entries(MODES)) {
    const b = document.createElement('button');
    b.className = 'btn' + (k === T.mode ? ' on' : '');
    b.textContent = m.n;
    b.onclick = () => { SFX.play('click'); T.mode = k; T.lbMode = k; store.set('pa_mode', k); llPickRender(); llLB(); };
    $('#ll-mode').appendChild(b);
  }
  $('#ll-help').innerHTML = `${MODES[T.mode].help}<br>APUNTA CON EL RATÓN O EL DEDO · CLIC, TOQUE O ESPACIO PARA DISPARAR`;
}

function llSpawn() {
  const prog = (DUR - T.time) / DUR;
  const life = 2.6 - 1.4 * prog;
  const a = Math.random() * Math.PI * 2;
  T.tg = { x: 110 + Math.random() * 190, y: 26 + Math.random() * 120, dx: Math.cos(a), dy: Math.sin(a), life, max: life, born: T.t };
  T.made++;
  SFX.play('pop');
}
export function llStart() {
  Object.assign(T, { running: true, score: 0, time: DUR, shots: 0, hits: 0, spits: [], pops: [], splats: [], phase: 0, cd: 0, tg: null, wait: .4, made: 0, sunHits: 0 });
  $('#ll-over').hidden = true;
  SFX.play('start');
  llHud(); fitSoon();
}
function llEnd() {
  T.running = false; T.tg = null;
  const acc = llAcc();
  const extra = T.mode === 'uno' ? ` · BLANCOS: ${T.hits}/${T.made}` : `<br>${T.hits} ACIERTOS × ${acc}%`;
  $('#ll-over-txt').innerHTML = `¡TIEMPO!<br><br>PUNTOS: <b style="color:#ffcd75">${T.score}</b> · PRECISIÓN: ${acc}%${extra}<br><br>ESCOGE ANIMAL Y MODO`;
  $('#ll-start').textContent = 'OTRA VEZ';
  $('#ll-over').hidden = false;
  SFX.play(T.score > 0 ? 'win' : 'lose');
  T.lbMode = T.mode;
  const lbTxt = T.mode === 'cont' ? `${ANIMALS[T.animal].n} ${T.hits}×${acc}%` : `${ANIMALS[T.animal].n} ${acc}%`;
  if (T.score > 0) LB.confirmar(`¿SUBES TU PUNTAJE DE ${T.score} A LA TABLA?`, () => LB.submit(MODES[T.mode].key, T.score, false, lbTxt)).then(llLB); else llLB();
}
function llLB() {
  $('#ll-lb-tabs').innerHTML = '';
  for (const [k, m] of Object.entries(MODES)) {
    const b = document.createElement('button'); b.className = 'btn' + (k === T.lbMode ? ' on' : ''); b.textContent = m.n;
    b.onclick = () => { T.lbMode = k; llLB(); };
    $('#ll-lb-tabs').appendChild(b);
  }
  LB.render($('#ll-lb'), MODES[T.lbMode].key, false, r => `${r.score} PTS${r.extra ? `<small>${esc(r.extra)}</small>` : ''}`);
}
function llHud() {
  if (T.mode === 'cont') T.score = T.hits * llAcc();
  $('#ll-score').textContent = T.score;
  $('#ll-time').textContent = Math.ceil(T.time);
  $('#ll-acc').textContent = T.shots ? llAcc() + '%' : '-';
}
function llVel() {
  const m = mouth();
  let dx = T.aim.x - m.x, dy = T.aim.y - m.y;
  if (dx < 4) dx = 4;
  const a = Math.atan2(dy, dx);
  return { vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED };
}
export function llSpit() {
  if (!T.running || T.cd > 0) return;
  const m = mouth(), v = llVel();
  T.spits.push({ x: m.x, y: m.y, vx: v.vx, vy: v.vy, kind: T.animal });
  T.shots++; T.cd = .32; T.recoil = 1;
  SFX.play(T.animal === 'erizo' ? 'throw' : 'spit');
  llHud();
}
function curTarget() {
  if (!T.running) return null; // al acabar el tiempo ya no cuentan los tiros en el aire
  if (T.mode === 'uno') return T.tg;
  return { x: T.tx, y: T.ty };
}
function llUpdate(dt) {
  T.t += dt;
  if (T.running) { T.time -= dt; if (T.time <= 0) { T.time = 0; llEnd(); } }
  if (T.mode === 'cont') {
    T.phase += dt * VEL_CONT * velMult();
    T.tx = 236 + 54 * Math.sin(T.phase * 1.1);
    T.ty = 82 + 50 * Math.sin(T.phase * 1.9 + 1.2);
  } else if (T.running) {
    if (T.tg) {
      T.tg.life -= dt;
      const v = VEL_UNO * velMult();
      T.tg.x += T.tg.dx * v * dt; T.tg.y += T.tg.dy * v * dt;
      if (T.tg.x < 110) { T.tg.x = 110; T.tg.dx = Math.abs(T.tg.dx); } else if (T.tg.x > 300) { T.tg.x = 300; T.tg.dx = -Math.abs(T.tg.dx); }
      if (T.tg.y < 26) { T.tg.y = 26; T.tg.dy = Math.abs(T.tg.dy); } else if (T.tg.y > 146) { T.tg.y = 146; T.tg.dy = -Math.abs(T.tg.dy); }
      if (T.tg.life <= 0) { T.pops.push({ x: T.tg.x, y: T.tg.y, txt: '¡SE FUE!', life: .8, bad: true }); SFX.play('miss'); T.tg = null; T.wait = .35; }
    } else if ((T.wait -= dt) <= 0) llSpawn();
  }
  T.cd -= dt; T.recoil = Math.max(0, T.recoil - dt * 6);
  for (let n = T.spits.length - 1; n >= 0; n--) {
    const s = T.spits[n];
    s.vy += GRAV * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    const tg = curTarget();
    const d = tg ? Math.hypot(s.x - tg.x, s.y - tg.y) : 1e9;
    if (d <= 14) {
      const pts = d <= 3.5 ? 10 : d <= 7 ? 5 : d <= 10.5 ? 3 : 1;
      T.hits++;
      if (T.mode === 'uno') T.score += pts; // en DIANA CONTINUA llHud() calcula ACIERTOS × PRECISIÓN
      const txt = T.mode === 'cont' ? (pts === 10 ? '¡DIANA!' : 'ACIERTO') : pts === 10 ? '¡DIANA! +10' : '+' + pts;
      T.pops.push({ x: s.x, y: s.y, txt, life: .9, big: pts === 10 });
      SFX.play(pts === 10 ? 'bull' : 'hit');
      if (T.mode === 'uno') { T.tg = null; T.wait = .3; }
      T.spits.splice(n, 1); llHud(); continue;
    }
    if (Math.hypot(s.x - SUN.x, s.y - SUN.y) <= 12) {
      T.spits.splice(n, 1); T.sunHits++;
      T.pops.push({ x: SUN.x, y: SUN.y + 18, txt: '¿?', life: .6 });
      if (T.sunHits >= 3) { T.sunHits = 0; EGG.show(); }
      continue;
    }
    if (s.y >= T.ground) { T.splats.push({ x: Math.round(s.x), life: 3, kind: s.kind }); T.spits.splice(n, 1); continue; }
    if (s.x > T.W + 10) T.spits.splice(n, 1);
  }
  T.pops.forEach(p => { p.life -= dt; p.y -= 22 * dt; }); T.pops = T.pops.filter(p => p.life > 0);
  T.splats.forEach(p => p.life -= dt); T.splats = T.splats.filter(p => p.life > 0);
  if (T.running) $('#ll-time').textContent = Math.ceil(T.time);
}
function llDraw() {
  cx.drawImage(bg, 0, 0);
  const tg = T.mode === 'cont' ? { x: T.tx, y: T.ty } : T.tg;
  if (tg) {
    const sw = Math.max(6, 22 - Math.round((T.ground - tg.y) / 10));
    cx.fillStyle = 'rgba(15,16,32,.35)'; cx.fillRect(Math.round(tg.x - sw / 2), T.ground + 1, sw, 2);
    if (T.mode === 'uno') {
      const age = T.t - tg.born, sc = Math.min(1, age / .15);
      const sz = Math.max(2, Math.round(29 * sc));
      cx.drawImage(tgt, Math.round(tg.x - sz / 2), Math.round(tg.y - sz / 2), sz, sz);
      const f = Math.max(0, tg.life / tg.max);
      cx.fillStyle = '#1a1c2c'; cx.fillRect(Math.round(tg.x - 15), Math.round(tg.y + 17), 30, 4);
      cx.fillStyle = f > .5 ? '#a7f070' : f > .25 ? '#ffcd75' : '#b13e53';
      cx.fillRect(Math.round(tg.x - 14), Math.round(tg.y + 18), Math.round(28 * f), 2);
    } else cx.drawImage(tgt, Math.round(tg.x - 14), Math.round(tg.y - 14));
  }
  T.splats.forEach(p => {
    cx.globalAlpha = Math.min(1, p.life);
    if (p.kind === 'erizo') { cx.fillStyle = '#5a3a22'; cx.fillRect(p.x, T.ground - 3, 1, 4); cx.fillStyle = '#e8c39e'; cx.fillRect(p.x, T.ground - 4, 1, 1); }
    else { cx.fillStyle = '#a7f070'; cx.fillRect(p.x - 3, T.ground, 7, 2); cx.fillRect(p.x - 1, T.ground - 1, 3, 1); }
    cx.globalAlpha = 1;
  });
  const m = mouth(), v = llVel();
  for (let k = 1; k <= 7; k++) {
    const tt = k * .07, x = m.x + v.vx * tt, y = m.y + v.vy * tt + .5 * GRAV * tt * tt;
    cx.globalAlpha = 1 - k / 9; cx.fillStyle = '#f4f4f4'; cx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
  cx.globalAlpha = 1;
  const p = animalPos(), bob = T.running ? 0 : Math.round(Math.sin(T.t * 4));
  cx.drawImage(ANIMALS[T.animal].spr, p.x - Math.round(T.recoil * 2), p.y + bob);
  T.spits.forEach(s => {
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.kind === 'erizo') {
      const sp = Math.hypot(s.vx, s.vy), ux = s.vx / sp, uy = s.vy / sp;
      cx.fillStyle = '#5a3a22';
      for (let k = 0; k < 5; k++) cx.fillRect(Math.round(x - ux * k), Math.round(y - uy * k), 1, 1);
      cx.fillStyle = '#f4f4f4'; cx.fillRect(x, y, 1, 1);
    } else {
      cx.fillStyle = '#a7f070'; cx.fillRect(x - 1, y - 1, 3, 3);
      cx.fillStyle = '#38b764'; cx.fillRect(x, y, 2, 2);
      cx.fillStyle = 'rgba(167,240,112,.5)'; cx.fillRect(Math.round(x - s.vx * .02), Math.round(y - s.vy * .02), 2, 2);
    }
  });
  cx.textAlign = 'center';
  T.pops.forEach(p => {
    cx.font = (p.big ? 10 : 8) + 'px "Press Start 2P"';
    cx.globalAlpha = Math.min(1, p.life * 2);
    cx.fillStyle = '#1a1c2c'; cx.fillText(p.txt, Math.round(p.x) + 1, Math.round(p.y) + 1);
    cx.fillStyle = p.big ? '#ffcd75' : p.bad ? '#ef7d57' : '#f4f4f4'; cx.fillText(p.txt, Math.round(p.x), Math.round(p.y));
  });
  cx.globalAlpha = 1;
}
function toCanvas(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * T.W, y: (e.clientY - r.top) / r.height * T.H }; }
cv.addEventListener('pointermove', e => { T.aim = toCanvas(e); });
cv.addEventListener('pointerdown', e => { T.aim = toCanvas(e); llSpit(); });
$('#ll-start').onclick = llStart;
llPickRender();
llLB();

// El bucle de animación compartido (loop(), en arcade.html) llama a estas dos por su nombre cuando la
// pestaña activa es "tiro".
export function tiroTick(dt) { llUpdate(dt); }
export function tiroDraw() { llDraw(); }
