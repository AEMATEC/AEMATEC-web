import './shell.js';
import { db, fs, UID, fbReady, $, esc, store, playerName, fmtT, genCode, isStale, liveRooms, presenceLoop, SFX, LB, scaled, pxCircle, EGG, fitSoon, expiraEn } from './core.js';
import { pedirAbandonar, pickRow, bucle } from './pagina.js';
import { CHARS, vspr, TRACKS, rcLbKey } from './compartido-juegos.js';

/* =========================================================
   CARRERAS
   ========================================================= */
const RW = 384, RH = 240, RR = 13, LAPS = 3, SR = 34;

const VEH = [
  { n: 'BICICLETA', max: 100, acc: 52, turn: 2.45, st: [5, 2, 2] },
  { n: 'PATINETA',  max: 90,  acc: 85, turn: 2.8,  st: [3, 5, 3] },
  { n: 'PATINES',   max: 84,  acc: 68, turn: 3.5,  st: [2, 3, 5] },
];

const SLOTC = ['#ffcd75', '#73eff7', '#a7f070', '#ef7d57'];

function buildTrack(t) {
  const P = t.pts, n = P.length, dense = [];
  const cr = (a, b, c, d, u) => {
    const u2 = u * u, u3 = u2 * u;
    return .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  };
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let s = 0; s < 30; s++) { const u = s / 30; dense.push([cr(p0[0], p1[0], p2[0], p3[0], u), cr(p0[1], p1[1], p2[1], p3[1], u)]); }
  }
  const L = [0];
  for (let i = 1; i <= dense.length; i++) { const a = dense[i - 1], b = dense[i % dense.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = L[dense.length], N = Math.round(total / 2), C = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const tgt = k * total / N;
    while (L[j + 1] < tgt) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length], u = (tgt - L[j]) / (L[j + 1] - L[j] || 1);
    C.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u });
  }
  C.forEach((p, k) => { const q = C[(k + 1) % N], o = C[(k - 1 + N) % N]; p.a = Math.atan2(q.y - o.y, q.x - o.x); });

  const dist = new Float32Array(RW * RH).fill(1e9), idx = new Int16Array(RW * RH).fill(-1);
  C.forEach((p, k) => {
    const x0 = Math.max(0, Math.floor(p.x - SR)), x1 = Math.min(RW - 1, Math.ceil(p.x + SR));
    const y0 = Math.max(0, Math.floor(p.y - SR)), y1 = Math.min(RH - 1, Math.ceil(p.y + SR));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + .5 - p.x, y + .5 - p.y), q = y * RW + x;
      if (d < dist[q]) { dist[q] = d; idx[q] = k; }
    }
  });

  const img = document.createElement('canvas'); img.width = RW; img.height = RH;
  const g = img.getContext('2d'), id = g.createImageData(RW, RH), pal = t.pal;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const curb = pal.curb || ['#b13e53', '#f4f4f4'];
  const col = { g1: hex(pal.g1), g2: hex(pal.g2), road: hex(pal.road), road2: hex(pal.road2), red: hex(curb[0]), white: hex(curb[1]), dash: hex('#94b0c2') };
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    const q = y * RW + x, d = dist[q], k = idx[q];
    const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    let c;
    if (d <= RR - 2) c = (d < .9 && Math.floor(k / 4) % 2 === 0) ? col.dash : (hsh % 13 === 0 ? col.road2 : col.road);
    else if (d <= RR) c = Math.floor(k / 3) % 2 ? col.red : col.white;
    else if (pal.deco === 'ice') c = (hsh % 5 === 0 || (x + y * 2) % 23 < 2) ? col.g2 : col.g1;
    else c = hsh % 7 === 0 ? col.g2 : col.g1;
    id.data.set([c[0], c[1], c[2], 255], q * 4);
  }
  g.putImageData(id, 0, 0);
  // línea de meta a cuadros
  const s0 = C[0], nx = -Math.sin(s0.a), ny = Math.cos(s0.a), tx = Math.cos(s0.a), ty = Math.sin(s0.a);
  for (let s = -RR + 1; s < RR; s++) for (let u = 0; u < 4; u++) {
    g.fillStyle = (Math.floor((s + RR) / 2) + Math.floor(u / 2)) % 2 ? '#1a1c2c' : '#f4f4f4';
    g.fillRect(Math.round(s0.x + nx * s + tx * (u - 2)), Math.round(s0.y + ny * s + ty * (u - 2)), 1, 1);
  }
  // decoración
  let seed = t.n.length * 9973;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (pal.deco === 'ice') rcIceDeco(g, dist, rnd);
  else for (let a = 0; a < 140; a++) {
    const x = 6 + Math.floor(rnd() * (RW - 12)), y = 8 + Math.floor(rnd() * (RH - 14));
    if (dist[y * RW + x] < RR + 9) continue;
    if (pal.deco === 'tree') { pxCircle(g, x, y, 4, '#257179'); pxCircle(g, x - 1, y - 1, 2, '#38b764'); }
    else if (pal.deco === 'pine') {
      g.fillStyle = '#5a3a22'; g.fillRect(x, y + 3, 1, 2);
      g.fillStyle = '#143f44'; for (let r = 0; r < 5; r++) g.fillRect(x - r + (r > 2 ? 1 : 0), y - 3 + r, (r > 2 ? r - 1 : r) * 2 + 1, 1);
    } else {
      if (a % 3) { g.fillStyle = '#41a6f6'; g.fillRect(x - 3, y, 7, 1); g.fillStyle = '#73eff7'; g.fillRect(x - 1, y, 3, 1); }
      else { g.fillStyle = '#8a5a38'; g.fillRect(x, y - 2, 1, 6); g.fillStyle = '#38b764'; g.fillRect(x - 3, y - 3, 7, 1); g.fillRect(x - 2, y - 4, 5, 1); g.fillRect(x - 3, y - 2, 1, 1); g.fillRect(x + 3, y - 2, 1, 1); }
    }
  }
  return { ...t, C, N, dist, idx, img };
}
// Lago helado: grietas, agujeros de agua y témpanos (solo decoración, no chocan).
function rcIceDeco(g, dist, rnd) {
  const far = (x, y, m) => x > 2 && y > 2 && x < RW - 3 && y < RH - 3 && dist[(y | 0) * RW + (x | 0)] > RR + m;
  for (let a = 0; a < 70; a++) { // grietas en zigzag
    let x = 4 + rnd() * (RW - 8), y = 4 + rnd() * (RH - 8);
    const dx = rnd() < .5 ? 1 : -1;
    g.fillStyle = a % 3 ? '#f4f4f4' : '#94b0c2';
    for (let k = 0; k < 6 + rnd() * 8; k++) {
      if (!far(x, y, 2)) break;
      g.fillRect(x | 0, y | 0, 1, 1);
      x += dx; y += rnd() < .5 ? 1 : 0;
    }
  }
  for (let a = 0; a < 26; a++) { // agujeros de agua
    const x = 8 + Math.floor(rnd() * (RW - 16)), y = 8 + Math.floor(rnd() * (RH - 16)), r = 2 + Math.floor(rnd() * 4);
    if (!far(x, y, r + 5)) continue;
    pxCircle(g, x, y, r + 1, '#f4f4f4'); pxCircle(g, x, y, r, '#29366f');
    if (r > 2) pxCircle(g, x, y, r - 1, '#3b5dc9');
    g.fillStyle = '#41a6f6'; g.fillRect(x - 1, y - 1, 2, 1);
  }
  for (let a = 0; a < 18; a++) { // témpanos
    const x = 8 + Math.floor(rnd() * (RW - 16)), y = 10 + Math.floor(rnd() * (RH - 18)), h = 4 + Math.floor(rnd() * 4);
    if (!far(x, y, h + 6) || !far(x, y - h, 6)) continue;
    g.fillStyle = '#29366f'; g.fillRect(x - h - 1, y + 1, h * 2 + 3, 2);
    for (let r = 0; r <= h; r++) {
      const w = Math.max(1, Math.round((r + 1) * 1.3));
      g.fillStyle = '#f4f4f4'; g.fillRect(x - w, y - h + r, w, 1);
      g.fillStyle = '#73eff7'; g.fillRect(x, y - h + r, w, 1);
    }
    g.fillStyle = '#41a6f6'; g.fillRect(x, y - h + 1, 1, h);
  }
}
const RTRACKS = TRACKS.map(buildTrack);

