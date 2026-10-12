import { db, fs, UID, fbReady, $, esc, playerName, genCode, liveRooms, presenceLoop, SFX, LB, sprite, pxCircle, fitSoon, expiraEn } from './core.js';
import { arcade, registrarBucle } from './estado.js';
import { pedirAbandonar, crDrawFrog } from './compartido-juegos.js';

/* =========================================================
   CRUZAR LA CALLE — solo o hasta 4 en línea (cada quien su rana,
   mismo tablero, sincronizado con una semilla compartida)
   ========================================================= */
const CR_TILE = 32, CR_COLS = 13, CR_ROWS = 13;
const CR_CVW = CR_TILE * CR_COLS, CR_CVH = CR_TILE * CR_ROWS;
const CR_START_ROW = 12, CR_MEDIAN_ROW = 6, CR_HOME_ROW = 0;
const CR_RIVER_ROWS = [1, 2, 3, 4, 5], CR_ROAD_ROWS = [7, 8, 9, 10, 11];
const CR_HOME_COLS = [1, 4, 7, 10];
const CR_LIVES_START = 3, CR_HOP_MS = 140, CR_MOVE_COOLDOWN = 150;
const CR_CAR_COLORS = ['#b13e53', '#41a6f6', '#ef7d57', '#5d275d', '#e3b619'];
const CR_PCOLORS = ['#a7f070', '#e83b3b', '#41a6f6', '#ffcd75'];
const CR_THEMES = [
  { n: 'DÍA', water: '#2f8b93', waterHome: '#0b5c66', grass: '#38b764', road: '#333c57', line: '#f4f4f4', homeSlot: '#a7f070' },
  { n: 'NOCHE', water: '#1c3c5a', waterHome: '#0a1f33', grass: '#1f4d3a', road: '#141522', line: '#8fa0c0', homeSlot: '#73eff7' },
  { n: 'DESIERTO', water: '#3a6ea8', waterHome: '#254b78', grass: '#c9a15a', road: '#7a5a3a', line: '#fff1c4', homeSlot: '#ffcd75' },
  { n: 'CIUDAD', water: '#345b7a', waterHome: '#1c3348', grass: '#4a5568', road: '#22242f', line: '#ffe14d', homeSlot: '#41a6f6' },
];
function crTheme() { return CR_THEMES[CR.level % CR_THEMES.length]; }
function crRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
/* Carriles de la calle: cada uno tiene { velocidad, densidad }.
   - velocidad 1–8 en "unidades" de CR_VEL_UNIT px/s (1 unidad = 30 px/s ≈ 0,5 px por cuadro a 60 FPS).
   - densidad = cuántos vehículos hay en el carril (1–5).
   Una fila de la tabla por nivel; dentro del nivel va del carril de abajo (fila 1) al de arriba (fila 5).
   Del último nivel de la tabla en adelante se repite esa fila (solo cambia el tema). */
const CR_VEL_UNIT = 30, CR_MIN_GAP = 48;   // CR_MIN_GAP: hueco mínimo (px) entre vehículos: siempre se puede pasar
const CR_ROAD_TABLE = [
  [[2, 2], [3, 2], [2, 3], [4, 3], [3, 4]],
  [[3, 3], [4, 3], [3, 4], [5, 3], [4, 4]],
  [[4, 3], [5, 3], [4, 4], [6, 3], [5, 4]],
  [[5, 4], [6, 3], [4, 5], [7, 3], [6, 4]],
  [[6, 4], [7, 3], [5, 5], [8, 3], [7, 4]],
];
const CR_DEATH_MS = 1500;                  // cuánto se ve la rana con ojos en X antes del fin
/* Qué carriles son de camión: cada 3 o 4 carriles de autos (contando seguido entre niveles) sale uno.
   Sale solo de la semilla, así que en línea todos ven los mismos camiones en el mismo nivel. */
