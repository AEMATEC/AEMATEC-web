import './shell.js';
import { db, fs, UID, fbReady, $, esc, store, playerName, genCode, isStale, liveRooms, presenceLoop, SFX, LB, scaled, pxCircle, fitSoon, expiraEn } from './core.js';
import { pedirAbandonar, pickRow, bucle } from './pagina.js';
import { TEAMC, soldier, tinyText } from './compartido-juegos.js';

/* ---- lector seguro de funciones matemáticas (sin eval) ---- */
const FC_KEYS = {}; // flechas y WASD que están apretadas
const FC_FN = {
  asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsen: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, raiz: Math.sqrt,
  sin: Math.sin, sen: Math.sin, cos: Math.cos, tan: Math.tan, tg: Math.tan, abs: Math.abs,
  exp: Math.exp, log: Math.log10, ln: Math.log, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign
};
const FC_NAMES = [...Object.keys(FC_FN), 'pi', 'x', 'e'].sort((a, b) => b.length - a.length);
// sen = sin, ln = logaritmo natural, log = base 10, e^x = exp(x), abs(x) = |x|
const fcNorm = src => String(src).toLowerCase().replace(/\s+/g, '').replace(/π/g, 'pi').replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/[−–]/g, '-').replace(/^(y|f\(x\))=/, '');
// Reflejo sobre el eje Y: cambia cada x por (-x). Devuelve null si no entiende la expresión.
function fcReflect(src) {
  const s = fcNorm(src); let out = '';
  for (let i = 0; i < s.length;) {
    if (/[a-z]/.test(s[i])) {
      const n = FC_NAMES.find(k => s.startsWith(k, i)); if (!n) return null;
      out += n === 'x' ? '(-x)' : n; i += n.length;
    } else out += s[i++];
  }
  return out.replace(/\(\(-x\)\)/g, '(-x)');
}
function fcCompile(src) {
  const s = fcNorm(src);
  if (!s) throw new Error('ESCRIBE UNA FUNCIÓN');
  if (s.length > 80) throw new Error('FUNCIÓN DEMASIADO LARGA');
  let i = 0;
  const peek = () => s[i];
  function expr() {
    let a = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++], b = term(), A = a;
      a = op === '+' ? x => A(x) + b(x) : x => A(x) - b(x);
    }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      const c = peek();
      if (c === '*' || c === '/') { i++; const b = unary(), A = a; a = c === '*' ? x => A(x) * b(x) : x => A(x) / b(x); }
      else if (c !== undefined && /[0-9.a-z(]/.test(c)) { const b = power(), A = a; a = x => A(x) * b(x); }
      else break;
    }
    return a;
  }
  function unary() {
    if (peek() === '-') { i++; const a = unary(); return x => -a(x); }
    if (peek() === '+') { i++; return unary(); }
    return power();
  }
  function power() {
    const b = atom();
    if (peek() === '^') { i++; const e = unary(); return x => Math.pow(b(x), e(x)); }
    return b;
  }
  function atom() {
    const c = peek();
    if (c === undefined) throw new Error('LA FUNCIÓN ESTÁ INCOMPLETA');
    if (c === '(') { i++; const a = expr(); if (s[i] !== ')') throw new Error('FALTA CERRAR UN PARÉNTESIS )'); i++; return a; }
    if (c === '|') { i++; const a = expr(); if (s[i] !== '|') throw new Error('FALTA CERRAR UN |'); i++; return x => Math.abs(a(x)); }
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
      if (!m) throw new Error('NÚMERO NO VÁLIDO');
      i += m[0].length; const v = +m[0]; return () => v;
    }
    if (/[a-z]/.test(c)) {
      const name = FC_NAMES.find(n => s.startsWith(n, i));
      if (!name) throw new Error('NO CONOZCO: ' + s.slice(i).match(/^[a-z]+/)[0].toUpperCase());
      i += name.length;
      if (name === 'x') return x => x;
      if (name === 'pi') return () => Math.PI;
      if (name === 'e') return () => Math.E;
      const f = FC_FN[name], arg = power();
      return x => f(arg(x));
    }
    throw new Error('SÍMBOLO NO VÁLIDO: ' + c);
  }
  const f = expr();
  if (i < s.length) throw new Error('SOBRA ALGO: ' + s.slice(i));
  return f;
}

/* =========================================================
   COMBATE DE FUNCIONES
   Plano: x ∈ [-25, 25], y ∈ [-15, 15]. La curva y = f(x) se desplaza
   verticalmente para salir del personaje: y = f(x) − f(x₀) + y₀
   (igual que Graph War; ver docs/arcade-combate-disparo.md)
   ========================================================= */
const FW = 400, FH = 240, SC = 8, XR = 25, YR = 15, TURN_S = 20, MOVE = 5, URAD = .9, HOLE = 1.6;
// Trazado del disparo: paso normal en x, subida máxima por paso (se achica el paso si la curva es empinada),
// paso mínimo y salto máximo que se une con una línea vertical (más grande = asíntota: el disparo termina).
const FC_DX = .01, FC_DY = .25, FC_DXMIN = 1e-6, FC_JUMP = 3;
// Sprite de 7×9 dibujado al doble (14×18 px); el impacto sigue siendo un círculo de radio URAD (7.2 px).
const FC_SPR = 2;
const FC_BOT = [{ n: 'FÁCIL', miss: .3 }, { n: 'MEDIO', miss: .2 }, { n: 'DIFÍCIL', miss: .1 }];
const FC_TINT = ['rgba(100,150,255,.15)', 'rgba(255,100,100,.15)', 'rgba(120,240,120,.12)', 'rgba(255,215,110,.12)'];
const fcClampT = v => { v = Math.round(Number(v)); return v >= 10 && v <= 60 ? v : TURN_S; };
const wx2p = x => (x + XR) * SC, wy2p = y => (YR - y) * SC;
const p2wx = px => px / SC - XR, p2wy = py => YR - py / SC;
const FC_TRACKS = [
  { n: 'PRADERA', pal: { b1: '#1f4d3a', b2: '#1c4535', grid: '#2c6b50', axis: '#a7f070', o1: '#566c86', o2: '#4d6079', edge: '#29304a' },
    obs: [{ c: [0, 0, 4] }, { c: [-10, 8, 2.5] }, { c: [11, -7, 3] }, { c: [-12, -9, 2] }, { c: [13, 9, 2] }, { c: [-4, -11, 1.5] }, { c: [5, 11, 1.5] }] },
  { n: 'CAÑÓN', pal: { b1: '#5a3a22', b2: '#52351f', grid: '#7a5232', axis: '#ffcd75', o1: '#b13e53', o2: '#9c3548', edge: '#3a1420' },
    obs: [{ r: [-1, -15, 2, 12] }, { r: [-1, 4, 2, 11] }, { c: [-9, 4, 2.5] }, { c: [9, -4, 2.5] }, { c: [-15, -6, 1.8] }, { c: [15, 6, 1.8] }] },
  { n: 'ISLAS', pal: { b1: '#29366f', b2: '#253163', grid: '#3b5dc9', axis: '#73eff7', o1: '#38b764', o2: '#2f9e56', edge: '#1a4a3a' },
    obs: [{ c: [-14, 7, 2.5] }, { c: [-6, -3, 3] }, { c: [0, 9, 2] }, { c: [5, -9, 2.5] }, { c: [7, 3, 3] }, { c: [15, -3, 2.5] }, { c: [-16, -9, 2] }, { c: [-2, -12, 1.5] }, { c: [16, 10, 1.8] }, { c: [-8, 12, 1.5] }] },
  { n: 'FORTALEZA', pal: { b1: '#333c57', b2: '#2e3650', grid: '#4a5578', axis: '#ef7d57', o1: '#94b0c2', o2: '#8599aa', edge: '#1a1c2c' },
    obs: [{ r: [-7, 5, 14, 1.6] }, { r: [-7, -6.6, 14, 1.6] }, { r: [-7, -5, 1.6, 3.5] }, { r: [5.4, 1.5, 1.6, 3.5] }, { c: [0, 0, 1.8] }, { c: [-17, 0, 2.2] }, { c: [17, 0, 2.2] }, { r: [-12, 10, 1.6, 5] }, { r: [10.4, -15, 1.6, 5] }] },
];
const FC_FMT = { '1v1': { n: '1 VS 1', seats: 2, per: 4 }, '2v2': { n: '2 VS 2', seats: 4, per: 2 }, 'ffa': { n: 'TODOS CONTRA TODOS', seats: 4, per: 4 } };

const TEAMN = ['AZUL', 'NARANJA', 'VERDE', 'AMARILLO'];
const teamOf = (fmt, seat) => fmt === 'ffa' ? seat : seat % 2;
function fcZone(fmt, seat) {
  if (fmt === 'ffa') return [[-24, -3, 1, 14], [3, 24, -14, -1], [-24, -3, -14, -1], [3, 24, 1, 14]][seat];
  return teamOf(fmt, seat) === 0 ? [-24, -7, -14, 14] : [7, 24, -14, 14];
}