function portrait(ci) {
  const c = document.createElement('canvas'); c.width = 12; c.height = 12;
  const x = c.getContext('2d'), ch = CHARS[ci];
  const f = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  f(ch.hair, 2, 0, 8, 2); f(ch.hair, 1, 1, 10, 3); f(ch.skin, 2, 3, 8, 6); f(ch.hair, 1, 3, 1, 4); f(ch.hair, 10, 3, 1, 4);
  f('#1a1c2c', 4, 5, 1, 2); f('#1a1c2c', 7, 5, 1, 2); f('#b13e53', 5, 7, 2, 1);
  f(ch.skin, 5, 9, 2, 1); f(ch.shirt, 1, 10, 10, 2);
  return c;
}
function thumb(tr) { const c = document.createElement('canvas'); c.width = 96; c.height = 60; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(tr.img, 0, 0, 96, 60); return c; }

const rcSel = store.get('pa_rc', { c: 0, v: 0, c2: 1, v2: 1, t: 0 });
if (!(rcSel.t >= 0 && rcSel.t < TRACKS.length)) rcSel.t = 0;
if (typeof rcSel.col !== 'boolean') rcSel.col = true;    // colisiones entre jugadores (SÍ por defecto)
if (rcSel.lbm !== 'total') rcSel.lbm = 'lap';            // Top 10 visible: 'lap' (vuelta) o 'total' (circuito)
const RC = { mode: null, phase: 'menu', players: 1, T: null, racers: [], keys: {}, touch: {}, lbTrack: rcSel.t,
  room: null, roomData: null, roomPlayers: {}, unsubs: [], lastSend: 0, round: 0, isHost: false, submitted: false,
  hbStop: null, spectating: false, specUnsubs: [], col: true };
const rcv = $('#rc-cv'), rx = rcv.getContext('2d');
rx.imageSmoothingEnabled = false;

