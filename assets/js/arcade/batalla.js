import './shell.js';
import { db, fs, UID, fbReady, $, esc, store, playerName, genCode, isStale, liveRooms, presenceLoop, SFX, LB, fitSoon, expiraEn } from './core.js';
import { pickRow } from './pagina.js';

/* =========================================================
   BATALLA NAVAL
   ========================================================= */
const SHIPS = [
  { n: 'PORTAAVIONES', l: 5 }, { n: 'ACORAZADO', l: 4 }, { n: 'CRUCERO', l: 3 },
  { n: 'SUBMARINO', l: 3 }, { n: 'DESTRUCTOR', l: 2 }
];
const BS_LVLS = ['FÁCIL', 'MEDIO', 'DIFÍCIL'];

const BS = { mode: null, phase: 'menu', me: null, room: null, unsub: null, placed: [], hor: true, hover: -1, lvl: store.get('pa_bs_lvl', 1), cpuTimer: null, submitted: false, hbStop: null, forfeitSent: false, spectating: false, specUnsub: null };
const G = { myBoard: '', oppBoard: '', myShots: [], oppShots: [], myTurn: false, winner: null, oppName: '', oppJoined: false, oppReady: false, meReady: false, oppGone: false };

function shipCells(start, len, hor) {
  const x = start % 10, y = (start / 10) | 0;
  if (hor ? x + len > 10 : y + len > 10) return null;
  const r = []; for (let k = 0; k < len; k++) r.push(hor ? start + k : start + k * 10);
  return r;
}
function occ(placed) { const b = Array(100).fill('.'); placed.forEach(p => p.cells.forEach(c => b[c] = String(p.id))); return b; }
function canPlace(placed, cells) { if (!cells) return false; const b = occ(placed); return cells.every(c => b[c] === '.'); }
function randomFleet() {
  const placed = [];
  SHIPS.forEach((s, id) => {
    for (;;) { const c = shipCells((Math.random() * 100) | 0, s.l, Math.random() < .5); if (canPlace(placed, c)) { placed.push({ id, cells: c }); break; } }
  });
  return placed;
}
const boardStr = placed => occ(placed).join('');
function allSunk(board, shots) { const s = new Set(shots); for (let i = 0; i < 100; i++) if (board[i] !== '.' && !s.has(i)) return false; return true; }
function sunkIds(board, shots) {
  const s = new Set(shots), res = new Set();
  if (!board) return res;
  for (let id = 0; id < SHIPS.length; id++) {
    let any = false, all = true;
    for (let i = 0; i < 100; i++) if (board[i] === String(id)) { any = true; if (!s.has(i)) all = false; }
    if (any && all) res.add(String(id));
  }
  return res;
}
function mkGrid(el) {
  el.innerHTML = '';
  for (let i = 0; i < 100; i++) { const d = document.createElement('div'); d.className = 'bcell'; d.dataset.i = i; el.appendChild(d); }
}
const bsMineEl = $('#bs-mine'), bsEnemyEl = $('#bs-enemy');
mkGrid(bsMineEl); mkGrid(bsEnemyEl);
const cellIdx = e => { const c = e.target.closest('.bcell'); return c ? +c.dataset.i : -1; };

bsMineEl.addEventListener('click', e => {
  const i = cellIdx(e); if (i < 0 || BS.phase !== 'place' || BS.placed.length >= SHIPS.length) return;
  const id = BS.placed.length, c = shipCells(i, SHIPS[id].l, BS.hor);
  if (canPlace(BS.placed, c)) { BS.placed.push({ id, cells: c }); SFX.play('click'); bsRender(); }
});
bsMineEl.addEventListener('mousemove', e => { const i = cellIdx(e); if (i !== BS.hover) { BS.hover = i; if (BS.phase === 'place') bsRender(); } });
bsMineEl.addEventListener('mouseleave', () => { BS.hover = -1; if (BS.phase === 'place') bsRender(); });
bsMineEl.addEventListener('contextmenu', e => { e.preventDefault(); if (BS.phase === 'place') { BS.hor = !BS.hor; bsRender(); } });
bsEnemyEl.addEventListener('click', e => { const i = cellIdx(e); if (i >= 0) bsFire(i); });

