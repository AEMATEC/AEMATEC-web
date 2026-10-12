import { db, fs, UID, fbReady, $, esc, playerName, genCode, isStale, liveRooms, presenceLoop, SFX, LB, pxCircle, fitSoon, expiraEn } from './core.js';
import { arcade, registrarBucle } from './estado.js';
import { pedirAbandonar, pickRow, BL_R, blBallImg, BL_POCKET_R, BL_FRICTION, BL_MAXV, BL_REST } from './compartido-juegos.js';

/* =========================================================
   BILLAR — normal (8 bolas) y bola 9
   ========================================================= */
const BL_CW = 440, BL_CH = 240, BL_RAIL = 20, BL_PW = 400, BL_PH = 200;

const BL_POCKETS = [
  { x: 0, y: 0 }, { x: BL_PW / 2, y: 0 }, { x: BL_PW, y: 0 },
  { x: 0, y: BL_PH }, { x: BL_PW / 2, y: BL_PH }, { x: BL_PW, y: BL_PH },
];

function blShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }
function blTriSlots(rowsArr) {
  const foot = { x: BL_PW * 0.74, y: BL_PH / 2 }, D = BL_R * 2 * 0.87, slots = [];
  rowsArr.forEach((cnt, r) => { for (let i = 0; i < cnt; i++) slots.push({ x: foot.x + r * D, y: foot.y + (i - (cnt - 1) / 2) * (BL_R * 2 + 0.6) }); });
  return slots;
}
function blRackEight() {
  const slots = blTriSlots([1, 2, 3, 4, 5]);
  const nums = blShuffle([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
  const order = [...nums.slice(0, 4), 8, ...nums.slice(4)];
  return order.map((num, i) => ({ num, x: slots[i].x, y: slots[i].y }));
}
function blRackNine() {
  const slots = blTriSlots([1, 2, 3, 2, 1]);
  const rest = blShuffle([2, 3, 4, 5, 6, 7, 8]);
  const order = [1, rest[0], rest[1], rest[2], 9, rest[3], rest[4], rest[5], rest[6]];
  return order.map((num, i) => ({ num, x: slots[i].x, y: slots[i].y }));
}
function blNewBalls(variant) {
  const rack = variant === 'nine' ? blRackNine() : blRackEight();
  const balls = [{ num: 0, x: BL_PW * 0.22, y: BL_PH / 2, vx: 0, vy: 0, potted: false }];
  rack.forEach(r => balls.push({ num: r.num, x: r.x, y: r.y, vx: 0, vy: 0, potted: false }));
  return balls;
}

/* ---- física ---- */
function blStep(balls, dt) {
  const ev = { potted: [], firstHit: null };
  for (const b of balls) {
    if (b.potted) continue;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0.01) {
      const nsp = Math.max(0, sp - BL_FRICTION * dt), k = nsp / sp;
      b.vx *= k; b.vy *= k;
    } else { b.vx = 0; b.vy = 0; }
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  for (const b of balls) {
    if (b.potted) continue;
    if (b.x < BL_R) { b.x = BL_R; b.vx = -b.vx * BL_REST; }
    if (b.x > BL_PW - BL_R) { b.x = BL_PW - BL_R; b.vx = -b.vx * BL_REST; }
    if (b.y < BL_R) { b.y = BL_R; b.vy = -b.vy * BL_REST; }
    if (b.y > BL_PH - BL_R) { b.y = BL_PH - BL_R; b.vy = -b.vy * BL_REST; }
  }
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].potted) continue;
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[j].potted) continue;
      const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < BL_R * 2) {
        const nx = dx / d, ny = dy / d, overlap = BL_R * 2 - d;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approach < 0) { a.vx += approach * nx; a.vy += approach * ny; b.vx -= approach * nx; b.vy -= approach * ny; }
        if (a.num === 0 && ev.firstHit == null) ev.firstHit = b.num;
        if (b.num === 0 && ev.firstHit == null) ev.firstHit = a.num;
      }
    }
  }
  for (const b of balls) {
    if (b.potted) continue;
    for (const p of BL_POCKETS) if (Math.hypot(b.x - p.x, b.y - p.y) < BL_POCKET_R) { b.potted = true; b.vx = 0; b.vy = 0; ev.potted.push(b.num); break; }
  }
  return ev;
}
function blAllStopped(balls) { return balls.every(b => b.potted || (Math.abs(b.vx) < 3 && Math.abs(b.vy) < 3)); }

/* ---- reglas ---- */
function blEvalEight(st, ev) {
  const potted = ev.potted.filter(n => n !== 0), scratched = ev.potted.includes(0);
  let foul = scratched || ev.firstHit == null;
  if (!foul && !st.openTable && ev.firstHit !== 8) {
    const g = st.myGroup, hg = ev.firstHit <= 7 ? 'solid' : 'stripe';
    if (g !== hg) foul = true;
  } else if (!foul && !st.openTable && ev.firstHit === 8 && st.myRemaining !== 0) foul = true;
  let groupAssigned = null;
  if (!foul && st.openTable) { const nonEight = potted.filter(n => n !== 8).map(n => n <= 7 ? 'solid' : 'stripe'); if (nonEight.length) groupAssigned = nonEight[0]; }
  const eightPotted = potted.includes(8);
  let result;
  if (eightPotted) result = (foul || st.myRemaining !== 0) ? 'lose' : 'win';
  else if (foul) result = 'foul';
  else {
    const g = groupAssigned || st.myGroup;
    const pottedMine = g ? potted.some(n => n !== 8 && (n <= 7 ? 'solid' : 'stripe') === g) : potted.length > 0;
    result = pottedMine ? 'continue' : 'pass';
  }
  return { foul, groupAssigned, result };
}
function blEvalNine(st, ev) {
  const potted = ev.potted.filter(n => n !== 0), scratched = ev.potted.includes(0);
  const foul = scratched || ev.firstHit == null || ev.firstHit !== st.lowest;
  const ninePotted = potted.includes(9);
  let result;
  if (ninePotted) result = foul ? 'respot_foul' : 'win';
  else if (foul) result = 'foul';
  else result = potted.length ? 'continue' : 'pass';
  return { foul, result };
}
function blLegalTargets(balls, variant, st) {
  const onTable = n => balls.some(b => b.num === n && !b.potted);
  if (variant === 'nine') { const lo = Math.min(...balls.filter(b => !b.potted && b.num !== 0).map(b => b.num)); return isFinite(lo) ? [lo] : []; }
  if (st.openTable || !st.myGroup) return balls.filter(b => !b.potted && b.num !== 0 && b.num !== 8).map(b => b.num);
  const mine = balls.filter(b => !b.potted && (st.myGroup === 'solid' ? b.num <= 7 : (b.num >= 9 && b.num <= 15))).map(b => b.num);
  return mine.length ? mine : (onTable(8) ? [8] : []);
}

