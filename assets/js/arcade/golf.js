import { db, fs, UID, fbReady, $, esc, playerName, genCode, isStale, liveRooms, presenceLoop, SFX, LB, pxCircle, fitSoon, filtrarTexto, expiraEn } from './core.js';
import { arcade, registrarBucle } from './estado.js';
import { mensajeErrorAuth, onModerador, moderadorLogin, moderadorLogout, moderadorActual, dbMod } from './moderacion.js';
import { pedirAbandonar, pickRow } from './compartido-juegos.js';

/* =========================================================
   GOLF — minigolf de 6 hoyos, física de arrastre (como Billar)
   ========================================================= */
const GF_CVW = 480, GF_CVH = 300, GF_MARGIN = 20;
const GF_R = 6, GF_HOLE_R = 10;
const GF_FRICTION = 210, GF_SAND_FRICTION = 950, GF_ICE_FRICTION = 35, GF_REST = 0.7;
const GF_MAXV = 620, GF_TURN_S = 30;
const GF_STOP_V = 4, GF_SINK_MAXV = 260, GF_MAX_STROKES = 8;
const GF_RAMP_MINV = 150, GF_RAMP_AIR_FRICTION = 15;
const GF_BORDER_WALLS = [
  { x: 0, y: 0, w: GF_CVW, h: GF_MARGIN }, { x: 0, y: GF_CVH - GF_MARGIN, w: GF_CVW, h: GF_MARGIN },
  { x: 0, y: 0, w: GF_MARGIN, h: GF_CVH }, { x: GF_CVW - GF_MARGIN, y: 0, w: GF_MARGIN, h: GF_CVH },
];
/* Cada hoyo puede traer, además de par/inicio/hoyo/paredes/arena/agua:
   - ice: zonas donde la bola casi no frena (hielo)
   - wind: { x, y } fuerza del viento en px/s² (con ráfagas: varía según la posición de la bola)
   - ramps: [{x,y,w,h,dir:'right'|'left'|'up'|'down',dist}] rampas: si entras con suficiente velocidad
     en esa dirección, saltas por encima de lo que haya en los siguientes `dist` px (sin chocar con
     paredes/arena/agua mientras estás en el aire). */
