// TETRIS del Arcade AEMATEC (tetris.html): pantalla, teclado/táctil, sonido y partidas 1 contra 1 en línea.
// Las reglas están en tetris-motor.js (probadas con tests/tetris.test.js). Usa core.js para Firebase (proyecto
// arcade-matec), apodo, sonido, tabla de puntajes y salas, igual que el resto del Arcade.
//
// Salas en línea: colección `tetris/{sala}` ({host, hostName, state: lobby|playing, round, seed, created, expiraEn,
// lastSeen}) y `tetris/{sala}/players/{uid}` ({name, round, alive, board, score, lines, sent, lastSeen}). Cada quien
// escribe SOLO su documento; la "basura" se manda como un total (`sent`) que el rival lee. Reglas: arcade-firebase/firestore.rules.
import { $, esc, store, SFX, LB, setUpdateMenuMusicHook, fbReady, db, fs, UID, genCode, presenceLoop, expiraEn, liveRooms, playerName, nameMissing, isStale } from './core.js';
import { MUSIC, setMusicToggleHook } from './musica.js';
import { Partida, COLS, ROWS, TIPOS, celdas, serializar, deserializar } from './tetris-motor.js';

const COLORES = { 0: null, 1: '#73eff7', 2: '#ffcd75', 3: '#b55fd0', 4: '#38b764', 5: '#b13e53', 6: '#3b5dc9', 7: '#ef7d57', 8: '#566c86' };
const TIPO_COLOR = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };
const VISTAS = { menu: 'tt-menu', sala: 'tt-lobby', juego: 'tt-game' };
const vista = nombre => Object.entries(VISTAS).forEach(([v, id]) => { $('#' + id).hidden = v !== nombre; });
const aleatorio = () => (Math.random() * 2 ** 31) | 0;
$('#arcade-volver').onclick = () => { if (window.arcadeTransition) window.arcadeTransition('arcade.html'); else location.href = 'arcade.html'; };

/* ---------- dibujo ---------- */
function celda(ctx, x, y, s, codigo, alfa = 1) {
  const c = COLORES[codigo]; if (!c) return;
  ctx.globalAlpha = alfa;
  ctx.fillStyle = c; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, s, Math.max(1, s / 8)); ctx.fillRect(x, y, Math.max(1, s / 8), s);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + s - Math.max(1, s / 8), s, Math.max(1, s / 8)); ctx.fillRect(x + s - Math.max(1, s / 8), y, Math.max(1, s / 8), s);
  ctx.globalAlpha = 1;
}
function rejilla(ctx, s) {
  ctx.fillStyle = '#0b0c18'; ctx.fillRect(0, 0, COLS * s, ROWS * s);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let x = 1; x < COLS; x++) ctx.fillRect(x * s, 0, 1, ROWS * s);
  for (let y = 1; y < ROWS; y++) ctx.fillRect(0, y * s, COLS * s, 1);
}
function dibujarTablero(ctx, p, s = 24) {
  rejilla(ctx, s);
  p.tab.forEach((fila, y) => fila.forEach((c, x) => celda(ctx, x * s, y * s, s, c)));
  if (!p.vivo) return;
  const gy = p.fantasma(), cod = TIPO_COLOR[p.pieza.tipo];
  celdas(p.pieza.tipo, p.pieza.rot).forEach(([cx, cy]) => { if (gy + cy >= 0) celda(ctx, (p.pieza.x + cx) * s, (gy + cy) * s, s, cod, 0.25); });
  celdas(p.pieza.tipo, p.pieza.rot).forEach(([cx, cy]) => { if (p.pieza.y + cy >= 0) celda(ctx, (p.pieza.x + cx) * s, (p.pieza.y + cy) * s, s, cod); });
}
function dibujarMini(ctx, tipos, ancho, alto, s = 12) {
  ctx.fillStyle = '#0b0c18'; ctx.fillRect(0, 0, ancho, alto);
  tipos.forEach((t, i) => {
    if (!t) return;
    const cs = celdas(t, 0), minX = Math.min(...cs.map(c => c[0])), maxX = Math.max(...cs.map(c => c[0])), minY = Math.min(...cs.map(c => c[1]));
    const ox = Math.round((ancho - (maxX - minX + 1) * s) / 2), oy = 6 + i * (s * 3 + 4);
    cs.forEach(([cx, cy]) => celda(ctx, ox + (cx - minX) * s, oy + (cy - minY) * s, s, TIPO_COLOR[t]));
  });
}
const cvJuego = $('#tt-cv'), ctx = cvJuego.getContext('2d');
const ctxHold = $('#tt-hold').getContext('2d'), ctxNext = $('#tt-next').getContext('2d'), ctxRival = $('#tt-cv-rival').getContext('2d');
[ctx, ctxHold, ctxNext, ctxRival].forEach(c => { c.imageSmoothingEnabled = false; });