/* ---- IA ---- */
function blGhostAim(cue, target, pocket) {
  const dx = pocket.x - target.x, dy = pocket.y - target.y, d = Math.hypot(dx, dy);
  if (d < 1) return null;
  const nx = dx / d, ny = dy / d, gb = { x: target.x - nx * BL_R * 2, y: target.y - ny * BL_R * 2 };
  const tx = gb.x - cue.x, ty = gb.y - cue.y, dist = Math.hypot(tx, ty);
  if (dist < 1) return null;
  const cutCos = (tx * nx + ty * ny) / dist;
  return { angle: Math.atan2(ty, tx), dist, pocketDist: d, gb, feasible: cutCos > 0.12 };
}
function blSegClear(balls, x0, y0, x1, y1, skip) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < 1) return true;
  const ux = dx / len, uy = dy / len;
  for (const b of balls) {
    if (b.potted || skip.includes(b.num)) continue;
    const t = Math.max(0, Math.min(len, (b.x - x0) * ux + (b.y - y0) * uy)), px = x0 + ux * t, py = y0 + uy * t;
    if (Math.hypot(b.x - px, b.y - py) < BL_R * 1.85) return false;
  }
  return true;
}
function blPlanShot(balls, targets) {
  const cue = balls.find(b => b.num === 0);
  let best = null;
  for (const num of targets) {
    const t = balls.find(b => b.num === num && !b.potted); if (!t) continue;
    for (const p of BL_POCKETS) {
      const g = blGhostAim(cue, t, p); if (!g || !g.feasible) continue;
      if (!blSegClear(balls, cue.x, cue.y, g.gb.x, g.gb.y, [0, num])) continue;
      if (!blSegClear(balls, t.x, t.y, p.x, p.y, [num])) continue;
      const score = g.dist + g.pocketDist * 0.6;
      if (!best || score < best.score) best = { angle: g.angle, dist: g.dist, pocketDist: g.pocketDist, score };
    }
  }
  if (!best) {
    const t = balls.find(b => b.num === targets[0] && !b.potted);
    if (t) best = { angle: Math.atan2(t.y - cue.y, t.x - cue.x), dist: Math.hypot(t.x - cue.x, t.y - cue.y), pocketDist: 220 };
  }
  if (!best) return null;
  const power = Math.min(BL_MAXV, 250 + best.pocketDist * 1.5 + best.dist * 0.7) * (0.88 + Math.random() * 0.22);
  return { angle: best.angle + (Math.random() - 0.5) * 0.05, power };
}
function blAutoPlaceCue(balls) {
  const cue = balls.find(b => b.num === 0);
  let x = BL_PW * 0.22, y = BL_PH / 2, k = 0;
  while (balls.some(b => b.num !== 0 && !b.potted && Math.hypot(b.x - x, b.y - y) < BL_R * 2.2) && k < 40) { x = BL_R * 3 + Math.random() * (BL_PW * 0.4); y = BL_R * 2 + Math.random() * (BL_PH - BL_R * 4); k++; }
  cue.x = x; cue.y = y; cue.vx = 0; cue.vy = 0; cue.potted = false;
}