const FC = {
  mode: null, fmt: store.get('pa_fc_fmt', '1v1'), ffaN: 4, track: store.get('pa_fc_track', 0), phase: 'menu',
  seats: [], turn: null, ptr: [], turnN: 0, tEnd: 0, moveLeft: MOVE, dir: 1, holes: [], terrain: null, img: null,
  anim: null, fx: [], placeSeat: 0, mv: {}, mouse: null, room: null, roomData: null, roomPlayers: {}, unsubs: [], me: 0,
  isHost: false, lastSend: 0, turnSeenAt: 0, won: false, hbStop: null, spectating: false, elimSent: null,
  turnS: fcClampT(store.get('pa_fc_ts', TURN_S)), preview: store.get('pa_fc_prev', false) === true, botLvl: store.get('pa_fc_bot', 1),
  lseats: store.get('pa_fc_lseats', null), sched: null, piAxis: store.get('pa_fc_pi', false) === true, localLbl: '',
  prev: null, prevAt: 0, prevDirty: false, hint: false, bot: null, lostWhy: '', autoFired: false, shakeUntil: 0, lastLeft: -1
};
if (!FC_FMT[FC.fmt]) FC.fmt = '1v1';
if (!FC_BOT[FC.botLvl]) FC.botLvl = 1;
{ // asientos del modo local: 'h' humano, 'b' bot, '-' vacío (a = equipo azul, b = naranja, f = todos contra todos)
  const L = FC.lseats && typeof FC.lseats === 'object' ? FC.lseats : {}, ok = (v, e) => v === 'h' || v === 'b' || (e && v === '-');
  const arr = (a, n, e, d) => [...Array(n)].map((_, i) => Array.isArray(a) && ok(a[i], e && i > 0) ? a[i] : d[i]);
  FC.lseats = { a: arr(L.a, 2, true, ['h', '-']), b: arr(L.b, 2, true, ['b', '-']), f: arr(L.f, 4, false, ['h', 'b', 'b', 'b']),
    tf: [0, 1, 2, 3].map(i => Array.isArray(L.tf) && L.tf[i] >= 0 && L.tf[i] <= 3 ? L.tf[i] | 0 : i) }; // tf: equipo elegido por asiento en TODOS VS TODOS
  FC.lseats.a[0] = 'h'; FC.lseats.f[0] = 'h';
}
const fcv = $('#fc-cv'), fx = fcv.getContext('2d');
fx.imageSmoothingEnabled = false;