$('#bs-rot').onclick = () => { BS.hor = !BS.hor; bsRender(); };
$('#bs-rand').onclick = () => { BS.placed = randomFleet(); bsRender(); };
$('#bs-clear').onclick = () => { BS.placed = []; bsRender(); };
$('#bs-ready').onclick = bsReady;
$('#bs-leave').onclick = () => { if (BS.phase === 'over' || window.confirm('¿ABANDONAR LA PARTIDA?')) bsLeave(); }; // terminada la partida no hace falta preguntar
$('#bs-again').onclick = () => { if (BS.mode === 'cpu') bsCpu(); else bsLeave(); };
$('#bs-cpu').onclick = bsCpu;
$('#bs-create').onclick = bsCreate;
$('#bs-join').onclick = bsJoin;
$('#bs-code').addEventListener('keydown', e => { if (e.key === 'Enter') bsJoin(); });

if (![0, 1, 2].includes(BS.lvl)) BS.lvl = 1;
function bsLvlRender() { pickRow($('#bs-lvl'), BS_LVLS.map(n => ({ html: n })), BS.lvl, i => { SFX.play('click'); BS.lvl = i; store.set('pa_bs_lvl', i); bsLvlRender(); }); }
bsLvlRender();
function bsMenuMsg(t, cls = '') { const m = $('#bs-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }
function resetG() { Object.assign(G, { myBoard: '', oppBoard: '', myShots: [], oppShots: [], myTurn: false, winner: null, oppName: '', oppJoined: false, oppReady: false, meReady: false, oppGone: false }); }
function bsStartPlacing() {
  BS.placed = []; BS.hor = true; BS.phase = 'place'; BS.submitted = false;
  resetG();
  $('#bs-menu').hidden = true; $('#bs-game').hidden = false;
  $('#bs-mine-title').textContent = 'TU FLOTA'; $('#bs-place').hidden = false; $('#bs-again').hidden = true;
  bsRender(); fitSoon();
}
function bsCpu() {
  bsLeave(true);
  BS.mode = 'cpu';
  $('#bs-room').textContent = 'VS CPU';
  bsStartPlacing();
  G.oppName = 'CPU'; G.oppJoined = true;
  bsRender();
}
async function bsCreate() {
  if (!(await fbReady)) return bsMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR VS CPU.', 'lose');
  bsLeave(true);
  bsMenuMsg('CREANDO SALA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'rooms', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, {
      p1: { uid: UID, name: playerName(), ready: false, board: '' }, p2: null,
      shots_p1: [], shots_p2: [], turn: 'p1', winner: null, created: fs.serverTimestamp()
    });
    BS.mode = 'online'; BS.me = 'p1'; BS.room = code;
    $('#bs-room').textContent = 'SALA ' + code;
    bsMenuMsg('');
    bsStartPlacing(); bsListen();
  } catch (e) { console.error(e); bsMenuMsg('ERROR AL CREAR SALA: ' + e.message, 'lose'); }
}
async function bsJoin() {
  const code = $('#bs-code').value.trim().toUpperCase();
  if (code.length < 5) return bsMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return bsMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR VS CPU.', 'lose');
  bsLeave(true);
  bsMenuMsg('ENTRANDO…');
  const ref = fs.doc(db, 'rooms', code);
  try {
    await fs.runTransaction(db, async tx => {
      const s = await tx.get(ref);
      if (!s.exists()) throw new Error('ESA SALA NO EXISTE');
      if (s.data().p2) throw new Error('LA SALA ESTÁ LLENA');
      if (s.data().p1.uid === UID) throw new Error('NO PUEDES UNIRTE A TU PROPIA SALA');
      tx.update(ref, { p2: { uid: UID, name: playerName(), ready: false, board: '' } });
    });
    BS.mode = 'online'; BS.me = 'p2'; BS.room = code;
    $('#bs-room').textContent = 'SALA ' + code;
    bsMenuMsg('');
    bsStartPlacing(); bsListen();
  } catch (e) { bsMenuMsg(e.message, 'lose'); }
}
function bsListen() {
  BS.unsub = fs.onSnapshot(fs.doc(db, 'rooms', BS.room), s => {
    if (!s.exists()) { bsLeave(); bsMenuMsg('LA SALA SE CERRÓ.', 'lose'); return; }
    onRoom(s.data());
  });
  BS.forfeitSent = false;
  BS.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'rooms', BS.room), { [BS.me + '.lastSeen']: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
}
function onRoom(d) {
  const opp = BS.me === 'p1' ? 'p2' : 'p1', meD = d[BS.me] || {}, oppD = d[opp];
  G.oppJoined = !!oppD; G.oppName = oppD ? oppD.name : '';
  G.oppReady = !!(oppD && oppD.ready); G.meReady = !!meD.ready;
  G.oppBoard = (oppD && oppD.board) || '';
  G.oppGone = !!(oppD && isStale(oppD.lastSeen, Date.now()));
  const pm = G.myShots.length, po = G.oppShots.length;
  G.myShots = d['shots_' + BS.me] || []; G.oppShots = d['shots_' + opp] || [];
  if (G.myShots.length > pm && G.oppBoard) shotSound((oppD && oppD.board) || G.oppBoard, G.myShots);
  if (G.oppShots.length > po && G.myBoard) shotSound(G.myBoard, G.oppShots);
  G.myTurn = d.turn === BS.me;
  G.winner = d.winner ? (d.winner === BS.me ? 'me' : 'opp') : null;
  if (BS.phase === 'wait' && G.meReady && G.oppReady) BS.phase = 'play';
  if (!G.winner && G.oppGone && !BS.forfeitSent && (BS.phase === 'wait' || BS.phase === 'play')) {
    BS.forfeitSent = true;
    fs.updateDoc(fs.doc(db, 'rooms', BS.room), { winner: BS.me, forfeit: true }).catch(() => { BS.forfeitSent = false; });
  }
  if (G.winner && BS.phase !== 'over') { BS.phase = 'over'; G.forfeitWin = !!d.forfeit; if (G.winner === 'me') bsWin(); else setTimeout(() => SFX.play('lose'), 500); }
  bsRender();
}
function bsLeave(silent) {
  if (BS.unsub) { BS.unsub(); BS.unsub = null; }
  if (BS.hbStop) { BS.hbStop(); BS.hbStop = null; }
  bsSpecStop();
  clearTimeout(BS.cpuTimer);
  BS.mode = null; BS.phase = 'menu'; BS.room = null; BS.me = null;
  $('#bs-menu').hidden = false; $('#bs-game').hidden = true;
  if (!silent) bsMenuMsg('');
}
async function bsReady() {
  if (BS.placed.length < SHIPS.length) return;
  G.myBoard = boardStr(BS.placed);
  if (BS.mode === 'cpu') {
    G.oppBoard = boardStr(randomFleet());
    G.myShots = []; G.oppShots = []; G.myTurn = true; G.winner = null;
    BS.phase = 'play'; bsRender();
  } else {
    BS.phase = 'wait'; bsRender();
    try {
      await fs.updateDoc(fs.doc(db, 'rooms', BS.room), { [BS.me + '.board']: G.myBoard, [BS.me + '.ready']: true });
    } catch (e) { console.error(e); BS.phase = 'place'; bsRender(); }
  }
}
async function bsFire(i) {
  if (BS.phase !== 'play' || !G.myTurn || G.winner || G.myShots.includes(i)) return;
  const hit = G.oppBoard[i] !== '.';
  if (BS.mode === 'cpu') {
    G.myShots.push(i);
    shotSound(G.oppBoard, G.myShots);
    if (allSunk(G.oppBoard, G.myShots)) { G.winner = 'me'; BS.phase = 'over'; bsWin(); }
    else if (!hit) { G.myTurn = false; BS.cpuTimer = setTimeout(cpuShoot, 700); }
    bsRender();
  } else {
    G.myTurn = false; bsRender();
    const opp = BS.me === 'p1' ? 'p2' : 'p1', win = allSunk(G.oppBoard, [...G.myShots, i]);
    try {
      await fs.updateDoc(fs.doc(db, 'rooms', BS.room), {
        ['shots_' + BS.me]: fs.arrayUnion(i),
        turn: hit && !win ? BS.me : opp,
        winner: win ? BS.me : null
      });
    } catch (e) { console.error(e); G.myTurn = true; bsRender(); }
  }
}
/* Dificultad del bot (0 FÁCIL, 1 MEDIO, 2 DIFÍCIL): FÁCIL solo dispara al azar; MEDIO caza en tablero
   de ajedrez y, tras un acierto, remata (si ya hay 2 aciertos seguidos, solo sigue esa línea); DIFÍCIL
   remata igual pero caza donde caben más posiciones de los barcos que aún flotan.
   Sin estado: todo se deduce del tablero y los tiros, así un barco hundido deja de ser objetivo solo. */