/* ---------- sonido y música (sintetizados) ---------- */
const snd = fn => { if (!SFX.on) return; SFX.init(); if (SFX.ctx) fn(); };
const SON = {
  mover: () => snd(() => SFX.tone(220, .03, 'square', .025)),
  girar: () => snd(() => SFX.tone(520, .05, 'square', .04)),
  fijar: () => snd(() => SFX.noise(.07, .09, 500)),
  lineas: n => snd(() => (n >= 4 ? SFX.seq([523, 659, 784, 1047, 1319], .06) : SFX.seq([660, 880, 1100].slice(0, Math.max(1, n)), .07))),
  nivel: () => snd(() => SFX.seq([784, 988, 1175, 1568], .07)),
  basura: () => snd(() => { SFX.noise(.25, .18, 250); SFX.tone(110, .2, 'sawtooth', .06, -40); }),
  perder: () => snd(() => SFX.seq([392, 330, 262, 196], .16, 'triangle', .1)),
  ganar: () => snd(() => SFX.seq([523, 659, 784, 1047, 0, 784, 1047], .1)),
  cuenta: () => snd(() => SFX.tone(440, .12, 'square', .07)),
  ya: () => snd(() => SFX.tone(880, .3, 'square', .08))
};
// La música es la del resto del Arcade (assets/js/arcade/musica/tetris.js, con el botón ♪ del encabezado).

/* ---------- entrada: teclado y botones táctiles ---------- */
const entrada = { izq: false, der: false, abajo: false };
let das = { dir: 0, espera: 0, rep: 0 };
function pulsar(k, abajo) {
  if (!juego || juego.pausa || juego.cuenta > 0 || juego.fin) return;
  const p = juego.p;
  if (k === 'izq' || k === 'der') {
    entrada[k] = abajo;
    if (abajo) { const d = k === 'izq' ? -1 : 1; if (p.mover(d)) SON.mover(); das = { dir: d, espera: 0.16, rep: 0 }; }
    else das = entrada.izq ? { dir: -1, espera: .16, rep: 0 } : entrada.der ? { dir: 1, espera: .16, rep: 0 } : { dir: 0, espera: 0, rep: 0 };
  } else if (k === 'abajo') p.bajando = abajo;
  else if (!abajo) return;
  else if (k === 'giro') { if (p.girar(1)) SON.girar(); }
  else if (k === 'giro2') { if (p.girar(-1)) SON.girar(); }
  else if (k === 'caer') { p.caer(); despuesDeFijar(); }
  else if (k === 'hold') { if (p.guardar()) SON.girar(); }
}
const TECLAS = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowDown: 'abajo', KeyS: 'abajo', ArrowUp: 'giro', KeyX: 'giro', KeyW: 'giro', KeyZ: 'giro2', Space: 'caer', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold' };
window.addEventListener('keydown', e => {
  if ($('#tt-game').hidden || e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyP' || e.code === 'Escape') { if (!e.repeat) alternarPausa(); return; }
  const k = TECLAS[e.code]; if (!k) return;
  e.preventDefault();
  if (!e.repeat) pulsar(k, true);
});
window.addEventListener('keyup', e => { const k = TECLAS[e.code]; if (k === 'izq' || k === 'der' || k === 'abajo') pulsar(k, false); });
document.querySelectorAll('.tt-botones [data-k]').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); pulsar(k, true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (k === 'izq' || k === 'der' || k === 'abajo') pulsar(k, false); }));
});