const statsHtml = v => `<div>${v.n}</div><div class="stats"><span>VEL</span><span><i style="width:${v.st[0] * 8}px"></i></span><span>ACEL</span><span><i style="width:${v.st[1] * 8}px"></i></span><span>MANEJO</span><span><i style="width:${v.st[2] * 8}px"></i></span></div>`;
function rcSetupRender() {
  store.set('pa_rc', rcSel);
  const online = RC.mode === 'online';
  pickRow($('#rc-char'), CHARS.map((c, i) => ({ canvas: scaled(portrait(i), 4), html: c.n })), rcSel.c, i => { rcSel.c = i; rcSetupRender(); rcPushMe(); });
  pickRow($('#rc-veh'), VEH.map((v, i) => ({ canvas: scaled(vspr(rcSel.c, i), 4), html: statsHtml(v) })), rcSel.v, i => { rcSel.v = i; rcSetupRender(); rcPushMe(); });
  pickRow($('#rc-char2'), CHARS.map((c, i) => ({ canvas: scaled(portrait(i), 3), html: c.n })), rcSel.c2, i => { rcSel.c2 = i; rcSetupRender(); });
  pickRow($('#rc-veh2'), VEH.map((v, i) => ({ canvas: scaled(vspr(rcSel.c2, i), 3), html: v.n })), rcSel.v2, i => { rcSel.v2 = i; rcSetupRender(); });
  const curT = online && RC.roomData ? RC.roomData.track : rcSel.t;
  pickRow($('#rc-track'), RTRACKS.map(t => ({ canvas: thumb(t), html: t.n })), curT, i => {
    if (online) { if (RC.isHost) fs.updateDoc(fs.doc(db, 'races', RC.room), { track: i }).catch(console.error); return; }
    rcSel.t = i; RC.lbTrack = i; rcSetupRender(); rcLB();
  });
  $('#rc-track').querySelectorAll('.btn').forEach(b => b.disabled = online && !RC.isHost);
  const curC = online && RC.roomData ? RC.roomData.collisions !== false : rcSel.col;
  pickRow($('#rc-col'), [{ html: 'SÍ<small>REBOTAN</small>' }, { html: 'NO<small>SE ATRAVIESAN</small>' }], curC ? 0 : 1, i => {
    if (online) { if (RC.isHost) fs.updateDoc(fs.doc(db, 'races', RC.room), { collisions: i === 0 }).catch(console.error); return; }
    rcSel.col = i === 0; rcSetupRender();
  });
  $('#rc-col').querySelectorAll('.btn').forEach(b => b.disabled = online && !RC.isHost);
  $('#rc-p2').hidden = RC.mode !== null;
  $('#rc-p1-title').textContent = RC.mode === null ? 'PERSONAJE (J1: WASD / FLECHAS)' : 'PERSONAJE';
}
const RC_LBM = [{ k: 'lap', n: 'VUELTA MÁS RÁPIDA', sub: 'MEJOR VUELTA' }, { k: 'total', n: 'CIRCUITO', sub: `CARRERA COMPLETA (${LAPS} VUELTAS)` }];