function fcBuildTerrain(track, holes) {
  const t = FC_TRACKS[track], m = new Uint8Array(FW * FH);
  for (let py = 0; py < FH; py++) for (let px = 0; px < FW; px++) {
    const x = p2wx(px + .5), y = p2wy(py + .5);
    let s = 0;
    for (const o of t.obs) {
      if (o.c ? Math.hypot(x - o.c[0], y - o.c[1]) <= o.c[2] : (x >= o.r[0] && x <= o.r[0] + o.r[2] && y >= o.r[1] && y <= o.r[1] + o.r[3])) { s = 1; break; }
    }
    if (s) for (const h of holes) if (Math.hypot(x - h.x, y - h.y) <= HOLE) { s = 0; break; }
    m[py * FW + px] = s;
  }
  return m;
}
function fcRenderTerrain(track, m, img, pi) {
  img.width = FW; img.height = FH;
  const g = img.getContext('2d'), id = g.createImageData(FW, FH), p = FC_TRACKS[track].pal;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const C = {}; for (const k in p) C[k] = hex(p[k]);
  for (let py = 0; py < FH; py++) for (let px = 0; px < FW; px++) {
    const q = py * FW + px, h = ((px * 73856093) ^ (py * 19349663)) >>> 0;
    let c;
    if (m[q]) {
      const edge = px === 0 || py === 0 || px === FW - 1 || py === FH - 1 || !m[q - 1] || !m[q + 1] || !m[q - FW] || !m[q + FW];
      c = edge ? C.edge : (h % 5 === 0 ? C.o2 : C.o1);
    } else if (px === 200 || py === 120) c = C.axis;
    else if (px % 40 === 0 || py % 40 === 0) c = C.grid;
    else c = h % 9 === 0 ? C.b2 : C.b1;
    id.data.set([c[0], c[1], c[2], 255], q * 4);
  }
  g.putImageData(id, 0, 0);
  if (pi) {
    // Solo cambian los rótulos: la escala es la misma (x = 3.14 cae en «π»). Marca cada π/2 y rotula cada π.
    for (let k = -15; k <= 15; k++) {
      const v = k * Math.PI / 2; if (!k || Math.abs(v) > XR - 1) continue;
      const px = Math.round(wx2p(v)), big = k % 2 === 0;
      if (!m[121 * FW + px]) { g.fillStyle = p.axis; g.fillRect(px, big ? 118 : 119, 1, big ? 5 : 3); }
      const t = big ? (k === 2 ? 'π' : k === -2 ? '-π' : k / 2 + 'π') : k === 1 ? 'π/2' : k === -1 ? '-π/2' : '';
      // π/2 y -π/2 van encima del eje para no chocar con «π» y «-π»
      if (t) tinyText(g, t, px - [...t].length * 2 + 1, big ? 124 : 112, p.axis);
    }
  } else for (const v of [-20, -15, -10, -5, 5, 10, 15, 20]) {
    const px = wx2p(v); if (!m[121 * FW + px]) { g.fillStyle = p.axis; g.fillRect(px, 118, 1, 5); }
    tinyText(g, String(v), px - String(v).length * 2 + 1, 124, p.axis);
  }
  for (const v of [-10, -5, 5, 10]) {
    const py = wy2p(v); g.fillStyle = p.axis; g.fillRect(198, py, 5, 1);
    tinyText(g, String(v), 205, py - 2, p.axis);
  }
  tinyText(g, 'x', FW - 6, 112, p.axis); tinyText(g, 'y', 204, 2, p.axis);
}
function fcTerrain() {
  FC.terrain = fcBuildTerrain(FC.track, FC.holes);
  FC.img = FC.img || document.createElement('canvas');
  fcRenderTerrain(FC.track, FC.terrain, FC.img, FC.piAxis);
}
const fcSolid = (x, y) => { const px = Math.floor(wx2p(x)), py = Math.floor(wy2p(y)); if (px < 0 || py < 0 || px >= FW || py >= FH) return 1; return FC.terrain[py * FW + px]; };
function fcFree(x, y, r = .6) {
  if (Math.abs(x) > XR - .6 || Math.abs(y) > YR - .6) return false;
  if (fcSolid(x, y)) return false;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (fcSolid(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false; }
  return true;
}

/* ---- simulación del disparo ----
   Como en Graph War: y = f(x) − f(x₀) + y₀ (la gráfica se sube o baja hasta pasar por el personaje)
   y se recorre desde x₀ hacia la dirección elegida; x es la coordenada real del mapa.
   El paso en x se achica donde la curva es muy empinada (antes, una subida de más de 25 unidades
   en un paso de 0.01 cortaba el disparo sin dibujarlo): así una parte casi vertical también choca.
   Un salto que no se achica al reducir el paso es una asíntota (1/x, tan x): ahí termina el disparo. */
function fcSim(fn, x0, y0, dir, shooter) {
  const c = fn(x0);
  if (!isFinite(c)) { const e = new Error('LA FUNCIÓN NO ESTÁ DEFINIDA EN x = ' + x0.toFixed(1)); e.undef = true; throw e; }
  const F = x => fn(x) - c + y0;
  let px = x0, py = y0, dx = FC_DX;
  const pts = [[px, py]], kills = [], killed = new Set();
  let lastPt = [px, py];
  const push = (x, y, force) => { if (force || Math.hypot(x - lastPt[0], y - lastPt[1]) > .12) { pts.push([x, y]); lastPt = [x, y]; } };
  for (let it = 0; it < 60000; it++) {
    let d = dx, nx = px + d * dir, ny = F(nx);
    while (!(isFinite(ny) && Math.abs(ny - py) <= FC_DY) && d > FC_DXMIN) { d /= 2; nx = px + d * dir; ny = F(nx); }
    if (!isFinite(ny) || Math.abs(ny - py) > FC_JUMP) { push(px, py, true); return { pts, kills, end: null }; }
    dx = Math.min(FC_DX, d * 2);
    const len = Math.hypot(nx - px, ny - py);
    const sub = Math.max(1, Math.ceil(len / .08));
    for (let k = 1; k <= sub; k++) {
      const x = px + (nx - px) * k / sub, y = py + (ny - py) * k / sub;
      if (x < -XR || x > XR || y < -YR || y > YR) { push(x, y, true); return { pts, kills, end: null }; }
      FC.seats.forEach((s, si) => s.units.forEach((u, ui) => {
        const id = si + ':' + ui;
        if (!u.alive || id === shooter || killed.has(id)) return;
        if (Math.hypot(u.x - x, u.y - y) < URAD) { killed.add(id); kills.push(id); }
      }));
      if (fcSolid(x, y)) { push(x, y, true); return { pts, kills, end: [Math.round(x * 100) / 100, Math.round(y * 100) / 100] }; }
      push(x, y);
    }
    px = nx; py = ny;
  }
  push(px, py, true);
  return { pts, kills, end: null };
}

/* ---- turnos ---- */
// sched (solo local): orden de asientos por ronda; un jugador solo contra dos aparece dos veces
// (p. ej. [0, 1, 0, 2]) para que cada equipo dispare lo mismo. Sin sched: 0, 1, 2, 3… como antes.
function fcNextTurn(seats, ptr, turn, sched) {
  const order = sched || seats.map((_, i) => i), n = order.length; ptr = [...ptr];
  let k0 = turn.k != null ? turn.k : order.lastIndexOf(turn.seat);
  if (k0 < -1) k0 = -1;
  for (let k = 1; k <= n; k++) {
    const kk = (k0 + k) % n, s = order[kk], alive = [];
    seats[s].units.forEach((u, i) => u.alive && alive.push(i));
    if (!alive.length) continue;
    let j = alive.find(i => i > ptr[s]); if (j === undefined) j = alive[0];
    ptr[s] = j;
    const t = { seat: s, unit: j }; if (sched) t.k = kk;
    return { turn: t, ptr };
  }
  return { turn: null, ptr };
}
const fcTeamsAlive = seats => new Set(seats.filter(s => s.units.some(u => u.alive)).map(s => s.team));
const fcCur = () => FC.turn ? FC.seats[FC.turn.seat].units[FC.turn.unit] : null;
const fcMine = () => FC.phase === 'play' && FC.turn && (FC.mode === 'local' ? !FC.seats[FC.turn.seat].bot : FC.turn.seat === FC.me);
const fcBotTurn = () => FC.mode === 'local' && FC.turn && FC.seats[FC.turn.seat] && FC.seats[FC.turn.seat].bot;
const fcPer = s => (FC.seats[s] && FC.seats[s].per) || FC_FMT[FC.fmt].per;
const fcSeatZone = s => (FC.seats[s] && FC.seats[s].zone) || fcZone(FC.fmt, s);

/* ---- interfaz ---- */
function fcSetupRender() {
  store.set('pa_fc_fmt', FC.fmt); store.set('pa_fc_track', FC.track);
  const online = FC.mode === 'online', lock = online && !FC.isHost;
  const fmtItems = [
    { k: '1v1', html: '1 VS 1<br><small>4 PERSONAJES C/U</small>' },
    { k: '2v2', html: '2 VS 2<br><small>EQUIPOS DE 4</small>' },
    { k: 'ffa3', html: 'TODOS VS TODOS<br><small>3 JUGADORES</small>' },
    { k: 'ffa4', html: 'TODOS VS TODOS<br><small>4 JUGADORES</small>' },
  ].filter(it => !(online && it.k === 'ffa3'));
  const L = FC.lseats, na = L.a.filter(v => v !== '-').length, nb = L.b.filter(v => v !== '-').length;
  // en el menú, si los equipos locales son desiguales (1 VS 2…) no se marca 1 VS 1 ni 2 VS 2
  const curK = FC.fmt === 'ffa' ? (online ? 'ffa4' : 'ffa' + FC.ffaN) : !online && na !== nb ? '' : FC.fmt;
  pickRow($('#fc-fmt'), fmtItems.map(it => ({ html: online && it.k === 'ffa4' ? 'TODOS VS TODOS<br><small>3 O 4 JUGADORES</small>' : it.html })),
    fmtItems.findIndex(it => it.k === curK), i => {
      const k = fmtItems[i].k; SFX.play('click');
      if (k.startsWith('ffa')) { FC.fmt = 'ffa'; FC.ffaN = +k[3]; } else FC.fmt = k;
      if (!online && k === '1v1') { L.a[1] = '-'; L.b[1] = '-'; }
      if (!online && k === '2v2') { if (L.a[1] === '-') L.a[1] = 'h'; if (L.b[1] === '-') L.b[1] = L.b[0]; }
      if (online) fs.updateDoc(fs.doc(db, 'fights', FC.room), { fmt: FC.fmt }).catch(console.error);
      fcSetupRender(); fcLobbyRender();
    });
  pickRow($('#fc-track'), FC_TRACKS.map((t, i) => {
    const m = fcBuildTerrain(i, []), c = document.createElement('canvas'); fcRenderTerrain(i, m, c);
    const th = document.createElement('canvas'); th.width = 100; th.height = 60; const g = th.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 100, 60);
    return { canvas: th, html: t.n };
  }), FC.track, i => {
    SFX.play('click'); FC.track = i;
    if (online) fs.updateDoc(fs.doc(db, 'fights', FC.room), { track: i }).catch(console.error);
    fcSetupRender();
  });
  $('#fc-fmt').querySelectorAll('.btn').forEach(b => b.disabled = lock);
  $('#fc-track').querySelectorAll('.btn').forEach(b => b.disabled = lock);
  if (!online) { store.set('pa_fc_ts', FC.turnS); store.set('pa_fc_prev', FC.preview); store.set('pa_fc_bot', FC.botLvl); store.set('pa_fc_lseats', FC.lseats); }
  $('#fc-ts-v').textContent = FC.turnS + ' s';
  $('#fc-ts-m').disabled = lock || FC.turnS <= 10; $('#fc-ts-p').disabled = lock || FC.turnS >= 60;
  const pv = $('#fc-prev-t'); pv.textContent = FC.preview ? 'SÍ' : 'NO'; pv.className = 'btn ' + (FC.preview ? 'on' : 'gray'); pv.disabled = lock;
  fcSeatsRender();
}
// Editor de asientos del modo local: cada botón cambia HUMANO → BOT → VACÍO. El primer asiento azul eres tú.
function fcSeatsRender() {
  const online = FC.mode === 'online', L = FC.lseats, box = $('#fc-seats'), ffa = FC.fmt === 'ffa';
  $('#fc-seats-sec').hidden = online;
  box.innerHTML = '';
  const row = (title, color, key, n) => {
    const d = document.createElement('div'); d.className = 'fc-team';
    const b = document.createElement('b'); b.textContent = title; b.style.color = color; d.appendChild(b);
    for (let i = 0; i < n; i++) {
      const v = L[key][i], you = i === 0 && key !== 'b', btn = document.createElement('button');
      btn.className = 'btn' + (you ? ' on' : v === 'b' ? ' bot' : v === '-' ? ' empty' : '');
      btn.textContent = you ? 'TÚ' : v === 'b' ? 'BOT' : v === '-' ? '+ AGREGAR' : 'HUMANO';
      btn.disabled = you;
      btn.onclick = () => {
        SFX.play('click');
        const cyc = i === 0 || key === 'f' ? { h: 'b', b: 'h' } : { '-': 'h', h: 'b', b: '-' };
        L[key][i] = cyc[v] || 'h';
        const na = L.a.filter(q => q !== '-').length, nb = L.b.filter(q => q !== '-').length;
        if (key !== 'f' && na === nb) FC.fmt = na === 1 ? '1v1' : '2v2';
        fcSetupRender();
      };
      d.appendChild(btn);
      if (key === 'f') { // equipo de este asiento (solo local): mismo color = aliados
        const tb = document.createElement('button'), t = L.tf[i]; tb.className = 'btn'; tb.style.color = TEAMC[t]; tb.textContent = 'EQ. ' + TEAMN[t];
        tb.onclick = () => { SFX.play('click'); L.tf[i] = (t + 1) % 4; fcSetupRender(); };
        d.appendChild(tb);
      }
    }
    box.appendChild(d);
  };
  let bots;
  if (ffa) { row('TODOS VS TODOS', TEAMC[3], 'f', FC.ffaN); bots = L.f.slice(0, FC.ffaN).filter(v => v === 'b').length; }
  else { row('EQUIPO AZUL', TEAMC[0], 'a', 2); row('EQUIPO NARANJA', TEAMC[1], 'b', 2); bots = [...L.a, ...L.b].filter(v => v === 'b').length; }
  const na = L.a.filter(v => v !== '-').length, nb = L.b.filter(v => v !== '-').length;
  $('#fc-seats-lbl').textContent = (ffa ? `${FC.ffaN} JUGADORES, 4 PERSONAJES C/U · TOCA EQ. PARA ELEGIR EQUIPO (IGUAL COLOR = ALIADOS)` : `PARTIDA LOCAL: ${na} VS ${nb} (4 PERSONAJES POR EQUIPO)`) + (bots ? ` · ${bots} BOT${bots > 1 ? 'S' : ''}` : '');
  $('#fc-bot-sec').hidden = online || !bots;
  pickRow($('#fc-bot'), FC_BOT.map((b, i) => ({ html: `${b.n}<br><small>FALLA ~${Math.round(b.miss * 100)}%${i === 2 ? ' · SUMA AL TOP' : ''}</small>` })), FC.botLvl, i => { SFX.play('click'); FC.botLvl = i; fcSetupRender(); });
}
function fcSetTurnS(v) {
  const online = FC.mode === 'online'; if (online && !FC.isHost) return;
  FC.turnS = Math.max(10, Math.min(60, v)); SFX.play('click');
  if (online) fs.updateDoc(fs.doc(db, 'fights', FC.room), { turnS: FC.turnS }).catch(console.error);
  fcSetupRender(); fcLobbyRender();
}
function fcView(v) {
  $('#fc-setup').hidden = !(v === 'menu' || v === 'lobby');
  $('#fc-menu').hidden = v !== 'menu';
  $('#fc-lobby').hidden = v !== 'lobby';
  $('#fc-game').hidden = v !== 'game';
  fitSoon();
}
function fcMenuMsg(t, cls = '') { const m = $('#fc-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }
function fcMsg(t, cls = '') { const m = $('#fc-msg'); m.textContent = t; m.className = 'sub ' + cls; }
function fcLB() { LB.render($('#fc-lb'), 'funciones', false, r => `${r.score} ${r.score === 1 ? 'VICTORIA' : 'VICTORIAS'}${r.extra ? `<small>${esc(r.extra)}</small>` : ''}`); }

function fcUI() {
  const place = FC.phase === 'place' && !FC.spectating, play = (FC.phase === 'play' || FC.phase === 'anim' || FC.phase === 'wait') && !FC.spectating;
  $('#fc-place').hidden = !place;
  $('#fc-ctrl').hidden = !play;
  const mine = fcMine();
  ['#fc-fx', '#fc-dir', '#fc-fire'].forEach(s => $(s).disabled = !mine);
  document.querySelectorAll('#fc-ctrl .mv .btn').forEach(b => b.disabled = !mine);
  $('#fc-dir').textContent = FC.dir > 0 ? 'DER ▶' : '◀ IZQ';
  let turnTxt = '';
  if (FC.spectating && FC.phase === 'place') {
    turnTxt = '👁 MODO ESPECTADOR: LOS JUGADORES ESTÁN COLOCANDO SUS PERSONAJES…';
  } else if (place) {
    const s = FC.mode === 'local' ? FC.placeSeat : FC.me, seat = FC.seats[s], per = fcPer(s);
    turnTxt = `<span style="color:${TEAMC[seat.team]}">${esc(seat.name)}</span>: ${seat.bot ? 'COLOCANDO PERSONAJES…' : `COLOCA ${per - seat.units.length} PERSONAJE(S) EN TU ZONA`}`;
    $('#fc-place').hidden = !!seat.bot;
    $('#fc-ready').hidden = FC.mode === 'local';
    $('#fc-ready').disabled = seat.units.length < per || seat.ready;
    if (FC.mode === 'online' && seat.ready) turnTxt = 'ESPERANDO A QUE LOS DEMÁS COLOQUEN SUS PERSONAJES…';
  } else if (FC.turn) {
    const seat = FC.seats[FC.turn.seat];
    turnTxt = `TURNO: <span style="color:${TEAMC[seat.team]}">${seat.bot ? '🤖 ' : ''}${esc(seat.name)}</span> · PERSONAJE ${FC.turn.unit + 1}${mine && FC.mode === 'online' ? ' (TÚ)' : ''}`;
  }
  if (FC.mode === 'online' && FC.roomData && FC.roomData.order && FC.phase !== 'place') {
    const now = Date.now();
    const goneNames = FC.roomData.order
      .map((uid, i) => ({ p: FC.roomPlayers[uid], seat: FC.seats[i] }))
      .filter(({ p, seat }) => seat && seat.units.some(u => u.alive) && (!p || isStale(p.lastSeen, now)))
      .map(({ seat }) => seat.name);
    if (goneNames.length) turnTxt += ` <span class="discon">⚠ ${esc(goneNames.join(', '))} DESCONECTADO</span>`;
  }
  $('#fc-turn').innerHTML = turnTxt;
  fitSoon();
}
function fcStartLocal() {
  if (FC.fmt === 'ffa' && new Set(FC.lseats.tf.slice(0, FC.ffaN)).size < 2) { fcMenuMsg('NECESITAS AL MENOS DOS EQUIPOS DISTINTOS: CAMBIA EL EQUIPO (EQ.) DE ALGÚN JUGADOR.', 'lose'); SFX.play('miss'); return; }
  fcLeaveOnline();
  FC.mode = 'local'; FC.me = 0; FC.sched = null;
  const L = FC.lseats; let hn = 0, bn = 0;
  const mk = (v, team, per, zone) => v === 'b'
    ? { name: 'BOT ' + (++bn), bot: true, lvl: FC.botLvl, team, per, zone, units: [] }
    : { name: hn++ === 0 ? playerName() : 'JUGADOR ' + hn, bot: false, team, per, zone, units: [] };
  if (FC.fmt === 'ffa') {
    FC.seats = L.f.slice(0, FC.ffaN).map((v, i) => mk(i === 0 ? 'h' : v, L.tf[i], 4, fcZone('ffa', i)));
    FC.localLbl = 'FFA ' + FC.ffaN + (new Set(L.tf.slice(0, FC.ffaN)).size < FC.ffaN ? ' EQUIPOS' : '');
  } else {
    // Cada equipo tiene 4 personajes: 1 jugador = 4, 2 jugadores = 2 cada uno. Asientos intercalados A, B, A, B.
    const A = L.a.filter(v => v !== '-'), B = L.b.filter(v => v !== '-'), ia = [], ib = [];
    FC.seats = [];
    for (let i = 0; i < 2; i++) {
      if (A[i]) { ia.push(FC.seats.length); FC.seats.push(mk(i === 0 ? 'h' : A[i], 0, 4 / A.length, fcZone('1v1', 0))); }
      if (B[i]) { ib.push(FC.seats.length); FC.seats.push(mk(B[i], 1, 4 / B.length, fcZone('1v1', 1))); }
    }
    // orden de turnos: los equipos se alternan; el jugador solo juega dos veces por ronda en 1 VS 2
    FC.sched = [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) FC.sched.push(ia[i % ia.length], ib[i % ib.length]);
    if (A.length === B.length) FC.fmt = A.length === 1 ? '1v1' : '2v2';
    FC.localLbl = `${A.length} VS ${B.length}`;
  }
  fcBeginPlacement();
}
function fcBeginPlacement() {
  FC.holes = []; fcTerrain();
  FC.phase = 'place'; FC.placeSeat = 0; FC.turn = null; FC.anim = null; FC.fx = []; FC.won = false;
  $('#fc-over').hidden = true;
  fcView('game'); fcUI();
  fcMsg('TOCA EL MAPA DENTRO DE LA ZONA ILUMINADA PARA COLOCAR CADA PERSONAJE.');
}
function fcTryPlace(x, y) {
  const s = FC.mode === 'local' ? FC.placeSeat : FC.me, seat = FC.seats[s], per = fcPer(s);
  if (seat.units.length >= per || seat.ready || seat.bot) return false;
  const z = fcSeatZone(s);
  if (x < z[0] || x > z[1] || y < z[2] || y > z[3]) { fcMsg('FUERA DE TU ZONA', 'lose'); SFX.play('miss'); return false; }
  if (!fcFree(x, y, 1)) { fcMsg('HAY UN OBSTÁCULO AHÍ', 'lose'); SFX.play('miss'); return false; }
  if (FC.seats.some(q => q.units.some(u => Math.hypot(u.x - x, u.y - y) < 2.2))) { fcMsg('MUY CERCA DE OTRO PERSONAJE', 'lose'); SFX.play('miss'); return false; }
  seat.units.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, alive: true });
  SFX.play('click'); fcMsg('');
  if (seat.units.length >= per) fcPlacedSeat();
  fcUI();
  return true;
}
function fcRandomPlace() {
  const s = FC.mode === 'local' ? FC.placeSeat : FC.me, seat = FC.seats[s], z = fcSeatZone(s), per = fcPer(s);
  let guard = 0;
  while (seat.units.length < per && guard++ < 2000 && FC.phase === 'place' && (FC.mode === 'local' ? FC.placeSeat === s : true)) {
    const x = z[0] + Math.random() * (z[1] - z[0]), y = z[2] + Math.random() * (z[3] - z[2]);
    if (!fcFree(x, y, 1) || FC.seats.some(q => q.units.some(u => Math.hypot(u.x - x, u.y - y) < 2.2))) continue;
    seat.units.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, alive: true });
    if (seat.units.length >= per) { fcPlacedSeat(); break; }
  }
  SFX.play('click'); fcUI();
}
function fcPlacedSeat() {
  if (FC.mode === 'local') {
    if (FC.placeSeat < FC.seats.length - 1) {
      FC.placeSeat++;
      if (FC.seats[FC.placeSeat].bot) {
        fcMsg('EL BOT ESTÁ COLOCANDO SUS PERSONAJES…');
        const s = FC.placeSeat; setTimeout(() => { if (FC.phase === 'place' && FC.placeSeat === s) fcRandomPlace(); }, 450);
      } else fcMsg('SIGUIENTE JUGADOR: COLOCA TUS PERSONAJES.');
    } else fcBeginPlay();
  }
}
function fcBeginPlay() {
  FC.ptr = FC.seats.map(() => -1);
  const r = fcNextTurn(FC.seats, FC.ptr, { seat: FC.seats.length - 1, k: -1 }, FC.sched);
  FC.turn = r.turn; FC.ptr = r.ptr; FC.turnN = 1;
  fcStartTurn();
}
const FC_HELLO = 'ESCRIBE TU FUNCIÓN Y DISPARA, O MUÉVETE UN POCO (FLECHAS/WASD)';
function fcStartTurn() {
  const now = performance.now();
  FC.phase = 'play'; FC.tEnd = now + FC.turnS * 1000; FC.turnSeenAt = now;
  FC.moveLeft = MOVE; FC.mv = {}; FC.prev = null; FC.prevDirty = true; FC.hint = false; FC.lastLeft = -1;
  const u = fcCur(); FC.dir = u && u.x > 0 ? -1 : 1;
  // El cuadro empieza vacío en cada turno (si no, al acabarse el tiempo se dispararía la función de otro).
  // Con ↑ se recupera la última función de este jugador.
  const seat = FC.turn && FC.seats[FC.turn.seat], inp = $('#fc-fx');
  inp.value = ''; inp.placeholder = fcMine() && seat.lastExpr ? '↑ ' + seat.lastExpr : '0.5x + sin(x)';
  FC.bot = fcBotTurn() ? { t: now + 900 + Math.random() * 700, plan: null } : null;
  fcMsg(FC.bot ? `🤖 ${seat.name} (${FC_BOT[seat.lvl].n}) ESTÁ PENSANDO…` : fcMine() ? FC_HELLO : 'ESPERA TU TURNO…');
  SFX.play('beep');
  fcUI();
}
// Simula y envía el disparo del personaje en turno. Devuelve el error si la función no sirve.
function fcShoot(expr) {
  const u = fcCur();
  let res;
  try { res = fcSim(fcCompile(expr), u.x, u.y, FC.dir, FC.turn.seat + ':' + FC.turn.unit); } catch (e) { return e; }
  FC.seats[FC.turn.seat].lastExpr = expr; FC.prev = null;
  fcCommit({ expr, dir: FC.dir, seat: FC.turn.seat, unit: FC.turn.unit, x0: u.x, y0: u.y, end: res.end, kills: res.kills });
  return null;
}
// Si f no está definida donde está el personaje, sugiere el reflejo f(-x) (la gráfica espejada sobre el eje Y),
// que sí está definida ahí cuando el dominio de f queda del otro lado: ln(x) en x = -20 → ln(-x).
function fcSuggest(expr) {
  const u = fcCur(), t = `FUNCIÓN NO DEFINIDA EN x=${u.x.toFixed(1)}`, r = fcReflect(expr);
  try { if (r && isFinite(fcCompile(r)(u.x))) return `${t} ¿PRUEBA f(-x)? → y = ${r}`; } catch (e) { /* sin sugerencia */ }
  return `${t}. MUÉVETE O CAMBIA LA FUNCIÓN.`;
}
const fcErrText = (e, expr) => e.undef ? fcSuggest(expr) : e.message;
function fcFire() {
  if (!fcMine()) return;
  const expr = $('#fc-fx').value.trim(), err = fcShoot(expr);
  if (err) { fcMsg(fcErrText(err, expr), 'lose'); SFX.play('miss'); }
}
// Se acabó el tiempo: se dispara lo escrito aunque no se haya presionado Enter; si está vacío o no sirve, turno perdido.
function fcTimeUp() {
  if (FC.mode === 'online') fcSendUnits();
  const expr = $('#fc-fx').value.trim();
  if (expr) {
    FC.autoFired = true;
    const err = fcShoot(expr);
    if (!err) return;
    FC.autoFired = false;
    FC.lostWhy = `LA FUNCIÓN NO SIRVE (${fcErrText(err, expr)}). TURNO PERDIDO`;
  } else FC.lostWhy = 'NO ESCRIBISTE NINGUNA FUNCIÓN. TURNO PERDIDO';
  fcCommit(null);
}
// Sugerencia en vivo mientras se escribe (solo si la función se entiende y no está definida en tu x).
function fcHint() {
  if (!fcMine()) return;
  const expr = $('#fc-fx').value.trim(), u = fcCur();
  let bad = false;
  try { bad = !!expr && !isFinite(fcCompile(expr)(u.x)); } catch (e) { bad = false; }
  if (bad) { fcMsg(fcSuggest(expr), 'lose'); FC.hint = true; }
  else if (FC.hint) { fcMsg(FC_HELLO); FC.hint = false; }
}