/* ---- estado y render ---- */
const BL = {
  mode: null, phase: 'menu', variant: 'eight', lbVariant: 'eight',
  balls: [], turn: 0, names: ['', ''], groups: [null, null], openTable: true,
  placing: null, placePreview: null, aimPointer: null, dragging: false, power: .7, shotActive: false, shotEvents: null,
  winner: null, submitted: false, cpuTimer: null, _acc: 0,
  room: null, isHost: false, roomData: null, roomPlayers: {}, unsubs: [], hbStop: null, me: -1, spectating: false, lastSend: 0,
};
const blcv = $('#bl-cv'), blx = blcv.getContext('2d'); blx.imageSmoothingEnabled = false;
function blSt(idx) {
  const g = BL.groups[idx];
  const remaining = g ? BL.balls.filter(b => !b.potted && (g === 'solid' ? b.num <= 7 : (b.num >= 9 && b.num <= 15))).length : 7;
  const nums = BL.balls.filter(b => !b.potted && b.num !== 0).map(b => b.num);
  const lowest = nums.length ? Math.min(...nums) : null;
  return { openTable: BL.openTable, myGroup: g, myRemaining: remaining, lowest };
}
function blCanAct() {
  if (BL.spectating || BL.shotActive) return false;
  if (BL.mode === 'cpu') return BL.turn === 0;
  if (BL.mode === 'local2') return true;
  if (BL.mode === 'online') return BL.turn === BL.me;
  return false;
}
function blPlaceOk(x, y) {
  if (x < BL_R || x > BL_PW - BL_R || y < BL_R || y > BL_PH - BL_R) return false;
  return !BL.balls.some(b => b.num !== 0 && !b.potted && Math.hypot(b.x - x, b.y - y) < BL_R * 2);
}
function blView(v) {
  $('#bl-setup').hidden = !(v === 'menu' || v === 'lobby');
  $('#bl-menu').hidden = v !== 'menu';
  $('#bl-lobby').hidden = v !== 'lobby';
  $('#bl-game').hidden = v !== 'game';
  fitSoon();
}
function blSetupRender() {
  const online = BL.mode === 'online', lock = online && !BL.isHost;
  pickRow($('#bl-fmt'), [{ html: 'NORMAL<br><small>8 BOLAS</small>' }, { html: 'BOLA 9<br><small>MÁS RÁPIDA</small>' }],
    BL.variant === 'nine' ? 1 : 0, i => {
      const v = i === 0 ? 'eight' : 'nine'; SFX.play('click'); BL.variant = v;
      if (online) fs.updateDoc(fs.doc(db, 'pool', BL.room), { variant: v }).catch(console.error);
      blSetupRender();
    });
  $('#bl-fmt').querySelectorAll('.btn').forEach(b => b.disabled = lock);
}
function blMsg(t, cls = '') { const m = $('#bl-msg'); m.textContent = t; m.className = 'msg ' + cls; }
function blUI() {
  const t = BL.turn;
  let txt = `<span style="color:${t === 0 ? 'var(--yellow)' : 'var(--cyan)'}">${esc(BL.names[t] || '???')}</span>: `;
  if (BL.variant === 'nine') { const lo = blSt(t).lowest; txt += lo ? `GOLPEA PRIMERO LA BOLA ${lo}` : ''; }
  else txt += BL.groups[t] ? (BL.groups[t] === 'solid' ? 'LISAS (1-7)' : 'RAYADAS (9-15)') : 'MESA ABIERTA';
  if (BL.placing != null) txt = `${esc(BL.names[BL.placing] || '???')}: COLOCA LA BOLA BLANCA (TOCA LA MESA)`;
  if (BL.mode === 'online' && BL.spectating) txt = `<span style="color:${t === 0 ? 'var(--yellow)' : 'var(--cyan)'}">${esc(BL.names[t] || '???')}</span>: SU TURNO`;
  $('#bl-turn').innerHTML = txt;
  blSyncShootBtn();
  fitSoon();
}
function blSyncShootBtn() {
  const canShoot = blCanAct() && BL.placing == null;
  const cue = BL.balls.find(b => b.num === 0);
  const aimed = BL.aimPointer && cue && Math.hypot(BL.aimPointer.x - cue.x, BL.aimPointer.y - cue.y) > 4;
  const shoot = $('#bl-shoot'), power = $('#bl-power'); // blDraw lo llama en cada fotograma: solo escribe si cambió
  if (shoot.disabled !== (!canShoot || !aimed)) shoot.disabled = !canShoot || !aimed;
  if (power.disabled !== !canShoot) power.disabled = !canShoot;
}
function blLB() {
  $('#bl-lb-tabs').innerHTML = '';
  [['eight', 'NORMAL'], ['nine', 'BOLA 9']].forEach(([k, n]) => {
    const b = document.createElement('button'); b.className = 'btn' + (BL.lbVariant === k ? ' on' : ''); b.textContent = n;
    b.onclick = () => { BL.lbVariant = k; blLB(); };
    $('#bl-lb-tabs').appendChild(b);
  });
  LB.render($('#bl-lb'), 'billar_' + BL.lbVariant, false, r => `${r.score} ${r.score === 1 ? 'PARTIDA' : 'PARTIDAS'}`);
}