function cpuPick(board, shots, lvl) {
  const shot = new Set(shots), sunk = sunkIds(board, shots), free = k => k >= 0 && k < 100 && !shot.has(k);
  const all = []; for (let k = 0; k < 100; k++) if (free(k)) all.push(k);
  const rnd = a => a[(Math.random() * a.length) | 0];
  if (lvl === 0) return rnd(all);
  const hits = new Set(shots.filter(k => board[k] !== '.' && !sunk.has(board[k])));
  if (hits.size) {
    const line = [], near = [];
    const at = (x, y) => x >= 0 && x < 10 && y >= 0 && y < 10 ? y * 10 + x : -1; // -1 = fuera del tablero
    hits.forEach(h => [[1, 0], [0, 1]].forEach(([dx, dy]) => {
      const x = h % 10, y = (h / 10) | 0;
      if (!hits.has(at(x + dx, y + dy))) return; // h y su vecino forman una línea
      let n = 0; while (hits.has(at(x - n * dx, y - n * dy))) n++; // retrocede hasta el extremo
      let m = 0; while (hits.has(at(x + m * dx, y + m * dy))) m++; // avanza hasta el otro
      [at(x - n * dx, y - n * dy), at(x + m * dx, y + m * dy)].forEach(k => { if (k >= 0 && free(k)) line.push(k); });
    }));
    if (line.length) return rnd(line);
    hits.forEach(h => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const X = h % 10 + dx, Y = ((h / 10) | 0) + dy;
      if (X >= 0 && X < 10 && Y >= 0 && Y < 10 && free(Y * 10 + X)) near.push(Y * 10 + X);
    }));
    if (near.length) return rnd(near);
  }
  if (lvl === 2) {
    const w = Array(100).fill(0);
    SHIPS.forEach((sh, id) => { if (sunk.has(String(id))) return;
      for (let st = 0; st < 100; st++) [true, false].forEach(hor => {
        const c = shipCells(st, sh.l, hor); if (c && c.every(free)) c.forEach(k => w[k]++);
      });
    });
    const m = Math.max(...all.map(k => w[k]));
    return rnd(all.filter(k => w[k] === m));
  }
  const par = all.filter(k => (k % 10 + ((k / 10) | 0)) % 2 === 0);
  return rnd(par.length ? par : all);
}
function cpuShoot() {
  if (BS.mode !== 'cpu' || BS.phase !== 'play') return;
  const i = cpuPick(G.myBoard, G.oppShots, BS.lvl);
  const hit = G.myBoard[i] !== '.';
  G.oppShots.push(i);
  shotSound(G.myBoard, G.oppShots);
  if (allSunk(G.myBoard, G.oppShots)) { G.winner = 'opp'; BS.phase = 'over'; setTimeout(() => SFX.play('lose'), 500); }
  else if (hit) BS.cpuTimer = setTimeout(cpuShoot, 650);
  else G.myTurn = true;
  bsRender();
}
function shotSound(board, shots) {
  if (!board || !shots.length) return;
  const last = shots[shots.length - 1];
  if (board[last] === '.') return SFX.play('splash');
  SFX.play(sunkIds(board, shots).size > sunkIds(board, shots.slice(0, -1)).size ? 'sunk' : 'hitship');
}
function bsWin() {
  if (BS.submitted) return;
  BS.submitted = true;
  setTimeout(() => SFX.play('win'), 500);
  // VS CPU solo cuentan las victorias en DIFÍCIL (como Combate de Funciones); en línea cuenta siempre.
  if (BS.mode === 'cpu' && BS.lvl !== 2) return;
  { const tiros = Math.max(17, G.myShots.length), modo = BS.mode === 'cpu' ? 'VS CPU DIFÍCIL' : 'ONLINE';
    LB.confirmar(`¡GANASTE EN ${tiros} TIROS! ¿LO SUBES A LA TABLA?`, () => LB.submit('batalla', tiros, true, modo)).then(bsLB); }
}
function bsLB() {
  LB.render($('#bs-lb'), 'batalla', true, r => `${r.score} TIROS${r.extra ? `<small>${esc(r.extra)}</small>` : ''}`);
}
function bsStatus(t, cls = 'big') { const s = $('#bs-status'); s.textContent = t; s.className = 'msg ' + cls; }
function bsRender() {
  const placing = BS.phase === 'place';
  const myStr = placing || !G.myBoard ? occ(BS.placed).join('') : G.myBoard;
  let prev = null, ok = false;
  if (placing && BS.hover >= 0 && BS.placed.length < SHIPS.length) {
    prev = shipCells(BS.hover, SHIPS[BS.placed.length].l, BS.hor);
    ok = canPlace(BS.placed, prev);
    if (!prev) prev = [BS.hover];
  }
  const os = new Set(G.oppShots), mySunk = sunkIds(myStr, G.oppShots), mc = bsMineEl.children;
  for (let i = 0; i < 100; i++) {
    let c = 'bcell';
    if (myStr[i] !== '.') { c += ' ship'; if (mySunk.has(myStr[i])) c += ' sunk'; }
    if (os.has(i)) c += myStr[i] !== '.' ? ' hit' : ' miss';
    if (prev && prev.includes(i)) c += ok ? ' prev' : ' bad';
    mc[i].className = c;
  }
  const ms = new Set(G.myShots), ob = G.oppBoard, enSunk = sunkIds(ob, G.myShots), ec = bsEnemyEl.children;
  const canAim = BS.phase === 'play' && G.myTurn && !G.winner;
  for (let i = 0; i < 100; i++) {
    let c = 'bcell';
    const ship = ob && ob[i] !== '.';
    if (ms.has(i)) { c += ship ? ' hit' : ' miss'; if (ship && enSunk.has(ob[i])) c += ' sunk'; }
    else if (BS.phase === 'over' && ship) c += ' ship reveal';
    else if (canAim) c += ' aim';
    ec[i].className = c;
  }
  bsEnemyEl.classList.toggle('dim', BS.phase === 'place' || BS.phase === 'wait');
  $('#bs-en-title').textContent = G.oppName ? 'ENEMIGO: ' + G.oppName : 'ENEMIGO';
  if (placing || BS.phase === 'wait') {
    $('#bs-fleet-title').textContent = 'TUS BARCOS';
    $('#bs-fleet').innerHTML = SHIPS.map((s, id) =>
      `<li class="${id < BS.placed.length ? 'done' : (id === BS.placed.length && placing ? 'cur' : '')}"><i style="width:${s.l * 6}px"></i>${s.n}</li>`).join('');
  } else {
    $('#bs-fleet-title').textContent = 'FLOTA ENEMIGA';
    $('#bs-fleet').innerHTML = SHIPS.map((s, id) =>
      `<li class="${enSunk.has(String(id)) ? 'sunk' : ''}"><i style="width:${s.l * 6}px"></i>${s.n}</li>`).join('');
  }
  $('#bs-place').hidden = !placing;
  $('#bs-ready').disabled = BS.placed.length < SHIPS.length;
  $('#bs-again').hidden = BS.phase !== 'over';
  if (placing) {
    if (BS.placed.length < SHIPS.length) {
      const s = SHIPS[BS.placed.length];
      bsStatus(`COLOCA TU ${s.n} (${s.l}) · ${BS.hor ? 'HORIZONTAL' : 'VERTICAL'}`);
    } else bsStatus('¡FLOTA LISTA! PULSA ¡LISTO!');
    if (BS.mode === 'online' && !G.oppJoined) $('#bs-status').textContent += ` · CÓDIGO: ${BS.room}`;
  } else if (BS.phase === 'wait') {
    bsStatus(G.oppJoined ? `ESPERANDO A QUE ${G.oppName} COLOQUE SU FLOTA…` : `COMPARTE EL CÓDIGO ${BS.room} CON TU RIVAL…`);
  } else if (BS.phase === 'play') {
    bsStatus(G.myTurn ? '¡TU TURNO! DISPARA AL TABLERO ENEMIGO' : `TURNO DE ${G.oppName || 'RIVAL'}…`);
  } else if (BS.phase === 'over') {
    if (G.winner === 'me') bsStatus(`¡VICTORIA${G.forfeitWin ? ' POR DESCONEXIÓN DEL RIVAL' : ` EN ${G.myShots.length} DISPAROS`}!${BS.mode === 'cpu' && BS.lvl !== 2 ? ' (FÁCIL O MEDIO NO SUMAN AL TOP 10)' : ''}`, 'big win');
    else bsStatus(`DERROTA… ${G.oppName} HUNDIÓ TU FLOTA`, 'big lose');
  }
  if (BS.mode === 'online' && G.oppGone && BS.phase !== 'over') {
    $('#bs-status').innerHTML += `<br><span class="discon">⚠ ${esc(G.oppName || 'TU RIVAL')} SE DESCONECTÓ…</span>`;
  }
}
bsLB();