/* ---------- partida ---------- */
let juego = null; // { p, online, ronda, pausa, cuenta, fin, t0, ultimoEnvio, ... }
const enPartida = () => Boolean(juego && !juego.fin);

function empezar({ semilla, online = false, ronda = 0 }) {
  juego = { p: new Partida(semilla), online, ronda, pausa: false, cuenta: online ? 3 : 0, fin: false, ultimaEscritura: 0, sucio: true, tick: performance.now(), rival: null, viRival: false };
  entrada.izq = entrada.der = entrada.abajo = false; das = { dir: 0, espera: 0, rep: 0 };
  vista('juego');
  $('#tt-rival').hidden = !online;
  $('#tt-pause').hidden = online;
  $('#tt-status').textContent = online ? 'EN LÍNEA 1 vs 1' : 'MODO SOLO';
  cartel(null);
  if (online) {
    juego.cuenta = 3.2; // 3, 2, 1, ¡YA!
    SON.cuenta();
    escribirYo(true);
  } else { SON.cuenta(); }
  actualizarHud();
  requestAnimationFrame(bucle);
}
function cartel(titulo, texto = '', botones = []) {
  const o = $('#tt-over');
  o.hidden = !titulo;
  if (!titulo) return;
  $('#tt-over-t').textContent = titulo;
  $('#tt-over-p').textContent = texto;
  const fila = $('#tt-over-b');
  fila.replaceChildren();
  botones.forEach(([t, clase, fn]) => { const x = document.createElement('button'); x.className = 'btn ' + clase; x.type = 'button'; x.textContent = t; x.onclick = fn; fila.appendChild(x); });
}
function actualizarHud() {
  const p = juego.p;
  $('#tt-puntos').textContent = p.puntos; $('#tt-nivel').textContent = p.nivel; $('#tt-lineas').textContent = p.lineas;
  dibujarMini(ctxHold, [p.guardada], 64, 64, 12);
  dibujarMini(ctxNext, p.cola.slice(0, 3), 64, 176, 12);
  $('#tt-basura').textContent = juego.online && p.pendiente > 0 ? `BASURA ▲${p.pendiente}` : '';
}
function despuesDeFijar() {
  const p = juego.p, u = p.ultimo;
  if (!u) return;
  p.ultimo = null;
  SON.fijar();
  if (u.lineas) SON.lineas(u.lineas);
  if (u.nivelSubio) SON.nivel();
  if (u.recibe) SON.basura();
  juego.sucio = true;
  actualizarHud();
}
function bucle(ahora) {
  if (!juego || juego.fin) return;
  const dt = Math.min(0.1, (ahora - juego.tick) / 1000); juego.tick = ahora;
  const p = juego.p;
  if (juego.cuenta > 0) {
    const antes = Math.ceil(juego.cuenta);
    juego.cuenta -= dt;
    const n = Math.ceil(juego.cuenta);
    if (juego.cuenta > 0 && n < antes && n > 0) SON.cuenta();
    cartel(juego.cuenta > 0.2 ? String(Math.min(3, n)) : null);
    if (juego.cuenta <= 0) { cartel(null); SON.ya(); }
  } else if (!juego.pausa) {
    // repetición automática de ← → (DAS): primero espera, luego avanza cada 40 ms
    if (das.dir && (entrada.izq || entrada.der)) {
      das.espera -= dt;
      while (das.espera <= 0) { if (p.mover(das.dir)) SON.mover(); das.espera += 0.04; }
    }
    const bloques = p.cola.join() + p.pieza.tipo + p.puntos;
    p.tick(dt);
    if (p.cola.join() + p.pieza.tipo + p.puntos !== bloques || p.ultimo) { despuesDeFijar(); }
    if (juego.online) revisarRival(p);
    if (!p.vivo) return terminar(false);
  }
  dibujarTablero(ctx, p);
  if (juego.online) {
    $('#tt-rival').hidden = false;
    if (juego.rival && juego.rival.board) { const tr = deserializar(juego.rival.board); rejilla(ctxRival, 12); tr.forEach((f, y) => f.forEach((c, x) => celda(ctxRival, x * 12, y * 12, 12, c))); }
    else rejilla(ctxRival, 12);
    escribirYo(false);
  }
  if (juego && !juego.fin) requestAnimationFrame(bucle);
}
function alternarPausa() {
  if (!juego || juego.online || juego.fin || juego.cuenta > 0) return;
  juego.pausa = !juego.pausa;
  $('#tt-pause').textContent = juego.pausa ? 'SEGUIR' : 'PAUSA';
  cartel(juego.pausa ? 'PAUSA' : null, 'P PARA SEGUIR');
  if (!juego.pausa) juego.tick = performance.now();
}
$('#tt-pause').onclick = alternarPausa;