function rcLB() {
  $('#rc-lb-modes').innerHTML = '';
  RC_LBM.forEach(m => {
    const b = document.createElement('button'); b.className = 'btn' + (m.k === rcSel.lbm ? ' on' : ''); b.textContent = m.n;
    b.onclick = () => { rcSel.lbm = m.k; store.set('pa_rc', rcSel); rcLB(); };
    $('#rc-lb-modes').appendChild(b);
  });
  $('#rc-lb-sub').textContent = RC_LBM.find(m => m.k === rcSel.lbm).sub + ' · ' + RTRACKS[RC.lbTrack].n;
  $('#rc-lb-tabs').innerHTML = '';
  RTRACKS.forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'btn' + (i === RC.lbTrack ? ' on' : ''); b.textContent = t.n;
    b.onclick = () => { RC.lbTrack = i; rcLB(); };
    $('#rc-lb-tabs').appendChild(b);
  });
  LB.render($('#rc-lb'), rcLbKey(RC.lbTrack, rcSel.lbm), true, r => `${fmtT(r.score)}${r.extra ? `<small>${esc(r.extra)}</small>` : ''}`);
}
function rcView(v) {
  fitSoon();
  $('#rc-setup').hidden = v === 'race' || v === 'spectate';
  $('#rc-menu').hidden = v !== 'menu';
  $('#rc-lobby').hidden = v !== 'lobby';
  $('#rc-race').hidden = v !== 'race';
  $('#rc-spectate').hidden = v !== 'spectate';
}
function rcMenuMsg(t, cls = '') { const m = $('#rc-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }

/* ---- física y carrera ---- */
function trackQ(x, y) { const X = Math.min(RW - 1, Math.max(0, x | 0)), Y = Math.min(RH - 1, Math.max(0, y | 0)); return Y * RW + X; }
function mkRacer(o, slot) {
  const T_ = RC.T, back = 6 + Math.floor(slot / 2) * 8, k = (T_.N - back) % T_.N, p = T_.C[k];
  const off = slot % 2 ? 6 : -6;
  const r = { ...o, slot, x: p.x - Math.sin(p.a) * off, y: p.y + Math.cos(p.a) * off, a: p.a, spd: 0,
    li: k, total: k - T_.N, lapsDone: -1, lapStart: 0, best: null, fin: null, lane: off * .5, k: o.k || 1,
    vx: 0, vy: 0, bx: 0, by: 0, rvx: 0, rvy: 0 }; // v = movimiento real (derrapa en hielo), b = empujón de choque
  r.tx = r.x; r.ty = r.y; r.ta = r.a;
  return r;
}
function rcBegin(track, entries, col = true) {
  RC.T = RTRACKS[track]; RC.trackIdx = track; RC.lbTrack = track; RC.col = col !== false; rcLB();
  RC.racers = entries.map((e, i) => mkRacer(e, e.slot ?? i));
  RC.phase = 'count'; RC.goAt = performance.now() + 3000; RC.t0 = RC.goAt; RC.submitted = false; RC.doneAt = null;
  $('#rc-res').hidden = true;
  rcView('race'); fitSoon();
  const k = RC.mode === 'local' && RC.players === 2 ? 'J1: WASD · J2: FLECHAS' : 'FLECHAS O WASD PARA MOVERTE';
  $('#rc-keys').textContent = k + ' · ' + LAPS + ' VUELTAS' + (RC.col ? '' : ' · SIN CHOQUES') + (RC.T.ice ? ' · ¡CUIDADO CON EL HIELO!' : '');
}
function inputFor(r) {
  const K = RC.keys, t = RC.touch;
  const wasd = { up: K.KeyW, down: K.KeyS, left: K.KeyA, right: K.KeyD };
  const arr = { up: K.ArrowUp, down: K.ArrowDown, left: K.ArrowLeft, right: K.ArrowRight };
  if (r.ctrl === 'p2') return arr;
  if (r.ctrl === 'p1') {
    const base = RC.mode === 'local' && RC.players === 2 ? wasd : { up: wasd.up || arr.up, down: wasd.down || arr.down, left: wasd.left || arr.left, right: wasd.right || arr.right };
    return { up: base.up || t.up, down: base.down || t.down, left: base.left || t.left, right: base.right || t.right };
  }
  // CPU (si se atasca, retrocede un momento)
  if (r.unstuck > 0) { r.unstuck -= 1 / 60; return { down: true, left: r.lane > 0, right: r.lane <= 0 }; }
  r.slow = r.spd < 12 ? (r.slow || 0) + 1 / 60 : 0;
  if (r.slow > 1.2) { r.slow = 0; r.unstuck = .6; r.lane = -r.lane || 4; }
  const T_ = RC.T, ahead = T_.C[(Math.max(0, r.li) + 9 + Math.round(r.spd / 7)) % T_.N];
  if (Math.random() < .005) r.lane = (Math.random() * 2 - 1) * 5;
  const gx = ahead.x - Math.sin(ahead.a) * r.lane, gy = ahead.y + Math.cos(ahead.a) * r.lane;
  let da = Math.atan2(gy - r.y, gx - r.x) - r.a;
  while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  return { up: Math.abs(da) < 1 || r.spd < 30, down: Math.abs(da) > 1.3 && r.spd > 45, left: da < -.05, right: da > .05 };
}
// Hielo (Lago helado, fuera del circuito): en asfalto/tierra el vehículo va exactamente hacia donde apunta
// (agarre total, como siempre). En hielo la velocidad real solo se acerca poco a poco a la dirección
// del vehículo (grip por segundo: ≈ 0.96 de inercia por cuadro) → derrapa. Frena y desacelera menos.
const RC_ICE = { grip: 2.2, cap: .72, coast: 7, brake: .4, decel: 35 };
function drive(r, inp, dt) {
  const V = VEH[r.veh], off = RC.T.dist[trackQ(r.x, r.y)] > RR, ice = off && RC.T.ice;
  const max = V.max * r.k * (ice ? RC_ICE.cap : off ? .45 : 1);
  if (inp.up) r.spd += V.acc * dt;
  else if (inp.down) r.spd -= (r.spd > 0 ? 130 : 45) * (ice ? RC_ICE.brake : 1) * dt;
  else r.spd -= Math.sign(r.spd) * Math.min(Math.abs(r.spd), (ice ? RC_ICE.coast : 28) * dt);
  if (r.spd > max) r.spd = Math.max(max, r.spd - (ice ? RC_ICE.decel : 140) * dt);
  if (r.spd < -30) r.spd = -30;
  const st = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  r.a += st * V.turn * dt * Math.max(-1, Math.min(1, r.spd / 35));
  const tx = Math.cos(r.a) * r.spd, ty = Math.sin(r.a) * r.spd;
  if (ice) { const f = 1 - Math.exp(-RC_ICE.grip * dt); r.vx += (tx - r.vx) * f; r.vy += (ty - r.vy) * f; }
  else { r.vx = tx; r.vy = ty; }
  r.x += (r.vx + r.bx) * dt; r.y += (r.vy + r.by) * dt;
  const fb = Math.exp(-RC_BUMP_DECAY * dt); r.bx *= fb; r.by *= fb;
  if (r.x < 4 || r.x > RW - 4 || r.y < 4 || r.y > RH - 4) {
    r.x = Math.min(RW - 4, Math.max(4, r.x)); r.y = Math.min(RH - 4, Math.max(4, r.y));
    r.spd *= .5; r.vx *= .5; r.vy *= .5; r.bx *= -.5; r.by *= -.5;
  }
}
function progress(r, now) {
  const N = RC.T.N, k = RC.T.idx[trackQ(r.x, r.y)];
  if (k < 0) return;
  let dk = k - r.li;
  if (dk > N / 2) dk -= N; if (dk < -N / 2) dk += N;
  if (Math.abs(dk) < N / 4) r.total += dk;
  r.li = k;
  const laps = Math.floor(r.total / N);
  if (laps > r.lapsDone) {
    if (laps >= 1 && r.fin == null) {
      const lt = (now - r.lapStart) / 1000;
      r.best = r.best == null ? lt : Math.min(r.best, lt);
      r.lapStart = now;
      if (laps >= LAPS) r.fin = (now - RC.t0) / 1000;
      if (r.ctrl === 'p1' || r.ctrl === 'p2') SFX.play(r.fin != null ? 'win' : 'lap');
    }
    r.lapsDone = laps;
  }
}
// Choques tipo Mario Kart: (1) se separan los cuerpos para que no queden encimados y (2) si alguno va
// rápido, rebote elástico: impulso = velocidad relativa (en la línea del choque) × RC_BOUNCE. El empujón
// va a (bx, by) y se apaga solo en ~0.3 s. Los autos de otros jugadores online (remote) cuentan como
// masa infinita: solo se mueve el propio. Velocidades en px/s (60 px/s = 1 px por cuadro; máx. ≈ 100).
const RC_HIT = 7, RC_BOUNCE = .75, RC_SLOW = 20, RC_BUMP_DECAY = 6;
const rcVel = r => r.ctrl === 'remote' ? [r.rvx || 0, r.rvy || 0] : [r.vx + r.bx, r.vy + r.by];
function collide() {
  if (!RC.col) return; // "Colisiones entre jugadores: NO" → se atraviesan
  const R = RC.racers;
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const a = R[i], b = R[j], am = a.ctrl !== 'remote', bm = b.ctrl !== 'remote';
    if (!am && !bm) continue;
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= RC_HIT) continue;
    if (d < .01) { dx = -Math.sin(a.a); dy = Math.cos(a.a); d = .01; } // encima exacto: separar de lado
    const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy), over = RC_HIT - d;
    const wa = am ? (bm ? .5 : 1) : 0, wb = bm ? (am ? .5 : 1) : 0;
    a.x -= ux * over * wa; a.y -= uy * over * wa;
    b.x += ux * over * wb; b.y += uy * over * wb;
    const va = rcVel(a), vb = rcVel(b);
    if (Math.hypot(va[0], va[1]) < RC_SLOW && Math.hypot(vb[0], vb[1]) < RC_SLOW) continue; // lentos (salida): solo separar
    const vn = (vb[0] - va[0]) * ux + (vb[1] - va[1]) * uy;
    if (vn >= 0) continue; // ya se están alejando
    const J = -vn * RC_BOUNCE;
    const hit = (r, sgn, w) => {
      if (!w) return;
      const k = J * w * 2, px = ux * sgn * k, py = uy * sgn * k;
      r.bx += px; r.by += py;
      const along = px * Math.cos(r.a) + py * Math.sin(r.a); // empujado hacia atrás → pierde algo de velocidad
      if (along < 0 && r.spd > 0) r.spd = Math.max(0, r.spd + along * .5);
    };
    hit(a, -1, wa); hit(b, 1, wb);
    if ([a, b].some(r => r.ctrl === 'p1' || r.ctrl === 'p2') && J > 25 && !(RC.bumpCd > 0)) { RC.bumpCd = .15; SFX.play('click'); }
  }
}
const ranking = () => [...RC.racers].sort((a, b) => (a.fin != null) !== (b.fin != null) ? (a.fin != null ? -1 : 1) : a.fin != null ? a.fin - b.fin : b.total - a.total);

