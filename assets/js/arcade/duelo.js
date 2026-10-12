import './shell.js';
import { db, fs, UID, fbReady, $, esc, store, playerName, genCode, tsMillis, isStale, presenceLoop, SFX, LB, sprite, pxCircle, fitSoon, expiraEn } from './core.js';
import { tab, pedirAbandonar, pickRow, bucle } from './pagina.js';

/* ============================================================
   DUELO DEL OESTE — duelo de reflejos, 1 contra 1. Cuenta regresiva
   3, 2, 1… una espera al azar y "¡YA!": gana la ronda quien dispare
   primero. Disparar antes de tiempo pierde la ronda. Al mejor de 3.
   Modos: VS CPU (el rival es un vaquero robot), 2 jugadores en el
   mismo equipo (teclas A y L) y en línea (el anfitrión reparte la
   cuenta regresiva con una marca de tiempo compartida; quien gana la
   ronda la reclama con una transacción de Firestore, así los dos
   quedan de acuerdo aunque disparen casi al mismo tiempo).
   Entre humanos (local o en línea) cada quien elige sombrero y poncho;
   en línea la elección va en `duelos/{sala}.{A|B}.look`.
   Top 10 dual:
   - "duelo": duelos ganados VS CPU (sin cambios, suma 1 por duelo).
   - "duelo_reaccion": mejor tiempo de reacción en ms enteros (menor es
     mejor). Cuenta VS CPU y en línea, solo con un disparo válido después
     del "¡YA!". No cuenta en 2 jugadores del mismo equipo (hay un solo
     nombre de jugador y no se sabría de quién es la marca). Se ignoran
     valores fuera de [DL_RT_MIN, DL_RT_MAX] (menos de 80 ms no es humano).
   ============================================================ */
const DL_COUNT_STEP = 700, DL_MIN_WAIT = 1000, DL_MAX_WAIT = 3500;
// Retraso del CPU tras el "¡YA!" según dificultad. MEDIO = 220..520 ms (como siempre). FÁCIL (450..800) queda
// por encima del reflejo típico humano (~250 ms) y DIFÍCIL (150..280) lo iguala o lo supera, sin bajar de DL_RT_MIN.
const DL_BOT = [{ n: 'FÁCIL', min: 450, max: 800 }, { n: 'MEDIO', min: 220, max: 520 }, { n: 'DIFÍCIL', min: 150, max: 280 }];
let dlBotLvl = store.get('pa_dl_bot', 1);
if (!DL_BOT[dlBotLvl]) dlBotLvl = 1;
const DL_WINS_TO_TAKE = 2;
const DL_RT_MIN = 80, DL_RT_MAX = 5000, DL_SCALE = 3;
const DL = {
  mode: null, room: null, me: null, isHost: false, unsub: null, hbStop: null, roomData: null,
  names: { A: 'JUGADOR 1', B: 'JUGADOR 2' }, wins: { A: 0, B: 0 },
  phase: 'idle', countN: 3, yaAt: 0, roundActive: false, currentRoundSeq: 0, roundSeqCounter: 0,
  appliedRoundSeq: 0, lastResultRoundSeq: -1, appliedMatchSeq: 0, timers: [], shot: null,
  looks: { A: null, B: null }, lbKey: 'duelo', lookTimer: null,
  matchBestRt: null, // mejor tiempo de reacción de ESTE duelo; se pregunta una sola vez al terminar
};
function dlMsg(t, cls) { const m = $('#dl-msg'); m.textContent = t; m.className = 'msg' + (cls ? ' ' + cls : ''); }
function dlMenuMsg(t, cls) { const m = $('#dl-menu-msg'); m.textContent = t; m.className = 'msg' + (cls ? ' ' + cls : ''); }
function dlSchedule(fn, delayMs) { const id = setTimeout(fn, Math.max(0, delayMs)); DL.timers.push(id); return id; }
function dlClearTimers() { DL.timers.forEach(clearTimeout); DL.timers = []; }
function dlShow(view) {
  $('#dl-menu').hidden = view !== 'menu'; $('#dl-local-setup').hidden = view !== 'local';
  $('#dl-lobby').hidden = view !== 'lobby'; $('#dl-game').hidden = view !== 'game';
  $('#dl-fire').hidden = !(view === 'game' && (DL.mode === 'cpu' || DL.mode === 'online'));
  $('#dl-fire2').hidden = !(view === 'game' && DL.mode === 'local');
  fitSoon();
}

/* ---------- apariencia: sombrero y poncho ---------- */
const DL_HATS = ['VAQUERO', 'CHARRO', 'BOMBÍN', 'COPA'];
const DL_HAT_COLORS = [['CAFÉ', '#7a4a2a', '#3b2214'], ['NEGRO', '#262b44', '#b13e53'], ['CREMA', '#e8d8b0', '#8a5a3c'],
  ['ROJO', '#b13e53', '#5d275d'], ['GRIS', '#8b9bb4', '#333c57'], ['VERDE', '#38b764', '#1e5c3a']];
const DL_PONCHOS = [['ROJO', '#b13e53', '#ffcd75'], ['AZUL', '#3b5dc9', '#f4f4f4'], ['VERDE', '#257179', '#a7f070'],
  ['MORADO', '#5d275d', '#ef7d57'], ['NARANJA', '#ef7d57', '#1a1c2c'], ['CREMA', '#e8d8b0', '#b13e53']];