function crTruckLanes(seed, level) {
  const rng = crRng(seed ^ 0x5bd1e995), out = [];
  let cars = 3 + (rng() < .5 ? 0 : 1);
  for (let g = 0; g < (level + 1) * CR_ROAD_ROWS.length; g++) {
    if (cars === 0) { out.push(true); cars = 3 + (rng() < .5 ? 0 : 1); } else { out.push(false); cars--; }
  }
  return out.slice(level * CR_ROAD_ROWS.length);
}
function crLane(o) {
  // separación pareja entre vehículos, con hueco >= CR_MIN_GAP y sin que aparezcan de golpe en el borde
  let spacing = Math.max(CR_CVW / o.count, o.w + CR_MIN_GAP), span = spacing * o.count;
  if (span < CR_CVW + o.w) { span = CR_CVW + o.w; spacing = span / o.count; }
  return { ...o, spacing, span, phase: o.phase * span };
}
function crLanes(seed, level = 0) {
  const rng = crRng((seed + level * 7919) >>> 0), lanes = {}, boost = 1 + Math.min(level, 6) * 0.1;
  const trucks = crTruckLanes(seed, level), tbl = CR_ROAD_TABLE[Math.min(level, CR_ROAD_TABLE.length - 1)];
  for (let i = 0; i < CR_ROAD_ROWS.length; i++) {
    const row = CR_ROAD_ROWS[CR_ROAD_ROWS.length - 1 - i], [vel, dens] = tbl[i], dir = i % 2 === 0 ? 1 : -1;
    const phase = rng(), big = rng() < .5, color = CR_CAR_COLORS[(i * 2 + Math.floor(rng() * 5)) % CR_CAR_COLORS.length];
    lanes[row] = trucks[i]
      // camión: blanco, 3–4 veces el largo de un auto, a la mitad de la velocidad, 1 o 2 por carril
      ? crLane({ kind: 'truck', dir, vel, dens: dens <= 2 ? 1 : 2, count: dens <= 2 ? 1 : 2, speed: vel * CR_VEL_UNIT / 2, w: CR_TILE * (big ? 4 : 3), phase, color: '#f4f4f4' })
      : crLane({ kind: 'car', dir, vel, dens, count: dens, speed: vel * CR_VEL_UNIT, w: big ? 38 : 26, phase, color });
  }
  CR_RIVER_ROWS.forEach((row, i) => {
    const count = 2 + (rng() < .5 ? 0 : 1);
    lanes[row] = crLane({
      dir: i % 2 === 0 ? -1 : 1, speed: (35 + rng() * 45) * boost, w: 46 + (rng() < .5 ? 0 : 26),
      count, phase: rng(), kind: i % 2 === 0 ? 'log' : 'turtle'
    });
  });
  return lanes;
}
function crLaneItems(lane, t) {
  const items = [];
  for (let i = 0; i < lane.count; i++) {
    let x = (lane.phase + i * lane.spacing + lane.dir * lane.speed * t) % lane.span;
    if (x < 0) x += lane.span;
    x -= lane.w;
    items.push({ x, w: lane.w });
  }
  return items;
}
function crItemAt(lane, t, px) { return crLaneItems(lane, t).find(it => px >= it.x && px <= it.x + it.w) || null; }
const CR = {
  mode: null, spectating: false, room: null, isHost: false, roomData: null, roomPlayers: {}, others: {},
  unsubs: [], hbStop: null, _hostTimer: null, lastSend: 0, resultShown: false, _seenRoundStart: 0,
  seed: 1, t0: 0, roundStart: 0, lanes: null,
  x: 0, y: 0, row: CR_START_ROW, lives: CR_LIVES_START, score: 0, bestRow: CR_START_ROW, level: 0,
  state: 'ready', hop: null, lastMoveAt: 0, popup: null, deadT: 0, deadX: 0, deadY: 0, _sentLevel: null
};
function crFrogStart() { return { x: 6 * CR_TILE + CR_TILE / 2, y: CR_START_ROW * CR_TILE + CR_TILE / 2 }; }
function crNow() { return (performance.now() - CR.t0) / 1000; }
function crReset() {
  $('#cr-over').hidden = true;
  CR.seed = (Math.random() * 1e9) | 0; CR.lanes = crLanes(CR.seed, 0); CR.t0 = performance.now();
  const p = crFrogStart(); CR.x = p.x; CR.y = p.y; CR.row = CR_START_ROW; CR.bestRow = CR_START_ROW;
  CR.lives = CR_LIVES_START; CR.score = 0; CR.level = 0; CR.state = 'playing'; CR.hop = null; CR.popup = null;
}
function crTryMove(dx, dy) {
  if (CR.state !== 'playing' || CR.hop) return;
  const now = performance.now(); if (now - CR.lastMoveAt < CR_MOVE_COOLDOWN) return; CR.lastMoveAt = now;
  const col = Math.round(CR.x / CR_TILE - 0.5), row = CR.row;
  const nrow = Math.max(CR_HOME_ROW, Math.min(CR_START_ROW, row + dy));
  const ncol = Math.max(0, Math.min(CR_COLS - 1, col + dx));
  if (nrow === row && ncol === col) return;
  CR.hop = { fx: CR.x, fy: CR.y, tx: ncol * CR_TILE + CR_TILE / 2, ty: nrow * CR_TILE + CR_TILE / 2, t: 0, row: nrow };
  SFX.play('bump');
}
function crRoadHit(row, t, x) { const lane = CR.lanes[row]; return crLaneItems(lane, t).some(it => x + 10 > it.x && x - 10 < it.x + it.w); }
function crLand(t) {
  if (CR_ROAD_ROWS.includes(CR.row)) { if (crRoadHit(CR.row, t, CR.x)) { crDie('ATROPELLADO'); return; } }
  if (CR_RIVER_ROWS.includes(CR.row)) { if (!crItemAt(CR.lanes[CR.row], t, CR.x)) { crDie('AGUA'); return; } }
  if (CR.row === CR_HOME_ROW) {
    const onSlot = CR_HOME_COLS.some(c => Math.abs(CR.x - (c * CR_TILE + CR_TILE / 2)) < CR_TILE / 2);
    if (!onSlot) { crDie('AGUA'); return; }
    crScoreHome(); return;
  }
  if (CR.row < CR.bestRow) { CR.score += (CR.bestRow - CR.row) * 10; CR.bestRow = CR.row; }
}
function crScoreHome() {
  CR.score += 50; SFX.play('win');
  // misma semilla toda la partida: los carriles de cada nivel salen de (semilla, nivel), igual para todos en línea
  CR.level++; CR.lanes = crLanes(CR.seed, CR.level);
  CR.popup = { txt: `¡LLEGASTE! +50 · NIVEL ${CR.level + 1}: ${crTheme().n}`, life: 1.6 };
  const p = crFrogStart(); CR.x = p.x; CR.y = p.y; CR.row = CR_START_ROW; CR.bestRow = CR_START_ROW;
}
function crDie(reason) {
  SFX.play('lose'); CR.lives--;
  CR.popup = { txt: reason === 'AGUA' ? '¡TE CAÍSTE AL AGUA!' : '¡TE ATROPELLARON!', life: 1 };
  if (CR.lives <= 0) {
    // última vida: se ve la rana con ojos en X un momento y luego sale la pantalla de fin
    CR.state = 'dying'; CR.deadT = CR_DEATH_MS / 1000; CR.hop = null;
    CR.deadX = Math.max(16, Math.min(CR_CVW - 16, CR.x)); CR.deadY = CR.y;
    CR.popup = { txt: 'GAME OVER', life: CR_DEATH_MS / 1000 };
    return;
  }
  const p = crFrogStart(); CR.x = p.x; CR.y = p.y; CR.row = CR_START_ROW; CR.bestRow = CR_START_ROW; CR.hop = null;
}
function crGameOver() {
  if (CR.mode === 'online') { CR.state = 'dead'; crOnlineSend(true); }
  else { CR.state = 'over'; crFinish(); }
}
function crFinish() {
  $('#cr-over-p').textContent = `PUNTAJE: ${CR.score}`;
  $('#cr-over').hidden = false; $('#cr-again').hidden = false;
  LB.confirmar(`PUNTAJE: ${CR.score}. ¿LO SUBES A LA TABLA?`, () => LB.submit('cruce', CR.score, false)).then(crLB);
}
function crLB() { LB.render($('#cr-lb'), 'cruce', false, r => r.score + ' PTS'); }
function crStep(dt) {
  if (CR.mode === 'online') { Object.values(CR.others).forEach(o => { const f = Math.min(1, dt * 10); o.x += (o.tx - o.x) * f; o.y += (o.ty - o.y) * f; }); }
  if (CR.state === 'dying') { CR.deadT -= dt; if (CR.deadT <= 0) crGameOver(); return; }
  if (CR.state !== 'playing') return;
  const t = CR.mode === 'online' ? (Date.now() - CR.roundStart) / 1000 : crNow();
  if (CR.hop) {
    CR.hop.t += dt / (CR_HOP_MS / 1000);
    const k = Math.min(1, CR.hop.t);
    CR.x = CR.hop.fx + (CR.hop.tx - CR.hop.fx) * k; CR.y = CR.hop.fy + (CR.hop.ty - CR.hop.fy) * k;
    if (k >= 1) { CR.row = CR.hop.row; CR.x = CR.hop.tx; CR.y = CR.hop.ty; CR.hop = null; crLand(t); }
  } else {
    if (CR_RIVER_ROWS.includes(CR.row)) {
      const lane = CR.lanes[CR.row], item = crItemAt(lane, t, CR.x);
      if (!item) { crDie('AGUA'); }
      else {
        CR.x += lane.dir * lane.speed * dt;
        if (CR.x < -CR_TILE / 2 || CR.x > CR_CVW + CR_TILE / 2) crDie('AGUA');
      }
    } else if (CR_ROAD_ROWS.includes(CR.row) && crRoadHit(CR.row, t, CR.x)) { crDie('ATROPELLADO'); }
  }
  if (CR.mode === 'online' && CR.state === 'playing') crOnlineSend();
}
function crDrawLane(ctx, row, lane, t) {
  const y = row * CR_TILE;
  crLaneItems(lane, t).forEach(it => {
    if (lane.kind === 'car') {
      ctx.fillStyle = lane.color; ctx.fillRect(it.x + 2, y + 5, it.w - 4, CR_TILE - 10);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(it.x + 4, y + 7, it.w - 8, 4);
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(it.x + (lane.dir > 0 ? it.w - 9 : 3), y + 5, 6, CR_TILE - 10);
    } else if (lane.kind === 'truck') {
      crDrawTruck(ctx, Math.round(it.x), y, it.w, lane.dir);
    } else if (lane.kind === 'log') {
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(it.x, y + 6, it.w, CR_TILE - 12);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(it.x, y + 6, it.w, 3);
      ctx.fillStyle = '#a97c4f'; for (let k = it.x + 6; k < it.x + it.w - 4; k += 14) ctx.fillRect(k, y + 9, 3, CR_TILE - 18);
    } else {
      const n = Math.max(1, Math.round(it.w / 24));
      for (let k = 0; k < n; k++) { pxCircle(ctx, it.x + 12 + k * 24, y + CR_TILE / 2, 10, '#38b764'); pxCircle(ctx, it.x + 12 + k * 24, y + CR_TILE / 2, 6, '#2c5c34'); }
    }
  });
}
/* camión blanco pixelado: remolque largo + cabina al frente (según la dirección) */
function crDrawTruck(ctx, x, y, w, dir) {
  const cab = 24, gap = 2, tw = w - cab - gap, tx = dir > 0 ? x : x + cab + gap, cx = dir > 0 ? x + tw + gap : x;
  ctx.fillStyle = '#1a1c2c';                                   // llantas
  for (let k = 8; k < w - 6; k += (k < tw - 12 ? 14 : 10)) { ctx.fillRect(x + k, y + 3, 6, 3); ctx.fillRect(x + k, y + CR_TILE - 6, 6, 3); }
  ctx.fillStyle = '#94b0c2'; ctx.fillRect(tx, y + 5, tw, CR_TILE - 10);   // sombra del remolque
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(tx, y + 5, tw, CR_TILE - 13);   // remolque
  ctx.fillStyle = '#c2c3c7'; for (let k = tx + 8; k < tx + tw - 4; k += 12) ctx.fillRect(k, y + 7, 2, CR_TILE - 17);
  ctx.fillStyle = '#566c86'; ctx.fillRect(tx, y + 5, tw, 1); ctx.fillRect(tx, y + CR_TILE - 6, tw, 1);
  ctx.fillStyle = '#566c86'; ctx.fillRect(dir > 0 ? cx - gap : cx + cab, y + 13, gap, 6); // enganche
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(cx, y + 7, cab, CR_TILE - 14);   // cabina
  ctx.fillStyle = '#94b0c2'; ctx.fillRect(cx, y + CR_TILE - 10, cab, 3);
  ctx.fillStyle = '#41a6f6'; ctx.fillRect(dir > 0 ? cx + cab - 9 : cx + 3, y + 9, 6, CR_TILE - 18); // parabrisas
  ctx.fillStyle = '#ffcd75'; ctx.fillRect(dir > 0 ? cx + cab - 2 : cx, y + 8, 2, 3); ctx.fillRect(dir > 0 ? cx + cab - 2 : cx, y + CR_TILE - 11, 2, 3); // luces
}
/* rana "muerta" de caricatura: ojos en X y lengua afuera (8-bit, un sprite por color) */
const CR_DEAD_ROWS = [
  ".22222....22222.",
  "2343432..2343432",
  "2334332112334332",
  "2343432112343432",
  ".22222111122222.",
  "2111111111111112",
  "2111111111111112",
  "2111222222221112",
  "2111111551111112",
  ".21111155111112.",
  "22.2222552222.22",
  "2...22....22...2",
];
const CR_DEAD_SPR = {};
function crDeadSprite(color) {
  return CR_DEAD_SPR[color] || (CR_DEAD_SPR[color] = sprite(CR_DEAD_ROWS, { 1: color, 2: '#1a1c2c', 3: '#f4f4f4', 4: '#1a1c2c', 5: '#b13e53' }, 2));
}
function crDrawDeadFrog(ctx, x, y, color) {
  const s = crDeadSprite(color);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(x - 12), Math.round(y + 10), 24, 4);
  ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
}