function blDrawBall(b) {
  blx.drawImage(blBallImg(b.num), Math.round(b.x + BL_RAIL) - BL_R, Math.round(b.y + BL_RAIL) - BL_R);
}
let blTableImg = null;
function blTable() {
  if (blTableImg) return blTableImg;
  const c = document.createElement('canvas'); c.width = BL_CW; c.height = BL_CH;
  const g = c.getContext('2d');
  const F = BL_RAIL, W = BL_CW, H = BL_CH;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // azar fijo: la mesa siempre sale igual
  // marco de madera con luz arriba-izquierda y veta
  r(0, 0, W, H, '#2a170c'); r(1, 1, W - 2, H - 2, '#6b4226');
  r(1, 1, W - 2, 1, '#a0703f'); r(1, 1, 1, H - 2, '#a0703f'); r(2, 2, W - 4, 1, '#865630'); r(2, 2, 1, H - 4, '#865630');
  r(2, H - 3, W - 3, 1, '#4a2b15'); r(W - 3, 2, 1, H - 3, '#4a2b15');
  for (let i = 0; i < 90; i++) {
    const col = rnd() < .5 ? '#5a371d' : '#7c4e2b', len = 8 + (rnd() * 26 | 0), a = 3 + (rnd() * 9 | 0), b = (rnd() * (i % 2 ? W - len : H - len)) | 0;
    if (i % 2) { r(b, a, len, 1, col); r(b, H - 4 - (a - 3), len, 1, col); } else { r(a, b, 1, len, col); r(W - 4 - (a - 3), b, 1, len, col); }
  }
  r(13, 13, W - 26, H - 26, '#2a170c');
  // bandas (goma verde) alrededor del paño
  r(14, 14, W - 28, H - 28, '#0b5d3e');
  r(14, 14, W - 28, 1, '#1a8a5c'); r(14, 14, 1, H - 28, '#1a8a5c'); r(14, H - 15, W - 28, 1, '#08432d'); r(W - 15, 14, 1, H - 28, '#08432d');
  // paño con textura
  r(F, F, BL_PW, BL_PH, '#14784f');
  for (let y = 0; y < BL_PH; y += 2) for (let x = 0; x < BL_PW; x += 2) {
    const n = rnd(); if (n < .16) r(F + x, F + y, 2, 2, '#168258'); else if (n < .3) r(F + x, F + y, 2, 2, '#11704a');
  }
  r(F, F, BL_PW, 2, 'rgba(0,0,0,.28)'); r(F, F, 2, BL_PH, 'rgba(0,0,0,.28)'); // sombra de la banda sobre el paño
  r(F + (BL_PW * .22 | 0), F, 1, BL_PH, 'rgba(255,255,255,.08)');                // línea de cabecera
  r(F + (BL_PW * .22 | 0) - 1, F + BL_PH / 2 - 1, 3, 3, 'rgba(255,255,255,.18)');
  r(F + (BL_PW * .74 | 0) - 1, F + BL_PH / 2 - 1, 3, 3, 'rgba(0,0,0,.25)');       // punto del vértice del triángulo
  // rombos de madera/nácar: 3 por tramo largo y 3 por lado corto
  const rombo = (x, y) => { r(x - 1, y - 1, 3, 3, '#efe3c2'); r(x, y, 2, 2, '#3a2312'); r(x - 1, y - 1, 2, 2, '#f8f0d8'); };
  for (const k of [50, 100, 150]) {
    rombo(F + k, 6); rombo(F + BL_PW - k, 6); rombo(F + k, H - 7); rombo(F + BL_PW - k, H - 7);
    rombo(6, F + k); rombo(W - 7, F + k);
  }
  // aspilleras: borde de cuero, boca negra y brillo
  for (const p of BL_POCKETS) {
    const x = Math.round(p.x + F), y = Math.round(p.y + F);
    pxCircle(g, x, y, BL_POCKET_R + 3, '#1a0e07'); pxCircle(g, x, y, BL_POCKET_R + 2, '#4a3019');
    pxCircle(g, x, y, BL_POCKET_R, '#050505'); pxCircle(g, x + 1, y + 1, BL_POCKET_R - 3, '#000');
    r(x - BL_POCKET_R + 1, y - 3, 1, 5, '#2b1a10');
  }
  return blTableImg = c;
}
function blDraw() {
  // Cada fotograma parte de un lienzo limpio y con el estado por defecto; si la mesa pregenerada fallara por
  // cualquier motivo, se pinta un paño liso en vez de dejar las bolas y el taco "manchando" la pantalla.
  blx.globalAlpha = 1; blx.globalCompositeOperation = 'source-over'; blx.clearRect(0, 0, BL_CW, BL_CH);
  try { blx.drawImage(blTable(), 0, 0); } catch (err) { console.error('Billar: mesa', err); blTableImg = null; blx.fillStyle = '#14784f'; blx.fillRect(0, 0, BL_CW, BL_CH); }
  if (BL.placing != null && BL.placePreview) {
    const ok = blPlaceOk(BL.placePreview.x, BL.placePreview.y);
    blx.globalAlpha = .65; pxCircle(blx, Math.round(BL.placePreview.x + BL_RAIL), Math.round(BL.placePreview.y + BL_RAIL), BL_R, ok ? '#f4f4f4' : '#b13e53'); blx.globalAlpha = 1;
  }
  for (const b of BL.balls) if (!b.potted) blDrawBall(b);
  if (BL.aimPointer && !BL.shotActive && BL.placing == null) {
    const cue = BL.balls.find(x => x.num === 0);
    const dx0 = BL.aimPointer.x - cue.x, dy0 = BL.aimPointer.y - cue.y, dist = Math.hypot(dx0, dy0);
    if (dist > 4) {
      const ang = Math.atan2(dy0, dx0), ux = Math.cos(ang), uy = Math.sin(ang);
      const cx = cue.x + BL_RAIL, cy = cue.y + BL_RAIL;
      // la línea de mira termina en la primera bola (con la blanca "fantasma" ahí) o en la banda
      let reach = Math.min(ux > 0 ? (BL_PW - BL_R - cue.x) / ux : ux < 0 ? (BL_R - cue.x) / ux : 1e9, uy > 0 ? (BL_PH - BL_R - cue.y) / uy : uy < 0 ? (BL_R - cue.y) / uy : 1e9), ghost = null;
      for (const b of BL.balls) {
        if (b.num === 0 || b.potted) continue;
        const ox = b.x - cue.x, oy = b.y - cue.y, along = ox * ux + oy * uy, perp2 = ox * ox + oy * oy - along * along, rr = (BL_R * 2) ** 2;
        if (along <= 0 || perp2 >= rr) continue;
        const t = along - Math.sqrt(rr - perp2);
        if (t > 0 && t < reach) { reach = t; ghost = { x: cue.x + ux * t, y: cue.y + uy * t }; }
      }
      blx.fillStyle = 'rgba(244,244,244,.85)';
      for (let d = BL_R + 3; d < reach; d += 5) blx.fillRect(Math.round(cx + ux * d), Math.round(cy + uy * d), 2, 2);
      if (ghost) { blx.globalAlpha = .45; blx.drawImage(blBallImg(0), Math.round(ghost.x + BL_RAIL) - BL_R, Math.round(ghost.y + BL_RAIL) - BL_R); blx.globalAlpha = 1; }
      // taco de píxeles: punta con tiza, casquillo blanco, caña de arce y mango oscuro; se aleja al subir la fuerza
      const pull = 10 + BL.power * 70;
      for (let i = 0; i < 125; i++) {
        const sx = Math.round(cx - ux * (pull + i)), sy = Math.round(cy - uy * (pull + i)), w = i > 75 ? 3 : 2;
        blx.fillStyle = 'rgba(0,0,0,.25)'; blx.fillRect(sx + 1, sy + 2, w, w);
        blx.fillStyle = i < 3 ? '#6fb1e8' : i < 6 ? '#f4f4f4' : i < 76 ? (i % 2 ? '#f0cf8e' : '#e6c27c') : i < 80 ? '#c9a24b' : i < 102 ? '#6b3d1e' : '#2a170c';
        blx.fillRect(sx, sy, w, w);
      }
    }
  }
  blSyncShootBtn();
}
function blCanvasPos(e) {
  const r = blcv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * BL_CW - BL_RAIL, y: (e.clientY - r.top) / r.height * BL_CH - BL_RAIL };
}
function blCommitPlace(x, y) {
  if (!blPlaceOk(x, y)) { SFX.play('miss'); return; }
  const cue = BL.balls.find(b => b.num === 0);
  cue.x = x; cue.y = y; cue.vx = 0; cue.vy = 0; cue.potted = false;
  BL.placing = null; BL.placePreview = null;
  SFX.play('click'); blUI(); blDraw();
  if (BL.mode === 'online') fs.updateDoc(fs.doc(db, 'pool', BL.room), { balls: blBallsOut(), placing: null }).catch(console.error);
}
const blBallsOut = () => BL.balls.map(b => ({ num: b.num, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, potted: b.potted }));
blcv.addEventListener('pointerdown', e => {
  if (!blCanAct() && BL.placing == null) return;
  if (BL.placing != null && (BL.mode !== 'online' || BL.turn === BL.me)) { const p = blCanvasPos(e); blCommitPlace(p.x, p.y); return; }
  if (!blCanAct()) return;
  BL.dragging = true; BL.aimPointer = blCanvasPos(e); blDraw();
});
blcv.addEventListener('pointermove', e => {
  const p = blCanvasPos(e);
  if (BL.placing != null && (BL.mode !== 'online' || BL.turn === BL.me) && !BL.spectating) { BL.placePreview = p; blDraw(); return; }
  if (!BL.dragging) return;
  BL.aimPointer = p; blDraw();
});
window.addEventListener('pointerup', () => {
  if (BL.placing != null || !BL.dragging) return;
  BL.dragging = false; blDraw();
});
$('#bl-power').addEventListener('input', e => { BL.power = e.target.value / 100; blDraw(); });
$('#bl-shoot').addEventListener('click', () => {
  if (!blCanAct() || BL.placing != null) return;
  const cue = BL.balls.find(b => b.num === 0), p = BL.aimPointer;
  if (!p) return;
  const dx = p.x - cue.x, dy = p.y - cue.y, dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  BL.aimPointer = null; BL.dragging = false;
  blShoot(Math.atan2(dy, dx), Math.max(60, BL.power * BL_MAXV));
});