/* ---- bots (solo local): prueban funciones candidatas con fcSim y eligen una que dé a un rival sin fuego amigo ---- */
function fcBotMove() {
  const si = FC.turn.seat, me = FC.seats[si], u = fcCur(), id = si + ':' + FC.turn.unit, lvl = FC_BOT[me.lvl] ? me.lvl : 1;
  const foes = [], foeIds = new Set();
  FC.seats.forEach((s, i) => { if (s.team !== me.team) s.units.forEach((v, j) => { foeIds.add(i + ':' + j); if (v.alive) foes.push(v); }); });
  foes.sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
  const r3 = v => Math.round(v * 1000) / 1000;
  const poly = terms => terms.filter(t => r3(t[0]) !== 0).map((t, i) => {
    const c = r3(t[0]), a = Math.abs(c), body = (a === 1 ? '' : String(a)) + t[1];
    return i ? (c < 0 ? ' - ' : ' + ') + body : (c < 0 ? '-' : '') + body;
  }).join('') || '0';
  // Candidatas que pasan por (tx, ty): recta, parábolas (arcos para saltar obstáculos) y senos.
  const gen = (tx, ty) => {
    const dx = tx - u.x, dy = ty - u.y; if (Math.abs(dx) < .8) return [];
    const dir = dx > 0 ? 1 : -1, out = [{ dir, expr: poly([[dy / dx, 'x']]) }];
    for (const a of [-.1, -.05, -.02, .02, .05, .1]) out.push({ dir, expr: poly([[a, 'x^2'], [(dy - a * (tx * tx - u.x * u.x)) / dx, 'x']]) });
    for (const A of [2, 4]) for (const w of [.5, 1]) out.push({ dir, expr: poly([[A, `sin(${w}x)`], [(dy - A * (Math.sin(w * tx) - Math.sin(w * u.x))) / dx, 'x']]) });
    return out;
  };
  const test = list => list.map(c => {
    try { const r = fcSim(fcCompile(c.expr), u.x, u.y, c.dir, id), ek = r.kills.filter(k => foeIds.has(k)).length; return { ...c, ek, fk: r.kills.length - ek }; }
    catch (e) { return null; }
  }).filter(Boolean);
  const any = a => a[Math.random() * a.length | 0];
  const ev = test(foes.slice(0, 4).flatMap(t => gen(t.x, t.y)));
  const hits = ev.filter(c => c.ek > 0 && !c.fk).sort((a, b) => b.ek - a.ek);
  if (hits.length && Math.random() >= FC_BOT[lvl].miss) return any(hits.filter(c => c.ek === hits[0].ek));
  // Falla a propósito (o no encontró tiro): apunta un poco arriba o abajo de un rival, sin tocar a nadie.
  const near = test(foes.slice(0, 3).flatMap(t => gen(t.x, t.y + (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 2))));
  const safe = near.concat(ev).filter(c => !c.ek && !c.fk);
  if (safe.length) return any(safe.slice(0, 12));
  if (hits.length) return hits[0];
  const noFriend = ev.filter(c => !c.fk);
  if (noFriend.length) return any(noFriend);
  return { dir: foes.length && foes[0].x < u.x ? -1 : 1, expr: '0' };
}
function fcBotStep(now) {
  const b = FC.bot; if (!b || now < b.t || !fcBotTurn()) return;
  if (!b.plan) {
    b.plan = fcBotMove(); FC.dir = b.plan.dir;
    $('#fc-fx').value = b.plan.expr; fcUI();
    b.t = now + 800; return;
  }
  FC.bot = null;
  if (fcShoot(b.plan.expr)) { FC.lostWhy = 'EL BOT SE EQUIVOCÓ'; fcCommit(null); }
}
function fcCommit(shot) {
  const seats = FC.seats.map(s => ({ ...s, units: s.units.map(u => ({ ...u })) }));
  if (shot) shot.kills.forEach(k => { const [a, b] = k.split(':').map(Number); seats[a].units[b].alive = false; });
  const { turn, ptr } = fcNextTurn(seats, FC.ptr, FC.turn, FC.mode === 'local' ? FC.sched : null);
  const teams = fcTeamsAlive(seats), over = teams.size <= 1;
  const winner = over ? (teams.size ? [...teams][0] : -1) : null;
  if (FC.mode === 'local') {
    FC.phase = 'anim'; fcUI();
    fcAnimate(shot, () => {
      if (shot) { fcApplyKills(shot.kills); if (shot.end) { FC.holes.push({ x: shot.end[0], y: shot.end[1] }); fcTerrain(); } }
      FC.ptr = ptr; FC.turn = turn; FC.turnN++;
      if (over) fcOver(winner); else fcStartTurn();
    });
  } else {
    FC.phase = 'wait'; fcUI();
    const upd = { turnN: FC.turnN + 1, turn: turn || null, ptr, shot: shot ? { ...shot, n: FC.turnN } : null };
    if (shot && shot.kills.length) upd.dead = fs.arrayUnion(...shot.kills);
    if (shot && shot.end) upd.holes = fs.arrayUnion({ x: shot.end[0], y: shot.end[1], n: FC.turnN });
    if (over) { upd.state = 'over'; upd.winner = winner; }
    fs.updateDoc(fs.doc(db, 'fights', FC.room), upd).catch(e => { console.error(e); FC.phase = 'play'; fcUI(); });
  }
}
function fcApplyKills(kills) {
  kills.forEach(k => { const [a, b] = k.split(':').map(Number); const u = FC.seats[a] && FC.seats[a].units[b]; if (u && u.alive) { u.alive = false; FC.fx.push({ x: u.x, y: u.y, t: performance.now(), kind: 'ko', team: FC.seats[a].team }); } });
}
function fcAnimate(shot, done) {
  if (shot && shot.disco) { SFX.play('miss'); fcMsg(`⚠ ${shot.seatName} SE DESCONECTÓ Y FUE ELIMINADO`, 'lose'); setTimeout(done, 900); return; }
  if (!shot) { SFX.play('miss'); const why = FC.lostWhy; FC.lostWhy = ''; fcMsg('⏱ ¡SE ACABÓ EL TIEMPO! ' + (why || 'TURNO PERDIDO'), 'lose'); setTimeout(done, why ? 1600 : 700); return; }
  let pts = [[shot.x0, shot.y0]];
  try {
    const fn = fcCompile(shot.expr);
    const alive = FC.seats.map(s => s.units.map(u => u.alive));
    pts = fcSim(fn, shot.x0, shot.y0, shot.dir, shot.seat + ':' + shot.unit).pts;
    FC.seats.forEach((s, i) => s.units.forEach((u, j) => u.alive = alive[i][j]));
  } catch (e) { console.warn(e); }
  if (shot.end) { const L = pts[pts.length - 1]; if (Math.hypot(L[0] - shot.end[0], L[1] - shot.end[1]) > .5) pts.push(shot.end); }
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  FC.anim = { pts, shot, t0: performance.now(), dur: Math.min(2600, Math.max(700, len * 45)), done, team: FC.seats[shot.seat].team, fin: false };
  fcMsg(`${FC.autoFired ? '⏱ DISPARO AUTOMÁTICO · ' : ''}${FC.seats[shot.seat].name}: y = ${shot.expr}`);
  FC.autoFired = false;
  SFX.play('spit');
}
function fcHostCheckDisconnects(now) {
  if (!FC.isHost || FC.mode !== 'online' || FC.phase !== 'play' || !FC.roomData || !FC.roomData.order) return;
  if (FC._lastDC && now - FC._lastDC < 2500) return;
  FC._lastDC = now;
  if (!FC.elimSent) FC.elimSent = new Set();
  let victimSeat = -1, victimName = '';
  for (let si = 0; si < FC.seats.length; si++) {
    if (FC.elimSent.has(si)) continue;
    const uid = FC.roomData.order[si], p = FC.roomPlayers[uid];
    const gone = !p || isStale(p.lastSeen, now);
    if (gone && FC.seats[si].units.some(u => u.alive)) { victimSeat = si; victimName = FC.seats[si].name; break; }
  }
  if (victimSeat < 0) return;
  FC.elimSent.add(victimSeat);
  const seats = FC.seats.map(s => ({ ...s, units: s.units.map(u => ({ ...u })) }));
  const kills = [];
  seats[victimSeat].units.forEach((u, ui) => { if (u.alive) { u.alive = false; kills.push(victimSeat + ':' + ui); } });
  let turn = FC.turn, ptr = FC.ptr;
  if (turn && turn.seat === victimSeat) { const r = fcNextTurn(seats, ptr, turn); turn = r.turn; ptr = r.ptr; }
  const teams = fcTeamsAlive(seats), over = teams.size <= 1;
  const winner = over ? (teams.size ? [...teams][0] : -1) : null;
  const upd = { turnN: FC.turnN + 1, turn: turn || null, ptr, shot: { disco: true, seatName: victimName, n: FC.turnN }, dead: fs.arrayUnion(...kills) };
  if (over) { upd.state = 'over'; upd.winner = winner; }
  fs.updateDoc(fs.doc(db, 'fights', FC.room), upd).catch(console.error);
}
function fcOver(winner) {
  FC.phase = 'over'; FC.turn = null; fcUI();
  const myTeam = FC.seats[FC.me] ? FC.seats[FC.me].team : -1;
  const t = winner < 0 ? '¡EMPATE!' : `¡GANA EL EQUIPO ${TEAMN[winner]}!`;
  const names = winner < 0 ? '' : FC.seats.filter(s => s.team === winner).map(s => s.name).join(' + ');
  $('#fc-over-t').textContent = t; $('#fc-over-t').style.color = winner < 0 ? '' : TEAMC[winner];
  $('#fc-over-p').textContent = names;
  $('#fc-again').hidden = FC.mode === 'online' && !FC.isHost;
  $('#fc-over').hidden = false;
  if (winner >= 0 && winner === myTeam && !FC.won) {
    FC.won = true; SFX.play('win');
    // Contra bots: solo cuentan las victorias en DIFÍCIL (si algún rival es humano, cuenta como siempre).
    const foes = FC.seats.filter(s => s.team !== myTeam), vsBots = FC.mode === 'local' && foes.length && foes.every(s => s.bot);
    if (vsBots && !foes.every(s => s.lvl === 2)) $('#fc-over-p').textContent = (names ? names + ' · ' : '') + 'LAS VICTORIAS CONTRA BOTS FÁCIL O MEDIO NO SUMAN AL TOP 10.';
    else { const ex = FC.mode === 'local' ? (vsBots ? 'BOT DIFÍCIL · ' : '') + FC.localLbl : FC_FMT[FC.fmt].n;
      LB.confirmar('¡GANASTE! ¿SUMAS ESTA VICTORIA A LA TABLA?', () => LB.increment('funciones', ex)).then(fcLB); }
  } else SFX.play(winner < 0 ? 'miss' : 'lose');
}