function crDraw() {
  const cv = $('#cr-cv'); if (!cv || !cv.offsetParent || !CR.lanes) return;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center';
  const t = CR.mode === 'online' ? (Date.now() - CR.roundStart) / 1000 : crNow();
  const th = crTheme();
  ctx.fillStyle = th.waterHome; ctx.fillRect(0, CR_HOME_ROW * CR_TILE, CR_CVW, CR_TILE);
  CR_HOME_COLS.forEach(c => { ctx.fillStyle = th.water; ctx.fillRect(c * CR_TILE, 0, CR_TILE, CR_TILE); pxCircle(ctx, c * CR_TILE + CR_TILE / 2, CR_TILE / 2, 8, th.homeSlot); });
  ctx.fillStyle = th.water; CR_RIVER_ROWS.forEach(r => ctx.fillRect(0, r * CR_TILE, CR_CVW, CR_TILE));
  ctx.fillStyle = th.grass; ctx.fillRect(0, CR_MEDIAN_ROW * CR_TILE, CR_CVW, CR_TILE);
  ctx.fillStyle = th.road; CR_ROAD_ROWS.forEach(r => ctx.fillRect(0, r * CR_TILE, CR_CVW, CR_TILE));
  ctx.fillStyle = th.grass; ctx.fillRect(0, CR_START_ROW * CR_TILE, CR_CVW, CR_TILE);
  ctx.fillStyle = th.line; CR_ROAD_ROWS.forEach(r => { for (let i = 6; i < CR_CVW; i += 16) ctx.fillRect(i, r * CR_TILE + CR_TILE / 2 - 1, 8, 2); });
  [...CR_RIVER_ROWS, ...CR_ROAD_ROWS].forEach(r => crDrawLane(ctx, r, CR.lanes[r], t));
  if (CR.mode === 'online') {
    const seats = crSeatList();
    seats.forEach(([uid], i) => {
      if (uid === UID) return;
      const o = CR.others[uid]; if (!o) return;
      // si va en otro nivel su tablero es distinto: se dibuja como "fantasma"
      ctx.globalAlpha = o.level != null && o.level !== CR.level ? .35 : 1;
      if (o.finished) crDrawDeadFrog(ctx, Math.max(16, Math.min(CR_CVW - 16, o.x)), o.y, CR_PCOLORS[i] || '#aaaaaa');
      else crDrawFrog(ctx, o.x, o.y, CR_PCOLORS[i] || '#aaaaaa');
      ctx.globalAlpha = 1;
    });
    const myCol = CR_PCOLORS[seats.findIndex(([u]) => u === UID)] || '#a7f070';
    if (CR.state === 'playing') crDrawFrog(ctx, CR.x, CR.y, myCol);
    else if (CR.state === 'dying' || CR.state === 'dead') crDrawDeadFrog(ctx, CR.deadX, CR.deadY, myCol);
  } else if (CR.state === 'playing') {
    crDrawFrog(ctx, CR.x, CR.y, '#a7f070');
  } else if (CR.state === 'dying' || CR.state === 'over') {
    crDrawDeadFrog(ctx, CR.deadX, CR.deadY, '#a7f070');
  }
  if (CR.popup && CR.popup.life > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, CR_CVH / 2 - 20, CR_CVW, 32);
    ctx.fillStyle = '#ffe14d'; ctx.font = '12px "Press Start 2P"'; ctx.fillText(CR.popup.txt, CR_CVW / 2, CR_CVH / 2 + 4);
  }
  $('#cr-status').textContent = `VIDAS: ${'❤'.repeat(Math.max(0, CR.lives))} · NIVEL ${CR.level + 1}: ${th.n}`;
  $('#cr-score').textContent = `PUNTAJE: ${CR.score}`;
}
function crTick(dt) {
  if (CR.popup) { CR.popup.life -= dt; if (CR.popup.life <= 0) CR.popup = null; }
  crStep(dt);
}
['cr-up', 'cr-down', 'cr-left', 'cr-right'].forEach(id => {
  const dx = id === 'cr-left' ? -1 : id === 'cr-right' ? 1 : 0, dy = id === 'cr-up' ? -1 : id === 'cr-down' ? 1 : 0;
  $('#' + id).addEventListener('pointerdown', e => { e.preventDefault(); crTryMove(dx, dy); });
});

