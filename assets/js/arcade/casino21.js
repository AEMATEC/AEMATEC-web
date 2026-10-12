import './shell.js';
import { db, fs, UID, fbReady, $, esc, store, playerName, genCode, isStale, liveRooms, presenceLoop, SFX, LB, fitSoon, expiraEn } from './core.js';
import { pedirAbandonar } from './pagina.js';

/* =========================================================
   21 (BLACKJACK) — mesa de casino, hasta 5 jugadores + crupier CPU
   ========================================================= */
const BJ_SUITS = { S: { sym: '♠', red: false }, H: { sym: '♥', red: true }, D: { sym: '♦', red: true }, C: { sym: '♣', red: false } };
const BJ_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function bjFreshDeck() { const d = []; for (const s in BJ_SUITS) for (const r of BJ_RANKS) d.push(r + s); return d; }
function bjShuffle(d) { const a = [...d]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }
function bjRank(card) { return card.slice(0, -1); }
function bjSuit(card) { return card.slice(-1); }
function bjVal(card) { const r = bjRank(card); if (r === 'A') return 11; if (r === 'J' || r === 'Q' || r === 'K') return 10; return +r; }
function bjHandValue(hand) {
  let sum = 0, aces = 0;
  hand.forEach(c => { sum += bjVal(c); if (bjRank(c) === 'A') aces++; });
  while (sum > 21 && aces > 0) { sum -= 10; aces--; }
  return sum;
}
function bjIsBlackjack(hand) { return hand.length === 2 && bjHandValue(hand) === 21; }
function bjResult(hand, dealerHand) {
  const pv = bjHandValue(hand), dv = bjHandValue(dealerHand);
  if (pv > 21) return 'bust';
  const playerBJ = bjIsBlackjack(hand), dealerBJ = bjIsBlackjack(dealerHand);
  if (playerBJ && dealerBJ) return 'push';
  if (playerBJ) return 'blackjack';
  if (dealerBJ) return 'lose';
  if (dv > 21) return 'win';
  if (pv > dv) return 'win';
  if (pv < dv) return 'lose';
  return 'push';
}
function bjCardEl(card, hidden) {
  const d = document.createElement('div');
  if (hidden || !card) { d.className = 'bj-card back'; return d; }
  const suit = bjSuit(card), info = BJ_SUITS[suit], rank = bjRank(card);
  d.className = 'bj-card ' + (info.red ? 'red' : 'black');
  d.innerHTML = `<span>${rank}${info.sym}</span><span class="br">${rank}${info.sym}</span>`;
  return d;
}
function bjHandEl(handEl, hand, hideLast, hideFirst) {
  handEl.innerHTML = '';
  hand.forEach((c, i) => handEl.appendChild(bjCardEl(c, (hideLast && i === hand.length - 1) || (hideFirst && i === 0))));
}
function bjMsg(t, cls = '') { const m = $('#bj-msg'); m.textContent = t; m.className = 'msg ' + cls; }
function bjMenuMsg(t, cls = '') { const m = $('#bj-menu-msg'); m.textContent = t; m.className = 'msg ' + cls; m.style.textAlign = 'left'; }
function bjLB() { LB.render($('#bj-lb'), 'veintiuno', false, r => `${r.score} ${r.score === 1 ? 'MANO' : 'MANOS'}`); }
function bjShowResult(res) {
  const m = { win: '¡GANASTE!', blackjack: '¡BLACKJACK! GANASTE', lose: 'PERDISTE', push: 'EMPATE', bust: 'TE PASASTE DE 21 · PERDISTE' };
  bjMsg(m[res] || '', res === 'win' || res === 'blackjack' ? 'win' : (res === 'push' ? '' : 'lose'));
}
function bjView(v) {
  $('#bj-menu').hidden = v !== 'menu';
  $('#bj-lobby').hidden = v !== 'lobby';
  $('#bj-game').hidden = v !== 'game';
  fitSoon();
}