/* ---- bucle ---- */
function fcUpdate(dt, now) {
  if (FC.phase === 'play' && fcMine()) {
    const K = FC_KEYS, typing = document.activeElement === $('#fc-fx');
    const l = FC.mv.l || (!typing && (K.ArrowLeft || K.KeyA)), r = FC.mv.r || (!typing && (K.ArrowRight || K.KeyD));
    const u = FC.mv.u || (!typing && (K.ArrowUp || K.KeyW)), d = FC.mv.d || (!typing && (K.ArrowDown || K.KeyS));
    const mx = (r ? 1 : 0) - (l ? 1 : 0), my = (u ? 1 : 0) - (d ? 1 : 0);
    if ((mx || my) && FC.moveLeft > 0) {
      const c = fcCur(), sp = 1.6 * dt / Math.hypot(mx, my), nx = c.x + mx * sp, ny = c.y + my * sp, before = FC.moveLeft;
      if (fcFree(nx, ny)) { FC.moveLeft -= Math.hypot(nx - c.x, ny - c.y); c.x = nx; c.y = ny; }
      else if (fcFree(nx, c.y)) { FC.moveLeft -= Math.abs(nx - c.x); c.x = nx; }
      else if (fcFree(c.x, ny)) { FC.moveLeft -= Math.abs(ny - c.y); c.y = ny; }
      if (mx && FC.dir !== mx) { FC.dir = mx; fcUI(); }
      if (FC.moveLeft < before) {
        FC.prevDirty = true;
        if (now >= FC.shakeUntil) { FC.shakeUntil = now + 200; fcMovEl.classList.remove('shake'); void fcMovEl.offsetWidth; fcMovEl.classList.add('shake'); }
      }
      if (FC.mode === 'online' && now - FC.lastSend > 200) { FC.lastSend = now; fcSendUnits(); }
    }
    fcPreview(now);
    if (now >= FC.tEnd) fcTimeUp();
  } else if (FC.phase === 'play' && FC.bot) fcBotStep(now);
  if (FC.phase !== 'play') FC.prev = null;
  if (FC.mode === 'online' && FC.isHost && FC.phase === 'play' && FC.turn) {
    const uid = FC.roomData && FC.roomData.order ? FC.roomData.order[FC.turn.seat] : null;
    const gone = uid && !FC.roomPlayers[uid];
    if (FC.turn.seat !== FC.me && (gone && now - FC.turnSeenAt > 1500 || now - FC.turnSeenAt > (FC.turnS + 8) * 1000)) { FC.turnSeenAt = now; fcCommit(null); }
  }
  fcHostCheckDisconnects(now);
  if (FC.anim && !FC.anim.fin && now - FC.anim.t0 >= FC.anim.dur) {
    FC.anim.fin = true;
    const a = FC.anim;
    if (a.shot.end) { FC.fx.push({ x: a.shot.end[0], y: a.shot.end[1], t: now, kind: 'boom' }); SFX.play('boom'); }
    if (a.shot.kills.length) SFX.play('hitship');
    setTimeout(() => { FC.anim = null; a.done(); }, 650);
  }
  if (FC.phase === 'play') {
    const left = Math.max(0, Math.ceil((FC.tEnd - now) / 1000));
    fcClockEl.textContent = `⏱ ${left}s`; fcMovEl.textContent = `· MOV ${Math.max(0, FC.moveLeft).toFixed(1)}`;
    fcClockEl.style.color = left <= 5 ? 'var(--orange)' : '';
    // últimos 5 s: el número crece a 120 % y vuelve, una vez por segundo
    if (left !== FC.lastLeft) { FC.lastLeft = left; fcClockEl.classList.remove('pulse'); if (left <= 5 && left > 0) { void fcClockEl.offsetWidth; fcClockEl.classList.add('pulse'); } }
  } else { fcClockEl.textContent = ''; fcMovEl.textContent = ''; FC.lastLeft = -1; }
}
const fcClockEl = $('#fc-clock'), fcMovEl = $('#fc-mov');
// Vista previa: la misma simulación del disparo, solo para dibujar la curva punteada (no cambia nada del juego).
function fcPreview(now) {
  if (!FC.preview || !fcMine()) { FC.prev = null; return; }
  if (!FC.prevDirty || now - FC.prevAt < 90) return;
  FC.prevDirty = false; FC.prevAt = now; FC.prev = null;
  const u = fcCur(), expr = $('#fc-fx').value.trim();
  if (!expr) return;
  const alive = FC.seats.map(s => s.units.map(v => v.alive));
  try { FC.prev = fcSim(fcCompile(expr), u.x, u.y, FC.dir, FC.turn.seat + ':' + FC.turn.unit).pts; } catch (e) { FC.prev = null; }
  FC.seats.forEach((s, i) => s.units.forEach((v, j) => v.alive = alive[i][j]));
}
function fcDraw(now) {
  if (!FC.img) return;
  fx.drawImage(FC.img, 0, 0);
  // tinte del equipo en turno (rojizo, azulado…), translúcido para que todo se siga viendo
  if (FC.turn && FC.seats[FC.turn.seat] && (FC.phase === 'play' || FC.phase === 'anim' || FC.phase === 'wait')) {
    fx.fillStyle = FC_TINT[FC.seats[FC.turn.seat].team] || FC_TINT[0]; fx.fillRect(0, 0, FW, FH);
  }
  // vista previa punteada
  if (FC.prev && FC.phase === 'play') {
    const pts = FC.prev; let n0 = 0;
    fx.fillStyle = '#f4f4f4'; fx.globalAlpha = .85;
    for (let i = 1; i < pts.length; i++) {
      const x0 = wx2p(pts[i - 1][0]), y0 = wy2p(pts[i - 1][1]), x1 = wx2p(pts[i][0]), y1 = wy2p(pts[i][1]);
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let j = 0; j < n; j++, n0++) if ((n0 >> 2) % 2 === 0) fx.fillRect(Math.round(x0 + (x1 - x0) * j / n) - 1, Math.round(y0 + (y1 - y0) * j / n) - 1, 2, 2);
    }
    fx.globalAlpha = 1;
  }
  if (FC.phase === 'place' && !FC.spectating) {
    const s = FC.mode === 'local' ? FC.placeSeat : FC.me, z = fcSeatZone(s);
    fx.fillStyle = TEAMC[FC.seats[s].team]; fx.globalAlpha = .16 + .06 * Math.sin(now / 250);
    fx.fillRect(wx2p(z[0]), wy2p(z[3]), (z[1] - z[0]) * SC, (z[3] - z[2]) * SC);
    fx.globalAlpha = 1;
  }
  // trayectoria animada
  if (FC.anim) {
    const a = FC.anim, f = Math.min(1, (now - a.t0) / a.dur), pts = a.pts;
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let rem = total * f;
    fx.fillStyle = TEAMC[a.team];
    let hx = wx2p(pts[0][0]), hy = wy2p(pts[0][1]);
    for (let i = 1; i < pts.length && rem > 0; i++) {
      const l = seg[i - 1], k = Math.min(1, rem / (l || 1)); rem -= l;
      const x0 = wx2p(pts[i - 1][0]), y0 = wy2p(pts[i - 1][1]), x1 = x0 + (wx2p(pts[i][0]) - x0) * k, y1 = y0 + (wy2p(pts[i][1]) - y0) * k;
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let j = 0; j <= n; j++) fx.fillRect(Math.round(x0 + (x1 - x0) * j / n) - 1, Math.round(y0 + (y1 - y0) * j / n) - 1, 2, 2);
      hx = x1; hy = y1;
    }
    if (f < 1) { fx.fillStyle = '#f4f4f4'; fx.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4); }
  }
  // personajes
  const blink = Math.floor(now / 250) % 2;
  FC.seats.forEach((s, si) => s.units.forEach((u, ui) => {
    if (!u.alive) return;
    const px = Math.round(wx2p(u.x)), py = Math.round(wy2p(u.y));
    const act = FC.turn && FC.turn.seat === si && FC.turn.unit === ui && FC.phase !== 'over';
    // sprite al doble (14×18), centrado en el punto del personaje; el impacto sigue siendo radio URAD
    const hw = 3.5 * FC_SPR, hh = 4.5 * FC_SPR;
    if (act) { fx.fillStyle = 'rgba(244,244,244,.25)'; fx.fillRect(px - hw - 3, py - hh - 3, 2 * hw + 6, 2 * hh + 6); }
    fx.save(); fx.translate(px, py);
    if (act ? FC.dir < 0 : u.x > 0) fx.scale(-1, 1);
    fx.imageSmoothingEnabled = false;
    fx.drawImage(soldier(s.team), -hw, -hh, 2 * hw, 2 * hh);
    fx.restore();
    if (act && blink) { const ay = py - hh - 8; fx.fillStyle = TEAMC[s.team]; fx.fillRect(px - 2, ay, 5, 1); fx.fillRect(px - 1, ay + 1, 3, 1); fx.fillRect(px, ay + 2, 1, 1); }
  }));
  // cuadro de diálogo: el personaje "grita" su función al disparar
  if (FC.anim && FC.anim.shot && !FC.anim.shot.disco) {
    const shot = FC.anim.shot, pop = Math.min(1, (now - FC.anim.t0) / 220), s = pop < 1 ? .5 + .5 * pop : 1;
    const px = wx2p(shot.x0), py = wy2p(shot.y0);
    const text = 'y = ' + shot.expr;
    fx.font = '8px "Press Start 2P"';
    const bw = Math.min(180, fx.measureText(text).width + 10), bh = 14;
    let bx = px - bw / 2; bx = Math.max(2, Math.min(FW - bw - 2, bx));
    const by = Math.max(2, py - bh - 16);
    fx.save();
    fx.translate(bx + bw / 2, by + bh); fx.scale(s, s); fx.translate(-(bx + bw / 2), -(by + bh));
    fx.fillStyle = '#f4f4f4'; fx.fillRect(bx, by, bw, bh);
    fx.fillStyle = TEAMC[FC.anim.team];
    fx.fillRect(bx, by, bw, 2); fx.fillRect(bx, by + bh - 2, bw, 2); fx.fillRect(bx, by, 2, bh); fx.fillRect(bx + bw - 2, by, 2, bh);
    const tailX = Math.max(bx + 6, Math.min(bx + bw - 6, px));
    fx.fillStyle = '#f4f4f4';
    fx.beginPath(); fx.moveTo(tailX - 4, by + bh); fx.lineTo(tailX + 4, by + bh); fx.lineTo(tailX, by + bh + 6); fx.closePath(); fx.fill();
    fx.fillStyle = '#1a1c2c'; fx.textAlign = 'left';
    fx.fillText(text.length * 6 > bw ? text.slice(0, Math.floor(bw / 6)) : text, bx + 5, by + 10);
    fx.restore();
  }
  // efectos
  FC.fx = FC.fx.filter(e => now - e.t < 700);
  FC.fx.forEach(e => {
    const k = (now - e.t) / 700, px = wx2p(e.x), py = wy2p(e.y);
    if (e.kind === 'boom') { const r = Math.round(HOLE * SC * (0.6 + k)); fx.globalAlpha = 1 - k; pxCircle(fx, Math.round(px), Math.round(py), r, k < .4 ? '#ffcd75' : '#ef7d57'); }
    else { fx.globalAlpha = 1 - k; fx.fillStyle = TEAMC[e.team]; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; fx.fillRect(Math.round(px + Math.cos(a) * k * 12), Math.round(py + Math.sin(a) * k * 12), 2, 2); } }
    fx.globalAlpha = 1;
  });
  // coordenadas
  const c = fcCur(), lines = [], xs = v => FC.piAxis ? (v / Math.PI).toFixed(2) + 'π' : v.toFixed(1);
  if (c && FC.phase !== 'place') lines.push(`(${xs(c.x)}, ${c.y.toFixed(1)})`);
  if (FC.mouse) lines.push(`x ${xs(FC.mouse[0])}  y ${FC.mouse[1].toFixed(1)}`);
  fx.font = '8px "Press Start 2P"'; fx.textAlign = 'left';
  lines.forEach((l, i) => {
    const w = fx.measureText(l).width + 6;
    fx.fillStyle = 'rgba(15,16,32,.75)'; fx.fillRect(3, FH - 14 - i * 12, w, 11);
    fx.fillStyle = i === 0 && c && FC.phase !== 'place' ? TEAMC[FC.seats[FC.turn.seat].team] : '#f4f4f4';
    fx.fillText(l, 6, FH - 5 - i * 12);
  });
}
function fcCanvasPos(e) { const r = fcv.getBoundingClientRect(); return [p2wx((e.clientX - r.left) / r.width * FW), p2wy((e.clientY - r.top) / r.height * FH)]; }
fcv.addEventListener('pointermove', e => { FC.mouse = fcCanvasPos(e); });
fcv.addEventListener('pointerleave', () => { FC.mouse = null; });
fcv.addEventListener('pointerdown', e => { if (FC.phase === 'place' && !FC.spectating) { const p = fcCanvasPos(e); fcTryPlace(p[0], p[1]); } });