/* ---------- fin de la partida ---------- */
function terminar(gano, motivo = '') {
  if (!juego || juego.fin) return;
  juego.fin = true;
  const p = juego.p, online = juego.online;
  dibujarTablero(ctx, p);
  if (online) {
    escribirYo(true, !gano ? false : undefined);
    (gano ? SON.ganar : SON.perder)();
    const botones = [['SALIR A LA SALA', 'gray', () => volverALaSala()]];
    if (esAnfitrion()) botones.unshift(['REVANCHA', 'green', () => anfitrionReinicia()]);
    cartel(gano ? '¡GANASTE!' : 'PERDISTE', `${motivo} · ${p.puntos} PUNTOS · ${p.lineas} LÍNEAS${esAnfitrion() ? '' : ' · ESPERA LA REVANCHA DEL ANFITRIÓN…'}`, botones);
    if (gano) LB.confirmar('¿SUBES TU VICTORIA EN LÍNEA?', () => LB.increment('tetris_vs', 'ONLINE')).then(() => cargarTablas());
  } else {
    SON.perder();
    cartel('FIN DEL JUEGO', `${p.puntos} PUNTOS · ${p.lineas} LÍNEAS · NIVEL ${p.nivel}`,
      [['OTRA VEZ', 'green', () => empezar({ semilla: aleatorio() })], ['MENÚ', 'gray', () => { vista('menu'); cartel(null); }]]);
    if (p.puntos > 0) LB.confirmar(`PUNTAJE: ${p.puntos}. ¿LO SUBES A LA TABLA?`, () => LB.submit('tetris', p.puntos, false, `${p.lineas} LÍN · NIV ${p.nivel}`)).then(() => cargarTablas());
  }
}
$('#tt-quit').onclick = () => {
  if (!juego || juego.fin) { if (sala) volverALaSala(); else vista('menu'); return; }
  if (!confirm('¿Abandonar la partida?')) return;
  if (juego.online) { juego.p.vivo = false; terminar(false, 'ABANDONASTE'); volverALaSala(); }
  else { juego.fin = true; vista('menu'); cartel(null); }
};

/* ---------- tablas ---------- */
function cargarTablas() {
  LB.render($('#tt-lb'), 'tetris', false, r => `${r.score} PTS<small>${esc(r.extra || '')}</small>`);
  LB.render($('#tt-lb-vs'), 'tetris_vs', false, r => `${r.score} V`);
}

/* ---------- salas en línea ---------- */
let sala = null; // { code, host, unsubs: [], datos, jugadores: {uid: data}, ronda, parar }
const esAnfitrion = () => Boolean(sala && sala.datos && sala.datos.host === UID);
const refSala = code => fs.doc(db, 'tetris', code);
const refYo = code => fs.doc(db, 'tetris', code, 'players', UID);
const mensaje = (id, texto) => { $(id).textContent = texto; };