const DL_PATTERNS = ['LISO', 'RAYAS', 'ZIGZAG', 'FLECOS'];
// Campos de `look` (enteros): hat 0-3, hatColor 0-5, poncho 0-5, pattern 0-3.
const DL_LOOK_FIELDS = [['hat', 'SOMBRERO', DL_HATS], ['hatColor', 'COLOR', DL_HAT_COLORS.map(c => c[0])],
  ['poncho', 'PONCHO', DL_PONCHOS.map(c => c[0])], ['pattern', 'DISEÑO', DL_PATTERNS]];
const DL_LOOK_DEF = { A: { hat: 0, hatColor: 0, poncho: 0, pattern: 1 }, B: { hat: 1, hatColor: 1, poncho: 1, pattern: 2 } };
function dlLook(o, def) {
  const out = {};
  DL_LOOK_FIELDS.forEach(([k, , opts]) => {
    const v = o && Number.isInteger(o[k]) ? o[k] : def[k];
    out[k] = v >= 0 && v < opts.length ? v : def[k];
  });
  return out;
}
const dlMyLook = () => dlLook(store.get('dl_look', null), DL_LOOK_DEF.A);
const DL_HAT_ROWS = [
  ["................", "......HHHH......", ".....HHHHHH.....", ".....hhhhhh.....", "..HHHHHHHHHHHH..", "...HHHHHHHHHH..."],
  [".......HH.......", "......HHHH......", ".....HHHHHH.....", ".....hhhhhh.....", "HHHHHHHHHHHHHHHH", ".HHhHHhHHhHHhHH."],
  ["................", "................", "......HHHH......", ".....HHHHHH.....", ".....hhhhhh.....", "....HHHHHHHH...."],
  [".....HHHHHH.....", ".....HHHHHH.....", ".....HHHHHH.....", ".....hhhhhh.....", ".....HHHHHH.....", "...HHHHHHHHHH..."]
];
const DL_BODY_ROWS = [
  ".....SSSSSS.....", ".....SSSSES.....", ".....SSSSSSS....", ".....SSMMMS.....", "......SSSS......",
  ".....PPPPPP.....", "....PPPPPPPP....", "...PPPPPPPPPP...", "..PPPPPPPPPPPSGG", "..PPPPPPPPPPPP..",
  "..PPPPPPPPPPPP..", "...PPPPPPPPPP...",
  ".....BBBBBB.....", ".....BB..BB.....", ".....BB..BB.....", ".....BB..BB.....", "....KKK..KKK....", "....KKK..KKK...."
];
const DL_ROBOT_ROWS = [
  "................", "......HHHH......", ".....HHHHHH.....", ".....hhhhhh.....", "..HHHHHHHHHHHH..", "...HHHHHHHHHH...",
  ".....MMMMMM.....", ".....MRRRRM.....", ".....MMMMMMD....", ".....MDMDMM.....", "......MMMM......",
  ".......DD.......", "....MMMMMMMM....", "...MMLLMMMMMM...", "...MMDDDDMMMMMGG", "...MMMMMMMMMM...",
  "...MMMCCMMMMM...", "....MMMMMMMM....",
  ".....DDDDDD.....", ".....DD..DD.....", ".....MM..MM.....", ".....DD..DD.....", "....MMM..MMM....", "....DDD..DDD...."
];
// Rodea el dibujo con un borde oscuro de 1 píxel (se lee mejor sobre el cielo naranja).
function dlOutline(rows) {
  const w = rows[0].length + 2, pad = '.'.repeat(w);
  const g = [pad, ...rows.map(r => '.' + r + '.'), pad].map(r => [...r]);
  const solid = (y, x) => g[y] && g[y][x] && g[y][x] !== '.' && g[y][x] !== 'o';
  return g.map((r, y) => r.map((ch, x) => ch === '.' && (solid(y - 1, x) || solid(y + 1, x) || solid(y, x - 1) || solid(y, x + 1)) ? 'o' : ch).join(''));
}
const DL_SPR_CACHE = {};
function dlCowboySprite(look) {
  const key = `${look.hat}-${look.hatColor}-${look.poncho}-${look.pattern}`;
  if (DL_SPR_CACHE[key]) return DL_SPR_CACHE[key];
  const rows = DL_HAT_ROWS[look.hat].concat(DL_BODY_ROWS).map((r, y) => [...r].map((ch, x) => {
    if (ch !== 'P') return ch;
    const p = look.pattern;
    if (p === 1 && (y === 13 || y === 16)) return 'Q';
    if (p === 2 && ((y === 14 && x % 4 === 0) || (y === 15 && x % 2 === 1) || (y === 16 && x % 4 === 2))) return 'Q';
    if (p === 3 && (y === 11 || (y === 17 && x % 2 === 0))) return 'Q';
    return ch;
  }).join(''));
  const hc = DL_HAT_COLORS[look.hatColor], pc = DL_PONCHOS[look.poncho];
  return (DL_SPR_CACHE[key] = sprite(dlOutline(rows), {
    o: '#1a1c2c', H: hc[1], h: hc[2], S: '#e0a878', E: '#1a1c2c', M: '#3b2214',
    P: pc[1], Q: pc[2], B: '#29366f', K: '#3b2214', G: '#566c86'
  }));
}
const DL_ROBOT_PAL = { o: '#1a1c2c', H: '#7a4a2a', h: '#3b2214', M: '#8b9bb4', D: '#566c86', L: '#a7f070', C: '#73eff7', G: '#333c57' };
const DL_ROBOT = sprite(dlOutline(DL_ROBOT_ROWS), { ...DL_ROBOT_PAL, R: '#ff4a4a' });
const DL_ROBOT_BLINK = sprite(dlOutline(DL_ROBOT_ROWS), { ...DL_ROBOT_PAL, R: '#5d275d' });
const DL_TUMBLE = sprite([
  "..tTtTt...", ".T.t..tT..", "t..TttT.t.", "tT.t..t..T", "t.tTttTt.t",
  "T..t..tT.t", "t.T.tt..T.", ".tT.t..t..", "..tTtTtt..", "....tt...."
], { t: '#9a6a34', T: '#4e2f1c' });
const DL_CACTUS = sprite(dlOutline([
  ".....ff.....", "....cCCc....", "....cCCc....", "....cCCc..c.", ".c..cCCc.cCc", "cCc.cCCc.cCc",
  "cCc.cCCc.cCc", "cCc.cCCccCCc", "cCCccCCcCCc.", ".cCCCCCCCc..", "..cccCCc....", "....cCCc....",
  "....cCCc....", "....cCCc....", "....cCCc....", "....cCCc....", "....cCCc...."
]), { o: '#1a1c2c', c: '#1e6a3e', C: '#38b764', f: '#ef7d57' });