const BJ = {
  mode: null, phase: 'menu', spectating: false,
  room: null, isHost: false, roomData: null, roomPlayers: {}, unsubs: [], hbStop: null, _hostTimer: null, _dealerRunning: false,
  round: 0, resultShown: false, showValue: store.get('pa_bj_showval', true),
  deck: [], hand: [], dealer: [], dealerHidden: true, status: 'playing', dealTimer: null,
  // Preguntamos una sola vez por sentada en la mesa si quiere publicar sus victorias (no en cada
  // mano, sería muy molesto): null = todavía no se preguntó, true/false = ya decidió.
  subiendo: null,
};
function bjToggleValBtn() { $('#bj-toggle-val').textContent = BJ.showValue ? 'OCULTAR VALOR' : 'MOSTRAR VALOR'; }
$('#bj-toggle-val').onclick = () => {
  BJ.showValue = !BJ.showValue; store.set('pa_bj_showval', BJ.showValue); bjToggleValBtn(); SFX.play('click');
  if (BJ.mode === 'online') bjRenderOnline(); else if (BJ.mode === 'local') bjRenderLocal();
};
bjToggleValBtn();

/* ---- solo vs crupier ---- */
function bjLocalDeal() {
  bjLeaveOnline();
  BJ.mode = 'local'; BJ.spectating = false;
  BJ.deck = bjShuffle(bjFreshDeck());
  BJ.hand = [BJ.deck.pop(), BJ.deck.pop()];
  BJ.dealer = [BJ.deck.pop(), BJ.deck.pop()];
  BJ.dealerHidden = true;
  BJ.status = bjIsBlackjack(BJ.hand) ? 'blackjack' : 'playing';
  BJ.phase = 'play';
  bjView('game'); $('#bj-room2').textContent = 'SOLO VS CRUPIER'; $('#bj-spec-badge').hidden = true;
  $('#bj-ctrl').hidden = false; $('#bj-again-row').hidden = true;
  bjMsg('');
  bjRenderLocal();
  if (BJ.status !== 'playing') bjLocalResolveDealer();
}
function bjLocalHit() {
  if (BJ.mode !== 'local' || BJ.status !== 'playing') return;
  BJ.hand.push(BJ.deck.pop());
  const v = bjHandValue(BJ.hand);
  if (v > 21) BJ.status = 'bust';
  SFX.play('click'); bjRenderLocal();
  if (BJ.status !== 'playing') bjLocalResolveDealer();
}
function bjLocalStand() {
  if (BJ.mode !== 'local' || BJ.status !== 'playing') return;
  BJ.status = 'stand'; SFX.play('click'); bjRenderLocal(); bjLocalResolveDealer();
}
function bjLocalResolveDealer() {
  BJ.dealerHidden = false; bjRenderLocal();
  const step = () => {
    const v = bjHandValue(BJ.dealer);
    if (BJ.status !== 'bust' && v < 17) { BJ.dealer.push(BJ.deck.pop()); bjRenderLocal(); BJ.dealTimer = setTimeout(step, 700); }
    else bjLocalFinish();
  };
  BJ.dealTimer = setTimeout(step, 700);
}
// Preguntar "¿subes tu puntaje?" en cada mano sería muy molesto (una mesa dura muchas manos), así
// que se pregunta una sola vez por sentada (BJ.subiendo) y las siguientes manos se suman solas.
function bjSubirVictoria() {
  if (BJ.subiendo === true) { LB.increment('veintiuno').then(bjLB); return; }
  if (BJ.subiendo === false) return;
  LB.confirmar('¡GANASTE! ¿QUIERES QUE TUS VICTORIAS EN ESTA MESA SE PUBLIQUEN EN LA TABLA?', () => LB.increment('veintiuno'))
    .then(ok => { BJ.subiendo = !!ok; bjLB(); });
}
function bjLocalFinish() {
  BJ.phase = 'over';
  const res = bjResult(BJ.hand, BJ.dealer);
  bjRenderLocal(); bjShowResult(res);
  if (res === 'win' || res === 'blackjack') { SFX.play('win'); bjSubirVictoria(); }
  else if (res === 'push') SFX.play('click'); else SFX.play('lose');
  $('#bj-ctrl').hidden = true; $('#bj-again-row').hidden = false;
}
function bjRenderLocal() {
  bjHandEl($('#bj-dealer-cards'), BJ.dealer, BJ.dealerHidden);
  $('#bj-dealer-val').textContent = (BJ.dealerHidden || !BJ.showValue) ? '' : 'VALOR: ' + bjHandValue(BJ.dealer);
  const seats = $('#bj-seats'); seats.innerHTML = '';
  const seat = document.createElement('div');
  seat.className = 'bj-seat me' + (BJ.status === 'playing' ? ' turn' : '');
  seat.innerHTML = `<div class="bj-name"><b>${esc(playerName())}</b></div>`;
  const cardsEl = document.createElement('div'); cardsEl.className = 'bj-cards';
  bjHandEl(cardsEl, BJ.hand, false);
  seat.appendChild(cardsEl);
  const val = document.createElement('div'); val.className = 'bj-val'; val.textContent = BJ.showValue ? 'VALOR: ' + bjHandValue(BJ.hand) : '';
  seat.appendChild(val);
  const statusTxt = { playing: '', stand: 'PLANTADO', bust: 'SE PASÓ', blackjack: '¡21!' }[BJ.status] || '';
  const st = document.createElement('div'); st.className = 'bj-status' + (BJ.status === 'bust' ? ' bust' : BJ.status === 'blackjack' ? ' bjk' : '');
  st.textContent = statusTxt; seat.appendChild(st);
  seats.appendChild(seat);
  $('#bj-hit').disabled = BJ.status !== 'playing'; $('#bj-stand').disabled = BJ.status !== 'playing';
  fitSoon();
}