async function requiereNombreYRed(idMsg) {
  if (!$('#name').value.trim()) { nameMissing(); return false; }
  if (!(await fbReady)) { mensaje(idMsg, 'SIN CONEXIÓN: EL MODO EN LÍNEA NO ESTÁ DISPONIBLE.'); return false; }
  return true;
}
async function crearSala() {
  if (!(await requiereNombreYRed('#tt-menu-msg'))) return;
  const code = genCode(), nombre = playerName();
  try {
    await fs.setDoc(refSala(code), { host: UID, hostName: nombre, state: 'lobby', round: 0, seed: aleatorio(), created: fs.serverTimestamp(), lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() });
    await fs.setDoc(refYo(code), { name: nombre, round: 0, alive: true, board: '', score: 0, lines: 0, sent: 0, lastSeen: fs.serverTimestamp() });
    entrarEnSala(code);
  } catch (e) { console.warn(e); mensaje('#tt-menu-msg', 'NO SE PUDO CREAR LA SALA. ¿ESTÁN ACTUALIZADAS LAS REGLAS DE FIREBASE?'); }
}
async function unirse(codigo) {
  const code = (codigo || $('#tt-code').value).trim().toUpperCase();
  if (!(await requiereNombreYRed('#tt-menu-msg'))) return;
  if (code.length < 4) { mensaje('#tt-menu-msg', 'ESCRIBE EL CÓDIGO DE LA SALA.'); return; }
  try {
    const snap = await fs.getDoc(refSala(code));
    if (!snap.exists()) { mensaje('#tt-menu-msg', 'ESA SALA NO EXISTE.'); return; }
    const datos = snap.data();
    if (datos.state !== 'lobby' && datos.host !== UID) { mensaje('#tt-menu-msg', 'LA PARTIDA YA EMPEZÓ.'); return; }
    const jugs = await fs.getDocs(fs.collection(db, 'tetris', code, 'players'));
    if (jugs.docs.length >= 2 && !jugs.docs.some(d => d.id === UID)) { mensaje('#tt-menu-msg', 'LA SALA ESTÁ LLENA.'); return; }
    await fs.setDoc(refYo(code), { name: playerName(), round: datos.round || 0, alive: true, board: '', score: 0, lines: 0, sent: 0, lastSeen: fs.serverTimestamp() });
    entrarEnSala(code);
  } catch (e) { console.warn(e); mensaje('#tt-menu-msg', 'NO SE PUDO ENTRAR A LA SALA.'); }
}
function entrarEnSala(code) {
  salirListeners();
  sala = { code, datos: null, jugadores: {}, ronda: -1, unsubs: [], parar: null };
  mensaje('#tt-menu-msg', '');
  $('#tt-room').textContent = 'SALA ' + code; $('#tt-room2').textContent = 'SALA ' + code; $('#tt-room2').hidden = false;
  vista('sala');
  sala.unsubs.push(fs.onSnapshot(refSala(code), snap => {
    if (!snap.exists()) { mensaje('#tt-menu-msg', 'LA SALA SE CERRÓ.'); cerrarLocal(); return; }
    sala.datos = snap.data();
    pintarSala();
    const d = sala.datos;
    if (d.state === 'playing' && d.round !== sala.ronda && Object.keys(sala.jugadores).length >= 2) {
      sala.ronda = d.round;
      empezar({ semilla: d.seed, online: true, ronda: d.round });
    } else if (d.state === 'lobby' && juego && juego.online && juego.fin) { volverALaSala(true); }
  }, e => console.warn(e)));
  sala.unsubs.push(fs.onSnapshot(fs.collection(db, 'tetris', code, 'players'), snap => {
    sala.jugadores = {}; snap.docs.forEach(d => { sala.jugadores[d.id] = d.data(); });
    pintarSala();
    if (juego && juego.online) juego.rival = rivalDe();
  }, e => console.warn(e)));
  sala.parar = presenceLoop(() => {
    fs.setDoc(refYo(code), { lastSeen: fs.serverTimestamp() }, { merge: true }).catch(() => {});
    if (esAnfitrion()) fs.updateDoc(refSala(code), { lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {});
  });
}
const rivalUid = () => Object.keys(sala ? sala.jugadores : {}).find(u => u !== UID);
const rivalDe = () => { const u = rivalUid(); return u ? sala.jugadores[u] : null; };
function pintarSala() {
  if (!sala) return;
  const ul = $('#tt-plist');
  ul.replaceChildren();
  const ids = Object.keys(sala.jugadores);
  ids.forEach(u => {
    const li = document.createElement('li');
    const n = document.createElement('span'); n.textContent = `${sala.jugadores[u].name}${u === sala.datos?.host ? ' (ANFITRIÓN)' : ''}${u === UID ? ' · TÚ' : ''}`;
    li.appendChild(n); ul.appendChild(li);
  });
  if (ids.length < 2) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'ESPERANDO A TU RIVAL…'; ul.appendChild(li); }
  $('#tt-go').disabled = !(esAnfitrion() && ids.length >= 2 && sala.datos?.state === 'lobby');
  $('#tt-go').hidden = !esAnfitrion();
  mensaje('#tt-lobby-msg', esAnfitrion() ? (ids.length >= 2 ? 'LISTOS: PULSA INICIAR.' : '') : 'ESPERA A QUE EL ANFITRIÓN INICIE.');
}
$('#tt-go').onclick = async () => {
  if (!esAnfitrion()) return;
  try { await fs.updateDoc(refSala(sala.code), { state: 'playing', round: (sala.datos.round || 0) + 1, seed: aleatorio() }); }
  catch (e) { console.warn(e); mensaje('#tt-lobby-msg', 'NO SE PUDO INICIAR.'); }
};
async function anfitrionReinicia() {
  try { await fs.updateDoc(refSala(sala.code), { state: 'lobby' }); } catch (e) { console.warn(e); }
}
function volverALaSala(desdeRival = false) {
  if (juego) { juego.fin = true;  }
  cartel(null);
  if (sala) { vista('sala'); pintarSala(); if (!desdeRival && esAnfitrion()) anfitrionReinicia(); }
  else vista('menu');
}
function salirListeners() {
  if (!sala) return;
  sala.unsubs.forEach(u => { try { u(); } catch {} });
  if (sala.parar) sala.parar();
}
function cerrarLocal() {
  salirListeners(); sala = null; if (juego) { juego.fin = true; }  cartel(null); vista('menu'); cargarSalas();
}
$('#tt-leave').onclick = async () => {
  if (!sala) { vista('menu'); return; }
  const code = sala.code, anfitrion = esAnfitrion();
  try { await fs.deleteDoc(refYo(code)); if (anfitrion) await fs.deleteDoc(refSala(code)); } catch (e) { console.warn(e); }
  cerrarLocal();
};
window.addEventListener('pagehide', () => { if (sala) { try { fs.deleteDoc(refYo(sala.code)); } catch {} } });