/* ---------- selector de sombrero y poncho ---------- */
// el: contenedor; title: texto; getLook(): apariencia actual; onChange(look) o null si solo se muestra.
function dlPicker(el, title, getLook, onChange) {
  const look = getLook();
  el.innerHTML = '';
  const t = document.createElement('p'); t.className = 'dl-pick-t'; t.textContent = title; el.appendChild(t);
  if (!look) { const m = document.createElement('p'); m.className = 'sub'; m.textContent = 'ESPERANDO…'; el.appendChild(m); return; }
  const cv = document.createElement('canvas'); cv.className = 'dl-prev';
  const spr = dlCowboySprite(look); cv.width = spr.width; cv.height = spr.height;
  cv.getContext('2d').drawImage(spr, 0, 0); el.appendChild(cv);
  DL_LOOK_FIELDS.forEach(([k, label, opts]) => {
    const row = document.createElement('div'); row.className = 'dl-opt';
    const txt = document.createElement('span'); txt.textContent = `${label}: ${opts[look[k]]}`;
    if (onChange) {
      const mk = (s, d) => {
        const b = document.createElement('button'); b.className = 'btn'; b.textContent = s;
        b.setAttribute('aria-label', `${label} ${d > 0 ? 'SIGUIENTE' : 'ANTERIOR'}`);
        b.onclick = () => { SFX.play('click'); const n = { ...getLook() }; n[k] = (n[k] + d + opts.length) % opts.length; onChange(n); };
        return b;
      };
      row.append(mk('<', -1), txt, mk('>', 1));
    } else row.append(txt);
    el.appendChild(row);
  });
}
function dlLocalPickers() {
  dlPicker($('#dl-pick-a'), 'J1 (TECLA A)', () => DL.looks.A, n => { DL.looks.A = n; store.set('dl_look', n); dlLocalPickers(); });
  dlPicker($('#dl-pick-b'), 'J2 (TECLA L)', () => DL.looks.B, n => { DL.looks.B = n; store.set('dl_look2', n); dlLocalPickers(); });
}
function dlLobbyPickers() {
  const opp = DL.me === 'A' ? 'B' : 'A', hasOpp = !!(DL.roomData && DL.roomData[opp]);
  dlPicker($('#dl-pick-me'), 'TÚ', () => DL.looks[DL.me], n => {
    DL.looks[DL.me] = n; store.set('dl_look', n); dlLobbyPickers(); dlSendLook();
  });
  dlPicker($('#dl-pick-opp'), 'RIVAL', () => hasOpp ? DL.looks[opp] : null, null);
}
// Escribe mi apariencia en la sala (con un poco de espera para no escribir en cada clic).
function dlSendLook() {
  clearTimeout(DL.lookTimer);
  DL.lookTimer = setTimeout(() => {
    if (DL.mode !== 'online' || !DL.room) return;
    fs.updateDoc(fs.doc(db, 'duelos', DL.room), { [DL.me + '.look']: dlLook(DL.looks[DL.me], DL_LOOK_DEF[DL.me]) })
      .catch(e => console.warn('No se pudo compartir la apariencia:', e));
  }, 300);
}

