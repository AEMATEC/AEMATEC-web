// BUSCAMINAS
import { $, SFX, LB, fitSoon, FIT_EXTRAS, docTop } from './core.js';

const MS_LV = {
  facil:   { w: 9,  h: 9,  m: 10, n: 'FÁCIL' },
  medio:   { w: 12, h: 12, m: 24, n: 'MEDIO' },
  dificil: { w: 16, h: 16, m: 40, n: 'DIFÍCIL' },
};
const MS = { lv: 'facil' };
const msBoard = $('#ms-board');

function msNew() {
  const L = MS_LV[MS.lv], N = L.w * L.h;
  clearInterval(MS.timer);
  Object.assign(MS, {
    w: L.w, h: L.h, m: L.m, started: false, planted: false, over: false, lost: false, opened: 0, boom: -1,
    mine: Array(N).fill(false), open: Array(N).fill(false), flag: Array(N).fill(false), cnt: Array(N).fill(0)
  });
  $('#ms-time').textContent = '000';
  $('#ms-face').textContent = ':)';
  msBoard.style.gridTemplateColumns = `repeat(${L.w}, var(--cs))`;
  msBoard.innerHTML = '';
  for (let i = 0; i < N; i++) { const d = document.createElement('div'); d.className = 'cell'; d.dataset.i = i; msBoard.appendChild(d); }
  msMsg('1 CLIC = BANDERA · 2 CLICS = DESCUBRIR');
  msDraw(); msLB();
}
function msMsg(t, cls = '') { const m = $('#ms-msg'); m.textContent = t; m.className = 'msg ' + cls; }
function msLB() {
  $('#ms-lb-title').textContent = 'MEJOR TIEMPO · ' + MS_LV[MS.lv].n;
  LB.render($('#ms-lb'), 'minas_' + MS.lv, true, r => Number(r.score).toFixed(1) + 's');
}
function nb(i) {
  const x = i % MS.w, y = (i / MS.w) | 0, r = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const X = x + dx, Y = y + dy;
    if (X >= 0 && Y >= 0 && X < MS.w && Y < MS.h) r.push(Y * MS.w + X);
  }
  return r;
}
function msPlant(safe) {
  const ban = new Set([safe, ...nb(safe)]), N = MS.w * MS.h;
  let k = 0;
  while (k < MS.m) { const i = (Math.random() * N) | 0; if (MS.mine[i] || ban.has(i)) continue; MS.mine[i] = true; k++; }
  for (let i = 0; i < N; i++) MS.cnt[i] = nb(i).filter(j => MS.mine[j]).length;
  MS.planted = true;
}
function msStart() {
  if (MS.started) return;
  MS.started = true; MS.t0 = Date.now();
  MS.timer = setInterval(() => { $('#ms-time').textContent = String(Math.min(999, ((Date.now() - MS.t0) / 1000) | 0)).padStart(3, '0'); }, 250);
}
function msFlag(i) {
  if (MS.over || MS.open[i]) return;
  msStart();
  MS.flag[i] = !MS.flag[i];
  SFX.play('flag');
  msDraw();
}
function msOpen(i) {
  if (MS.over || MS.open[i] || MS.flag[i]) return;
  if (MS.mine[i]) { MS.boom = i; msLose(); return; }
  const st = [i];
  while (st.length) {
    const c = st.pop();
    if (MS.open[c] || MS.flag[c]) continue;
    MS.open[c] = true; MS.opened++;
    if (MS.cnt[c] === 0) nb(c).forEach(j => { if (!MS.open[j] && !MS.mine[j]) st.push(j); });
  }
}
function msReveal(i) {
  if (MS.over) return;
  if (MS.open[i]) {
    const n = nb(i);
    if (MS.cnt[i] && n.filter(j => MS.flag[j]).length === MS.cnt[i]) n.forEach(j => msOpen(j));
  } else {
    if (MS.flag[i]) return;
    if (!MS.planted) msPlant(i);
    msStart();
    msOpen(i);
  }
  if (!MS.lost) SFX.play('open');
  msDraw(); msCheck();
}
function msLose() {
  MS.over = true; MS.lost = true;
  clearInterval(MS.timer);
  $('#ms-face').textContent = 'X(';
  SFX.play('boom');
  msMsg('¡BOOM! PERDISTE. PULSA LA CARA PARA REINTENTAR', 'lose');
}
function msCheck() {
  if (MS.over || MS.opened !== MS.w * MS.h - MS.m) return;
  MS.over = true;
  clearInterval(MS.timer);
  const t = Math.max(1, Math.round((Date.now() - MS.t0) / 100) / 10);
  MS.mine.forEach((m, i) => { if (m) MS.flag[i] = true; });
  msDraw();
  $('#ms-face').textContent = 'B)';
  SFX.play('win');
  msMsg(`¡GANASTE EN ${t.toFixed(1)}s!`, 'win');
  LB.confirmar(`¿SUBES TU TIEMPO DE ${t.toFixed(1)}s A LA TABLA?`, () => LB.submit('minas_' + MS.lv, t, true)).then(msLB);
}
function msDraw() {
  const cells = msBoard.children;
  for (let i = 0; i < cells.length; i++) {
    let cls = 'cell', txt = '';
    if (MS.open[i]) { cls += ' open'; if (MS.cnt[i]) { txt = MS.cnt[i]; cls += ' n' + MS.cnt[i]; } }
    else if (MS.lost && MS.mine[i] && !MS.flag[i]) cls += ' open mine' + (i === MS.boom ? ' boom' : '');
    else if (MS.flag[i]) cls += ' flag' + (MS.lost && !MS.mine[i] ? ' wrong' : '');
    cells[i].className = cls; cells[i].textContent = txt;
  }
  const left = MS.m - MS.flag.filter(Boolean).length;
  $('#ms-mines').textContent = left < 0 ? '-' + String(-left).padStart(2, '0') : String(left).padStart(3, '0');
}
let msClickTimer = null, msLastIdx = -1;
const DOUBLE_MS = 270;
msBoard.addEventListener('click', e => {
  const c = e.target.closest('.cell'); if (!c) return;
  const i = +c.dataset.i;
  if (msClickTimer && msLastIdx === i) { clearTimeout(msClickTimer); msClickTimer = null; msReveal(i); return; }
  if (msClickTimer) { clearTimeout(msClickTimer); msClickTimer = null; msFlag(msLastIdx); }
  msLastIdx = i;
  if (MS.open[i]) { msClickTimer = setTimeout(() => { msClickTimer = null; }, DOUBLE_MS); return; }
  msClickTimer = setTimeout(() => { msClickTimer = null; msFlag(i); }, DOUBLE_MS);
});
msBoard.addEventListener('contextmenu', e => e.preventDefault());
$('#ms-face').onclick = () => { SFX.play('click'); msNew(); fitSoon(); };
document.querySelectorAll('.ms-lv').forEach(b => b.onclick = () => {
  MS.lv = b.dataset.lv;
  document.querySelectorAll('.ms-lv').forEach(x => x.classList.toggle('on', x === b));
  SFX.play('click'); msNew(); fitSoon();
});

// El tamaño de cada celda depende del tablero actual (MS.w/MS.h): se ajusta aparte del caso
// genérico de fitAll() en core.js, que solo sabe de <canvas> dentro de .stage.
FIT_EXTRAS.push(() => {
  const mb = $('#ms-board');
  if (!mb.offsetParent) return;
  const W = mb.parentElement.clientWidth - 10, H = window.innerHeight - docTop(mb) - 60;
  mb.style.setProperty('--cs', Math.max(16, Math.min(38, Math.floor(Math.min(W / MS.w, H / MS.h)))) + 'px');
});

msNew();