/* ---------- lo que se comparte durante la partida ---------- */
function escribirYo(forzar, vivo) {
  if (!sala || !juego) return;
  const ahora = performance.now(), p = juego.p;
  if (!forzar && !juego.sucio && ahora - juego.ultimaEscritura < 1500) return;
  if (!forzar && ahora - juego.ultimaEscritura < 350) return;
  juego.ultimaEscritura = ahora; juego.sucio = false;
  fs.setDoc(refYo(sala.code), {
    name: playerName(), round: juego.ronda, alive: vivo === undefined ? p.vivo : vivo, board: p.vivo || forzar ? serializar(p.tab, p.vivo ? p.pieza : null) : serializar(p.tab),
    score: p.puntos, lines: p.lineas, sent: p.enviadas, lastSeen: fs.serverTimestamp()
  }, { merge: true }).catch(() => {});
}
let rivalVisto = 0;
function revisarRival(p) {
  const r = rivalDe();
  juego.rival = r && r.round === juego.ronda ? r : null;
  const info = $('#tt-rival-i'), nombre = $('#tt-rival-n');
  if (!juego.rival) { info.textContent = ''; return; }
  nombre.textContent = String(juego.rival.name || 'RIVAL').slice(0, 10);
  info.textContent = `${juego.rival.score || 0} PTS · ${juego.rival.lines || 0} LÍN`;
  p.rivalEnvio = Math.max(p.rivalEnvio, Number(juego.rival.sent) || 0);
  rivalVisto = performance.now();
  if (juego.rival.alive === false && juego.cuenta <= 0) terminar(true, 'TU RIVAL SE QUEDÓ SIN ESPACIO');
  else if (isStale(juego.rival.lastSeen, Date.now()) && juego.cuenta <= 0) terminar(true, 'TU RIVAL SE DESCONECTÓ');
}