function rcUpdate(dt, now) {
  if (RC.phase === 'count') { const n = Math.ceil((RC.goAt - now) / 1000); if (n !== RC.beep && n > 0 && n <= 3) { RC.beep = n; SFX.play('beep'); } }
  if (RC.phase === 'count' && now >= RC.goAt) { RC.phase = 'race'; RC.beep = 0; SFX.play('go'); RC.racers.forEach(r => r.lapStart = RC.t0); }
  const moving = RC.phase === 'race' || RC.phase === 'done';
  for (const r of RC.racers) {
    if (r.ctrl === 'remote') {
      const f = Math.min(1, dt * 10), ox = r.x, oy = r.y;
      r.x += (r.tx - r.x) * f; r.y += (r.ty - r.y) * f;
      if (dt > 0) { r.rvx = (r.x - ox) / dt; r.rvy = (r.y - oy) / dt; }
      let da = r.ta - r.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; r.a += da * f;
      continue;
    }
    if (!moving) continue;
    const inp = r.fin != null ? (r.ctrl === 'cpu' ? inputFor(r) : { up: false }) : inputFor(r);
    if (r.fin != null && r.ctrl !== 'cpu') inp.down = r.spd > 0;
    drive(r, inp, dt);
    progress(r, now);
    if (r.ctrl === 'p1') { r.secret = r.x > RW - 12 && r.y > RH - 12 ? (r.secret || 0) + dt : 0; if (r.secret > 1.5) { r.secret = -99; EGG.show(); } }
  }
  if (RC.bumpCd > 0) RC.bumpCd -= dt;
  if (moving) collide();

  const humans = RC.racers.filter(r => r.ctrl === 'p1' || r.ctrl === 'p2');
  if (RC.phase === 'race' && humans.every(r => r.fin != null)) { RC.phase = 'done'; RC.doneAt = now; rcFinish(); }
  if (RC.phase === 'done' && !$('#rc-res').hidden) rcResults();

  if (RC.mode === 'online' && moving && now - RC.lastSend > 110) { RC.lastSend = now; rcSendMe(); }
}
function rcFinish() {
  const me = RC.racers.find(r => r.ctrl === 'p1');
  if (me && me.best != null && !RC.submitted) {
    RC.submitted = true;
    const ex = `${CHARS[me.char].n} · ${VEH[me.veh].n}`, sec = (v, lo) => Math.min(1800, Math.max(lo, Math.round(v * 100) / 100));
    const vuelta = sec(me.best, 5), total = me.fin != null ? sec(me.fin, 15) : null;
    const resumen = total != null ? `VUELTA: ${fmtT(vuelta)} · CIRCUITO: ${fmtT(total)}` : `VUELTA: ${fmtT(vuelta)}`;
    LB.confirmar(`¿SUBES TU TIEMPO A LA TABLA? ${resumen}`, async () => {
      const jobs = [LB.submit(rcLbKey(RC.trackIdx, 'lap'), vuelta, true, ex)];
      if (total != null) jobs.push(LB.submit(rcLbKey(RC.trackIdx, 'total'), total, true, ex));
      await Promise.all(jobs);
      return true;
    }).then(() => { RC.lbTrack = RC.trackIdx; rcLB(); });
  }
  if (RC.mode === 'online') rcSendMe(true);
  $('#rc-res').hidden = false;
  $('#rc-again').hidden = RC.mode === 'online' && !RC.isHost;
  rcResults();
}
function rcResults() {
  const rk = ranking();
  const me = RC.racers.find(r => r.ctrl === 'p1');
  const pos = rk.indexOf(me) + 1;
  $('#rc-res-title').textContent = RC.players === 2 && RC.mode === 'local'
    ? `¡GANA ${rk.find(r => r.ctrl !== 'cpu')?.name || ''}!`
    : pos === 1 ? '¡PRIMER LUGAR!' : `LLEGASTE ${pos}º`;
  $('#rc-res-body').innerHTML = rk.map((r, i) =>
    `<tr class="${r.ctrl === 'p1' ? 'me' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:${SLOTC[r.slot % 4]}"></span> ${esc(r.name)}${r.gone ? ' <span class="discon">⚠</span>' : ''}</td><td>${r.fin != null ? fmtT(r.fin) : (r.gone ? 'DESCONECTADO' : 'EN CARRERA')}</td><td>${r.best != null ? fmtT(r.best) : '-'}</td></tr>`).join('');
  $('#rc-res-msg').textContent = RC.mode === 'online' && !RC.isHost ? 'ESPERANDO A QUE EL ANFITRIÓN INICIE OTRA CARRERA…' : '';
}
function ordinal(n) { return n + 'º'; }
function rcDraw(now) {
  const T_ = RC.T; if (!T_) return;
  rx.drawImage(T_.img, 0, 0);
  const rk = ranking();
  for (const r of [...RC.racers].sort((a, b) => a.y - b.y)) {
    rx.save(); rx.translate(Math.round(r.x), Math.round(r.y)); rx.rotate(r.a);
    rx.fillStyle = 'rgba(15,16,32,.35)'; rx.fillRect(-6, -2, 13, 6);
    rx.drawImage(vspr(r.char, r.veh), -7, -4);
    rx.restore();
    if (r.ctrl !== 'cpu') {
      const c = SLOTC[r.slot % 4]; rx.fillStyle = c;
      const x = Math.round(r.x), y = Math.round(r.y) - 11;
      rx.fillRect(x - 2, y, 5, 1); rx.fillRect(x - 1, y + 1, 3, 1); rx.fillRect(x, y + 2, 1, 1);
    }
  }
  // HUD
  rx.font = '8px "Press Start 2P"'; rx.textAlign = 'left';
  const humans = RC.mode === 'online' ? RC.racers.filter(r => r.ctrl === 'p1') : RC.racers.filter(r => r.ctrl === 'p1' || r.ctrl === 'p2');
  humans.forEach((r, i) => {
    const lap = Math.min(LAPS, Math.max(1, r.lapsDone + 1));
    const txt = `${RC.players === 2 && RC.mode === 'local' ? 'J' + (i + 1) + ' ' : ''}V${lap}/${LAPS} ${ordinal(rk.indexOf(r) + 1)}`;
    const w = rx.measureText(txt).width + 8;
    rx.fillStyle = 'rgba(15,16,32,.75)'; rx.fillRect(4, 4 + i * 14, w, 13);
    rx.fillStyle = SLOTC[r.slot % 4]; rx.fillText(txt, 8, 14 + i * 14);
  });
  const t = RC.phase === 'count' ? 0 : ((RC.phase === 'done' ? RC.doneAt : now) - RC.t0) / 1000;
  const tt = fmtT(Math.max(0, t)); rx.textAlign = 'right';
  const w = rx.measureText(tt).width + 8;
  rx.fillStyle = 'rgba(15,16,32,.75)'; rx.fillRect(RW - 4 - w, 4, w, 13);
  rx.fillStyle = '#f4f4f4'; rx.fillText(tt, RW - 8, 14);
  if (RC.mode === 'online') {
    const gone = RC.racers.filter(r => r.ctrl === 'remote' && r.gone && r.fin == null);
    if (gone.length) {
      const txt = '⚠ ' + gone.map(r => r.name).join(', ') + ' SE DESCONECTÓ';
      rx.textAlign = 'center'; rx.font = '7px "Press Start 2P"';
      const w2 = rx.measureText(txt).width + 8;
      rx.fillStyle = 'rgba(15,16,32,.8)'; rx.fillRect(RW / 2 - w2 / 2, RH - 16, w2, 12);
      rx.fillStyle = '#ef7d57'; rx.fillText(txt, RW / 2, RH - 7);
    }
  }
  if (RC.phase === 'count' || (RC.phase === 'race' && now - RC.goAt < 700)) {
    const left = Math.ceil((RC.goAt - now) / 1000), s = left > 0 ? String(left) : '¡YA!';
    rx.textAlign = 'center'; rx.font = '24px "Press Start 2P"';
    rx.fillStyle = '#1a1c2c'; rx.fillText(s, RW / 2 + 2, RH / 2 + 12);
    rx.fillStyle = left > 0 ? '#ffcd75' : '#a7f070'; rx.fillText(s, RW / 2, RH / 2 + 10);
  }
}