/* ---------- dibujo ---------- */
function dlDrawFighter(ctx, id, x, groundY, fall, tiltDir, now) {
  const img = DL.mode === 'cpu' && id === 'B'
    ? ((now % 2600) < 140 ? DL_ROBOT_BLINK : DL_ROBOT)
    : dlCowboySprite(DL.looks[id] || DL_LOOK_DEF[id]);
  const w = img.width * DL_SCALE, h = img.height * DL_SCALE;
  ctx.save();
  if (fall > 0) { ctx.translate(x, groundY); ctx.rotate(tiltDir * fall * 1.1); ctx.translate(-x, -groundY); ctx.globalAlpha = 1 - fall * .4; }
  if (id === 'B') { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(groundY - h + DL_SCALE), w, h);
  ctx.restore();
}
function dlDrawShot(ctx, W, groundY, shot) {
  const t = Math.min(1, (performance.now() - shot.start) / shot.duration);
  const shooterX = shot.winnerId === 'A' ? W * 0.26 : W * 0.74, targetX = shot.winnerId === 'A' ? W * 0.74 : W * 0.26;
  const gunY = groundY - 31, dir = shot.winnerId === 'A' ? 1 : -1;
  if (t < 0.3) {
    ctx.save(); ctx.globalAlpha = 1 - t / 0.3; ctx.fillStyle = '#fff4b0';
    ctx.beginPath(); ctx.arc(shooterX + dir * 24, gunY, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const bx = shooterX + (targetX - shooterX) * Math.min(1, t / 0.65);
  ctx.strokeStyle = 'rgba(255,244,176,.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx - (targetX - shooterX) * 0.08, gunY); ctx.lineTo(bx, gunY); ctx.stroke();
  ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(bx, gunY, 2.5, 0, Math.PI * 2); ctx.fill();
  return t;
}
// Fondo: cielo, sol que sube y baja despacio, mesetas, suelo, cactus fijo y un cactus rodante.
function dlDrawScene(ctx, W, H, groundY, now) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#f2a65a'); grad.addColorStop(.55, '#e8834f'); grad.addColorStop(1, '#c96a3e');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  const sunY = Math.round((H * 0.3 + Math.sin(now / 3200) * 10) / 2) * 2;
  pxCircle(ctx, W * 0.5, sunY, 24, 'rgba(255,235,180,.55)');
  pxCircle(ctx, W * 0.5, sunY, 19, '#ffe9b0');
  ctx.fillStyle = '#c4633c';
  ctx.fillRect(18, groundY - 34, 92, 34); ctx.fillRect(30, groundY - 44, 64, 10);
  ctx.fillRect(360, groundY - 26, 100, 26); ctx.fillRect(378, groundY - 38, 50, 12);
  ctx.fillStyle = '#b3573a'; ctx.fillRect(18, groundY - 8, 92, 8); ctx.fillRect(360, groundY - 6, 100, 6);
  ctx.fillStyle = '#8a5a3c'; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = '#6e4530'; ctx.fillRect(0, groundY, W, 4);
  ctx.fillStyle = '#7a4d33';
  for (let i = 0; i < 14; i++) ctx.fillRect((i * 67 + 13) % W, groundY + 12 + (i * 23) % (H - groundY - 16), 4 + (i % 3) * 2, 2);
  const cw = DL_CACTUS.width * DL_SCALE, ch = DL_CACTUS.height * DL_SCALE;
  ctx.drawImage(DL_CACTUS, 8, groundY + 6 - ch, cw, ch);
  // cactus rodante: cruza de izquierda a derecha a ~28 px/s, girando en pasos de 90°
  const span = W + 160, tx = ((now / 1000) * 28) % span - 60;
  const ts = DL_TUMBLE.width * DL_SCALE, bounce = Math.abs(Math.sin(now / 260)) * 7;
  ctx.save();
  ctx.translate(Math.round(tx), Math.round(groundY - ts / 2 - bounce + 2));
  ctx.rotate((Math.floor(tx / 8) % 4) * Math.PI / 2);
  ctx.drawImage(DL_TUMBLE, -ts / 2, -ts / 2, ts, ts);
  ctx.restore();
}
function dlDraw() {
  const cv = $('#dl-cv'); if (!cv || !cv.offsetParent) return;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height, groundY = Math.round(H * 0.74), now = performance.now();
  dlDrawScene(ctx, W, H, groundY, now);
  let fallA = 0, fallB = 0, shotT = 1;
  if (DL.shot) {
    shotT = Math.min(1, (now - DL.shot.start) / DL.shot.duration);
    const impact = Math.max(0, (shotT - 0.55) / 0.45);
    if (DL.shot.loserId === 'A') fallA = impact; else fallB = impact;
  }
  dlDrawFighter(ctx, 'A', W * 0.26, groundY, fallA, -1, now);
  dlDrawFighter(ctx, 'B', W * 0.74, groundY, fallB, 1, now);
  if (DL.shot && shotT < 1) dlDrawShot(ctx, W, groundY, DL.shot);
  ctx.textAlign = 'center';
  if (DL.phase === 'count') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff4e0'; ctx.font = '48px "Press Start 2P"'; ctx.fillText(String(DL.countN), W / 2, H / 2 + 16);
  } else if (DL.phase === 'go') {
    const pulse = 1 + Math.sin(now / 60) * .05;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffe14d'; ctx.font = '40px "Press Start 2P"'; ctx.fillText('¡YA!', 0, 10);
    ctx.restore();
  } else if (DL.phase === 'idle') {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff4e0'; ctx.font = '11px "Press Start 2P"'; ctx.fillText('PREPÁRATE…', W / 2, H / 2);
  }
  $('#dl-score').textContent = `${DL.names.A} ${DL.wins.A} - ${DL.wins.B} ${DL.names.B}`;
}