/* ---------- salas en vivo (lista del menú) ---------- */
async function cargarSalas() {
  const ul = $('#tt-rooms');
  if (!(await fbReady)) { ul.innerHTML = '<li class="muted">SIN CONEXIÓN</li>'; return; }
  const lista = await liveRooms('tetris', 10);
  if (!lista) { ul.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const abiertas = lista.filter(s => s.data.state === 'lobby' && !isStale(s.data.lastSeen, Date.now() - 0));
  ul.replaceChildren();
  if (!abiertas.length) { ul.innerHTML = '<li class="muted">NO HAY SALAS ABIERTAS</li>'; return; }
  abiertas.forEach(s => {
    const li = document.createElement('li');
    const t = document.createElement('span'); t.textContent = `${s.code} · ${s.data.hostName || ''}`;
    const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = 'UNIRSE'; b.onclick = () => unirse(s.code);
    li.append(t, b); ul.appendChild(li);
  });
}

/* ---------- menú ---------- */
$('#tt-solo').onclick = () => { SFX.init(); $('#tt-room2').hidden = true; empezar({ semilla: aleatorio() }); };
$('#tt-create').onclick = crearSala;
$('#tt-join').onclick = () => unirse();
$('#tt-code').addEventListener('keydown', e => { if (e.key === 'Enter') unirse(); });
$('#tt-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
vista('menu');
cargarTablas();
fbReady.then(() => cargarSalas());
setInterval(() => { if (!$('#tt-menu').hidden) cargarSalas(); }, 15000);
void store; void TIPOS;

/* ---------- portada (igual que la de los demás juegos) ---------- */
function dibujarSplash(c) {
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#0b0c18'; x.fillRect(0, 0, 160, 72);
  const bl = (X, Y, col) => celda(x, X, Y, 8, col);
  const pz = (X, Y, col, f) => f.forEach(([i, j]) => bl(X + i * 8, Y + j * 8, col));
  pz(28, 40, 7, [[0, 0], [1, 0], [2, 0], [2, -1]]); pz(52, 48, 1, [[0, 0], [1, 0], [2, 0], [3, 0]]); pz(84, 48, 2, [[0, 0], [1, 0], [0, -1], [1, -1]]);
  pz(100, 40, 3, [[0, 0], [1, 0], [2, 0], [1, -1]]); pz(124, 48, 4, [[0, 0], [1, 0], [1, -1], [2, -1]]); pz(36, 56, 5, [[0, 0], [1, 0], [1, 1], [2, 1]]); pz(18, 8, 6, [[0, 0], [0, 1], [0, 2], [1, 2]]);
  pz(120, 4, 3, [[0, 0], [1, 0], [2, 0], [1, 1]]); pz(66, 10, 2, [[0, 0], [1, 0], [0, 1], [1, 1]]);
}
const splash = document.querySelector('.splash[data-g="tetris"]');
dibujarSplash(splash.querySelector('canvas'));
document.fonts && document.fonts.ready.then(() => dibujarSplash(splash.querySelector('canvas')));
// Música como en los demás juegos: a volumen normal en la portada y más baja ya dentro (la del Arcade, musica/tetris.js).
function actualizarMusica() { if (!splash.hidden) MUSIC.stop(); else if (MUSIC.audible()) MUSIC.play('tetris', 'low'); else MUSIC.stop(); }
setUpdateMenuMusicHook(actualizarMusica); setMusicToggleHook(actualizarMusica);
document.addEventListener('visibilitychange', actualizarMusica);
splash.querySelector('.btn').onclick = () => { SFX.init(); SFX.play('start'); splash.hidden = true; splash.nextElementSibling.hidden = false; vista('menu'); actualizarMusica(); };
window.addEventListener('pagehide', () => MUSIC.stop());