const GF_HOLES = [
  { theme: 'parque', par: 2, start: { x: 60, y: 150 }, hole: { x: 420, y: 150 },
    walls: [{ x: 220, y: 108, w: 26, h: 84 }], sand: [], water: [], ice: [], ramps: [] },
  { theme: 'bosque', par: 3, start: { x: 70, y: 260 }, hole: { x: 420, y: 55 },
    walls: [{ x: 150, y: 30, w: 24, h: 130 }, { x: 255, y: 150, w: 24, h: 130 }, { x: 345, y: 25, w: 24, h: 100 }],
    sand: [], water: [], ice: [{ x: 185, y: 185, w: 100, h: 75 }], ramps: [] },
  { theme: 'desierto', par: 3, start: { x: 60, y: 150 }, hole: { x: 430, y: 150 },
    walls: [{ x: 228, y: 40, w: 24, h: 55 }, { x: 228, y: 205, w: 24, h: 55 }],
    sand: [{ x: 140, y: 20, w: 65, h: 260 }, { x: 300, y: 20, w: 65, h: 260 }], water: [], ice: [], ramps: [],
    wind: { x: 85, y: 0 } },
  { theme: 'playa', par: 4, start: { x: 60, y: 150 }, hole: { x: 435, y: 150 },
    walls: [{ x: 55, y: 35, w: 24, h: 65 }],
    sand: [{ x: 35, y: 215, w: 120, h: 65 }], water: [{ x: 210, y: 20, w: 140, h: 260 }], ice: [],
    ramps: [{ x: 158, y: 105, w: 48, h: 90, dir: 'right', dist: 195 }] },
  { theme: 'nieve', par: 4, start: { x: 60, y: 60 }, hole: { x: 430, y: 250 },
    walls: [{ x: 145, y: 128, w: 30, h: 30 }, { x: 258, y: 55, w: 30, h: 30 }, { x: 338, y: 188, w: 30, h: 30 }],
    sand: [], water: [], ice: [{ x: 40, y: 148, w: 400, h: 95 }], ramps: [],
    wind: { x: -55, y: 55 } },
  { theme: 'ciudad', par: 5, start: { x: 60, y: 150 }, hole: { x: 440, y: 150 },
    walls: [{ x: 145, y: 25, w: 34, h: 95 }, { x: 145, y: 180, w: 34, h: 95 }, { x: 345, y: 95, w: 34, h: 110 }],
    sand: [], water: [{ x: 228, y: 20, w: 75, h: 260 }], ice: [],
    ramps: [{ x: 205, y: 105, w: 40, h: 90, dir: 'right', dist: 155 }],
    wind: { x: 45, y: -25 } },
];
const GF_PCOLORS = ['#f4f4f4', '#e83b3b', '#41a6f6', '#ffcd75'];
const GF = {
  mode: null, spectating: false, room: null, isHost: false, roomData: null, roomPlayers: {},
  unsubs: [], hbStop: null, _hostTimer: null, resultShown: false, replay: null, _lastSeq: 0,
  state: 'aiming', holeIdx: 0, strokes: 0, totalStrokes: 0, scores: [],
  ball: { x: 0, y: 0, vx: 0, vy: 0 }, lastSafe: { x: 0, y: 0 },
  dragging: false, aimPointer: null, power: .7, popup: null, pauseT: 0, pending: null, _acc: 0,
  activeHoles: GF_HOLES, communityHoles: []
};
function gfInZone(ball, zones) { return zones.some(z => ball.x >= z.x && ball.x <= z.x + z.w && ball.y >= z.y && ball.y <= z.y + z.h); }
function gfCollideRect(ball, rect) {
  const cx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w)), cy = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  const dx = ball.x - cx, dy = ball.y - cy, dist = Math.hypot(dx, dy);
  if (dist < GF_R && dist > 0.0001) {
    const nx = dx / dist, ny = dy / dist, overlap = GF_R - dist;
    ball.x += nx * overlap; ball.y += ny * overlap;
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) { ball.vx -= (1 + GF_REST) * dot * nx; ball.vy -= (1 + GF_REST) * dot * ny; }
  }
}
function gfWindForce(hole, ball) {
  if (!hole.wind) return { x: 0, y: 0 };
  const gust = 0.55 + 0.45 * Math.sin(ball.y * 0.05 + ball.x * 0.017);
  return { x: hole.wind.x * gust, y: hole.wind.y * gust };
}
function gfTryRamp(ball, hole) {
  if (ball.airT > 0 || !hole.ramps || !hole.ramps.length) return;
  const sp = Math.hypot(ball.vx, ball.vy); if (sp < GF_RAMP_MINV) return;
  const DIRX = { right: 1, left: -1, up: 0, down: 0 }, DIRY = { right: 0, left: 0, up: -1, down: 1 };
  for (const r of hole.ramps) {
    if (ball.x < r.x || ball.x > r.x + r.w || ball.y < r.y || ball.y > r.y + r.h) continue;
    if (ball.vx * DIRX[r.dir] + ball.vy * DIRY[r.dir] <= 0) continue;
    ball.airT = ball.airT0 = r.dist / sp;
    break;
  }
}
function gfPhysicsStep(ball, dt, hole) {
  if (ball.airT === undefined) { ball.airT = 0; ball.airT0 = 0; }
  gfTryRamp(ball, hole);
  const airborne = ball.airT > 0;
  if (airborne) ball.airT = Math.max(0, ball.airT - dt);
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > 0.5) {
    const fr = airborne ? GF_RAMP_AIR_FRICTION : (gfInZone(ball, hole.sand) ? GF_SAND_FRICTION : (gfInZone(ball, hole.ice || []) ? GF_ICE_FRICTION : GF_FRICTION));
    const nsp = Math.max(0, sp - fr * dt), k = nsp / sp;
    ball.vx *= k; ball.vy *= k;
  } else { ball.vx = 0; ball.vy = 0; }
  if (!airborne && Math.hypot(ball.vx, ball.vy) > 0.5) {
    const wind = gfWindForce(hole, ball);
    ball.vx += wind.x * dt; ball.vy += wind.y * dt;
  }
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  if (ball.x < GF_R) { ball.x = GF_R; ball.vx = -ball.vx * GF_REST; }
  if (ball.x > GF_CVW - GF_R) { ball.x = GF_CVW - GF_R; ball.vx = -ball.vx * GF_REST; }
  if (ball.y < GF_R) { ball.y = GF_R; ball.vy = -ball.vy * GF_REST; }
  if (ball.y > GF_CVH - GF_R) { ball.y = GF_CVH - GF_R; ball.vy = -ball.vy * GF_REST; }
  for (const w of GF_BORDER_WALLS) gfCollideRect(ball, w);
  if (!airborne) for (const w of hole.walls) gfCollideRect(ball, w);
}
function gfStep(ball, dt, hole) {
  gfPhysicsStep(ball, dt, hole);
  if (ball.airT > 0) return null; // en el aire por la rampa: no se hunde ni cae al agua todavía
  if (gfInZone(ball, hole.water)) return 'water';
  const dHole = Math.hypot(ball.x - hole.hole.x, ball.y - hole.hole.y);
  if (dHole < GF_HOLE_R && Math.hypot(ball.vx, ball.vy) < GF_SINK_MAXV) return 'sunk';
  return null;
}
/* ---- física de varias bolas a la vez (en línea): con colisión bola-bola, como Billar ---- */
function gfBallCollide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d > 0 && d < GF_R * 2) {
    const nx = dx / d, ny = dy / d, overlap = GF_R * 2 - d;
    a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
    const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (approach < 0) { a.vx += approach * nx; a.vy += approach * ny; b.vx -= approach * nx; b.vy -= approach * ny; }
  }
}
function gfSimulateAll(simIn, hole) {
  const uids = Object.keys(simIn);
  const sim = {}; uids.forEach(u => sim[u] = { x: simIn[u].x, y: simIn[u].y, vx: simIn[u].vx, vy: simIn[u].vy });
  const events = {}, paths = {}; uids.forEach(u => paths[u] = [{ x: sim[u].x, y: sim[u].y }]);
  let rec = 0;
  for (let step = 0; step < 120 * 8; step++) {
    for (const u of uids) if (!events[u]) gfPhysicsStep(sim[u], 1 / 120, hole);
    for (let i = 0; i < uids.length; i++) for (let j = i + 1; j < uids.length; j++) {
      if (!events[uids[i]] && !events[uids[j]]) gfBallCollide(sim[uids[i]], sim[uids[j]]);
    }
    for (const u of uids) {
      if (events[u]) continue;
      if (sim[u].airT > 0) continue; // en el aire por la rampa: igual que en solo (gfStep), no cae al agua ni se hunde
      if (gfInZone(sim[u], hole.water)) { events[u] = 'water'; sim[u].vx = 0; sim[u].vy = 0; continue; }
      const dHole = Math.hypot(sim[u].x - hole.hole.x, sim[u].y - hole.hole.y);
      if (dHole < GF_HOLE_R && Math.hypot(sim[u].vx, sim[u].vy) < GF_SINK_MAXV) { events[u] = 'sunk'; sim[u].vx = 0; sim[u].vy = 0; }
    }
    rec++;
    if (rec >= 2) { uids.forEach(u => paths[u].push({ x: sim[u].x, y: sim[u].y })); rec = 0; }
    if (uids.every(u => events[u] || Math.hypot(sim[u].vx, sim[u].vy) < GF_STOP_V)) {
      uids.forEach(u => { if (!events[u]) { sim[u].vx = 0; sim[u].vy = 0; } });
      break;
    }
  }
  uids.forEach(u => paths[u].push({ x: sim[u].x, y: sim[u].y }));
  return { paths, events, finals: sim };
}
function gfNextTurn(order, turnIdx, balls) {
  for (let i = 1; i <= order.length; i++) { const idx = (turnIdx + i) % order.length; if (!balls[order[idx]].done) return idx; }
  return -1;
}
function gfLoadHole(i) {
  const h = GF.activeHoles[i];
  GF.ball = { x: h.start.x, y: h.start.y, vx: 0, vy: 0, airT: 0, airT0: 0 };
  GF.lastSafe = { x: h.start.x, y: h.start.y };
  GF.strokes = 0; GF.state = 'aiming'; GF.popup = null; GF._acc = 0;
}
function gfStart() {
  GF.activeHoles = GF_HOLES.concat(GF.communityHoles || []);
  GF.holeIdx = 0; GF.totalStrokes = 0; GF.scores = [];
  $('#gf-over').hidden = true;
  gfLoadHole(0);
}
function gfSunk(forced) {
  GF.state = 'sunk'; GF.ball.vx = 0; GF.ball.vy = 0;
  SFX.play(forced ? 'lose' : 'win');
  GF.scores[GF.holeIdx] = GF.strokes; GF.totalStrokes += GF.strokes;
  GF.popup = { txt: forced ? `MÁXIMO DE GOLPES (${GF.strokes})` : `¡HOYO! ${GF.strokes} GOLPE${GF.strokes === 1 ? '' : 'S'}`, life: 1.5 };
  GF.pauseT = 1.5;
  GF.pending = GF.holeIdx < GF.activeHoles.length - 1 ? 'next' : 'finish';
}
function gfWater() {
  GF.state = 'sunk';
  GF.ball.x = GF.lastSafe.x; GF.ball.y = GF.lastSafe.y; GF.ball.vx = 0; GF.ball.vy = 0;
  GF.strokes++;
  SFX.play('miss');
  GF.popup = { txt: '¡AL AGUA! +1 GOLPE', life: 1.2 };
  GF.pauseT = 1.1; GF.pending = 'resume';
}
function gfFinish() {
  GF.state = 'done';
  const totalPar = GF.activeHoles.reduce((s, h) => s + h.par, 0), diff = GF.totalStrokes - totalPar;
  const diffTxt = diff === 0 ? 'PAR' : (diff > 0 ? '+' + diff : String(diff));
  $('#gf-over-p').innerHTML = GF.activeHoles.map((h, i) => `HOYO ${i + 1}${h.comunitario ? ' · ' + esc(h.nombre) : ''}: ${GF.scores[i]} (PAR ${h.par})`).join('<br>') + `<br><br><b>TOTAL: ${GF.totalStrokes} GOLPES (${diffTxt})</b>`;
  $('#gf-over').hidden = false; $('#gf-again').hidden = false;
  LB.confirmar(`TERMINASTE CON ${GF.totalStrokes} GOLPES (${diffTxt}). ¿LO SUBES A LA TABLA?`, () => LB.submit('golf', GF.totalStrokes, true, diffTxt)).then(gfLB);
}
function gfAdvance() {
  if (GF.pending === 'next') { GF.holeIdx++; gfLoadHole(GF.holeIdx); }
  else if (GF.pending === 'finish') gfFinish();
  else GF.state = 'aiming';
  GF.pending = null;
}
function gfUpdate(dt) {
  const hole = GF.activeHoles[GF.holeIdx];
  const sub = 1 / 240; GF._acc += Math.min(dt, .08);
  let result = null;
  while (GF._acc >= sub && !result) { result = gfStep(GF.ball, sub, hole); GF._acc -= sub; }
  if (result === 'water') { GF._acc = 0; gfWater(); return; }
  if (result === 'sunk') { GF._acc = 0; gfSunk(false); return; }
  if (Math.hypot(GF.ball.vx, GF.ball.vy) < GF_STOP_V) {
    GF.ball.vx = 0; GF.ball.vy = 0; GF.lastSafe = { x: GF.ball.x, y: GF.ball.y };
    if (GF.strokes >= GF_MAX_STROKES) gfSunk(true); else GF.state = 'aiming';
  }
}
function gfTick(dt) {
  if (GF.popup) { GF.popup.life -= dt; if (GF.popup.life <= 0) GF.popup = null; }
  if (GF.mode === 'online') {
    if (GF.replay) {
      GF.replay.acc += dt;
      const stepDur = 1 / 60, len = Math.max(0, ...Object.values(GF.replay.paths).map(p => p.length));
      while (GF.replay.acc >= stepDur && GF.replay.i < len - 1) { GF.replay.i++; GF.replay.acc -= stepDur; }
      if (GF.replay.i >= len - 1) {
        if (Object.values(GF.replay.events || {}).includes('water')) { SFX.play('miss'); GF.popup = { txt: '¡AL AGUA! +1 GOLPE', life: 1.2 }; }
        GF.replay = null;
      }
    }
    // Límite por turno: cada cliente calcula su plazo al ver empezar el turno (como FC.tEnd en Combate, sin campos nuevos).
    // 30 s alcanzan para apuntar y dar fuerza; si se acaba, el jugador activo "golpea" con fuerza 0: cuenta como golpe y pasa el turno.
    const d = GF.roomData;
    if (d && d.state === 'play' && d.order && !GF.replay) {
      const key = d.holeIdx + ':' + d.turnIdx + ':' + ((d.lastShot && d.lastShot.seq) || 0), now = performance.now();
      if (key !== GF.tKey) { GF.tKey = key; GF.tEnd = now + GF_TURN_S * 1000; }
      if (now >= GF.tEnd && !GF.spectating && d.order[d.turnIdx] === UID) { GF.tEnd = Infinity; GF.aimPointer = null; gfOnlineShoot(0, 0); }
    } else { GF.tEnd = null; GF.tKey = null; }
    return;
  }
  if (GF.state === 'rolling') gfUpdate(dt);
  else if (GF.pauseT > 0) { GF.pauseT -= dt; if (GF.pauseT <= 0) gfAdvance(); }
}
function gfLB() { LB.render($('#gf-lb'), 'golf', true, r => r.score + (r.extra ? ' (' + esc(r.extra) + ')' : '')); }
const GF_THEMES = {
  parque: { bg: '#1f4d3a', ground: '#38b764', stripe: 'rgba(255,255,255,.05)' },
  bosque: { bg: '#0f2a1a', ground: '#2f8f4e', stripe: 'rgba(0,0,0,.1)' },
  desierto: { bg: '#7a5a2e', ground: '#d9b35c', stripe: 'rgba(255,255,255,.08)' },
  playa: { bg: '#0e4a63', ground: '#e8d9a0', stripe: 'rgba(255,255,255,.12)' },
  nieve: { bg: '#233252', ground: '#eef4fb', stripe: 'rgba(120,150,200,.18)' },
  ciudad: { bg: '#101022', ground: '#3a3f52', stripe: 'rgba(255,255,255,.05)' },
};
function gfDrawObstacle(ctx, w, theme) {
  const cx = Math.round(w.x + w.w / 2), topY = Math.round(w.y);
  switch (theme) {
    case 'bosque':
      ctx.fillStyle = '#6b4226'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(w.x, w.y, w.w, 3);
      pxCircle(ctx, cx, topY - 8, w.w * 0.85, '#2f8f4e'); pxCircle(ctx, cx, topY - 8, w.w * 0.55, '#3fae5e');
      return;
    case 'desierto':
      ctx.fillStyle = '#3d7a3d'; ctx.fillRect(w.x, w.y, w.w, w.h); // todo el rectángulo: es lo que choca
      ctx.fillStyle = '#2f6a2f'; ctx.fillRect(w.x, w.y + w.h * 0.28, w.w * 0.34, w.h * 0.2); ctx.fillRect(w.x + w.w * 0.66, w.y + w.h * 0.48, w.w * 0.34, w.h * 0.2);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(w.x + w.w * 0.32, w.y, 2, w.h);
      return;
    case 'playa':
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(w.x, w.y, w.w, w.h);
      pxCircle(ctx, cx, topY - 6, w.w * 0.8, '#38b764'); pxCircle(ctx, cx, topY - 6, w.w * 0.5, '#4fd274');
      return;
    case 'nieve':
      ctx.fillStyle = '#8a94a8'; ctx.fillRect(w.x, w.y + w.h * 0.22, w.w, w.h * 0.78);
      ctx.fillStyle = '#eef4fb'; ctx.fillRect(w.x, w.y, w.w, w.h * 0.28);
      return;
    case 'ciudad':
      ctx.fillStyle = '#5a6478'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#ffcd75';
      for (let yy = w.y + 6; yy < w.y + w.h - 4; yy += 12) for (let xx = w.x + 4; xx < w.x + w.w - 4; xx += 10) ctx.fillRect(xx, yy, 4, 5);
      return;
    default:
      ctx.fillStyle = '#566c86'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x, w.y, w.w, 2); ctx.fillRect(w.x, w.y, 2, w.h);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(w.x, w.y + w.h - 2, w.w, 2); ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
  }
}
function gfDrawIce(ctx, z) {
  ctx.fillStyle = '#dceeff'; ctx.fillRect(z.x, z.y, z.w, z.h);
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  for (let i = 6; i < z.w; i += 16) ctx.fillRect(z.x + i, z.y + 5, 8, 2);
  ctx.strokeStyle = 'rgba(120,170,220,.7)'; ctx.lineWidth = 1; ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
}
function gfDrawRamp(ctx, r) {
  ctx.fillStyle = '#a9773f'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let i = 3; i < Math.max(r.w, r.h); i += 6) ctx.fillRect(r.x, r.y + (r.dir === 'up' || r.dir === 'down' ? 0 : i), r.dir === 'up' || r.dir === 'down' ? r.w : 2, r.dir === 'up' || r.dir === 'down' ? 2 : r.h);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const ar = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[r.dir];
  ctx.fillStyle = '#ffe14d'; ctx.beginPath();
  ctx.moveTo(cx + ar[0] * 15, cy + ar[1] * 15);
  ctx.lineTo(cx - ar[0] * 7 - ar[1] * 9, cy - ar[1] * 7 - ar[0] * 9);
  ctx.lineTo(cx - ar[0] * 7 + ar[1] * 9, cy - ar[1] * 7 + ar[0] * 9);
  ctx.closePath(); ctx.fill();
}
function gfDrawWind(ctx, hole) {
  if (!hole.wind) return;
  const ang = Math.atan2(hole.wind.y, hole.wind.x), ux = Math.cos(ang), uy = Math.sin(ang);
  const now = performance.now() / 1000, span = GF_CVW + GF_CVH;
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const baseX = GF_MARGIN + 20 + (i * 53) % (GF_CVW - GF_MARGIN * 2 - 40);
    const baseY = GF_MARGIN + 20 + (i * 37) % (GF_CVH - GF_MARGIN * 2 - 40);
    const t = ((now * 100 + i * 60) % span);
    const px = baseX + ux * t, py = baseY + uy * t;
    if (px < GF_MARGIN + 4 || px > GF_CVW - GF_MARGIN - 4 || py < GF_MARGIN + 4 || py > GF_CVH - GF_MARGIN - 4) continue;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ux * 13, py - uy * 13); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function gfDraw() {
  const cv = $('#gf-cv'); if (!cv || !cv.offsetParent) return;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center';
  const holeIdx = GF.mode === 'online' ? (GF.roomData ? GF.roomData.holeIdx : 0) : GF.holeIdx;
  const holeList = GF.mode === 'online' ? GF_HOLES : GF.activeHoles;
  const hole = holeList[holeIdx] || holeList[0];
  const theme = GF_THEMES[hole.theme] || GF_THEMES.parque;
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, GF_CVW, GF_CVH);
  ctx.fillStyle = theme.ground; ctx.fillRect(GF_MARGIN, GF_MARGIN, GF_CVW - GF_MARGIN * 2, GF_CVH - GF_MARGIN * 2);
  ctx.fillStyle = theme.stripe;
  for (let i = GF_MARGIN; i < GF_CVW - GF_MARGIN; i += 24) ctx.fillRect(i, GF_MARGIN, 10, GF_CVH - GF_MARGIN * 2);
  (hole.ice || []).forEach(z => gfDrawIce(ctx, z));
  ctx.fillStyle = '#e8c170'; hole.sand.forEach(z => ctx.fillRect(z.x, z.y, z.w, z.h));
  hole.water.forEach(z => {
    const g = ctx.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
    g.addColorStop(0, '#3a6ea8'); g.addColorStop(1, '#5aa0d8');
    ctx.fillStyle = g; ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    for (let i = 0; i < z.w; i += 10) ctx.fillRect(z.x + i, z.y + 6 + (Math.sin(i / 8 + performance.now() / 300) > 0 ? 2 : 0), 5, 2);
  });
  (hole.ramps || []).forEach(r => gfDrawRamp(ctx, r));
  hole.walls.forEach(w => gfDrawObstacle(ctx, w, hole.theme));
  gfDrawWind(ctx, hole);
  pxCircle(ctx, hole.hole.x, hole.hole.y, GF_HOLE_R, '#0a0a0a'); pxCircle(ctx, hole.hole.x, hole.hole.y, GF_HOLE_R - 3, '#123018');
  ctx.fillStyle = '#caa15b'; ctx.fillRect(hole.hole.x - 1, hole.hole.y - 40, 2, 40);
  ctx.fillStyle = '#e83b3b'; ctx.beginPath(); ctx.moveTo(hole.hole.x + 1, hole.hole.y - 40); ctx.lineTo(hole.hole.x + 16, hole.hole.y - 34); ctx.lineTo(hole.hole.x + 1, hole.hole.y - 28); ctx.closePath(); ctx.fill();
  function gfDrawAim(bx, by, aimX, aimY) {
    const dx0 = aimX - bx, dy0 = aimY - by, dist = Math.hypot(dx0, dy0);
    if (dist <= 4) return;
    const ang = Math.atan2(dy0, dx0), ux = Math.cos(ang), uy = Math.sin(ang);
    ctx.strokeStyle = 'rgba(244,244,244,.85)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + ux * 180, by + uy * 180); ctx.stroke(); ctx.setLineDash([]);
    const pull = 8 + GF.power * 55;
    ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - ux * pull, by - uy * pull); ctx.lineTo(bx - ux * (pull + 42), by - uy * (pull + 42)); ctx.stroke(); ctx.lineCap = 'butt';
  }
  if (GF.mode === 'online') {
    const d = GF.roomData;
    if (d && d.order) {
      d.order.forEach((uid, i) => {
        const b = d.balls[uid]; if (!b) return;
        if (b.done) return; // ya está en el hoyo, no se dibuja encima
        let pos = b;
        if (GF.replay && GF.replay.paths[uid]) { const path = GF.replay.paths[uid]; pos = path[Math.min(GF.replay.i, path.length - 1)]; }
        pxCircle(ctx, pos.x, pos.y, GF_R, GF_PCOLORS[i] || '#aaaaaa');
        if (uid === UID) { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pos.x, pos.y, GF_R + 1.5, 0, Math.PI * 2); ctx.stroke(); }
      });
      const myTurn = !GF.spectating && d.state === 'play' && !GF.replay && d.order[d.turnIdx] === UID;
      if (myTurn && GF.aimPointer) { const mine = d.balls[UID]; gfDrawAim(mine.x, mine.y, GF.aimPointer.x, GF.aimPointer.y); }
      else if (!GF.spectating && d.state === 'play' && !GF.replay && d.order[d.turnIdx] !== UID) {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 0, GF_CVW, GF_CVH);
        ctx.fillStyle = '#fff4e0'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('ESPERANDO TURNO…', GF_CVW / 2, GF_CVH / 2);
      }
    }
    if (GF.popup && GF.popup.life > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, GF_CVH / 2 - 20, GF_CVW, 32);
      ctx.fillStyle = '#ffe14d'; ctx.font = '12px "Press Start 2P"'; ctx.fillText(GF.popup.txt, GF_CVW / 2, GF_CVH / 2 + 4);
    }
    if (d) {
      $('#gf-status').textContent = `HOYO ${d.holeIdx + 1}/${GF_HOLES.length} · PAR ${hole.par}`;
      const turnUid = d.order && d.order[d.turnIdx], turnName = turnUid ? ((GF.roomPlayers[turnUid] || {}).name || '?') : '';
      $('#gf-score').textContent = d.state === 'play' ? (turnUid === UID ? 'TU TURNO' : `TURNO DE ${esc(turnName)}`) + (GF.tEnd && GF.tEnd < Infinity ? ` · ⏱ ${Math.max(0, Math.ceil((GF.tEnd - performance.now()) / 1000))}s` : '') : '';
    }
    gfSyncShootBtn();
    return;
  }
  if (GF.ball.airT > 0) {
    const prog = 1 - GF.ball.airT / (GF.ball.airT0 || GF.ball.airT), lift = Math.sin(prog * Math.PI) * 22;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(GF.ball.x - GF_R), Math.round(GF.ball.y - 2), GF_R * 2, 4);
    pxCircle(ctx, GF.ball.x, GF.ball.y - lift, GF_R, '#f4f4f4');
  } else {
    pxCircle(ctx, GF.ball.x, GF.ball.y, GF_R, '#f4f4f4');
  }
  if (GF.state === 'aiming' && GF.aimPointer) gfDrawAim(GF.ball.x, GF.ball.y, GF.aimPointer.x, GF.aimPointer.y);
  if (GF.popup && GF.popup.life > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, GF_CVH / 2 - 20, GF_CVW, 32);
    ctx.fillStyle = '#ffe14d'; ctx.font = '12px "Press Start 2P"'; ctx.fillText(GF.popup.txt, GF_CVW / 2, GF_CVH / 2 + 4);
  }
  $('#gf-status').textContent = `HOYO ${GF.holeIdx + 1}/${GF.activeHoles.length}${hole.comunitario ? ' · ' + esc(hole.nombre) : ''} · PAR ${hole.par}`;
  $('#gf-score').textContent = `GOLPES: ${GF.strokes} · TOTAL: ${GF.totalStrokes}`;
  gfSyncShootBtn();
}
function gfSyncShootBtn() {
  let canShoot, ball;
  if (GF.mode === 'online') {
    const d = GF.roomData;
    canShoot = !GF.spectating && d && d.order && d.state === 'play' && !GF.replay && d.order[d.turnIdx] === UID;
    ball = canShoot && d.balls[UID];
  } else { canShoot = GF.state === 'aiming'; ball = GF.ball; }
  const aimed = GF.aimPointer && ball && Math.hypot(GF.aimPointer.x - ball.x, GF.aimPointer.y - ball.y) > 4;
  $('#gf-shoot').disabled = !canShoot || !aimed;
  $('#gf-power').disabled = !canShoot;
}
function gfCanvasPos(e) {
  const r = gfcv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * GF_CVW, y: (e.clientY - r.top) / r.height * GF_CVH };
}
const gfcv = $('#gf-cv');
gfcv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (GF.mode === 'online') {
    const d = GF.roomData;
    if (GF.spectating || !d || d.state !== 'play' || GF.replay || d.order[d.turnIdx] !== UID) return;
    GF.dragging = true; GF.aimPointer = gfCanvasPos(e); gfDraw();
    return;
  }
  if (GF.state !== 'aiming') return;
  GF.dragging = true; GF.aimPointer = gfCanvasPos(e); gfDraw();
});
gfcv.addEventListener('pointermove', e => { if (GF.dragging) { GF.aimPointer = gfCanvasPos(e); gfDraw(); } });
window.addEventListener('pointerup', () => {
  if (!GF.dragging) return;
  GF.dragging = false; gfDraw();
});
$('#gf-power').addEventListener('input', e => { GF.power = e.target.value / 100; gfDraw(); });
$('#gf-shoot').addEventListener('click', () => {
  const p = GF.aimPointer; if (!p) return;
  const power = Math.max(70, GF.power * GF_MAXV);
  if (GF.mode === 'online') {
    const d = GF.roomData;
    if (GF.spectating || !d || !d.order || d.state !== 'play' || GF.replay || d.order[d.turnIdx] !== UID || !d.balls || !d.balls[UID]) return;
    const mine = d.balls[UID], dx = p.x - mine.x, dy = p.y - mine.y, dist = Math.hypot(dx, dy);
    if (!(dist >= 4)) return;
    const angle = Math.atan2(dy, dx);
    GF.aimPointer = null; SFX.play('throw'); gfOnlineShoot(Math.cos(angle) * power, Math.sin(angle) * power);
    return;
  }
  if (GF.state !== 'aiming') return;
  const dx = p.x - GF.ball.x, dy = p.y - GF.ball.y, dist = Math.hypot(dx, dy);
  if (!(dist >= 4)) return;
  const angle = Math.atan2(dy, dx);
  GF.aimPointer = null;
  GF.ball.vx = Math.cos(angle) * power; GF.ball.vy = Math.sin(angle) * power;
  GF.strokes++; GF.state = 'rolling'; SFX.play('throw');
});