/* ---------- ronda (compartido CPU / local / en línea) ---------- */
function dlBeginCountdown(seq, startAt, yaAt) {
  dlClearTimers();
  DL.currentRoundSeq = seq; DL.roundActive = true; DL.phase = 'count'; DL.countN = 3; DL.yaAt = 0; DL.shot = null;
  dlMsg(''); dlDraw();
  const now = Date.now();
  dlSchedule(() => dlTick(seq, 2), startAt + DL_COUNT_STEP - now);
  dlSchedule(() => dlTick(seq, 1), startAt + DL_COUNT_STEP * 2 - now);
  dlSchedule(() => dlShowGo(seq), yaAt - now);
  if (DL.mode === 'cpu') {
    const B = DL_BOT[dlBotLvl], cpuDelay = B.min + Math.random() * (B.max - B.min);
    dlSchedule(() => dlCpuFire(seq), (yaAt - now) + cpuDelay);
  }
}
function dlTick(seq, n) { if (seq !== DL.currentRoundSeq || !DL.roundActive) return; DL.countN = n; dlDraw(); SFX.play('click'); }
function dlShowGo(seq) {
  if (seq !== DL.currentRoundSeq || !DL.roundActive) return;
  DL.phase = 'go'; DL.yaAt = performance.now(); dlDraw(); SFX.play('go');
}
function dlAfterRound(winnerId, wA, wB, msg, cls, early) {
  dlClearTimers();
  DL.roundActive = false; DL.phase = 'shot';
  if (early) { DL.shot = null; return dlFinishRound(winnerId, wA, wB, msg, cls); }
  const loserId = winnerId === 'A' ? 'B' : 'A';
  DL.shot = { winnerId, loserId, start: performance.now(), duration: 260 };
  SFX.play('boom'); dlDraw();
  dlSchedule(() => dlFinishRound(winnerId, wA, wB, msg, cls), 420);
}
function dlFinishRound(winnerId, wA, wB, msg, cls) {
  DL.wins = { A: wA, B: wB }; DL.phase = 'result';
  dlMsg(msg, cls); dlDraw();
  SFX.play(cls === 'win' ? 'win' : 'lose');
  if (wA >= DL_WINS_TO_TAKE || wB >= DL_WINS_TO_TAKE) return dlMatchOver(wA >= DL_WINS_TO_TAKE ? 'A' : 'B');
  if (DL.mode === 'cpu' || DL.mode === 'local') dlSchedule(() => dlStartRound(), 1600);
  else if (DL.mode === 'online' && DL.isHost) dlSchedule(() => dlHostNextRound(), 1600);
}
function dlMatchOver(id) {
  dlClearTimers(); DL.roundActive = false;
  const winner = id === 'A' ? DL.names.A : DL.names.B;
  $('#dl-over-t').textContent = `¡${winner} GANA EL DUELO!`;
  $('#dl-over-p').textContent = `${DL.wins.A} - ${DL.wins.B}`;
  $('#dl-over').hidden = false; $('#dl-fire').hidden = true; $('#dl-fire2').hidden = true;
  // Solo cuentan las victorias VS CPU en DIFÍCIL, como en Combate de Funciones.
  if (DL.mode === 'cpu' && id === 'A' && dlBotLvl !== 2) $('#dl-over-p').textContent += ' · LAS VICTORIAS VS CPU FÁCIL O MEDIO NO SUMAN AL TOP 10.';
  else if (DL.mode === 'cpu' && id === 'A') {
    LB.confirmar('¡GANASTE EL DUELO! ¿SUMAS ESTA VICTORIA A LA TABLA?', () => LB.increment('duelo'))
      .then(() => { if (DL.lbKey === 'duelo') dlRenderLB(); });
  }
  if ((DL.mode === 'cpu' || DL.mode === 'online') && DL.matchBestRt != null) {
    const ms = DL.matchBestRt, extra = `${dlToday()} ${DL.mode === 'cpu' ? 'CPU' : 'ONLINE'}`;
    DL.matchBestRt = null;
    LB.confirmar(`TU MEJOR REACCIÓN FUE ${ms} MS. ¿LA SUBES A LA TABLA?`, () => LB.submit('duelo_reaccion', ms, true, extra))
      .then(ok => { if (ok && DL.lbKey === 'duelo_reaccion') dlRenderLB(); });
  }
}