/* ---- reloj de turno ----
   30 s: alcanza para apuntar, ajustar la fuerza y tocar GOLPEAR en el celular (sin ser un examen), y es
   corto para que un rival en línea que se queda pensando no trabe la mesa. Mismo patrón que Combate de
   Funciones: cada cliente calcula su fecha límite al ver que empieza el turno (no hay campos nuevos en
   Firestore) y solo quien tiene el turno ejecuta la acción. Se acabó el tiempo = falta: pierde el turno y el
   rival recibe bola en mano (igual que las otras faltas de blShotDone). Si se acabó mientras COLOCABA la
   blanca, se coloca sola (blAutoPlaceCue) y sigue su turno con reloj nuevo. El reloj se detiene mientras
   las bolas ruedan (tirada propia o del rival: d.shooting) y no corre en el turno de la CPU. */
const BL_TURN_S = 30, blClockEl = $('#bl-clock');
function blClock(now) {
  const online = BL.mode === 'online', rd = BL.roomData;
  const on = BL.mode && !$('#bl-game').hidden && $('#bl-over').hidden && !BL.shotActive
    && !(online && (BL.phase !== 'play' || (rd && rd.shooting))) && !(BL.mode === 'cpu' && (BL.placing ?? BL.turn) === 1);
  if (!on) { BL._tKey = null; if (blClockEl.textContent) blClockEl.textContent = ''; return; }
  const key = BL.turn + '|' + BL.placing;
  if (key !== BL._tKey) { BL._tKey = key; BL.tEnd = now + BL_TURN_S * 1000; }
  const left = Math.max(0, Math.ceil((BL.tEnd - now) / 1000));
  const txt = `⏱ ${left}s`;
  if (blClockEl.textContent !== txt) { blClockEl.textContent = txt; blClockEl.style.color = left <= 5 ? 'var(--orange)' : ''; }
  if (left > 0 || BL.spectating) return;
  const mine = BL.placing != null ? (!online || BL.placing === BL.me) : blCanAct();
  if (!mine) return; // en línea el rival (o espectadores) esperan: solo quien tiene el turno escribe
  BL._tKey = null; BL.aimPointer = null; BL.dragging = false;
  SFX.play('miss');
  if (BL.placing != null) {
    blAutoPlaceCue(BL.balls); BL.placing = null; blUI(); blDraw();
    if (online) fs.updateDoc(fs.doc(db, 'pool', BL.room), { balls: blBallsOut(), placing: null }).catch(console.error);
    return;
  }
  blMsg('SE ACABÓ EL TIEMPO: BOLA EN MANO PARA EL RIVAL', 'lose');
  BL.turn = 1 - BL.turn; BL.placing = BL.turn;
  blAfterShotSync();
}