/* ---- partida en línea (hasta 4 jugadores, mismo recorrido) ---- */
function gfMenuMsg(t, cls = '') { const m = $('#gf-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }
function gfView(v) {
  $('#gf-menu').hidden = v !== 'menu'; $('#gf-lobby').hidden = v !== 'lobby'; $('#gf-game').hidden = v !== 'game';
  $('#gf-builder').hidden = v !== 'builder'; $('#gf-proposals').hidden = v !== 'proposals';
  fitSoon();
}
function gfSeatList() { return Object.entries(GF.roomPlayers).sort((a, b) => a[1].slot - b[1].slot); }
async function gfCreate() {
  if (!(await fbReady)) return gfMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR SOLO.', 'lose');
  gfLeaveOnline(); gfMenuMsg('CREANDO PARTIDA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'golf', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, { host: UID, state: 'lobby', holeIdx: 0, order: [], turnIdx: 0, balls: {}, scores: {}, lastShot: null, created: fs.serverTimestamp() });
    GF.room = code;
    await fs.setDoc(fs.doc(db, 'golf', code, 'players', UID), { name: playerName(), slot: 0, joined: fs.serverTimestamp() });
    gfEnterLobby();
  } catch (e) { console.error(e); GF.room = null; gfMenuMsg('ERROR AL CREAR PARTIDA: ' + e.message, 'lose'); }
}
async function gfJoin() {
  const code = $('#gf-code').value.trim().toUpperCase();
  if (code.length < 5) return gfMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return gfMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR SOLO.', 'lose');
  gfLeaveOnline(); gfMenuMsg('ENTRANDO…');
  try {
    const d = await fs.getDoc(fs.doc(db, 'golf', code));
    if (!d.exists()) throw new Error('ESA PARTIDA NO EXISTE');
    const ps = await fs.getDocs(fs.collection(db, 'golf', code, 'players'));
    const used = new Set(); let mine = false;
    ps.forEach(p => { if (p.id === UID) mine = true; else used.add(p.data().slot); });
    if (!mine && used.size >= 4) throw new Error('LA PARTIDA ESTÁ LLENA (MÁX. 4)');
    if (!mine && d.data().state !== 'lobby') throw new Error('LA PARTIDA YA EMPEZÓ');
    let slot = 0; while (used.has(slot)) slot++;
    GF.room = code;
    await fs.setDoc(fs.doc(db, 'golf', code, 'players', UID), { name: playerName(), slot, joined: fs.serverTimestamp() });
    gfEnterLobby();
  } catch (e) { GF.room = null; gfMenuMsg(e.message, 'lose'); }
}
function gfEnterLobby() {
  GF.mode = 'online'; GF.roomData = null; GF.roomPlayers = {}; GF.resultShown = false; GF._lastSeq = 0; GF.replay = null;
  gfMenuMsg(''); $('#gf-room').textContent = (GF.spectating ? '👁 ESPECTADOR · PARTIDA ' : 'PARTIDA ') + GF.room;
  gfView('lobby'); gfLobbyRender();
  GF.unsubs.push(fs.onSnapshot(fs.doc(db, 'golf', GF.room), s => {
    if (!s.exists()) { if (GF.spectating) { gfMenuMsg('LA PARTIDA SE CERRÓ.', 'lose'); gfToMenu(); } return; }
    GF.roomData = s.data(); gfSync();
  }));
  GF.unsubs.push(fs.onSnapshot(fs.collection(db, 'golf', GF.room, 'players'), s => {
    const m = {}; s.forEach(d => m[d.id] = d.data()); GF.roomPlayers = m; gfSync();
  }));
  if (!GF.spectating) GF.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'golf', GF.room, 'players', UID), { lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
  GF._hostTimer = setInterval(gfHostPoll, 3000);
}
async function gfSpecOpen(code) {
  gfToMenu();
  GF.spectating = true; GF.room = code;
  $('#gf-spec-list').hidden = true;
  gfEnterLobby();
}
function gfLobbyRender() {
  if (GF.mode !== 'online') return;
  const list = gfSeatList(), ul = $('#gf-plist'); ul.innerHTML = '';
  list.forEach(([uid, p], i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${GF_PCOLORS[i] || '#888'}"></span><span>${esc(p.name)}${uid === UID ? ' (TÚ)' : ''}${GF.roomData && uid === GF.roomData.host ? ' ★' : ''}</span>`;
    ul.appendChild(li);
  });
  $('#gf-lobby-msg').textContent = (GF.isHost ? `COMPARTE EL CÓDIGO ${GF.room}. ` : 'ESPERANDO AL ANFITRIÓN (★)… ') + `${list.length}/4 JUGADORES`;
  $('#gf-go').hidden = !GF.isHost || GF.spectating;
  $('#gf-go').disabled = list.length < 1;
}
async function gfOnlineStart() {
  if (!GF.isHost || GF.spectating) return;
  const list = gfSeatList(); if (!list.length) return;
  const order = list.map(([uid]) => uid), h = GF_HOLES[0], balls = {};
  order.forEach(uid => balls[uid] = { x: h.start.x, y: h.start.y, strokes: 0, done: false, lastSafeX: h.start.x, lastSafeY: h.start.y });
  try {
    await fs.updateDoc(fs.doc(db, 'golf', GF.room), { state: 'play', order, turnIdx: 0, holeIdx: 0, balls, scores: {}, lastShot: null });
  } catch (e) { console.error(e); }
}
function gfSync() {
  const d = GF.roomData; if (!d || GF.mode !== 'online') return;
  GF.isHost = d.host === UID;
  gfView(d.state === 'lobby' ? 'lobby' : 'game');
  if (d.state === 'lobby') { gfLobbyRender(); return; }
  $('#gf-over').hidden = d.state !== 'over';
  $('#gf-room2').hidden = false; $('#gf-room2').textContent = (GF.spectating ? '👁 ESPECTADOR · PARTIDA ' : 'PARTIDA ') + GF.room;
  $('#gf-spec-badge').hidden = !GF.spectating;
  if (d.lastShot && d.lastShot.seq !== GF._lastSeq) {
    GF._lastSeq = d.lastShot.seq;
    if (d.lastShot.uid !== UID) GF.replay = { paths: d.lastShot.paths, events: d.lastShot.events, i: 0, acc: 0 };
  }
  if (d.state === 'over' && !GF.resultShown) { GF.resultShown = true; gfOnlineFinish(); }
  gfRenderPlayers();
}
function gfRenderPlayers() {
  const d = GF.roomData; if (!d || !d.order) return;
  const ul = $('#gf-players'); ul.hidden = false; ul.innerHTML = '';
  d.order.forEach((uid, i) => {
    const p = GF.roomPlayers[uid] || { name: '?' }, b = (d.balls && d.balls[uid]) || { strokes: 0, done: false };
    const li = document.createElement('li');
    const turn = i === d.turnIdx && d.state === 'play';
    li.innerHTML = `<span class="dot" style="background:${GF_PCOLORS[i] || '#888'}"></span><span>${esc(p.name)}${uid === UID ? ' (TÚ)' : ''}${turn ? ' 👉' : ''}${b.done ? ' ✓' : ''}</span><small>${b.strokes} GOLPE${b.strokes === 1 ? '' : 'S'}</small>`;
    ul.appendChild(li);
  });
}
function gfOnlineFinish() {
  const d = GF.roomData;
  const totalPar = GF_HOLES.reduce((s, h) => s + h.par, 0);
  const totals = d.order.map(uid => ({ uid, name: (GF.roomPlayers[uid] || {}).name || '?', total: (d.scores[uid] || []).reduce((a, b) => a + b, 0) }));
  totals.sort((a, b) => a.total - b.total);
  $('#gf-over-p').innerHTML = totals.map((t, i) => `${i + 1}. ${esc(t.name)}${t.uid === UID ? ' (TÚ)' : ''}: ${t.total} GOLPES`).join('<br>') + `<br><br>PAR DEL RECORRIDO: ${totalPar}`;
  $('#gf-over').hidden = false;
  $('#gf-again').hidden = !GF.isHost || GF.spectating;
  if (!GF.spectating) {
    const mine = totals.find(t => t.uid === UID);
    if (mine) {
      const diff = mine.total - totalPar, diffTxt = diff === 0 ? 'PAR' : (diff > 0 ? '+' + diff : String(diff));
      LB.confirmar(`TERMINASTE CON ${mine.total} GOLPES (${diffTxt}). ¿LO SUBES A LA TABLA?`, () => LB.submit('golf', mine.total, true, diffTxt)).then(gfLB);
    }
  }
}
async function gfOnlineShoot(vx, vy) {
  try {
    await fs.runTransaction(db, async tx => {
      const ref = fs.doc(db, 'golf', GF.room);
      const snap = await tx.get(ref); if (!snap.exists()) return;
      const d = snap.data();
      if (!d.order || d.order[d.turnIdx] !== UID || d.state !== 'play') return;
      const hole = GF_HOLES[d.holeIdx], simIn = {};
      d.order.forEach(uid => { const b = d.balls[uid]; if (!b.done) simIn[uid] = { x: b.x, y: b.y, vx: uid === UID ? vx : 0, vy: uid === UID ? vy : 0 }; });
      const { paths, events, finals } = gfSimulateAll(simIn, hole);
      GF.replay = { paths, events, i: 0, acc: 0 };
      const balls = { ...d.balls };
      Object.keys(finals).forEach(u => {
        const b = { ...balls[u] };
        let x = finals[u].x, y = finals[u].y, strokes = b.strokes, done = b.done, lastSafeX = b.lastSafeX, lastSafeY = b.lastSafeY;
        if (u === UID) strokes++;
        if (events[u] === 'water') { x = b.lastSafeX; y = b.lastSafeY; strokes++; }
        else if (events[u] === 'sunk') { done = true; lastSafeX = x; lastSafeY = y; }
        else { lastSafeX = x; lastSafeY = y; }
        if (!done && strokes >= GF_MAX_STROKES) done = true;
        balls[u] = { x, y, strokes, done, lastSafeX, lastSafeY };
      });
      let holeIdx = d.holeIdx, scores = d.scores || {};
      const nextIdx = gfNextTurn(d.order, d.turnIdx, balls);
      const shotMeta = { uid: UID, seq: ((d.lastShot && d.lastShot.seq) || 0) + 1, paths, events };
      if (nextIdx === -1) {
        scores = { ...scores };
        d.order.forEach(uid => { scores[uid] = [...(scores[uid] || []), balls[uid].strokes]; });
        if (holeIdx < GF_HOLES.length - 1) {
          holeIdx++;
          const nh = GF_HOLES[holeIdx], freshBalls = {};
          d.order.forEach(uid => { freshBalls[uid] = { x: nh.start.x, y: nh.start.y, strokes: 0, done: false, lastSafeX: nh.start.x, lastSafeY: nh.start.y }; });
          tx.update(ref, { balls: freshBalls, holeIdx, scores, turnIdx: 0, lastShot: shotMeta });
        } else {
          tx.update(ref, { balls, holeIdx, scores, state: 'over', lastShot: shotMeta });
        }
      } else {
        tx.update(ref, { balls, turnIdx: nextIdx, lastShot: shotMeta });
      }
    });
  } catch (e) { console.error(e); GF.tKey = null; }
}
function gfHostPoll() {
  if (GF.mode !== 'online' || !GF.isHost || GF.spectating || !GF.roomData) return;
  const d = GF.roomData; if (d.state !== 'play' || !d.order) return;
  const uid = d.order[d.turnIdx], p = GF.roomPlayers[uid];
  if (p && isStale(p.lastSeen, Date.now())) {
    const balls = { ...d.balls, [uid]: { ...d.balls[uid], done: true } };
    const nextIdx = gfNextTurn(d.order, d.turnIdx, balls);
    if (nextIdx === -1) {
      const scores = { ...d.scores }; d.order.forEach(u => { scores[u] = [...(scores[u] || []), balls[u].strokes]; });
      fs.updateDoc(fs.doc(db, 'golf', GF.room), { balls, scores, state: 'over' }).catch(() => {});
    } else {
      fs.updateDoc(fs.doc(db, 'golf', GF.room), { balls, turnIdx: nextIdx }).catch(() => {});
    }
  }
}
function gfLeaveOnline() {
  GF.unsubs.forEach(u => u()); GF.unsubs = [];
  if (GF.hbStop) { GF.hbStop(); GF.hbStop = null; }
  if (GF._hostTimer) { clearInterval(GF._hostTimer); GF._hostTimer = null; }
  if (GF.room && fs && !GF.spectating) {
    const room = GF.room, others = Object.keys(GF.roomPlayers).filter(u => u !== UID);
    if (GF.isHost && others.length) fs.updateDoc(fs.doc(db, 'golf', room), { host: others[0] }).catch(() => {});
    fs.deleteDoc(fs.doc(db, 'golf', room, 'players', UID)).catch(() => {});
  }
  GF.room = null; GF.roomData = null; GF.roomPlayers = {}; GF.isHost = false; GF.spectating = false; GF.replay = null;
}
function gfToMenu() {
  if (GF.mode === 'online') gfLeaveOnline();
  GF.mode = null; GF.spectating = false;
  $('#gf-over').hidden = true;
  gfView('menu');
}
$('#gf-spec-btn').onclick = async () => {
  const list = $('#gf-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('golf');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const stateN = { lobby: 'EN LOBBY', play: 'JUGANDO', over: 'TERMINADA' };
  list.innerHTML = rooms.length
    ? rooms.map(r => `<li><span><b>PARTIDA ${r.code}</b><small>${stateN[r.data.state] || r.data.state}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY PARTIDAS RECIENTES</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); gfSpecOpen(b.dataset.code); });
};
let gfCommunityLoaded = false;
async function gfLoadCommunityHoles() {
  if (gfCommunityLoaded) return;
  gfCommunityLoaded = true;
  if (!(await fbReady)) return;
  try {
    const q = fs.query(fs.collection(db, 'golfHoyosPropuestos'), fs.where('estado', '==', 'aprobado'), fs.limit(12));
    const snap = await fs.getDocs(q);
    GF.communityHoles = [];
    snap.forEach(d => GF.communityHoles.push({ ...d.data(), comunitario: true }));
  } catch (e) { console.warn('No se pudieron cargar los hoyos de la comunidad:', e); }
}
$('#gf-local').onclick = async () => {
  SFX.play('start'); GF.mode = 'local'; GF.spectating = false;
  $('#gf-room2').hidden = true; $('#gf-spec-badge').hidden = true; $('#gf-players').hidden = true;
  await gfLoadCommunityHoles(); gfStart(); gfView('game');
};
$('#gf-create').onclick = gfCreate;
$('#gf-join').onclick = gfJoin;
$('#gf-code').addEventListener('keydown', e => { if (e.key === 'Enter') gfJoin(); });
$('#gf-go').onclick = gfOnlineStart;
$('#gf-leave').onclick = gfToMenu;
$('#gf-quit').onclick = pedirAbandonar(gfToMenu);
$('#gf-again').onclick = () => { if (GF.mode === 'local') { SFX.play('start'); gfStart(); } else if (GF.isHost) gfOnlineStart(); };
$('#gf-exit').onclick = () => arcade.goTab('menu');
window.addEventListener('beforeunload', () => { if (GF.mode === 'online') gfLeaveOnline(); });

/* ---- Creador de hoyos: cualquiera diseña un hoyo y lo envía; un moderador lo aprueba antes de
   que se sume a "JUGAR SOLO". Los hoyos aprobados se guardan en golfHoyosPropuestos (arcade-matec);
   ver docs/arcade-firebase-cambios.md para las reglas de Firestore que necesita esta colección. ---- */
const GFB_TOOLS = [
  { id: 'start', n: 'BOLA (INICIO)' }, { id: 'hole', n: 'BANDERA (META)' },
  { id: 'wall', n: 'PARED' }, { id: 'sand', n: 'ARENA' }, { id: 'water', n: 'AGUA' }, { id: 'ice', n: 'HIELO' },
  { id: 'ramp', n: 'RAMPA' },
];
const GFB_MAX = { wall: 6, sand: 3, water: 3, ice: 3, ramp: 2 };
const GFB_ZONE_KEY = { wall: 'walls', sand: 'sand', water: 'water', ice: 'ice', ramp: 'ramps' };
const GFB_DIRS = ['right', 'left', 'up', 'down'];
const GFB_DIR_ARROW = { right: '►', left: '◄', up: '▲', down: '▼' };
const GFB = { theme: 'parque', par: 3, tool: 'start', rampDir: 'right', start: null, hole: null, walls: [], sand: [], water: [], ice: [], ramps: [], dragFrom: null, _dragTo: null };
function gfbCount(tool) { const key = GFB_ZONE_KEY[tool]; return key ? GFB[key].length : 0; }
function gfbThemeRender() {
  const keys = Object.keys(GF_THEMES);
  pickRow($('#gfb-theme'), keys.map(k => ({ html: k.toUpperCase() })), keys.indexOf(GFB.theme), i => { GFB.theme = keys[i]; gfbThemeRender(); gfbDraw(); });
}
function gfbParRender() {
  const opts = [2, 3, 4, 5, 6];
  pickRow($('#gfb-par'), opts.map(p => ({ html: String(p) })), opts.indexOf(GFB.par), i => { GFB.par = opts[i]; gfbParRender(); });
}
function gfbToolsRender() {
  pickRow($('#gfb-tools'), GFB_TOOLS.map(t => ({ html: t.n + (GFB_MAX[t.id] ? ` (${gfbCount(t.id)}/${GFB_MAX[t.id]})` : '') })),
    GFB_TOOLS.findIndex(t => t.id === GFB.tool), i => { GFB.tool = GFB_TOOLS[i].id; gfbToolsRender(); });
  $('#gfb-rampdir').textContent = 'DIRECCIÓN RAMPA: ' + GFB_DIR_ARROW[GFB.rampDir];
}
function gfbDraw() {
  const cv = $('#gfb-cv'); if (!cv || !cv.offsetParent) return;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center';
  const theme = GF_THEMES[GFB.theme] || GF_THEMES.parque;
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, GF_CVW, GF_CVH);
  ctx.fillStyle = theme.ground; ctx.fillRect(GF_MARGIN, GF_MARGIN, GF_CVW - GF_MARGIN * 2, GF_CVH - GF_MARGIN * 2);
  ctx.fillStyle = theme.stripe;
  for (let i = GF_MARGIN; i < GF_CVW - GF_MARGIN; i += 24) ctx.fillRect(i, GF_MARGIN, 10, GF_CVH - GF_MARGIN * 2);
  GFB.ice.forEach(z => gfDrawIce(ctx, z));
  ctx.fillStyle = '#e8c170'; GFB.sand.forEach(z => ctx.fillRect(z.x, z.y, z.w, z.h));
  GFB.water.forEach(z => { ctx.fillStyle = '#4a8cc4'; ctx.fillRect(z.x, z.y, z.w, z.h); });
  GFB.ramps.forEach(r => gfDrawRamp(ctx, r));
  GFB.walls.forEach(w => gfDrawObstacle(ctx, w, GFB.theme));
  if (GFB.hole) { pxCircle(ctx, GFB.hole.x, GFB.hole.y, GF_HOLE_R, '#0a0a0a'); pxCircle(ctx, GFB.hole.x, GFB.hole.y, GF_HOLE_R - 3, '#123018'); }
  if (GFB.start) pxCircle(ctx, GFB.start.x, GFB.start.y, GF_R, '#f4f4f4');
  if (GFB.dragFrom && GFB._dragTo) {
    const x0 = Math.min(GFB.dragFrom.x, GFB._dragTo.x), y0 = Math.min(GFB.dragFrom.y, GFB._dragTo.y);
    const w = Math.abs(GFB._dragTo.x - GFB.dragFrom.x), h = Math.abs(GFB._dragTo.y - GFB.dragFrom.y);
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.strokeRect(x0, y0, w, h); ctx.setLineDash([]);
  }
}
function gfbCanvasPos(e) {
  const r = $('#gfb-cv').getBoundingClientRect();
  return {
    x: Math.max(GF_MARGIN, Math.min(GF_CVW - GF_MARGIN, (e.clientX - r.left) / r.width * GF_CVW)),
    y: Math.max(GF_MARGIN, Math.min(GF_CVH - GF_MARGIN, (e.clientY - r.top) / r.height * GF_CVH)),
  };
}
$('#gfb-cv').addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = gfbCanvasPos(e);
  if (GFB.tool === 'start') { GFB.start = p; gfbDraw(); return; }
  if (GFB.tool === 'hole') { GFB.hole = p; gfbDraw(); return; }
  if (gfbCount(GFB.tool) >= GFB_MAX[GFB.tool]) {
    $('#gfb-msg').textContent = 'YA PUSISTE EL MÁXIMO DE ESE TIPO. QUITA UNO O ELIGE OTRA HERRAMIENTA.'; $('#gfb-msg').className = 'msg lose';
    return;
  }
  GFB.dragFrom = p; GFB._dragTo = p;
});
$('#gfb-cv').addEventListener('pointermove', e => { if (GFB.dragFrom) { GFB._dragTo = gfbCanvasPos(e); gfbDraw(); } });
window.addEventListener('pointerup', () => {
  if (!GFB.dragFrom) return;
  const a = GFB.dragFrom, b = GFB._dragTo || a; GFB.dragFrom = null; GFB._dragTo = null;
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.max(20, Math.abs(b.x - a.x)), h = Math.max(20, Math.abs(b.y - a.y));
  const rect = { x, y, w, h };
  if (GFB.tool === 'wall') GFB.walls.push(rect);
  else if (GFB.tool === 'sand') GFB.sand.push(rect);
  else if (GFB.tool === 'water') GFB.water.push(rect);
  else if (GFB.tool === 'ice') GFB.ice.push(rect);
  else if (GFB.tool === 'ramp') GFB.ramps.push({ ...rect, dir: GFB.rampDir, dist: Math.max(150, Math.max(w, h) + 60) });
  else return;
  SFX.play('click'); gfbToolsRender(); gfbDraw();
});
$('#gfb-rampdir').onclick = () => { GFB.rampDir = GFB_DIRS[(GFB_DIRS.indexOf(GFB.rampDir) + 1) % GFB_DIRS.length]; gfbToolsRender(); };
$('#gfb-undo').onclick = () => {
  if (GFB.tool === 'start') GFB.start = null;
  else if (GFB.tool === 'hole') GFB.hole = null;
  else { const key = GFB_ZONE_KEY[GFB.tool]; if (key && GFB[key].length) GFB[key].pop(); }
  gfbToolsRender(); gfbDraw();
};
$('#gfb-clear').onclick = () => {
  Object.assign(GFB, { start: null, hole: null, walls: [], sand: [], water: [], ice: [], ramps: [] });
  gfbToolsRender(); gfbDraw();
};
$('#gfb-test').onclick = () => {
  const msg = $('#gfb-msg');
  if (!GFB.start || !GFB.hole) { msg.textContent = 'PON EL INICIO Y LA BANDERA PRIMERO.'; msg.className = 'msg lose'; return; }
  const hole = { theme: GFB.theme, par: GFB.par, start: GFB.start, hole: GFB.hole, walls: GFB.walls, sand: GFB.sand, water: GFB.water, ice: GFB.ice, ramps: GFB.ramps, comunitario: true, nombre: 'PRUEBA' };
  GF.mode = 'local'; GF.spectating = false;
  $('#gf-room2').hidden = true; $('#gf-spec-badge').hidden = true; $('#gf-players').hidden = true;
  GF.activeHoles = [hole]; GF.holeIdx = 0; GF.totalStrokes = 0; GF.scores = [];
  $('#gf-over').hidden = true;
  gfLoadHole(0);
  SFX.play('start'); gfView('game');
};
$('#gfb-send').onclick = async () => {
  const msg = $('#gfb-msg');
  if (!GFB.start || !GFB.hole) { msg.textContent = 'PON EL INICIO Y LA BANDERA PRIMERO.'; msg.className = 'msg lose'; return; }
  const autor = $('#gfb-autor').value.trim().slice(0, 12), nombre = $('#gfb-nombre').value.trim().slice(0, 30);
  if (!autor || !nombre) { msg.textContent = 'ESCRIBE TU APODO Y EL NOMBRE DEL HOYO.'; msg.className = 'msg lose'; return; }
  const filtroAutor = filtrarTexto(autor), filtroNombre = filtrarTexto(nombre);
  if (!filtroAutor.ok) { msg.textContent = filtroAutor.motivo; msg.className = 'msg lose'; return; }
  if (!filtroNombre.ok) { msg.textContent = filtroNombre.motivo; msg.className = 'msg lose'; return; }
  if (!(await fbReady)) { msg.textContent = 'SIN CONEXIÓN A FIREBASE: NO SE PUEDE ENVIAR AHORA.'; msg.className = 'msg lose'; return; }
  msg.textContent = 'ENVIANDO…'; msg.className = 'msg';
  try {
    await fs.addDoc(fs.collection(db, 'golfHoyosPropuestos'), {
      nombre, autor, theme: GFB.theme, par: GFB.par, start: GFB.start, hole: GFB.hole,
      walls: GFB.walls, sand: GFB.sand, water: GFB.water, ice: GFB.ice, ramps: GFB.ramps,
      estado: 'pendiente', creado: fs.serverTimestamp(),
    });
    SFX.play('win');
    msg.textContent = '¡ENVIADO! QUEDA PENDIENTE HASTA QUE UN MODERADOR LO APRUEBE.'; msg.className = 'msg win';
    Object.assign(GFB, { start: null, hole: null, walls: [], sand: [], water: [], ice: [], ramps: [] });
    $('#gfb-autor').value = ''; $('#gfb-nombre').value = '';
    gfbToolsRender(); gfbDraw();
  } catch (e) { console.error(e); msg.textContent = 'NO SE PUDO ENVIAR: ' + e.message; msg.className = 'msg lose'; }
};
$('#gf-builder-open').onclick = () => { gfbThemeRender(); gfbParRender(); gfbToolsRender(); gfView('builder'); gfbDraw(); };
$('#gfb-back').onclick = () => gfView('menu');

/* ---- Moderar propuestas: cuenta de correo/contraseña PROPIA de arcade-matec (no la del sitio), ver
   assets/js/arcade/moderacion.js. Sin Cloud Function ni cuenta de servicio: las reglas de arcade-matec
   (función esModerador()) ya distinguen una sesión de moderador (con contraseña) de una anónima
   (cualquiera jugando). Hace falta el voto del 75% de los moderadores (redondeado hacia arriba) para que
   una propuesta quede aprobada o rechazada — el conteo lo hace este mismo código leyendo
   arcadeModeradores, las reglas no pueden contar documentos. */
let gfpModeradorEmail = null;
let gfpDocs = {}; // id -> datos completos de la propuesta, para poder "PROBARLO" sin leerlo de nuevo
function gfpItemHtml(id, d) {
  const estadoTxt = { pendiente: 'PENDIENTE', aprobado: 'APROBADO ✓', rechazado: 'RECHAZADO ✗' }[d.estado] || d.estado;
  const estadoCls = d.estado === 'aprobado' ? 'win' : (d.estado === 'rechazado' ? 'lose' : '');
  const puedeModerar = gfpModeradorEmail && d.estado === 'pendiente';
  const votos = puedeModerar ? ` · ✔ ${(d.votosAprobar || []).length} ✘ ${(d.votosRechazar || []).length}` : '';
  return `<span><b>${esc(d.nombre)}</b> · ${esc((d.theme || '').toUpperCase())}<small>POR ${esc(d.autor)} · PAR ${esc(d.par)} · <span class="${estadoCls}">${esc(estadoTxt)}</span>${votos}</small></span>` +
    `<button class="btn" data-test="${esc(id)}">▶ PROBARLO</button>` +
    (puedeModerar ? `<button class="btn green" data-approve="${esc(id)}">APROBAR</button><button class="btn gray" data-reject="${esc(id)}">RECHAZAR</button>` : '') +
    (gfpModeradorEmail ? `<button class="btn red" data-delete="${esc(id)}">BORRAR</button>` : '');
}
async function gfpLoad() {
  const list = $('#gfp-list'); list.innerHTML = '<li class="muted">CARGANDO…</li>';
  if (!(await fbReady)) { list.innerHTML = '<li class="muted">SIN CONEXIÓN A FIREBASE</li>'; return; }
  try {
    const q = fs.query(fs.collection(db, 'golfHoyosPropuestos'), fs.orderBy('creado', 'desc'), fs.limit(30));
    const snap = await fs.getDocs(q);
    if (snap.empty) { list.innerHTML = '<li class="muted">TODAVÍA NO HAY PROPUESTAS</li>'; return; }
    list.innerHTML = ''; gfpDocs = {};
    snap.forEach(docSnap => {
      gfpDocs[docSnap.id] = docSnap.data();
      const li = document.createElement('li'); li.innerHTML = gfpItemHtml(docSnap.id, docSnap.data()); list.appendChild(li);
    });
    list.querySelectorAll('[data-test]').forEach(b => b.onclick = () => gfpTest(b.dataset.test));
    list.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => gfpVotar(b.dataset.approve, 'aprobado'));
    list.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => gfpVotar(b.dataset.reject, 'rechazado'));
    list.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => gfpBorrar(b.dataset.delete));
  } catch (e) { console.error(e); list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; }
}
// Jugarlo de verdad antes de votar, en vez de aprobar a ciegas solo por cómo se ve en el editor.
function gfpTest(id) {
  const d = gfpDocs[id]; if (!d) return;
  const hole = { theme: d.theme, par: d.par, start: d.start, hole: d.hole, walls: d.walls, sand: d.sand, water: d.water, ice: d.ice, ramps: d.ramps, comunitario: true, nombre: d.nombre };
  GF.mode = 'local'; GF.spectating = false;
  $('#gf-room2').hidden = true; $('#gf-spec-badge').hidden = true; $('#gf-players').hidden = true;
  GF.activeHoles = [hole]; GF.holeIdx = 0; GF.totalStrokes = 0; GF.scores = [];
  $('#gf-over').hidden = true;
  gfLoadHole(0);
  SFX.play('start'); gfView('game');
}
async function gfpUmbral() {
  const snap = await fs.getDocs(fs.collection(dbMod, 'arcadeModeradores'));
  const total = Math.max(1, snap.size);
  return { total, umbral: Math.ceil(total * 0.75) };
}
async function gfpVotar(id, voto) {
  const msg = $('#gfp-msg');
  try {
    const miCorreo = moderadorActual().email;
    const ref = fs.doc(dbMod, 'golfHoyosPropuestos', id);
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) { msg.textContent = 'ESA PROPUESTA YA NO EXISTE.'; msg.className = 'msg lose'; gfpLoad(); return; }
    const d = snap.data();
    // Cambiar de opinión mueve el voto de una lista a la otra, nunca cuenta en las dos a la vez.
    let votosAprobar = (d.votosAprobar || []).filter(c => c !== miCorreo);
    let votosRechazar = (d.votosRechazar || []).filter(c => c !== miCorreo);
    (voto === 'aprobado' ? votosAprobar : votosRechazar).push(miCorreo);
    const { total, umbral } = await gfpUmbral();
    let estado = d.estado;
    if (estado === 'pendiente') {
      if (votosAprobar.length >= umbral) estado = 'aprobado';
      else if (votosRechazar.length >= umbral) estado = 'rechazado';
    }
    await fs.updateDoc(ref, { votosAprobar, votosRechazar, estado });
    SFX.play('click');
    msg.textContent = estado === 'pendiente'
      ? `VOTO REGISTRADO: ✔ ${votosAprobar.length} · ✘ ${votosRechazar.length} (HACEN FALTA ${umbral} DE ${total}, EL 75%)`
      : `PROPUESTA ${estado.toUpperCase()}.`;
    msg.className = 'msg win';
    gfCommunityLoaded = false; gfpLoad();
  } catch (e) { console.error(e); msg.textContent = 'NO SE PUDO GUARDAR: ' + (e.message || e); msg.className = 'msg lose'; }
}
async function gfpBorrar(id) {
  if (!window.confirm('¿Borrar esta propuesta? No se puede deshacer.')) return;
  const msg = $('#gfp-msg');
  try { await fs.deleteDoc(fs.doc(dbMod, 'golfHoyosPropuestos', id)); SFX.play('click'); gfCommunityLoaded = false; gfpLoad(); }
  catch (e) { console.error(e); msg.textContent = 'NO SE PUDO BORRAR: ' + (e.message || e); msg.className = 'msg lose'; }
}
onModerador(user => {
  gfpModeradorEmail = user ? user.email : null;
  $('#gfp-login-row').hidden = !!user;
  $('#gfp-session-row').hidden = !user;
  if (user) $('#gfp-session-email').textContent = user.email;
  gfpLoad();
});
$('#gfp-login').onclick = async () => {
  const msg = $('#gfp-msg'), email = $('#gfp-email').value.trim(), pass = $('#gfp-pass').value;
  if (!email || !pass) { msg.textContent = 'ESCRIBE TU CORREO Y CONTRASEÑA.'; msg.className = 'msg lose'; return; }
  msg.textContent = 'ENTRANDO…'; msg.className = 'msg';
  try { await moderadorLogin(email, pass); $('#gfp-pass').value = ''; msg.textContent = ''; }
  catch (e) { msg.textContent = mensajeErrorAuth(e); msg.className = 'msg lose'; }
};
$('#gfp-logout').onclick = () => moderadorLogout();
$('#gf-proposals-open').onclick = () => { $('#gfp-msg').textContent = ''; gfpLoad(); gfView('proposals'); };
$('#gfp-back').onclick = () => gfView('menu');

gfLB(); gfView('menu');

// --- conexión con la página (antes en arcade.html) ---
registrarBucle(dt => { if (arcade.tab === 'golf') { gfTick(dt); gfDraw(); } });