/* ---- mesa online ---- */
function bjSeatList() { return Object.entries(BJ.roomPlayers).sort((a, b) => a[1].slot - b[1].slot); }
function bjStatusOf(uid) { return (BJ.roomData && BJ.roomData.status && BJ.roomData.status[uid]) || 'waiting'; }
function bjHandOf(uid) { return (BJ.roomData && BJ.roomData.hands && BJ.roomData.hands[uid]) || []; }
function bjTurnUid() { for (const [uid] of bjSeatList()) if (bjStatusOf(uid) === 'playing') return uid; return null; }
async function bjCreate() {
  if (!(await fbReady)) return bjMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR SOLO.', 'lose');
  bjLeaveOnline(); BJ.subiendo = null; bjMenuMsg('CREANDO MESA…');
  try {
    let code, ref;
    for (let k = 0; k < 5; k++) { code = genCode(); ref = fs.doc(db, 'blackjack', code); if (!(await fs.getDoc(ref)).exists()) break; }
    await fs.setDoc(ref, { host: UID, state: 'lobby', deck: [], dealerHand: [], dealerHidden: true, hands: {}, status: {}, round: 0, created: fs.serverTimestamp() });
    BJ.room = code;
    await fs.setDoc(fs.doc(db, 'blackjack', code, 'players', UID), { name: playerName(), slot: 0, joined: fs.serverTimestamp() });
    bjEnterLobby();
  } catch (e) { console.error(e); BJ.room = null; bjMenuMsg('ERROR AL CREAR MESA: ' + e.message, 'lose'); }
}
async function bjJoin() {
  const code = $('#bj-code').value.trim().toUpperCase();
  if (code.length < 5) return bjMenuMsg('ESCRIBE EL CÓDIGO DE 5 LETRAS.', 'lose');
  if (!(await fbReady)) return bjMenuMsg('SIN CONEXIÓN A FIREBASE: SOLO SE PUEDE JUGAR SOLO.', 'lose');
  bjLeaveOnline(); BJ.subiendo = null; bjMenuMsg('ENTRANDO…');
  try {
    const d = await fs.getDoc(fs.doc(db, 'blackjack', code));
    if (!d.exists()) throw new Error('ESA MESA NO EXISTE');
    const ps = await fs.getDocs(fs.collection(db, 'blackjack', code, 'players'));
    const used = new Set(); let mine = false;
    ps.forEach(p => { if (p.id === UID) mine = true; else used.add(p.data().slot); });
    if (!mine && used.size >= 5) throw new Error('LA MESA ESTÁ LLENA (MÁX. 5)');
    let slot = 0; while (used.has(slot)) slot++;
    BJ.room = code;
    await fs.setDoc(fs.doc(db, 'blackjack', code, 'players', UID), { name: playerName(), slot, joined: fs.serverTimestamp() });
    bjEnterLobby();
  } catch (e) { BJ.room = null; bjMenuMsg(e.message, 'lose'); }
}
function bjEnterLobby() {
  BJ.mode = 'online'; BJ.phase = 'lobby'; BJ.roomData = null; BJ.roomPlayers = {}; BJ.round = 0; BJ.resultShown = false;
  bjMenuMsg(''); $('#bj-room').textContent = (BJ.spectating ? '👁 ESPECTADOR · MESA ' : 'MESA ') + BJ.room;
  bjView('lobby'); bjLobbyRender();
  BJ.unsubs.push(fs.onSnapshot(fs.doc(db, 'blackjack', BJ.room), s => {
    if (!s.exists()) { if (BJ.spectating) { bjMenuMsg('LA MESA SE CERRÓ.', 'lose'); bjToMenu(); } return; }
    BJ.roomData = s.data(); bjSync();
  }));
  BJ.unsubs.push(fs.onSnapshot(fs.collection(db, 'blackjack', BJ.room, 'players'), s => {
    const m = {}; s.forEach(d => m[d.id] = d.data()); BJ.roomPlayers = m; bjSync();
  }));
  if (!BJ.spectating) BJ.hbStop = presenceLoop(() => fs.updateDoc(fs.doc(db, 'blackjack', BJ.room, 'players', UID), { lastSeen: fs.serverTimestamp(), expiraEn: expiraEn() }).catch(() => {}));
  BJ._hostTimer = setInterval(bjHostPoll, 3000);
}
async function bjSpecOpen(code) {
  bjToMenu();
  BJ.spectating = true; BJ.room = code;
  $('#bj-spec-list').hidden = true;
  bjEnterLobby();
}
function bjLobbyRender() {
  if (BJ.mode !== 'online' || BJ.phase !== 'lobby') return;
  const list = bjSeatList(), ul = $('#bj-plist'); ul.innerHTML = '';
  list.forEach(([uid, p]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${esc(p.name)}${uid === UID ? ' (TÚ)' : ''}${BJ.roomData && uid === BJ.roomData.host ? ' ★' : ''}</span>`;
    ul.appendChild(li);
  });
  $('#bj-lobby-msg').textContent = (BJ.isHost ? `COMPARTE EL CÓDIGO ${BJ.room}. ` : 'ESPERANDO AL ANFITRIÓN (★)… ') + `${list.length}/5 JUGADORES`;
  $('#bj-go').hidden = !BJ.isHost || BJ.spectating;
  $('#bj-go').disabled = list.length < 1;
}
function bjSync() {
  const d = BJ.roomData; if (!d || BJ.mode !== 'online') return;
  BJ.isHost = d.host === UID;
  if (d.round !== BJ.round) { BJ.round = d.round; BJ.resultShown = false; }
  BJ.phase = d.state;
  bjView(d.state === 'lobby' ? 'lobby' : 'game');
  if (d.state === 'lobby') { bjLobbyRender(); return; }
  $('#bj-room2').textContent = (BJ.spectating ? '👁 ESPECTADOR · MESA ' : 'MESA ') + BJ.room;
  $('#bj-spec-badge').hidden = !BJ.spectating;
  bjRenderOnline();
  const myTurn = !BJ.spectating && d.state === 'play' && bjTurnUid() === UID;
  $('#bj-ctrl').hidden = !myTurn;
  $('#bj-hit').disabled = !myTurn; $('#bj-stand').disabled = !myTurn;
  $('#bj-again-row').hidden = !(d.state === 'over' && BJ.isHost && !BJ.spectating);
  if (d.state === 'over' && !BJ.resultShown) { BJ.resultShown = true; bjOnlineShowResult(); }
}
function bjRenderOnline() {
  const d = BJ.roomData; if (!d) return;
  bjHandEl($('#bj-dealer-cards'), d.dealerHand || [], d.dealerHidden && d.state === 'play');
  $('#bj-dealer-val').textContent = ((d.dealerHidden && d.state === 'play') || !BJ.showValue) ? '' : 'VALOR: ' + bjHandValue(d.dealerHand || []);
  const list = bjSeatList(), seats = $('#bj-seats'), turnUid = bjTurnUid(), now = Date.now();
  seats.innerHTML = '';
  list.forEach(([uid, p]) => {
    const hand = bjHandOf(uid), status = bjStatusOf(uid);
    const seat = document.createElement('div'), gone = uid !== UID && isStale(p.lastSeen, now);
    seat.className = 'bj-seat' + (uid === UID ? ' me' : '') + (uid === turnUid ? ' turn' : '');
    seat.innerHTML = `<div class="bj-name"><b>${esc(p.name)}</b>${uid === UID ? ' (TÚ)' : ''}${gone ? ' <span class="discon">⚠</span>' : ''}</div>`;
    const cardsEl = document.createElement('div'); cardsEl.className = 'bj-cards';
    // primera carta de los demás oculta hasta que termina la mano (state 'over'); solo es visual, los datos siguen en Firestore
    const hideFirst = uid !== UID && d.state === 'play';
    bjHandEl(cardsEl, hand, false, hideFirst);
    seat.appendChild(cardsEl);
    const val = document.createElement('div'); val.className = 'bj-val'; val.textContent = (hand.length && BJ.showValue && !hideFirst) ? 'VALOR: ' + bjHandValue(hand) : '';
    seat.appendChild(val);
    // '¡21!' de otro jugador delataría su mano oculta: se muestra como plantado hasta el final
    const statusTxt = { waiting: 'ESPERA LA PRÓXIMA MANO', playing: '', stand: 'PLANTADO', bust: 'SE PASÓ', blackjack: hideFirst ? 'PLANTADO' : '¡21!' }[status] || '';
    const st = document.createElement('div'); st.className = 'bj-status' + (status === 'bust' ? ' bust' : status === 'blackjack' && !hideFirst ? ' bjk' : '');
    st.textContent = statusTxt + (gone ? ' · DESCONECTADO' : ''); seat.appendChild(st);
    seats.appendChild(seat);
  });
  for (let i = list.length; i < 5; i++) { const e = document.createElement('div'); e.className = 'bj-seat empty'; e.innerHTML = '<div class="bj-name">ASIENTO LIBRE</div>'; seats.appendChild(e); }
  fitSoon();
}
function bjOnlineShowResult() {
  if (BJ.spectating) return;
  const hand = bjHandOf(UID);
  if (bjStatusOf(UID) === 'waiting' || !hand.length) { bjMsg(''); return; }
  const res = bjResult(hand, BJ.roomData.dealerHand || []);
  bjShowResult(res);
  if (res === 'win' || res === 'blackjack') { SFX.play('win'); bjSubirVictoria(); }
  else if (res === 'push') SFX.play('click'); else SFX.play('lose');
}
async function bjOnlineHit() {
  if (BJ.spectating || bjTurnUid() !== UID) return;
  try {
    await fs.runTransaction(db, async tx => {
      const roomRef = fs.doc(db, 'blackjack', BJ.room);
      const rs = await tx.get(roomRef);
      if (!rs.exists()) return;
      const d = rs.data(), deck = [...d.deck], card = deck.pop();
      const hand = [...((d.hands && d.hands[UID]) || []), card], v = bjHandValue(hand);
      const status = v > 21 ? 'bust' : 'playing';
      tx.update(roomRef, { deck, [`hands.${UID}`]: hand, [`status.${UID}`]: status });
    });
    SFX.play('click');
  } catch (e) { console.error(e); }
}
function bjOnlineStand() {
  if (BJ.spectating || bjTurnUid() !== UID) return;
  SFX.play('click');
  fs.updateDoc(fs.doc(db, 'blackjack', BJ.room), { [`status.${UID}`]: 'stand' }).catch(console.error);
}
async function bjOnlineDeal() {
  if (!BJ.isHost || BJ.spectating) return;
  const list = bjSeatList(); if (!list.length) return;
  const deck = bjShuffle(bjFreshDeck()), dealerHand = [deck.pop(), deck.pop()], hands = {}, status = {};
  list.forEach(([uid]) => { const h = [deck.pop(), deck.pop()]; hands[uid] = h; status[uid] = bjIsBlackjack(h) ? 'blackjack' : 'playing'; });
  try {
    await fs.updateDoc(fs.doc(db, 'blackjack', BJ.room), { state: 'play', deck, dealerHand, dealerHidden: true, hands, status, round: (BJ.roomData.round || 0) + 1 });
  } catch (e) { console.error(e); }
}
function bjHostPoll() {
  if (BJ.mode !== 'online' || !BJ.isHost || BJ.spectating || !BJ.roomData) return;
  if (BJ.roomData.state !== 'play') return;
  const turnUid = bjTurnUid();
  if (turnUid) {
    const p = BJ.roomPlayers[turnUid];
    if (p && isStale(p.lastSeen, Date.now())) fs.updateDoc(fs.doc(db, 'blackjack', BJ.room), { [`status.${turnUid}`]: 'stand' }).catch(() => {});
    return;
  }
  if (!BJ._dealerRunning) { BJ._dealerRunning = true; bjHostDealerLoop(); }
}
async function bjHostDealerLoop() {
  const room = BJ.room;
  try {
    for (let guard = 0; guard < 30; guard++) {
      if (BJ.room !== room || !BJ.isHost) break;
      await new Promise(r => setTimeout(r, 800));
      if (BJ.room !== room || !BJ.isHost) break;
      const snap = await fs.getDoc(fs.doc(db, 'blackjack', room));
      if (!snap.exists()) break;
      const d = snap.data();
      if (d.state !== 'play') break;
      if (d.dealerHidden) { await fs.updateDoc(fs.doc(db, 'blackjack', room), { dealerHidden: false }); continue; }
      const statuses = Object.values(d.status || {});
      const active = statuses.filter(s => s !== 'waiting');
      const allBust = active.length > 0 && active.every(s => s === 'bust');
      const dv = bjHandValue(d.dealerHand || []);
      if (!allBust && dv < 17) {
        const deck = [...(d.deck || [])], card = deck.pop();
        await fs.updateDoc(fs.doc(db, 'blackjack', room), { deck, dealerHand: fs.arrayUnion(card) });
        continue;
      }
      await fs.updateDoc(fs.doc(db, 'blackjack', room), { state: 'over' });
      break;
    }
  } catch (e) { console.error(e); }
  BJ._dealerRunning = false;
}
function bjLeaveOnline() {
  BJ.unsubs.forEach(u => u()); BJ.unsubs = [];
  if (BJ.hbStop) { BJ.hbStop(); BJ.hbStop = null; }
  if (BJ._hostTimer) { clearInterval(BJ._hostTimer); BJ._hostTimer = null; }
  if (BJ.room && fs && !BJ.spectating) {
    const room = BJ.room, others = Object.keys(BJ.roomPlayers).filter(u => u !== UID);
    if (BJ.isHost && others.length) fs.updateDoc(fs.doc(db, 'blackjack', room), { host: others[0] }).catch(() => {});
    fs.deleteDoc(fs.doc(db, 'blackjack', room, 'players', UID)).catch(() => {});
  }
  BJ.room = null; BJ.roomData = null; BJ.roomPlayers = {}; BJ.isHost = false; BJ.spectating = false; BJ._dealerRunning = false;
}
function bjToMenu() {
  clearTimeout(BJ.dealTimer);
  if (BJ.mode === 'online') bjLeaveOnline();
  BJ.mode = null; BJ.phase = 'menu'; BJ.spectating = false; BJ.subiendo = null;
  bjView('menu');
}
$('#bj-spec-btn').onclick = async () => {
  const list = $('#bj-spec-list');
  if (!list.hidden) { list.hidden = true; return; }
  SFX.play('click'); list.hidden = false; list.innerHTML = '<li class="muted">CARGANDO…</li>';
  const rooms = await liveRooms('blackjack');
  if (rooms === null) { list.innerHTML = '<li class="muted">NO SE PUDO CARGAR</li>'; return; }
  const stateN = { lobby: 'EN LOBBY', play: 'JUGANDO', over: 'MANO TERMINADA' };
  list.innerHTML = rooms.length
    ? rooms.map(r => `<li><span><b>MESA ${r.code}</b><small>${stateN[r.data.state] || r.data.state}</small></span><button class="btn orange" data-code="${r.code}">VER</button></li>`).join('')
    : '<li class="muted">NO HAY MESAS RECIENTES</li>';
  list.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { SFX.play('click'); bjSpecOpen(b.dataset.code); });
};
$('#bj-local').onclick = () => { SFX.play('start'); BJ.subiendo = null; bjLocalDeal(); };
$('#bj-create').onclick = bjCreate;
$('#bj-join').onclick = bjJoin;
$('#bj-code').addEventListener('keydown', e => { if (e.key === 'Enter') bjJoin(); });
$('#bj-go').onclick = bjOnlineDeal;
$('#bj-leave').onclick = bjToMenu;
$('#bj-quit').onclick = pedirAbandonar(bjToMenu);
$('#bj-hit').onclick = () => { BJ.mode === 'local' ? bjLocalHit() : bjOnlineHit(); };
$('#bj-stand').onclick = () => { BJ.mode === 'local' ? bjLocalStand() : bjOnlineStand(); };
$('#bj-again').onclick = () => { if (BJ.mode === 'local') bjLocalDeal(); else if (BJ.isHost) bjOnlineDeal(); };
window.addEventListener('beforeunload', () => { if (BJ.mode === 'online') bjLeaveOnline(); });
bjLB(); bjView('menu');