/* ---- online ---- */
function fcSendUnits() {
  if (FC.mode !== 'online' || !FC.room) return;
  const me = FC.seats[FC.me];
  fs.updateDoc(fs.doc(db, 'fights', FC.room, 'players', UID), { units: me.units.map(u => ({ x: Math.round(u.x * 100) / 100, y: Math.round(u.y * 100) / 100 })) }).catch(console.error);
}
async function fcCreate() {
  if (!(await fbReady)) return fcMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO MODO LOCAL.', 'lose');
  fcLeaveOnline(); fcMenuMsg('CREANDO SALA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'fights', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, { host: UID, fmt: FC.fmt, track: FC.track, turnS: FC.turnS, preview: FC.preview, state: 'lobby', order: [], turnN: 0, turn: null, ptr: [], dead: [], holes: [], shot: null, winner: null, created: fs.serverTimestamp() });
    FC.room = code;
    await fs.setDoc(fs.doc(db, 'fights', code, 'players', UID), { name: playerName(), slot: 0, units: [], ready: false, joined: fs.serverTimestamp() });
    fcEnterLobby();
  } catch (e) { console.error(e); FC.room = null; fcMenuMsg('ERROR AL CREAR SALA: ' + e.message, 'lose'); }
}
async function fcJoin() {
  const code = $('#fc-code').value.trim().toUpperCase();
  if (code.length < 5) return fcMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return fcMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO MODO LOCAL.', 'lose');
  fcLeaveOnline(); fcMenuMsg('ENTRANDO…');
  try {
    const d = await fs.getDoc(fs.doc(db, 'fights', code));
    if (!d.exists()) throw new Error('ESA SALA NO EXISTE');
    if (d.data().state !== 'lobby') throw new Error('LA PARTIDA YA EMPEZÓ');
    const ps = await fs.getDocs(fs.collection(db, 'fights', code, 'players'));
    const used = new Set(); let mine = false;
    ps.forEach(p => { if (p.id === UID) mine = true; else used.add(p.data().slot); });
    if (!mine && used.size >= 4) throw new Error('LA SALA ESTÁ LLENA (MÁX. 4)');
    let slot = 0; while (used.has(slot)) slot++;
    FC.room = code;
    await fs.setDoc(fs.doc(db, 'fights', code, 'players', UID), { name: playerName(), slot, units: [], ready: false, joined: fs.serverTimestamp() });
    fcEnterLobby();
  } catch (e) { FC.room = null; fcMenuMsg(e.message, 'lose'); }
}
function fcEnterLobby() {
  FC.mode = 'online'; FC.phase = 'lobby'; FC.roomData = null; FC.roomPlayers = {}; FC.sched = null;
  fcMenuMsg(''); $('#fc-room').textContent = (FC.spectating ? '👁 ESPECTADOR · SALA ' : 'SALA ') + FC.room;
  fcView('lobby'); fcSetupRender(); fcLobbyRender();
  FC.unsubs.push(fs.onSnapshot(fs.doc(db, 'fights', FC.room), s => { if (s.exists()) { FC.roomData = s.data(); fcSync(); } else if (FC.spectating) { fcMenuMsg('LA SALA SE CERRÓ.', 'lose'); fcToMenu(); } }));
  FC.unsubs.push(fs.onSnapshot(fs.collection(db, 'fights', FC.room, 'players'), s => {
    const m = {}; s.forEach(d => m[d.id] = d.data()); FC.roomPlayers = m; fcSyncPlayers(); fcSync();
  }));
  if (!FC.spectating) FC.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'fights', FC.room, 'players', UID), { lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
}
async function fcSpecOpen(code) {
  fcToMenu();
  FC.spectating = true; FC.room = code;
  $('#fc-spec-list').hidden = true;
  fcEnterLobby();
}
function fcSeatsFromOrder(d) {
  return d.order.map((uid, i) => {
    const p = FC.roomPlayers[uid] || { name: '???', units: [] };
    return { uid, name: p.name, team: teamOf(d.fmt, i), ready: !!p.ready, units: (p.units || []).map((u, j) => ({ x: u.x, y: u.y, alive: !(d.dead || []).includes(i + ':' + j) })) };
  });
}
function fcSyncPlayers() {
  if (FC.mode !== 'online' || !FC.roomData || !FC.roomData.order || !FC.seats.length) return;
  FC.roomData.order.forEach((uid, i) => {
    const p = FC.roomPlayers[uid], seat = FC.seats[i]; if (!p || !seat) return;
    seat.ready = !!p.ready; seat.name = p.name;
    if (i === FC.me) return;
    if (FC.phase === 'place') seat.units = (p.units || []).map(u => ({ x: u.x, y: u.y, alive: true }));
    else (p.units || []).forEach((u, j) => { if (seat.units[j]) { seat.units[j].x = u.x; seat.units[j].y = u.y; } });
  });
}
function fcSync() {
  const d = FC.roomData; if (!d || FC.mode !== 'online') return;
  const prevHost = FC.isHost; FC.isHost = d.host === UID;
  // turnS y preview pueden faltar (salas de la versión anterior): 20 s y sin vista previa
  const ts = fcClampT(d.turnS), pv = d.preview === true;
  if (d.fmt !== FC.fmt || d.track !== FC.track || prevHost !== FC.isHost || ts !== FC.turnS || pv !== FC.preview) {
    FC.fmt = d.fmt; FC.track = d.track; FC.turnS = ts; FC.preview = pv;
    if (FC.phase === 'lobby') { fcSetupRender(); fcLobbyRender(); }
  }
  if (d.state === 'lobby') {
    if (FC.phase !== 'lobby') {
      FC.phase = 'lobby'; FC.seats = []; FC.anim = null;
      if (!FC.spectating) fs.updateDoc(fs.doc(db, 'fights', FC.room, 'players', UID), { units: [], ready: false }).catch(() => {});
      $('#fc-over').hidden = true; fcView('lobby'); fcSetupRender();
    }
    fcLobbyRender(); return;
  }
  if (FC.phase === 'anim') return;
  FC.me = d.order.indexOf(UID);
  if (d.state === 'place' && FC.phase === 'lobby') {
    FC.seats = fcSeatsFromOrder(d); FC.seats.forEach((s, i) => { if (i === FC.me) s.units = []; });
    fcBeginPlacement(); return;
  }
  if (d.state === 'place' && FC.phase === 'place') {
    fcUI();
    if (FC.isHost && d.order.every(uid => FC.roomPlayers[uid] && FC.roomPlayers[uid].ready && (FC.roomPlayers[uid].units || []).length === FC_FMT[d.fmt].per)) {
      const seats = fcSeatsFromOrder(d), r = fcNextTurn(seats, seats.map(() => -1), { seat: seats.length - 1 });
      fs.updateDoc(fs.doc(db, 'fights', FC.room), { state: 'play', turn: r.turn, ptr: r.ptr, turnN: 1, dead: [], holes: [], shot: null }).catch(console.error);
    }
    return;
  }
  if ((d.state === 'play' || d.state === 'over') && (FC.phase === 'place' || FC.phase === 'lobby')) {
    FC.elimSent = new Set();
    FC.seats = fcSeatsFromOrder(d); FC.holes = d.holes || []; fcTerrain();
    FC.turn = d.turn; FC.ptr = d.ptr; FC.turnN = d.turnN;
    fcView('game');
    if (d.state === 'over') fcOver(d.winner); else fcStartTurn();
    return;
  }
  if ((FC.phase === 'play' || FC.phase === 'wait') && d.turnN !== FC.turnN) {
    const shot = d.shot && d.shot.n === FC.turnN ? d.shot : null;
    FC.phase = 'anim'; fcUI();
    fcAnimate(shot, () => {
      fcApplyKills(d.dead || []);
      const nh = (d.holes || []).length !== FC.holes.length; FC.holes = d.holes || []; if (nh) fcTerrain();
      FC.turn = d.turn; FC.ptr = d.ptr; FC.turnN = d.turnN;
      FC.phase = 'play';
      if (d.state === 'over') fcOver(d.winner); else fcStartTurn();
      fcSync();
    });
  }
}
function fcLobbyRender() {
  if (FC.mode !== 'online' || FC.phase !== 'lobby') return;
  const list = Object.entries(FC.roomPlayers).sort((a, b) => a[1].slot - b[1].slot);
  const cap = FC_FMT[FC.fmt].seats, ul = $('#fc-plist'); ul.innerHTML = '';
  list.forEach(([uid, p], i) => {
    const team = teamOf(FC.fmt, i), li = document.createElement('li');
    li.appendChild(scaled(soldier(team), 3));
    const s = document.createElement('span');
    s.innerHTML = `${esc(p.name)}${uid === UID ? ' (TÚ)' : ''}${FC.roomData && uid === FC.roomData.host ? ' ★' : ''}<br><small style="color:${TEAMC[team]}">EQUIPO ${TEAMN[team]}</small>`;
    li.appendChild(s); ul.appendChild(li);
  });
  const n = list.length, ok = FC.fmt === '1v1' ? n === 2 : FC.fmt === '2v2' ? n === 4 : n >= 3;
  const need = FC.fmt === '1v1' ? 'SE NECESITAN 2 JUGADORES' : FC.fmt === '2v2' ? 'SE NECESITAN 4 JUGADORES' : 'SE NECESITAN 3 O 4 JUGADORES';
  $('#fc-lobby-msg').textContent = (FC.isHost ? `COMPARTE EL CÓDIGO ${FC.room}. ` : 'ESPERANDO AL ANFITRIÓN (★)… ') + `${FC_FMT[FC.fmt].n} · ${FC_TRACKS[FC.track].n} · ${FC.turnS} s${FC.preview ? ' · VISTA PREVIA' : ''} · ${n}/${cap} · ${ok ? 'LISTOS' : need}`;
  $('#fc-go').hidden = !FC.isHost; $('#fc-go').disabled = !ok || n > cap;
}
async function fcGoOnline() {
  if (!FC.isHost) return;
  const order = Object.entries(FC.roomPlayers).sort((a, b) => a[1].slot - b[1].slot).map(e => e[0]);
  try { await fs.updateDoc(fs.doc(db, 'fights', FC.room), { state: 'place', order, turnN: 0, turn: null, ptr: [], dead: [], holes: [], shot: null, winner: null }); }
  catch (e) { console.error(e); }
}
function fcLeaveOnline() {
  FC.unsubs.forEach(u => u()); FC.unsubs = [];
  if (FC.hbStop) { FC.hbStop(); FC.hbStop = null; }
  if (FC.room && fs && !FC.spectating) {
    const room = FC.room, others = Object.keys(FC.roomPlayers).filter(u => u !== UID);
    if (FC.isHost && others.length) fs.updateDoc(fs.doc(db, 'fights', room), { host: others[0] }).catch(() => {});
    fs.deleteDoc(fs.doc(db, 'fights', room, 'players', UID)).catch(() => {});
  }
  FC.room = null; FC.roomData = null; FC.roomPlayers = {}; FC.isHost = false; FC.spectating = false;
}
function fcToMenu() {
  if (FC.mode === 'online') fcLeaveOnline();
  FC.mode = null; FC.phase = 'menu'; FC.seats = []; FC.turn = null; FC.anim = null; FC.spectating = false; FC.bot = null; FC.sched = null;
  // al salir de una sala se vuelve a las opciones propias (la sala pudo cambiarlas)
  FC.turnS = fcClampT(store.get('pa_fc_ts', TURN_S)); FC.preview = store.get('pa_fc_prev', false) === true;
  $('#fc-over').hidden = true;
  fcView('menu'); fcSetupRender();
}