/* ---- partida en línea (hasta 4 jugadores, mismo tablero) ---- */
function crMenuMsg(t, cls = '') { const m = $('#cr-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }
function crView(v) { $('#cr-menu').hidden = v !== 'menu'; $('#cr-lobby').hidden = v !== 'lobby'; $('#cr-game').hidden = v !== 'game'; fitSoon(); }
function crSeatList() { return Object.entries(CR.roomPlayers).sort((a, b) => a[1].slot - b[1].slot); }
function crMeDoc() { return fs.doc(db, 'cruces', CR.room, 'players', UID); }
function crOnlineSend(force) {
  if (CR.mode !== 'online' || !CR.room) return;
  const now = performance.now(); if (!force && now - CR.lastSend < 110) return; CR.lastSend = now;
  fs.updateDoc(crMeDoc(), { x: Math.round(CR.x * 10) / 10, y: Math.round(CR.y * 10) / 10, lives: CR.lives, score: CR.score, finished: CR.state === 'dead' })
    .catch(e => force && console.error(e));
  // el nivel va aparte y solo cuando cambia: si fallara, no frena el envío de la posición
  if (CR.level !== CR._sentLevel) { CR._sentLevel = CR.level; fs.updateDoc(crMeDoc(), { level: CR.level }).catch(() => {}); }
}
async function crCreate() {
  if (!(await fbReady)) return crMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR SOLO.', 'lose');
  crLeaveOnline(); crMenuMsg('CREANDO PARTIDA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'cruces', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, { host: UID, state: 'lobby', seed: 0, roundStartMs: 0, created: fs.serverTimestamp() });
    CR.room = code;
    await fs.setDoc(fs.doc(db, 'cruces', code, 'players', UID), { name: playerName(), slot: 0, x: 0, y: 0, lives: CR_LIVES_START, score: 0, finished: false, joined: fs.serverTimestamp() });
    crEnterLobby();
  } catch (e) { console.error(e); CR.room = null; crMenuMsg('ERROR AL CREAR PARTIDA: ' + e.message, 'lose'); }
}
async function crJoin() {
  const code = $('#cr-code').value.trim().toUpperCase();
  if (code.length < 5) return crMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return crMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR SOLO.', 'lose');
  crLeaveOnline(); crMenuMsg('ENTRANDO…');
  try {
    const d = await fs.getDoc(fs.doc(db, 'cruces', code));
    if (!d.exists()) throw new Error('ESA PARTIDA NO EXISTE');
    const ps = await fs.getDocs(fs.collection(db, 'cruces', code, 'players'));
    const used = new Set(); let mine = false;
    ps.forEach(p => { if (p.id === UID) mine = true; else used.add(p.data().slot); });
    if (!mine && used.size >= 4) throw new Error('LA PARTIDA ESTÁ LLENA (MÁX. 4)');
    if (!mine && d.data().state !== 'lobby') throw new Error('LA PARTIDA YA EMPEZÓ');
    let slot = 0; while (used.has(slot)) slot++;
    CR.room = code;
    await fs.setDoc(fs.doc(db, 'cruces', code, 'players', UID), { name: playerName(), slot, x: 0, y: 0, lives: CR_LIVES_START, score: 0, finished: false, joined: fs.serverTimestamp() });
    crEnterLobby();
  } catch (e) { CR.room = null; crMenuMsg(e.message, 'lose'); }
}
function crEnterLobby() {
  CR.mode = 'online'; CR.roomData = null; CR.roomPlayers = {}; CR.others = {}; CR.resultShown = false; CR._seenRoundStart = 0;
  crMenuMsg(''); $('#cr-room').textContent = (CR.spectating ? '👁 ESPECTADOR · PARTIDA ' : 'PARTIDA ') + CR.room;
  crView('lobby'); crLobbyRender();
  CR.unsubs.push(fs.onSnapshot(fs.doc(db, 'cruces', CR.room), s => {
    if (!s.exists()) { if (CR.spectating) { crMenuMsg('LA PARTIDA SE CERRÓ.', 'lose'); crToMenu(); } return; }
    CR.roomData = s.data(); crSync();
  }));
  CR.unsubs.push(fs.onSnapshot(fs.collection(db, 'cruces', CR.room, 'players'), s => {
    const m = {}; s.forEach(d => m[d.id] = d.data()); CR.roomPlayers = m;
    Object.entries(m).forEach(([uid, data]) => {
      if (uid === UID) return;
      const o = CR.others[uid] || { x: data.x, y: data.y };
      CR.others[uid] = { ...o, tx: data.x, ty: data.y, name: data.name, lives: data.lives, score: data.score, finished: data.finished, level: typeof data.level === 'number' ? data.level : null };
    });
    crSync();
  }));
  if (!CR.spectating) CR.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'cruces', CR.room, 'players', UID), { lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
  CR._hostTimer = setInterval(crHostPoll, 3000);
}
async function crSpecOpen(code) { crToMenu(); CR.spectating = true; CR.room = code; $('#cr-spec-list').hidden = true; crEnterLobby(); }
function crLobbyRender() {
  if (CR.mode !== 'online') return;
  const list = crSeatList(), ul = $('#cr-plist'); ul.innerHTML = '';
  list.forEach(([uid, p], i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${CR_PCOLORS[i] || '#888'}"></span><span>${esc(p.name)}${uid === UID ? ' (TÚ)' : ''}${CR.roomData && uid === CR.roomData.host ? ' ★' : ''}</span>`;
    ul.appendChild(li);
  });
  $('#cr-lobby-msg').textContent = (CR.isHost ? `COMPARTE EL CÓDIGO ${CR.room}. ` : 'ESPERANDO AL ANFITRIÓN (★)… ') + `${list.length}/4 JUGADORES`;
  $('#cr-go').hidden = !CR.isHost || CR.spectating;
  $('#cr-go').disabled = list.length < 1;
}
async function crOnlineStart() {
  if (!CR.isHost || CR.spectating) return;
  const list = crSeatList(); if (!list.length) return;
  const seed = (Math.random() * 1e9) | 0, roundStartMs = Date.now();
  try {
    await fs.updateDoc(fs.doc(db, 'cruces', CR.room), { state: 'play', seed, roundStartMs });
    // Cada jugador reinicia SU propio documento al ver la partida nueva (en crSync): las reglas solo dejan escribir el propio.
  } catch (e) { console.error(e); }
}
function crSync() {
  const d = CR.roomData; if (!d || CR.mode !== 'online') return;
  CR.isHost = d.host === UID;
  crView(d.state === 'lobby' ? 'lobby' : 'game');
  if (d.state === 'lobby') { crLobbyRender(); return; }
  $('#cr-over').hidden = d.state !== 'over';
  $('#cr-room2').hidden = false; $('#cr-room2').textContent = (CR.spectating ? '👁 ESPECTADOR · PARTIDA ' : 'PARTIDA ') + CR.room;
  $('#cr-spec-badge').hidden = !CR.spectating;
  if (d.roundStartMs && d.roundStartMs !== CR._seenRoundStart) {
    // todos arman los mismos carriles con la semilla y la hora de inicio de la partida
    CR._seenRoundStart = d.roundStartMs; CR.resultShown = false; CR.seed = d.seed; CR.roundStart = d.roundStartMs; CR.level = 0; CR.lanes = crLanes(d.seed, 0);
    if (!CR.spectating) {
      const p = crFrogStart(); CR.x = p.x; CR.y = p.y; CR.row = CR_START_ROW; CR.bestRow = CR_START_ROW;
      CR.lives = CR_LIVES_START; CR.score = 0; CR.state = 'playing'; CR.hop = null; CR.popup = null; CR._sentLevel = null;
      crOnlineSend(true); // reinicia mi propio documento (posición, vidas, puntos)
    }
  }
  if (CR.spectating && CR.lanes) crSpecLevel();
  if (d.state === 'over' && !CR.resultShown) { CR.resultShown = true; crOnlineFinish(); }
  crRenderPlayers();
}
/* quien mira sigue el tablero de la primera rana que siga viva */
function crSpecLevel() {
  const alive = crSeatList().map(([uid]) => CR.others[uid]).filter(o => o && !o.finished && o.level != null);
  const lv = alive.length ? alive[0].level : CR.level;
  if (lv !== CR.level) { CR.level = lv; CR.lanes = crLanes(CR.seed, lv); }
}
function crRenderPlayers() {
  const d = CR.roomData; if (!d) return;
  const ul = $('#cr-players'); ul.hidden = false; ul.innerHTML = '';
  crSeatList().forEach(([uid, p], i) => {
    const mine = uid === UID;
    const st = mine ? { lives: CR.lives, score: CR.score } : (CR.others[uid] || { lives: p.lives, score: p.score });
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${CR_PCOLORS[i] || '#888'}"></span><span>${esc(p.name)}${mine ? ' (TÚ)' : ''}</span><small>${'❤'.repeat(Math.max(0, st.lives || 0))} · ${st.score || 0} PTS</small>`;
    ul.appendChild(li);
  });
}
function crOnlineFinish() {
  const totals = crSeatList().map(([uid, p]) => ({ uid, name: p.name, score: uid === UID ? CR.score : ((CR.others[uid] || {}).score || p.score || 0) }));
  totals.sort((a, b) => b.score - a.score);
  $('#cr-over-p').innerHTML = totals.map((t, i) => `${i + 1}. ${esc(t.name)}${t.uid === UID ? ' (TÚ)' : ''}: ${t.score} PTS`).join('<br>');
  $('#cr-again').hidden = !CR.isHost || CR.spectating;
  if (!CR.spectating) LB.confirmar(`PUNTAJE: ${CR.score}. ¿LO SUBES A LA TABLA?`, () => LB.submit('cruce', CR.score, false)).then(crLB);
}
function crHostPoll() {
  if (CR.mode !== 'online' || !CR.isHost || CR.spectating || !CR.roomData) return;
  const d = CR.roomData; if (d.state !== 'play') return;
  const list = crSeatList(); if (!list.length) return;
  const allDone = list.every(([uid, p]) => (uid === UID ? CR.state === 'dead' : p.finished));
  if (allDone) fs.updateDoc(fs.doc(db, 'cruces', CR.room), { state: 'over' }).catch(() => {});
}
function crLeaveOnline() {
  CR.unsubs.forEach(u => u()); CR.unsubs = [];
  if (CR.hbStop) { CR.hbStop(); CR.hbStop = null; }
  if (CR._hostTimer) { clearInterval(CR._hostTimer); CR._hostTimer = null; }
  if (CR.room && fs && !CR.spectating) {
    const room = CR.room, others = Object.keys(CR.roomPlayers).filter(u => u !== UID);
    if (CR.isHost && others.length) fs.updateDoc(fs.doc(db, 'cruces', room), { host: others[0] }).catch(() => {});
    fs.deleteDoc(fs.doc(db, 'cruces', room, 'players', UID)).catch(() => {});
  }
  CR.room = null; CR.roomData = null; CR.roomPlayers = {}; CR.others = {}; CR.isHost = false; CR.spectating = false;
}
function crToMenu() {
  if (CR.mode === 'online') crLeaveOnline();
  CR.mode = null; CR.spectating = false; CR.state = 'ready';
  $('#cr-over').hidden = true;
  crView('menu');
}
$('#cr-spec-btn').onclick = async () => {
  const list = $('#cr-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('cruces');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const stateN = { lobby: 'EN LOBBY', play: 'JUGANDO', over: 'TERMINADA' };
  list.innerHTML = rooms.length
    ? rooms.map(r => `<li><span><b>PARTIDA ${r.code}</b><small>${stateN[r.data.state] || r.data.state}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY PARTIDAS RECIENTES</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); crSpecOpen(b.dataset.code); });
};
$('#cr-local').onclick = () => {
  SFX.play('start'); CR.mode = 'local'; CR.spectating = false;
  $('#cr-room2').hidden = true; $('#cr-spec-badge').hidden = true; $('#cr-players').hidden = true;
  crReset(); crView('game');
};
$('#cr-create').onclick = crCreate;
$('#cr-join').onclick = crJoin;
$('#cr-code').addEventListener('keydown', e => { if (e.key === 'Enter') crJoin(); });
$('#cr-go').onclick = crOnlineStart;
$('#cr-leave').onclick = crToMenu;
$('#cr-quit').onclick = pedirAbandonar(crToMenu);
$('#cr-again').onclick = () => { if (CR.mode === 'local') { SFX.play('start'); crReset(); } else if (CR.isHost) crOnlineStart(); };
$('#cr-exit').onclick = () => arcade.goTab('menu');
window.addEventListener('beforeunload', () => { if (CR.mode === 'online') crLeaveOnline(); });
crLB(); crView('menu');

// --- conexión con la página (antes en arcade.html) ---
registrarBucle(dt => { if (arcade.tab === 'cruce') { crTick(dt); crDraw(); } });
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || arcade.tab !== 'cruce') return;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); crTryMove(0, -1); }
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); crTryMove(0, 1); }
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); crTryMove(-1, 0); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); crTryMove(1, 0); }
});