/* ---------- tiempo de reacción (Top 10 "duelo_reaccion") ---------- */
function dlToday() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dlBestText() {
  const b = store.get('dl_best_rt', 0);
  return b ? `TU MEJOR REACCIÓN: ${b} MS` : 'DISPARA RÁPIDO TRAS EL "¡YA!" PARA MARCAR TU REACCIÓN';
}
// Solo VS CPU y en línea, solo con disparo válido (después del "¡YA!").
function dlRecordReaction(rt) {
  if (DL.mode !== 'cpu' && DL.mode !== 'online') return;
  const ms = Math.round(rt);
  if (!Number.isFinite(ms) || ms < DL_RT_MIN || ms > DL_RT_MAX) return;
  if (DL.matchBestRt == null || ms < DL.matchBestRt) DL.matchBestRt = ms;
  const prev = store.get('dl_best_rt', 0), better = !prev || ms < prev;
  if (better) store.set('dl_best_rt', ms);
  $('#dl-best').textContent = better ? `¡NUEVA MEJOR REACCIÓN: ${ms} MS!` : dlBestText();
  // Ya no se sube sola cada ronda: se pregunta una sola vez en dlMatchOver() al terminar el duelo.
}
const DL_LB_CFG = {
  duelo: { asc: false, sub: 'DUELOS GANADOS VS CPU EN DIFÍCIL', fmt: r => `${Number(r.score) || 0}` },
  duelo_reaccion: { asc: true, sub: 'MEJOR TIEMPO DE REACCIÓN (VS CPU Y EN LÍNEA). MENOS ES MEJOR.', fmt: r => `${Number(r.score) || 0} MS` }
};
function dlDate(r) {
  const ms = tsMillis(r.ts), p = n => String(n).padStart(2, '0');
  if (ms) { const d = new Date(ms); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`; }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(r.extra || ''));
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : '';
}
// Render propio (en vez de LB.render) para mostrar también la fecha de la marca.
async function dlRenderLB() {
  const key = DL.lbKey, cfg = DL_LB_CFG[key], el = $('#dl-lb');
  document.querySelectorAll('#dl-lb-tabs .btn').forEach(b => b.classList.toggle('on', b.dataset.k === key));
  $('#dl-lb-sub').textContent = cfg.sub;
  el.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rows = await LB.top(key, cfg.asc);
  if (key !== DL.lbKey) return;
  if (!rows) { el.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  el.innerHTML = rows.length
    ? rows.map((r, i) => {
      const f = dlDate(r);
      return `<li class="${r.me ? 'me' : ''}"><span class="rk">${i + 1}.</span><span class="nm">${esc(r.name)}</span><span class="sc">${esc(cfg.fmt(r))}${f ? `<small>${esc(f)}</small>` : ''}</span></li>`;
    }).join('')
    : '<li class="muted">SIN RÉCORDS AÚN</li>';
}
document.querySelectorAll('#dl-lb-tabs .btn').forEach(b => b.onclick = () => {
  SFX.play('click'); DL.lbKey = b.dataset.k; store.set('dl_lb_tab', DL.lbKey); dlRenderLB();
});

/* ---------- disparo ---------- */
function dlHumanFire() {
  if (!DL.roundActive) return;
  if (DL.mode === 'cpu') return dlHumanFireCpu();
  if (DL.mode === 'online') return dlHumanFireOnline();
}
function dlHumanFireCpu() {
  if (DL.phase !== 'go') return dlAfterRound('B', DL.wins.A, DL.wins.B + 1, 'DISPARASTE ANTES DE TIEMPO', 'lose', true);
  const rt = performance.now() - DL.yaAt;
  dlAfterRound('A', DL.wins.A + 1, DL.wins.B, `¡GANASTE EN ${rt.toFixed(0)} MS!`, 'win', false);
  dlRecordReaction(rt);
}
function dlCpuFire(seq) {
  if (seq !== DL.currentRoundSeq || !DL.roundActive || DL.phase !== 'go') return;
  dlAfterRound('B', DL.wins.A, DL.wins.B + 1, `${DL.names.B} DISPARÓ PRIMERO`, 'lose', false);
}
function dlLocalFire(id) {
  if (DL.mode !== 'local' || !DL.roundActive) return;
  const other = id === 'A' ? 'B' : 'A';
  if (DL.phase !== 'go') {
    const wA = DL.wins.A + (other === 'A' ? 1 : 0), wB = DL.wins.B + (other === 'B' ? 1 : 0);
    return dlAfterRound(other, wA, wB, `${DL.names[id]} DISPARÓ ANTES DE TIEMPO`, 'lose', true);
  }
  const rt = performance.now() - DL.yaAt;
  const wA = DL.wins.A + (id === 'A' ? 1 : 0), wB = DL.wins.B + (id === 'B' ? 1 : 0);
  dlAfterRound(id, wA, wB, `¡${DL.names[id]} GANA EN ${rt.toFixed(0)} MS!`, 'win', false);
}
function dlHumanFireOnline() {
  const seq = DL.currentRoundSeq, early = DL.phase !== 'go';
  const rt = early ? null : performance.now() - DL.yaAt;
  DL.roundActive = false;
  dlClaim(early ? (DL.me === 'A' ? 'B' : 'A') : DL.me, seq, rt);
  if (!early) dlRecordReaction(rt);
}
async function dlClaim(winnerId, seq, rt) {
  if (!DL.room) return;
  const ref = fs.doc(db, 'duelos', DL.room);
  try {
    await fs.runTransaction(db, async tx => {
      const s = await tx.get(ref), d = s.data();
      if (!d || d.roundSeq !== seq || d.roundWinner) return;
      const wA = (d.winsA || 0) + (winnerId === 'A' ? 1 : 0), wB = (d.winsB || 0) + (winnerId === 'B' ? 1 : 0);
      tx.update(ref, { roundWinner: { id: winnerId, rt: rt || null }, winsA: wA, winsB: wB });
    });
  } catch (e) { console.warn(e); }
}

/* ---------- modos y sala en línea ---------- */
function dlStartRound() {
  const startAt = Date.now(), yaAt = startAt + DL_COUNT_STEP * 3 + DL_MIN_WAIT + Math.random() * (DL_MAX_WAIT - DL_MIN_WAIT);
  DL.roundSeqCounter++; dlBeginCountdown(DL.roundSeqCounter, startAt, yaAt);
}
function dlCpu() {
  dlLeaveOnline(true);
  DL.mode = 'cpu'; DL.me = 'A'; DL.names = { A: playerName() || 'JUGADOR 1', B: 'CPU' }; DL.wins = { A: 0, B: 0 }; DL.matchBestRt = null;
  DL.looks = { A: dlMyLook(), B: null };
  $('#dl-over').hidden = true; dlShow('game');
  DL.phase = 'idle'; dlMsg(''); $('#dl-best').textContent = dlBestText(); dlDraw();
  dlStartRound();
}
function dlLocalSetup() {
  dlLeaveOnline(true);
  DL.mode = null;
  DL.looks = { A: dlMyLook(), B: dlLook(store.get('dl_look2', null), DL_LOOK_DEF.B) };
  dlLocalPickers(); dlShow('local');
}
function dlLocalStart() {
  DL.mode = 'local'; DL.me = null; DL.names = { A: 'JUGADOR 1', B: 'JUGADOR 2' }; DL.wins = { A: 0, B: 0 };
  $('#dl-over').hidden = true; dlShow('game');
  DL.phase = 'idle'; dlMsg(''); $('#dl-best').textContent = 'J1: TECLA A · J2: TECLA L (EL TIEMPO DE REACCIÓN NO CUENTA EN ESTE MODO)'; dlDraw();
  dlStartRound();
}
async function dlCreate() {
  if (!(await fbReady)) return dlMenuMsg('SIN CONEXIÓN A FIREBASE: JUEGA VS CPU O EN 2 JUGADORES.', 'lose');
  dlLeaveOnline(true); dlMenuMsg('CREANDO SALA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'duelos', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, {
      A: { uid: UID, name: playerName(), lastSeen: fs.serverTimestamp() }, B: null,
      state: 'lobby', matchSeq: 0, winsA: 0, winsB: 0, roundSeq: 0, startAt: null, yaAt: null, roundWinner: null,
      created: fs.serverTimestamp()
    });
    DL.mode = 'online'; DL.me = 'A'; DL.isHost = true; DL.room = code;
    DL.looks = { A: dlMyLook(), B: DL_LOOK_DEF.B };
    $('#dl-room').textContent = 'SALA ' + code; dlMenuMsg('');
    dlShowLobby(); dlListen(); dlSendLook();
  } catch (e) { console.error(e); dlMenuMsg('ERROR AL CREAR SALA: ' + e.message, 'lose'); }
}
async function dlJoin() {
  const code = $('#dl-code').value.trim().toUpperCase();
  if (code.length < 5) return dlMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return dlMenuMsg('SIN CONEXIÓN A FIREBASE: JUEGA VS CPU O EN 2 JUGADORES.', 'lose');
  dlLeaveOnline(true); dlMenuMsg('ENTRANDO…');
  const ref = fs.doc(db, 'duelos', code);
  try {
    await fs.runTransaction(db, async tx => {
      const s = await tx.get(ref);
      if (!s.exists()) throw new Error('ESA SALA NO EXISTE');
      if (s.data().B) throw new Error('LA SALA ESTÁ LLENA');
      if (s.data().A.uid === UID) throw new Error('NO PUEDES UNIRTE A TU PROPIA SALA');
      tx.update(ref, { B: { uid: UID, name: playerName(), lastSeen: fs.serverTimestamp() } });
    });
    DL.mode = 'online'; DL.me = 'B'; DL.isHost = false; DL.room = code;
    DL.looks = { A: DL_LOOK_DEF.A, B: dlMyLook() };
    $('#dl-room').textContent = 'SALA ' + code; dlMenuMsg('');
    dlShowLobby(); dlListen(); dlSendLook();
  } catch (e) { dlMenuMsg(e.message, 'lose'); }
}
function dlShowLobby() { dlShow('lobby'); dlLobbyPickers(); }
function dlListen() {
  DL.unsub = fs.onSnapshot(fs.doc(db, 'duelos', DL.room), s => {
    if (!s.exists()) { dlLeaveOnline(); dlMenuMsg('LA SALA SE CERRÓ.', 'lose'); return; }
    dlOnRoom(s.data());
  });
  DL.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'duelos', DL.room), { [DL.me + '.lastSeen']: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
}
function dlOnRoom(d) {
  const oppKey = DL.me === 'A' ? 'B' : 'A', oppD = d[oppKey];
  const prevOpp = DL.roomData && DL.roomData[oppKey], prevLook = JSON.stringify(DL.looks[oppKey]);
  DL.roomData = d;
  // Solo tomo del documento la apariencia del rival; la mía la manda este equipo.
  DL.looks[oppKey] = dlLook(oppD && oppD.look, DL_LOOK_DEF[oppKey]);
  if (!$('#dl-lobby').hidden && (!!prevOpp !== !!oppD || prevLook !== JSON.stringify(DL.looks[oppKey]))) dlLobbyPickers();
  $('#dl-plist').innerHTML = ['A', 'B'].map(k => d[k] ? `<li>${esc(d[k].name)}${d[k].uid === UID ? ' (TÚ)' : ''}</li>` : '<li class="muted">ESPERANDO…</li>').join('');
  $('#dl-lobby-msg').textContent = DL.isHost ? `COMPARTE EL CÓDIGO ${DL.room}.` : 'ESPERANDO AL ANFITRIÓN…';
  $('#dl-turn').textContent = (oppD && isStale(oppD.lastSeen, Date.now())) ? 'EL RIVAL SE DESCONECTÓ' : '';
  if (typeof d.matchSeq === 'number' && d.matchSeq > 0 && d.matchSeq !== DL.appliedMatchSeq) {
    DL.appliedMatchSeq = d.matchSeq; dlEnterGame(d);
  }
  if (typeof d.roundSeq === 'number' && d.roundSeq > 0 && d.roundSeq !== DL.appliedRoundSeq && d.startAt) {
    DL.appliedRoundSeq = d.roundSeq; dlBeginCountdown(d.roundSeq, d.startAt, d.yaAt);
  }
  if (d.roundWinner && d.roundSeq !== DL.lastResultRoundSeq) {
    DL.lastResultRoundSeq = d.roundSeq;
    const winnerId = d.roundWinner.id, name = winnerId === 'A' ? DL.names.A : DL.names.B, mine = winnerId === DL.me;
    const msg = d.roundWinner.rt != null ? `${name} GANA LA RONDA (${d.roundWinner.rt.toFixed(0)} MS)` : `${name} GANA: EL RIVAL DISPARÓ ANTES DE TIEMPO`;
    dlAfterRound(winnerId, d.winsA, d.winsB, msg, mine ? 'win' : 'lose', d.roundWinner.rt == null);
  }
}
function dlEnterGame(d) {
  $('#dl-over').hidden = true; dlShow('game');
  DL.names = { A: (d.A && d.A.name) || 'JUGADOR 1', B: (d.B && d.B.name) || 'JUGADOR 2' };
  DL.wins = { A: d.winsA || 0, B: d.winsB || 0 }; DL.matchBestRt = null;
  DL.appliedRoundSeq = 0; DL.lastResultRoundSeq = -1; DL.phase = 'idle'; DL.roundActive = false;
  dlMsg(''); $('#dl-best').textContent = dlBestText(); dlDraw();
}
async function dlGo() {
  if (!DL.isHost || !DL.room) return;
  const seq = ((DL.roomData && DL.roomData.matchSeq) || 0) + 1;
  const startAt = Date.now(), yaAt = startAt + DL_COUNT_STEP * 3 + DL_MIN_WAIT + Math.random() * (DL_MAX_WAIT - DL_MIN_WAIT);
  await fs.updateDoc(fs.doc(db, 'duelos', DL.room), {
    state: 'play', matchSeq: seq, winsA: 0, winsB: 0, roundSeq: 1, startAt, yaAt, roundWinner: null
  }).catch(console.error);
}
async function dlHostNextRound() {
  if (!DL.room || !DL.roomData) return;
  const seq = (DL.roomData.roundSeq || 0) + 1;
  const startAt = Date.now(), yaAt = startAt + DL_COUNT_STEP * 3 + DL_MIN_WAIT + Math.random() * (DL_MAX_WAIT - DL_MIN_WAIT);
  await fs.updateDoc(fs.doc(db, 'duelos', DL.room), { roundSeq: seq, startAt, yaAt, roundWinner: null }).catch(() => {});
}
function dlLeaveOnline(silent) {
  dlClearTimers(); clearTimeout(DL.lookTimer);
  if (DL.unsub) { DL.unsub(); DL.unsub = null; }
  if (DL.hbStop) { DL.hbStop(); DL.hbStop = null; }
  DL.mode = null; DL.room = null; DL.isHost = false; DL.roomData = null; DL.roundActive = false;
  dlShow('menu');
  if (!silent) dlMenuMsg('');
}
function dlQuit() {
  dlClearTimers();
  if (DL.mode === 'online') dlLeaveOnline();
  else { DL.mode = null; DL.roundActive = false; dlShow('menu'); }
}
function dlAgain() {
  $('#dl-over').hidden = true;
  if (DL.mode === 'cpu' || DL.mode === 'local') { DL.wins = { A: 0, B: 0 }; dlShow('game'); dlStartRound(); }
  else if (DL.mode === 'online' && DL.isHost) dlGo();
}
function dlBotRender() {
  pickRow($('#dl-bot'), DL_BOT.map(b => ({ html: b.n })), dlBotLvl, i => { SFX.play('click'); dlBotLvl = i; store.set('pa_dl_bot', i); dlBotRender(); });
}
dlBotRender();
$('#dl-cpu').onclick = () => { SFX.play('start'); dlCpu(); };
$('#dl-local').onclick = () => { SFX.play('click'); dlLocalSetup(); };
$('#dl-local-go').onclick = () => { SFX.play('start'); dlLocalStart(); };
$('#dl-local-back').onclick = () => dlQuit();
$('#dl-create').onclick = () => { SFX.play('click'); dlCreate(); };
$('#dl-join').onclick = () => { SFX.play('click'); dlJoin(); };
$('#dl-go').onclick = () => { SFX.play('start'); dlGo(); };
$('#dl-leave').onclick = () => dlLeaveOnline();
$('#dl-quit').onclick = pedirAbandonar(dlQuit);
$('#dl-again').onclick = () => { SFX.play('start'); dlAgain(); };
$('#dl-exit').onclick = () => dlQuit();
$('#dl-fire').onclick = () => dlHumanFire();
// En 2 jugadores se dispara al tocar (pointerdown), sin esperar a soltar el dedo: es más justo.
$('#dl-fire-a').addEventListener('pointerdown', e => { e.preventDefault(); dlLocalFire('A'); });
$('#dl-fire-b').addEventListener('pointerdown', e => { e.preventDefault(); dlLocalFire('B'); });
document.addEventListener('keydown', e => {
  if (tab !== 'duelo' || DL.mode !== 'local' || e.repeat || e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyA') { e.preventDefault(); dlLocalFire('A'); }
  else if (e.code === 'KeyL') { e.preventDefault(); dlLocalFire('B'); }
});
window.addEventListener('beforeunload', () => { if (DL.mode === 'online') dlLeaveOnline(); });
DL.lbKey = DL_LB_CFG[store.get('dl_lb_tab', 'duelo')] ? store.get('dl_lb_tab', 'duelo') : 'duelo';
dlRenderLB();

// --- conexión con la página (antes en arcade.html) ---
bucle(() => dlDraw());
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); dlHumanFire(); }
});