/* ---- espectador ---- */
function bsSpecStop() {
  if (BS.specUnsub) { BS.specUnsub(); BS.specUnsub = null; }
  BS.spectating = false;
}
async function bsSpecOpen(code) {
  bsLeave(true);
  BS.spectating = true; BS.mode = 'spectate'; BS.phase = 'spectate'; BS.room = code;
  $('#bs-spec-list').hidden = true;
  $('#bs-room').textContent = '👁 ESPECTADOR · SALA ' + code;
  $('#bs-menu').hidden = true; $('#bs-game').hidden = false;
  $('#bs-place').hidden = true; $('#bs-again').hidden = true;
  BS.specUnsub = fs.onSnapshot(fs.doc(db, 'rooms', code), s => {
    if (!s.exists()) { bsMenuMsg('LA SALA SE CERRÓ.', 'lose'); bsLeave(); return; }
    bsSpecRender(s.data());
  });
  fitSoon();
}
function bsSpecRender(d) {
  const p1 = d.p1 || {}, p2 = d.p2;
  const b1 = p1.board || '', b2 = (p2 && p2.board) || '';
  const s1 = d.shots_p1 || [], s2 = d.shots_p2 || [];
  $('#bs-mine-title').textContent = p1.name ? `FLOTA DE ${esc(p1.name)}` : 'FLOTA J1';
  $('#bs-en-title').textContent = p2 ? `FLOTA DE ${esc(p2.name)}` : 'ESPERANDO RIVAL…';
  const sunk1 = sunkIds(b1, s2), mc = bsMineEl.children, os2 = new Set(s2);
  for (let i = 0; i < 100; i++) {
    let c = 'bcell';
    if (b1[i] && b1[i] !== '.') { c += ' ship'; if (sunk1.has(b1[i])) c += ' sunk'; }
    if (os2.has(i)) c += (b1[i] && b1[i] !== '.') ? ' hit' : ' miss';
    mc[i].className = c;
  }
  const sunk2 = sunkIds(b2, s1), ec = bsEnemyEl.children, os1 = new Set(s1);
  for (let i = 0; i < 100; i++) {
    let c = 'bcell';
    if (b2[i] && b2[i] !== '.') { c += ' ship'; if (sunk2.has(b2[i])) c += ' sunk'; }
    if (os1.has(i)) c += (b2[i] && b2[i] !== '.') ? ' hit' : ' miss';
    ec[i].className = c;
  }
  bsEnemyEl.classList.remove('dim');
  $('#bs-fleet-title').textContent = 'FLOTA DE ' + (p2 ? esc(p2.name) : '???');
  $('#bs-fleet').innerHTML = SHIPS.map((s, id) => `<li class="${sunk2.has(String(id)) ? 'sunk' : ''}"><i style="width:${s.l * 6}px"></i>${s.n}</li>`).join('');
  let status;
  if (!p2) status = `ESPERANDO RIVAL… SALA ${BS.room}`;
  else if (d.winner) status = `¡${esc((d.winner === 'p1' ? p1.name : p2.name) || '???')} GANÓ!${d.forfeit ? ' (DESCONEXIÓN)' : ''}`;
  else status = `TURNO DE ${esc((d.turn === 'p1' ? p1.name : (p2 && p2.name)) || '???')}`;
  const now = Date.now();
  if (isStale(p1.lastSeen, now)) status += ` · ⚠ ${esc(p1.name || 'J1')} DESCONECTADO`;
  if (p2 && isStale(p2.lastSeen, now)) status += ` · ⚠ ${esc(p2.name || 'J2')} DESCONECTADO`;
  bsStatus(status);
}
$('#bs-spec-btn').onclick = async () => {
  const list = $('#bs-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('rooms');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const active = rooms.filter(r => r.data.p1 && r.data.p2 && !r.data.winner);
  list.innerHTML = active.length
    ? active.map(r => `<li><span><b>${esc(r.data.p1.name)}</b> VS <b>${esc(r.data.p2.name)}</b><small>SALA ${r.code}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY PARTIDAS EN VIVO AHORA</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); bsSpecOpen(b.dataset.code); });
};
window.addEventListener('beforeunload', () => { if (BS.mode === 'online') bsLeave(true); });

// --- conexión con la página (antes en arcade.html) ---
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.key === 'r' || e.key === 'R') && BS.phase === 'place') { BS.hor = !BS.hor; bsRender(); }
});