$('#fc-spec-btn').onclick = async () => {
  const list = $('#fc-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('fights');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const stateN = { lobby: 'EN LOBBY', place: 'COLOCANDO', play: 'EN COMBATE', over: 'TERMINADA' };
  list.innerHTML = rooms.length
    ? rooms.map(r => `<li><span><b>SALA ${r.code}</b><small>${FC_FMT[r.data.fmt] ? FC_FMT[r.data.fmt].n : '?'} · ${stateN[r.data.state] || r.data.state}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY SALAS RECIENTES</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); fcSpecOpen(b.dataset.code); });
};
$('#fc-local').onclick = () => { SFX.play('start'); fcStartLocal(); };
$('#fc-create').onclick = fcCreate;
$('#fc-join').onclick = fcJoin;
$('#fc-code').addEventListener('keydown', e => { if (e.key === 'Enter') fcJoin(); });
$('#fc-go').onclick = fcGoOnline;
$('#fc-leave').onclick = fcToMenu;
$('#fc-exit').onclick = fcToMenu;
$('#fc-quit').onclick = pedirAbandonar(fcToMenu);
$('#fc-again').onclick = () => {
  if (FC.mode === 'local') { FC.seats.forEach(s => s.units = []); fcBeginPlacement(); }
  else if (FC.isHost) fs.updateDoc(fs.doc(db, 'fights', FC.room), { state: 'lobby' }).catch(console.error);
};
$('#fc-fire').onclick = fcFire;
$('#fc-fx').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); fcFire(); }
  else if (e.key === 'ArrowUp' && fcMine()) { const last = FC.seats[FC.turn.seat].lastExpr; if (last) { e.preventDefault(); e.target.value = last; FC.prevDirty = true; fcHint(); } }
});
$('#fc-fx').addEventListener('input', () => { FC.prevDirty = true; fcHint(); });
$('#fc-dir').onclick = () => { FC.dir = -FC.dir; FC.prevDirty = true; SFX.play('click'); fcUI(); };
$('#fc-ts-m').onclick = () => fcSetTurnS(FC.turnS - 5);
$('#fc-ts-p').onclick = () => fcSetTurnS(FC.turnS + 5);
$('#fc-prev-t').onclick = () => {
  const online = FC.mode === 'online'; if (online && !FC.isHost) return;
  FC.preview = !FC.preview; SFX.play('click');
  if (online) fs.updateDoc(fs.doc(db, 'fights', FC.room), { preview: FC.preview }).catch(console.error);
  fcSetupRender(); fcLobbyRender();
};
function fcPiBtn() { $('#fc-pi').textContent = FC.piAxis ? 'CAMBIAR A NÚMEROS' : 'CAMBIAR A π'; }
$('#fc-pi').onclick = () => {
  FC.piAxis = !FC.piAxis; store.set('pa_fc_pi', FC.piAxis); SFX.play('click'); fcPiBtn();
  if (FC.terrain && FC.img) fcRenderTerrain(FC.track, FC.terrain, FC.img, FC.piAxis);
};
fcPiBtn();
$('#fc-rand').onclick = fcRandomPlace;
$('#fc-ready').onclick = () => {
  const me = FC.seats[FC.me]; if (!me || me.units.length < fcPer(FC.me)) return;
  me.ready = true; SFX.play('click'); fcUI();
  fs.updateDoc(fs.doc(db, 'fights', FC.room, 'players', UID), { units: me.units.map(u => ({ x: u.x, y: u.y })), ready: true }).catch(console.error);
};
document.querySelectorAll('#fc-ctrl [data-m]').forEach(b => {
  const k = b.dataset.m;
  b.addEventListener('pointerdown', e => { e.preventDefault(); FC.mv[k] = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { FC.mv[k] = false; if (FC.mode === 'online') fcSendUnits(); }));
});
// «Funciones básicas»: insertan el texto donde está el cursor (o reemplazan lo seleccionado)
document.querySelectorAll('#fc-help [data-ex]').forEach(b => b.onclick = () => {
  const inp = $('#fc-fx'); if (inp.disabled) return;
  const t = b.dataset.ex, a = inp.selectionStart ?? inp.value.length, z = inp.selectionEnd ?? a;
  inp.value = inp.value.slice(0, a) + t + inp.value.slice(z);
  if (!matchMedia('(pointer:coarse)').matches) inp.focus();
  inp.setSelectionRange(a + t.length, a + t.length);
  FC.prevDirty = true; fcHint(); SFX.play('click');
});
window.addEventListener('beforeunload', () => { if (FC.mode === 'online') fcLeaveOnline(); });
fcSetupRender(); fcLB(); fcView('menu');

// --- conexión con la página (antes en arcade.html) ---
const RC_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
bucle((dt, now) => { if (FC.img) { fcUpdate(dt, now); fcDraw(now); } });
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (RC_KEYS.has(e.code)) { FC_KEYS[e.code] = true; if (FC.phase === 'play') e.preventDefault(); }
});
document.addEventListener('keyup', e => { if (RC_KEYS.has(e.code)) FC_KEYS[e.code] = false; });
window.addEventListener('blur', () => { for (const k in FC_KEYS) delete FC_KEYS[k]; });