/* ---- modo local ---- */
function rcLocal(players) {
  rcLeaveOnline();
  RC.mode = 'local'; RC.players = players;
  const e = [{ id: 'p1', name: playerName(), char: rcSel.c, veh: rcSel.v, ctrl: 'p1' }];
  if (players === 2) e.push({ id: 'p2', name: 'JUGADOR 2', char: rcSel.c2, veh: rcSel.v2, ctrl: 'p2' });
  const ks = [.9, .94, .97];
  while (e.length < 4) {
    const i = e.length;
    e.push({ id: 'cpu' + i, name: 'CPU ' + CHARS[(rcSel.c + i) % 3].n, char: (rcSel.c + i) % 3, veh: (i + rcSel.v) % 3, ctrl: 'cpu', k: ks[(i - 1) % 3] });
  }
  e.forEach((x, i) => x.slot = i);
  rcBegin(rcSel.t, e, rcSel.col);
}

/* ---- modo online ---- */
function rcMeDoc() { return fs.doc(db, 'races', RC.room, 'players', UID); }
function rcPushMe() {
  if (RC.mode !== 'online' || RC.phase !== 'lobby') return;
  fs.updateDoc(rcMeDoc(), { name: playerName(), char: rcSel.c, veh: rcSel.v }).catch(console.error);
}
function rcSendMe(force) {
  const me = RC.racers.find(r => r.ctrl === 'p1'); if (!me || !RC.room) return;
  fs.updateDoc(rcMeDoc(), {
    x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, a: Math.round(me.a * 100) / 100,
    total: me.total, lapsDone: me.lapsDone, fin: me.fin, best: me.best, round: RC.round
  }).catch(e => force && console.error(e));
}
async function rcCreate() {
  if (!(await fbReady)) return rcMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO MODO LOCAL.', 'lose');
  rcLeaveOnline();
  rcMenuMsg('CREANDO SALA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'races', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, { host: UID, track: rcSel.t, collisions: rcSel.col !== false, state: 'lobby', round: 0, created: fs.serverTimestamp() });
    RC.room = code;
    await fs.setDoc(rcMeDoc(), rcFreshMe(0));
    rcEnterLobby();
  } catch (e) { console.error(e); rcMenuMsg('ERROR AL CREAR SALA: ' + e.message, 'lose'); }
}
function rcFreshMe(slot) {
  return { name: playerName(), char: rcSel.c, veh: rcSel.v, slot, x: 0, y: 0, a: 0, total: 0, lapsDone: -1, fin: null, best: null, round: -1, joined: fs.serverTimestamp() };
}
async function rcJoin() {
  const code = $('#rc-code').value.trim().toUpperCase();
  if (code.length < 5) return rcMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return rcMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO MODO LOCAL.', 'lose');
  rcLeaveOnline();
  rcMenuMsg('ENTRANDO…');
  try {
    const rs = await fs.getDoc(fs.doc(db, 'races', code));
    if (!rs.exists()) throw new Error('ESA SALA NO EXISTE');
    if (rs.data().state !== 'lobby') throw new Error('LA CARRERA YA EMPEZÓ, ESPERA A QUE TERMINE');
    const ps = await fs.getDocs(fs.collection(db, 'races', code, 'players'));
    const used = new Set(); let mine = false;
    ps.forEach(d => { if (d.id === UID) mine = true; else used.add(d.data().slot); });
    if (!mine && used.size >= 4) throw new Error('LA SALA ESTÁ LLENA (MÁX. 4)');
    let slot = 0; while (used.has(slot)) slot++;
    RC.room = code;
    await fs.setDoc(rcMeDoc(), rcFreshMe(slot));
    rcEnterLobby();
  } catch (e) { RC.room = null; rcMenuMsg(e.message, 'lose'); }
}
function rcEnterLobby() {
  RC.mode = 'online'; RC.players = 1; RC.phase = 'lobby'; RC.roomData = null; RC.roomPlayers = {};
  rcMenuMsg('');
  $('#rc-room').textContent = 'SALA ' + RC.room;
  rcView('lobby'); rcSetupRender(); rcLobbyRender();
  RC.unsubs.push(fs.onSnapshot(fs.doc(db, 'races', RC.room), s => {
    if (!s.exists()) return;
    const prev = RC.roomData; RC.roomData = s.data(); RC.isHost = RC.roomData.host === UID;
    if (!prev || prev.track !== RC.roomData.track || prev.host !== RC.roomData.host || prev.collisions !== RC.roomData.collisions) rcSetupRender();
    rcOnRoom();
  }));
  RC.unsubs.push(fs.onSnapshot(fs.collection(db, 'races', RC.room, 'players'), s => {
    const m = {}; s.forEach(d => m[d.id] = d.data()); RC.roomPlayers = m;
    rcOnPlayers();
  }));
  RC.hbStop = presenceLoop(() => fs.updateDoc(rcMeDoc(), { lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
}
function rcOnRoom() {
  const d = RC.roomData;
  if (d.state === 'countdown' && d.round !== RC.round && (RC.phase === 'lobby')) {
    RC.round = d.round;
    const e = Object.entries(RC.roomPlayers).sort((a, b) => a[1].slot - b[1].slot)
      .map(([uid, p]) => ({ id: uid, name: p.name, char: p.char, veh: p.veh, slot: p.slot, ctrl: uid === UID ? 'p1' : 'remote' }));
    rcBegin(d.track, e, d.collisions !== false);
  } else if (d.state === 'lobby' && RC.phase !== 'lobby') {
    RC.phase = 'lobby'; RC.racers = [];
    fs.updateDoc(rcMeDoc(), { total: 0, lapsDone: -1, fin: null, best: null, round: -1 }).catch(console.error);
    rcView('lobby'); rcSetupRender();
  }
  rcLobbyRender();
}
function rcOnPlayers() {
  const now = Date.now();
  for (const r of RC.racers) {
    if (r.ctrl !== 'remote') continue;
    const p = RC.roomPlayers[r.id];
    if (!p) { r.gone = true; continue; }
    r.gone = isStale(p.lastSeen, now);
    if (p.round !== RC.round) continue;
    r.tx = p.x; r.ty = p.y; r.ta = p.a; r.total = p.total; r.lapsDone = p.lapsDone; r.fin = p.fin; r.best = p.best;
  }
  if (RC.roomData && RC.isHost === false && !RC.roomPlayers[RC.roomData.host] && RC.phase === 'lobby') {
    $('#rc-lobby-msg').textContent = 'EL ANFITRIÓN SALIÓ DE LA SALA.';
  }
  rcLobbyRender();
}
function rcLobbyRender() {
  if (RC.mode !== 'online') return;
  const list = Object.entries(RC.roomPlayers).sort((a, b) => a[1].slot - b[1].slot), now = Date.now();
  const ul = $('#rc-plist'); ul.innerHTML = '';
  list.forEach(([uid, p]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${SLOTC[p.slot % 4]}"></span>`;
    li.appendChild(scaled(portrait(p.char), 2));
    li.appendChild(scaled(vspr(p.char, p.veh), 2));
    const gone = uid !== UID && isStale(p.lastSeen, now);
    const s = document.createElement('span');
    s.innerHTML = `${esc(p.name)}${uid === UID ? ' (TÚ)' : ''}${RC.roomData && uid === RC.roomData.host ? ' ★' : ''}${gone ? ' <span class="discon">⚠ DESCONECTADO</span>' : ''}<br><small>${CHARS[p.char].n} · ${VEH[p.veh].n}</small>`;
    li.appendChild(s); ul.appendChild(li);
  });
  const tn = RC.roomData && RTRACKS[RC.roomData.track] ? RTRACKS[RC.roomData.track].n : '';
  const cn = 'CHOQUES: ' + (RC.roomData && RC.roomData.collisions === false ? 'NO' : 'SÍ');
  $('#rc-lobby-msg').textContent = RC.isHost
    ? `COMPARTE EL CÓDIGO ${RC.room}. CIRCUITO: ${tn}. ${cn}. JUGADORES: ${list.length}/4`
    : `ESPERANDO AL ANFITRIÓN (★)… CIRCUITO: ${tn}. ${cn}`;
  $('#rc-go').hidden = !RC.isHost;
  $('#rc-go').disabled = list.length < 1;
}
async function rcStartOnline() {
  if (!RC.isHost) return;
  try { await fs.updateDoc(fs.doc(db, 'races', RC.room), { state: 'countdown', round: (RC.roomData.round || 0) + 1 }); }
  catch (e) { console.error(e); }
}
function rcLeaveOnline() {
  RC.unsubs.forEach(u => u()); RC.unsubs = [];
  if (RC.hbStop) { RC.hbStop(); RC.hbStop = null; }
  if (RC.room && fs) {
    const room = RC.room, others = Object.keys(RC.roomPlayers).filter(u => u !== UID);
    if (RC.isHost && others.length) fs.updateDoc(fs.doc(db, 'races', room), { host: others[0] }).catch(() => {});
    fs.deleteDoc(fs.doc(db, 'races', room, 'players', UID)).catch(() => {});
  }
  RC.room = null; RC.roomData = null; RC.roomPlayers = {}; RC.isHost = false; RC.round = 0;
}
/* ---- espectador ---- */
function rcSpecStop() {
  RC.specUnsubs.forEach(u => u()); RC.specUnsubs = [];
  RC.spectating = false;
}
async function rcSpecOpen(code) {
  rcToMenu(); rcSpecStop();
  RC.spectating = true; RC.room = code;
  $('#rc-spec-list').hidden = true;
  $('#rc-spec-room').textContent = '👁 ESPECTADOR · SALA ' + code;
  rcView('spectate');
  let roomData = null, players = {};
  const render = () => {
    if (!roomData) return;
    const rk = Object.entries(players).sort((a, b) => (b[1].total || -999) - (a[1].total || -999));
    const now = Date.now();
    $('#rc-spec-standings').innerHTML = rk.length ? rk.map(([uid, p], i) => {
      const gone = isStale(p.lastSeen, now);
      return `<li><span class="rk">${i + 1}.</span><span class="nm">${esc(p.name)}${gone ? ' <span class="discon">⚠</span>' : ''}</span><span class="sc">${p.fin != null ? fmtT(p.fin) : (p.lapsDone >= 0 ? 'VUELTA ' + (p.lapsDone + 1) : '-')}</span></li>`;
    }).join('') : '<li class="muted">SIN JUGADORES</li>';
    $('#rc-spec-msg').textContent = `CIRCUITO: ${RTRACKS[roomData.track] ? RTRACKS[roomData.track].n : '?'} · ${roomData.state === 'lobby' ? 'EN LOBBY' : 'EN CARRERA'}`;
  };
  RC.specUnsubs.push(fs.onSnapshot(fs.doc(db, 'races', code), s => {
    if (!s.exists()) { $('#rc-spec-msg').textContent = 'LA SALA SE CERRÓ.'; return; }
    roomData = s.data(); render();
  }));
  RC.specUnsubs.push(fs.onSnapshot(fs.collection(db, 'races', code, 'players'), s => {
    const m = {}; s.forEach(d => m[d.id] = d.data()); players = m; render();
  }));
}
$('#rc-spec-leave').onclick = () => { rcSpecStop(); rcToMenu(); };
$('#rc-spec-btn').onclick = async () => {
  const list = $('#rc-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('races');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  list.innerHTML = rooms.length
    ? rooms.map(r => `<li><span><b>SALA ${r.code}</b><small>${RTRACKS[r.data.track] ? RTRACKS[r.data.track].n : '?'} · ${r.data.state === 'lobby' ? 'EN LOBBY' : 'EN CARRERA'}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY SALAS RECIENTES</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); rcSpecOpen(b.dataset.code); });
};
function rcToMenu() {
  if (RC.mode === 'online') rcLeaveOnline();
  RC.mode = null; RC.phase = 'menu'; RC.racers = []; RC.T = null;
  rcView('menu'); rcSetupRender();
}

$('#rc-local1').onclick = () => rcLocal(1);
$('#rc-local2').onclick = () => rcLocal(2);
$('#rc-create').onclick = rcCreate;
$('#rc-join').onclick = rcJoin;
$('#rc-code').addEventListener('keydown', e => { if (e.key === 'Enter') rcJoin(); });
$('#rc-go').onclick = rcStartOnline;
$('#rc-leave').onclick = rcToMenu;
$('#rc-exit').onclick = rcToMenu;
$('#rc-quit').onclick = pedirAbandonar(rcToMenu);
$('#rc-again').onclick = () => {
  if (RC.mode === 'local') rcLocal(RC.players);
  else if (RC.isHost) fs.updateDoc(fs.doc(db, 'races', RC.room), { state: 'lobby' }).catch(console.error);
};
document.querySelectorAll('.touch [data-k]').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); RC.touch[k] = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { RC.touch[k] = false; }));
});
window.addEventListener('beforeunload', () => { if (RC.mode === 'online') rcLeaveOnline(); });
rcSetupRender(); rcLB(); rcView('menu');

// --- conexión con la página (antes en arcade.html) ---
const RC_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
bucle((dt, now) => {
  if (RC.T && (RC.phase === 'count' || RC.phase === 'race' || RC.phase === 'done')) { rcUpdate(dt, now); rcDraw(now); }
});
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (RC_KEYS.has(e.code)) { RC.keys[e.code] = true; if (RC.T) e.preventDefault(); }
});
document.addEventListener('keyup', e => { if (RC_KEYS.has(e.code)) RC.keys[e.code] = false; });
window.addEventListener('blur', () => { RC.keys = {}; });