/* ---- disparo y resolución ---- */
function blShoot(angle, power) {
  const cue = BL.balls.find(b => b.num === 0);
  cue.vx = Math.cos(angle) * power; cue.vy = Math.sin(angle) * power;
  BL.shotActive = true; BL.shotEvents = { potted: [], firstHit: null }; BL._acc = 0;
  BL.shotSt = blSt(BL.turn); // estado justo antes de tirar (bola más baja, grupo, etc.): no cambia aunque esta tirada meta bolas
  SFX.play('throw'); blUI();
  if (BL.mode === 'online') fs.updateDoc(fs.doc(db, 'pool', BL.room), { shooting: BL.turn === 0 ? 'p1' : 'p2' }).catch(() => {});
}
function blUpdate(dt) {
  const sub = 1 / 240; BL._acc += Math.min(dt, .08);
  while (BL._acc >= sub) {
    const ev = blStep(BL.balls, sub);
    if (ev.potted.length) { BL.shotEvents.potted.push(...ev.potted); SFX.play(ev.potted.includes(0) ? 'splash' : 'pop'); }
    if (ev.firstHit != null && BL.shotEvents.firstHit == null) BL.shotEvents.firstHit = ev.firstHit;
    BL._acc -= sub;
  }
  if (BL.mode === 'online' && performance.now() - BL.lastSend > 110) { BL.lastSend = performance.now(); fs.updateDoc(fs.doc(db, 'pool', BL.room), { balls: blBallsOut() }).catch(() => {}); }
  if (blAllStopped(BL.balls)) { BL.shotActive = false; blShotDone(); }
}
function blShotDone() {
  const ev = BL.shotEvents, shooter = BL.turn;
  const st = BL.shotSt || blSt(shooter);
  const res = BL.variant === 'eight' ? blEvalEight(st, ev) : blEvalNine(st, ev);
  if (BL.variant === 'nine' && res.result === 'respot_foul') {
    const nine = BL.balls.find(b => b.num === 9); nine.potted = false; nine.x = BL_PW * 0.5; nine.y = BL_PH / 2;
    let k = 0; while (BL.balls.some(b => b.num !== 9 && !b.potted && Math.hypot(b.x - nine.x, b.y - nine.y) < BL_R * 2) && k < 20) { nine.x += BL_R * 2.2; k++; }
  }
  if (res.groupAssigned) { BL.groups[shooter] = res.groupAssigned; BL.groups[1 - shooter] = res.groupAssigned === 'solid' ? 'stripe' : 'solid'; BL.openTable = false; }
  if (res.result === 'win') return blOver(shooter, false);
  if (res.result === 'lose') return blOver(1 - shooter, false);
  if (ev.potted.includes(0)) { const cue = BL.balls.find(b => b.num === 0); cue.potted = false; cue.x = BL_PW * 0.22; cue.y = BL_PH / 2; }
  const foulResult = res.result === 'foul' || res.result === 'respot_foul';
  if (foulResult) { blMsg('FALTA: BOLA EN MANO PARA EL RIVAL', 'lose'); BL.turn = 1 - shooter; BL.placing = BL.turn; }
  else if (res.result === 'pass') { blMsg(''); BL.turn = 1 - shooter; }
  else blMsg('');
  blAfterShotSync();
}
function blAfterShotSync() {
  blUI(); blDraw();
  if (BL.mode === 'online') {
    fs.updateDoc(fs.doc(db, 'pool', BL.room), {
      balls: blBallsOut(), turn: BL.turn === 0 ? 'p1' : 'p2', groups: { p1: BL.groups[0], p2: BL.groups[1] },
      openTable: BL.openTable, placing: BL.placing == null ? null : (BL.placing === 0 ? 'p1' : 'p2'), shooting: null,
    }).catch(console.error);
    return;
  }
  if (BL.mode === 'cpu' && BL.turn === 1) {
    if (BL.placing === 1) BL.cpuTimer = setTimeout(() => { blAutoPlaceCue(BL.balls); BL.placing = null; blUI(); blDraw(); BL.cpuTimer = setTimeout(blCpuGo, 650); }, 700);
    else BL.cpuTimer = setTimeout(blCpuGo, 900);
  }
}
function blCpuGo() {
  if (BL.mode !== 'cpu' || BL.turn !== 1 || BL.shotActive || BL.placing != null) return;
  const targets = blLegalTargets(BL.balls, BL.variant, blSt(1));
  const plan = targets.length ? blPlanShot(BL.balls, targets) : null;
  if (!plan) { BL.turn = 0; blUI(); blDraw(); return; }
  blShoot(plan.angle, plan.power);
}
function blOver(winnerIdx, forfeit) {
  BL.winner = winnerIdx; clearTimeout(BL.cpuTimer);
  const iWon = BL.mode === 'online' ? winnerIdx === BL.me : winnerIdx === 0;
  $('#bl-over-t').textContent = BL.spectating ? `¡GANÓ ${esc(BL.names[winnerIdx] || '???')}!` : (iWon ? '¡GANASTE!' : 'PERDISTE');
  $('#bl-over-t').style.color = (BL.spectating ? true : iWon) ? 'var(--lime)' : 'var(--orange)';
  $('#bl-over-p').textContent = forfeit ? '(EL RIVAL SE DESCONECTÓ)' : `GANADOR: ${esc(BL.names[winnerIdx] || '???')}`;
  $('#bl-over').hidden = false;
  $('#bl-again').hidden = BL.mode === 'online' ? (!BL.isHost || BL.spectating) : false;
  SFX.play(BL.spectating ? 'win' : (iWon ? 'win' : 'lose'));
  if (!BL.spectating && iWon && !BL.submitted) { BL.submitted = true; LB.confirmar('¡GANASTE! ¿SUMAS ESTA VICTORIA A LA TABLA?', () => LB.increment('billar_' + BL.variant)).then(blLB); }
  blUI(); blDraw();
  if (BL.mode === 'online' && !BL.spectating) {
    fs.updateDoc(fs.doc(db, 'pool', BL.room), { state: 'over', winner: winnerIdx === 0 ? 'p1' : 'p2', forfeit: !!forfeit, balls: blBallsOut(), shooting: null }).catch(console.error);
  }
}
function blNewGame(variant) {
  BL.variant = variant; BL.balls = blNewBalls(variant); BL.turn = 0; BL.groups = [null, null];
  BL.openTable = true; BL.placing = null; BL.winner = null; BL.submitted = false; BL.shotActive = false;
  $('#bl-over').hidden = true; blMsg('');
  blView('game'); blUI(); blDraw();
  if (BL.mode === 'cpu' && BL.turn === 1) blCpuGo();
}
function blStartLocal(mode) {
  blLeaveOnline();
  BL.mode = mode; BL.spectating = false; BL.me = 0;
  BL.names = mode === 'cpu' ? [playerName(), 'CPU'] : [playerName(), 'JUGADOR 2'];
  blNewGame(BL.variant);
}
function blToMenu() {
  clearTimeout(BL.cpuTimer);
  if (BL.mode === 'online') blLeaveOnline();
  BL.mode = null; BL.phase = 'menu'; BL.shotActive = false; BL.dragging = false; BL.aimPointer = null; BL.placing = null; BL.spectating = false;
  BL._forfeitSent = false; BL._overShown = false; BL._uiKey = null;
  blView('menu'); blSetupRender();
}
/* ---- mesa online ---- */
function blMenuMsg(t, cls = '') { const m = $('#bl-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }
function blLobbyRender(d) {
  const ul = $('#bl-plist'); ul.innerHTML = '';
  [['p1', d.p1], ['p2', d.p2]].forEach(([k, p]) => {
    const li = document.createElement('li');
    li.innerHTML = p ? `<span>${esc(p.name)}${p.uid === UID ? ' (TÚ)' : ''}${k === 'p1' ? ' ★' : ''}</span>` : `<span class="sub">ESPERANDO RIVAL…</span>`;
    ul.appendChild(li);
  });
  $('#bl-room').textContent = (BL.spectating ? '👁 ESPECTADOR · ' : '') + 'MESA ' + BL.room;
  $('#bl-lobby-msg').textContent = BL.isHost ? `COMPARTE EL CÓDIGO ${BL.room}.` : 'ESPERANDO AL ANFITRIÓN (★)…';
  $('#bl-go').hidden = !BL.isHost || BL.spectating;
  $('#bl-go').disabled = !d.p2;
}
function blApplyRemoteOver(d) {
  const winnerIdx = d.winner === 'p1' ? 0 : 1, iWon = !BL.spectating && winnerIdx === BL.me;
  $('#bl-over-t').textContent = BL.spectating ? `¡GANÓ ${esc(BL.names[winnerIdx] || '???')}!` : (iWon ? '¡GANASTE!' : 'PERDISTE');
  $('#bl-over-t').style.color = (BL.spectating || iWon) ? 'var(--lime)' : 'var(--orange)';
  $('#bl-over-p').textContent = d.forfeit ? '(EL RIVAL SE DESCONECTÓ)' : `GANADOR: ${esc(BL.names[winnerIdx] || '???')}`;
  $('#bl-over').hidden = false;
  $('#bl-again').hidden = !BL.isHost || BL.spectating;
  SFX.play(BL.spectating ? 'win' : (iWon ? 'win' : 'lose'));
  if (!BL.spectating && iWon && !BL.submitted) { BL.submitted = true; LB.confirmar('¡GANASTE! ¿SUMAS ESTA VICTORIA A LA TABLA?', () => LB.increment('billar_' + BL.variant)).then(blLB); }
}
function blSyncOnline(d) {
  BL.roomData = d;
  const meIsP1 = d.p1 && d.p1.uid === UID, meIsP2 = d.p2 && d.p2.uid === UID;
  if (!BL.spectating) BL.me = meIsP1 ? 0 : (meIsP2 ? 1 : -1);
  BL.isHost = meIsP1;
  BL.names = [d.p1 ? d.p1.name : '', d.p2 ? d.p2.name : ''];
  BL.variant = d.variant || BL.variant;
  if (d.state === 'lobby') {
    BL._forfeitSent = false; BL._overShown = false; BL.submitted = false; BL._uiKey = null;
    if (BL.phase !== 'lobby') { BL.phase = 'lobby'; blView('lobby'); blSetupRender(); }
    blLobbyRender(d); return;
  }
  BL.phase = d.state;
  if (!$('#bl-lobby').hidden) { blView('game'); $('#bl-over').hidden = true; }
  BL.groups = [d.groups ? d.groups.p1 : null, d.groups ? d.groups.p2 : null];
  BL.openTable = !!d.openTable;
  BL.turn = d.turn === 'p2' ? 1 : 0;
  BL.placing = d.placing == null ? null : (d.placing === 'p1' ? 0 : 1);
  if (!BL.shotActive) BL.balls = (d.balls || []).map(b => ({ ...b, vx: 0, vy: 0 }));
  $('#bl-spec-badge').hidden = !BL.spectating;
  // Antes esto reconstruía el texto del turno (innerHTML + fitSoon -> medir el layout) y repintaba en CADA
  // snapshot (~9/s mientras el rival tira, por las posiciones de las bolas). blDraw ya corre cada fotograma
  // en loop(), y blUI solo cambia si cambia turno/grupos/colocación/bolas metidas.
  const uiKey = [d.state, d.turn, d.placing, d.openTable, d.groups && d.groups.p1, d.groups && d.groups.p2, BL.spectating, BL.me, BL.names.join('|'),
    (d.balls || []).reduce((n, b) => n + (b.potted ? 1 : 0), 0)].join();
  if (uiKey !== BL._uiKey) { BL._uiKey = uiKey; blUI(); }
  if (d.state === 'over') { if (!BL._overShown) { BL._overShown = true; blApplyRemoteOver(d); } }
  else {
    BL._overShown = false;
    const oppIdx = 1 - Math.max(0, BL.me), oppKey = BL.me === 0 ? 'p2' : 'p1', oppD = d[oppKey], now = Date.now();
    const oppGone = BL.me >= 0 && !!(oppD && isStale(oppD.lastSeen, now));
    if (oppGone && d.state === 'play') blMsg('⚠ ' + esc(BL.names[oppIdx] || 'RIVAL') + ' SE DESCONECTÓ…', 'lose');
    if (oppGone && d.state === 'play' && !BL._forfeitSent) {
      BL._forfeitSent = true;
      fs.updateDoc(fs.doc(db, 'pool', BL.room), { state: 'over', winner: BL.me === 0 ? 'p1' : 'p2', forfeit: true, balls: d.balls }).catch(() => { BL._forfeitSent = false; });
    }
  }
}
async function blCreate() {
  if (!(await fbReady)) return blMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO VS CPU O LOCAL.', 'lose');
  blLeaveOnline(); blMenuMsg('CREANDO MESA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'pool', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, {
      p1: { uid: UID, name: playerName(), lastSeen: fs.serverTimestamp() }, p2: null,
      variant: BL.variant, state: 'lobby', balls: [], turn: 'p1', groups: { p1: null, p2: null },
      openTable: true, placing: null, shooting: null, winner: null, forfeit: false, created: fs.serverTimestamp(),
    });
    BL.room = code; BL.mode = 'online'; BL.spectating = false;
    blMenuMsg(''); blEnterLobby();
  } catch (e) { console.error(e); blMenuMsg('ERROR AL CREAR MESA: ' + e.message, 'lose'); }
}
async function blJoin() {
  const code = $('#bl-code').value.trim().toUpperCase();
  if (code.length < 5) return blMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return blMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO VS CPU O LOCAL.', 'lose');
  blLeaveOnline(); blMenuMsg('ENTRANDO…');
  const ref = fs.doc(db, 'pool', code);
  try {
    await fs.runTransaction(db, async tx => {
      const s = await tx.get(ref);
      if (!s.exists()) throw new Error('ESA MESA NO EXISTE');
      if (s.data().p2) throw new Error('LA MESA ESTÁ LLENA');
      if (s.data().p1.uid === UID) throw new Error('NO PUEDES UNIRTE A TU PROPIA MESA');
      tx.update(ref, { p2: { uid: UID, name: playerName(), lastSeen: fs.serverTimestamp() } });
    });
    BL.room = code; BL.mode = 'online'; BL.spectating = false;
    blMenuMsg(''); blEnterLobby();
  } catch (e) { blMenuMsg(e.message, 'lose'); }
}
function blEnterLobby() {
  BL.phase = 'lobby'; BL.roomData = null; BL._forfeitSent = false;
  blView('lobby');
  BL.unsubs.push(fs.onSnapshot(fs.doc(db, 'pool', BL.room), s => {
    if (!s.exists()) { if (BL.spectating) { blMenuMsg('LA MESA SE CERRÓ.', 'lose'); blToMenu(); } return; }
    blSyncOnline(s.data());
  }));
  if (!BL.spectating) BL.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'pool', BL.room), { [(BL.me === 1 ? 'p2' : 'p1') + '.lastSeen']: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
}
async function blSpecOpen(code) {
  blToMenu();
  BL.spectating = true; BL.mode = 'online'; BL.room = code;
  $('#bl-spec-list').hidden = true;
  blEnterLobby();
}
async function blStartOnline() {
  if (!BL.isHost) return;
  const balls = blNewBalls(BL.variant);
  try {
    await fs.updateDoc(fs.doc(db, 'pool', BL.room), {
      state: 'play', balls: balls.map(b => ({ num: b.num, x: b.x, y: b.y, potted: false })),
      turn: 'p1', groups: { p1: null, p2: null }, openTable: true, placing: null, winner: null, forfeit: false, shooting: null,
    });
  } catch (e) { console.error(e); }
}
function blLeaveOnline() {
  BL.unsubs.forEach(u => u()); BL.unsubs = [];
  if (BL.hbStop) { BL.hbStop(); BL.hbStop = null; }
  BL.room = null; BL.roomData = null; BL.isHost = false; BL.me = -1; BL.spectating = false;
}
$('#bl-spec-btn').onclick = async () => {
  const list = $('#bl-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('pool');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const stateN = { lobby: 'EN LOBBY', play: 'JUGANDO', over: 'TERMINADA' };
  list.innerHTML = rooms.length
    ? rooms.map(r => `<li><span><b>MESA ${r.code}</b><small>${r.data.p1 ? esc(r.data.p1.name) : '?'}${r.data.p2 ? ' VS ' + esc(r.data.p2.name) : ''} · ${stateN[r.data.state] || r.data.state}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY MESAS RECIENTES</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); blSpecOpen(b.dataset.code); });
};
$('#bl-cpu').onclick = () => { SFX.play('start'); blStartLocal('cpu'); };
$('#bl-local2').onclick = () => { SFX.play('start'); blStartLocal('local2'); };
$('#bl-create').onclick = blCreate;
$('#bl-join').onclick = blJoin;
$('#bl-code').addEventListener('keydown', e => { if (e.key === 'Enter') blJoin(); });
$('#bl-go').onclick = blStartOnline;
$('#bl-leave').onclick = blToMenu;
$('#bl-exit').onclick = blToMenu;
$('#bl-quit').onclick = pedirAbandonar(blToMenu);
$('#bl-again').onclick = () => {
  if (BL.mode === 'cpu' || BL.mode === 'local2') blNewGame(BL.variant);
  else if (BL.isHost) blStartOnline();
};
window.addEventListener('beforeunload', () => { if (BL.mode === 'online') blLeaveOnline(); });
blSetupRender(); blLB(); blView('menu');

// --- conexión con la página (antes en arcade.html) ---
registrarBucle((dt, now) => {
  if (BL.shotActive) blUpdate(dt);
  if (arcade.tab === 'billar') blDraw();
  if (arcade.tab === 'billar' || BL.mode === 'online') blClock(now);
});
