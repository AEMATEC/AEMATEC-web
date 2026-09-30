/* ============================================================
   LA HUIDA DEL ZORRO — corredor sin fin. Salta (Espacio/↑/tocar) los
   obstáculos del suelo; los que cuelgan desde arriba no se pueden
   saltar, hay que agacharse (↓) para pasar por debajo. La puntuación
   son los metros recorridos: la velocidad sube con la distancia y
   cada 500 m cambia el escenario con una transición pixelada.
   ============================================================ */
import { $, SFX, LB, pxCircle, sprite } from './core.js';

const RN_CVW = 480, RN_CVH = 200, RN_GROUND = 160, RN_CHAR_X = 70;
const RN_GRAVITY = 2200, RN_JUMP_V = 520;
const RN_BASE_SPEED = 220, RN_MAX_SPEED = 520;
const RN_DUCK_H = 20, RN_STAND_H = 38;
const RN_PX_PER_M = 10, RN_THEME_METERS = 500;
const RN_TRANS_OUT = 380, RN_TRANS_HOLD = 850, RN_TRANS_IN = 380;
const RN_TRANS_TOTAL = RN_TRANS_OUT + RN_TRANS_HOLD + RN_TRANS_IN;
/* Cada escenario: cielo (sky→sky2), colinas lejanas (far) y cercanas (near),
   capa de "árboles" (cactus, edificios, pinos o cristales), nubes, suelo
   (top = franja de pasto/arena/acera/hielo; ground = tierra) y colores del
   interior de los huecos (pit: pared iluminada, pared en sombra, fondo). */
const RN_THEMES = [
  { n: 'DESIERTO', sky: '#f0b865', sky2: '#f8e2a8', ground: '#caa15b', deco: '#a97f3f',
    far: '#e8b872', near: '#d69a55', nearHi: '#e6b06a', cloud: '#fff6e0', cloudSh: '#f1d9a8',
    top: '#e8c77e', topDk: '#c99a52', speck: '#a97f3f', speckHi: '#dcb877',
    pit: ['#a97f3f', '#7d5a2a', '#4a3216', '#1e1208'] },
  { n: 'CIUDAD DE NOCHE', sky: '#1f2540', sky2: '#3c4568', ground: '#4a4f63', deco: '#1c1f29',
    far: '#323a5c', near: '#282f4c', nearHi: '#3a4468', cloud: '#4a5480', cloudSh: '#3a4268',
    top: '#8a8fa3', topDk: '#6b7088', speck: '#3a3e4f', speckHi: '#5c6178',
    pit: ['#3a3e4f', '#2a2d3a', '#181a24', '#08090f'] },
  { n: 'BOSQUE', sky: '#7cc6e0', sky2: '#c9f0e4', ground: '#6b4a2c', deco: '#2c5c34',
    far: '#9fd3a8', near: '#6db27a', nearHi: '#86c890', cloud: '#ffffff', cloudSh: '#d6ecf2',
    top: '#5fae5f', topDk: '#3f8a45', speck: '#4a2f1c', speckHi: '#8a6440',
    pit: ['#5a3c22', '#3e2816', '#24160b', '#0e0804'] },
  { n: 'CUEVA HELADA', sky: '#10132a', sky2: '#232a52', ground: '#2a2f4a', deco: '#8fd6f0',
    far: '#1c2244', near: '#27305c', nearHi: '#5f9ccc', cloud: '#2f3866', cloudSh: '#262e58',
    top: '#bfe6f2', topDk: '#7fb8d6', speck: '#1e2238', speckHi: '#3f4a70',
    pit: ['#3b4a78', '#26305a', '#141a36', '#05060d'] }
];
/* Margen (px por lado) que se descuenta a la zona mortal de los huecos:
   rozar el borde con la pata ya no hace caer al zorro. Se dibujan igual. */
const RN_PIT_MARGIN = 7;
/* ---- Zorro: sprites 8-bit (escala 2). El juego solo avanza hacia la
   derecha, así que el zorro siempre mira a la derecha. ---- */
const RN_FOX_PAL = { K: '#2a1608', d: '#4a2a14', o: '#e8823c', O: '#b5541f', h: '#f7a65a', w: '#fff3d6', W: '#e0c9a0', k: '#11121c', e: '#ffffff' };
const RN_FOX_TOP = [
  "...................K..K.....",
  "..................KdKKdK....",
  "..................KdoKdoK...",
  "..KKK............KhhhhhhhK..",
  ".KwwwK..........KhoooookoKK.",
  "KwwwhoK........KOoooooooooek",
  "KwwhhooK.......KOowwwwwwwKK.",
  ".KwhhoooKKKKKKKKOowwwwwK....",
  "..KhooooohhhhhhhhowwwwwK....",
  "...KoooooooooooooowwwwK.....",
  "...KOooooooooooooowwwwK.....",
  "....KOOoooooooooooOwwK......",
  ".....KKOOWWWWWWOOOOOK.......",
  "......KKKKKKKKKKKKKK........"
];
const RN_FOX_LEGS = {
  a: [
    "....KoOK........KooK........",
    "...KoOK..........KooK.......",
    "..KddK............KddK......",
    ".KddK..............KddK.....",
    ".KKK................KKK....."],
  b: [
    ".....KoOK......KooK.........",
    ".....KoOK......KooK.........",
    ".....KddK......KddK.........",
    ".....KddK......KddK.........",
    ".....KKKKK.....KKKKK........"],
  c: [
    ".......KoOK..KooK...........",
    "........KoOKKooK............",
    "........KddKKddK............",
    "........KddKKddK............",
    "........KKKKKKKKK..........."],
  up: [
    "...KoOK..........KooK.......",
    "..KddK.............KddK.....",
    ".KddK..............KKKK.....",
    ".KKK........................",
    "............................"],
  down: [
    ".....KoOK........KooK.......",
    ".....KddK.........KddK......",
    ".....KKKK.........KddK......",
    "..................KKKK......",
    "............................"]
};
const RN_FOX_DUCK_TOP = [
  "...................KK.KK......",
  "..KKK.............KdKKdKK.....",
  ".KwwwK..KKKKKKKKKKhhhhhhhK....",
  "KwwwhhKKhhhhhhhhhhoooookoKKK..",
  "KwwhhoooooooooooooooooooooeK..",
  ".KKhooooooooooooooOowwwwwwwkK.",
  "...KKOOOOOOOOOOOOOOowwwwwKKK..",
  "....KKOOWWWWWWWWOOOwwwwK......"
];
// Cada cuadro de RN_FOX_LEGS solo trae un par de patas (delantera y trasera): para que se vean
// las 4, se dibuja debajo un segundo par —oscurecido, como si estuviera un paso atrás— tomado de
// otro cuadro del mismo ciclo de carrera (misma paleta, sin inventar arte nuevo).
const RN_FOX_FAR_LEG = { a: 'c', b: 'a', c: 'b', up: 'down', down: 'up' };
function rnFoxOscurecer(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 45), g = Math.max(0, ((n >> 8) & 255) - 45), b = Math.max(0, (n & 255) - 45);
  return `rgb(${r},${g},${b})`;
}
export const RN_FOX_SPR = (() => {
  const s = {};
  const scale = 2, topRows = RN_FOX_TOP.length;
  Object.keys(RN_FOX_LEGS).forEach(k => {
    const rows = [...RN_FOX_TOP, ...RN_FOX_LEGS[k]];
    const c = document.createElement('canvas'); c.width = rows[0].length * scale; c.height = rows.length * scale;
    const ctx = c.getContext('2d');
    RN_FOX_LEGS[RN_FOX_FAR_LEG[k]].forEach((r, y) => [...r].forEach((ch, X) => {
      if (RN_FOX_PAL[ch]) { ctx.fillStyle = rnFoxOscurecer(RN_FOX_PAL[ch]); ctx.fillRect(X * scale, (topRows + y) * scale, scale, scale); }
    }));
    rows.forEach((r, y) => [...r].forEach((ch, X) => { if (RN_FOX_PAL[ch]) { ctx.fillStyle = RN_FOX_PAL[ch]; ctx.fillRect(X * scale, y * scale, scale, scale); } }));
    s[k] = c;
  });
  s.duck = [
    sprite([...RN_FOX_DUCK_TOP, "......KddK.......KddKKK.......", "......KKKK.......KKKK........."], RN_FOX_PAL, 2),
    sprite([...RN_FOX_DUCK_TOP, "........KddK.......KddK.......", "........KKKK.......KKKK......."], RN_FOX_PAL, 2)
  ];
  return s;
})();
const RN_RUN_CYCLE = ['a', 'b', 'c', 'b'];
/* ---- Fondo con parallax: cada capa se pre-dibuja una sola vez por
   escenario en un canvas fuera de pantalla (mosaico de 480 px que se
   repite sin costura) y en cada cuadro solo se copia con drawImage. ---- */
function rnRng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function rnMix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
const RN_CLOUD_SPR = [
  ["....aaaa........", "..aaaaaaaa.aaa..", ".aaaaaaaaaaaaaa.", "aaaaaaaaaaaaaaaa", ".bbbbbbbbbbbbbb."],
  ["...aaa.....", ".aaaaaaaa..", "aaaaaaaaaaa", ".bbbbbbbbb."]
];
const RN_TREE_SPR = {
  pine: ["....a....", "...aab...", "...abb...", "..aabbb..", "...abb...", "..aabbb..", ".aaabbbb.", "..aabbb..", ".aaabbbb.", "aaaabbbbb", "....c....", "....c...."],
  cactus: ["...ab...", "...ab...", "a..ab...", "ab.ab.a.", "abbab.ab", ".abab.ab", "...abbb.", "...ab...", "...ab...", "...ab..."],
  crystal: ["....a.....", "...ab..a..", "...ab.ab..", "a..ab.ab..", "ab.abbab.a", "ab.abbabab", "abbabbabab"]
};
const RN_LAYERS = [];
function rnBuildLayers(idx) {
  const th = RN_THEMES[idx], W = RN_CVW, H = RN_GROUND, rnd = rnRng(97 + idx * 131);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  // Cielo: degradado por escalones (8 bandas) con tramado en cada borde.
  const [sky, s] = mk(W, H), bands = 8, bh = H / bands;
  for (let i = 0; i < bands; i++) {
    s.fillStyle = rnMix(th.sky, th.sky2, i / (bands - 1)); s.fillRect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1);
    if (i) { s.fillStyle = rnMix(th.sky, th.sky2, (i - 1) / (bands - 1)); const y = Math.floor(i * bh); for (let x = (i % 2) * 2; x < W; x += 4) s.fillRect(x, y, 2, 2); }
  }
  if (idx === 0) { pxCircle(s, 380, 34, 15, '#ffe9a8'); pxCircle(s, 380, 34, 11, '#fff6d6'); }
  if (idx === 1) { pxCircle(s, 400, 30, 11, '#f4f0d8'); pxCircle(s, 405, 26, 9, rnMix(th.sky, th.sky2, 0.1)); }
  if (idx === 1 || idx === 3) {
    for (let i = 0; i < 46; i++) { s.fillStyle = rnd() < 0.3 ? '#fff4e0' : (idx === 3 ? '#8fd6f0' : '#b8c0e0'); s.fillRect((rnd() * W) | 0, (rnd() * H * 0.55) | 0, 2, 2); }
  }
  // Colinas: suma de senos con periodos enteros → el mosaico empata en los bordes.
  const hills = (color, hi, base, amp, k, seedOff, jag) => {
    const [c, x] = mk(W, H); const p1 = rnd() * 6.28, p2 = rnd() * 6.28;
    for (let px = 0; px < W; px += 4) {
      const a = px / W * Math.PI * 2;
      let hgt = Math.sin(a * k + p1) * amp + Math.sin(a * (k * 2 + 1) + p2) * amp * 0.45;
      if (jag) hgt = -Math.abs(Math.sin(a * (k + 3) + p1)) * amp * 1.6 + amp * 0.4;
      const y = Math.round((base - hgt) / 2) * 2;
      x.fillStyle = color; x.fillRect(px, y, 4, H - y);
      if (hi) { x.fillStyle = hi; x.fillRect(px, y, 4, 2); if ((px / 4 + seedOff) % 3 === 0) x.fillRect(px, y + 2, 2, 2); }
    }
    return c;
  };
  const far = hills(th.far, null, idx === 3 ? 96 : 112, idx === 3 ? 22 : 16, 2, 0, idx === 3);
  const near = hills(th.near, th.nearHi, 132, 10, 3, 1, false);
  // Capa media: cactus / edificios / pinos / cristales y estalactitas.
  const [mid, m] = mk(W, H);
  const put = (spr, px, py) => { m.drawImage(spr, px, py); if (px + spr.width > W) m.drawImage(spr, px - W, py); };
  if (idx === 1) {
    let bx = 0;
    while (bx < W - 10) {
      const bw = 22 + ((rnd() * 4) | 0) * 6, bhh = 34 + ((rnd() * 6) | 0) * 8, top = H - bhh;
      m.fillStyle = '#1c1f2e'; m.fillRect(bx, top, bw, bhh);
      m.fillStyle = '#252a3c'; m.fillRect(bx, top, 2, bhh);
      for (let wy = top + 6; wy < H - 8; wy += 8) for (let wx = bx + 4; wx < bx + bw - 4; wx += 6) {
        m.fillStyle = rnd() < 0.35 ? '#ffd66b' : '#2e3450'; m.fillRect(wx, wy, 2, 4);
      }
      bx += bw + 4 + ((rnd() * 3) | 0) * 6;
    }
  } else {
    const kind = idx === 0 ? 'cactus' : idx === 2 ? 'pine' : 'crystal';
    const pal = idx === 0 ? { a: '#6f9a55', b: '#527a40' } : idx === 2 ? { a: '#3e7a4a', b: '#2c5c38', c: '#4a3420' } : { a: '#8fd6f0', b: '#4f8fc0' };
    // Se funden con el color de las colinas para que no se confundan con los obstáculos.
    Object.keys(pal).forEach(k => { pal[k] = rnMix(pal[k], th.near, idx === 2 ? 0.2 : 0.5); });
    const spr = sprite(RN_TREE_SPR[kind], pal, 2), spr2 = idx === 2 ? sprite(RN_TREE_SPR[kind], pal, 3) : spr;
    const n = idx === 2 ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const big = rnd() < 0.4, sp = big ? spr2 : spr;
      put(sp, ((i + rnd() * 0.7) * W / n) | 0, H - sp.height + (idx === 2 ? 2 : -8));
    }
    if (idx === 3) {
      for (let px = 0; px < W; px += 12) {
        const len = 4 + ((rnd() * 6) | 0) * 4;
        for (let y = 0; y < len; y += 2) { const w = Math.max(2, Math.round((1 - y / len) * 8 / 2) * 2); m.fillStyle = y < 2 ? '#3a4478' : '#2f3866'; m.fillRect(px + 4 - w / 2, y, w, 2); }
      }
    }
  }
  // Suelo: franja superior (pasto/arena/acera/hielo) con borde irregular y tierra con piedritas.
  const GH = RN_CVH - RN_GROUND, [gnd, g] = mk(W, GH);
  g.fillStyle = th.ground; g.fillRect(0, 0, W, GH);
  for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.6 ? th.speck : th.speckHi; g.fillRect(((rnd() * W) >> 1) << 1, 8 + (((rnd() * (GH - 10)) >> 1) << 1), rnd() < 0.3 ? 4 : 2, 2); }
  for (let i = 0; i < 8; i++) { const px = ((rnd() * W) >> 1) << 1, py = 14 + (((rnd() * 18) >> 1) << 1); g.fillStyle = th.speckHi; g.fillRect(px, py, 6, 4); g.fillStyle = th.speck; g.fillRect(px, py + 4, 6, 2); g.fillRect(px + 6, py + 2, 2, 2); }
  g.fillStyle = th.top; g.fillRect(0, 0, W, 4);
  for (let px = 0; px < W; px += 2) { const d = ((px * 7 + (px >> 3) * 5) % 5 < 2) ? 2 : 0; g.fillStyle = th.top; g.fillRect(px, 4, 2, d); if (d) { g.fillStyle = th.topDk; g.fillRect(px, 4 + d, 2, 2); } }
  if (idx === 2) { g.fillStyle = th.topDk; for (let px = 0; px < W; px += 6) g.fillRect(px + (px % 12 ? 2 : 0), 0, 2, 2); }
  if (idx === 1) { g.fillStyle = th.topDk; for (let px = 0; px < W; px += 32) g.fillRect(px, 0, 2, 4); g.fillStyle = '#c9a640'; for (let px = 8; px < W; px += 48) g.fillRect(px, 22, 20, 2); }
  if (idx === 0) { g.fillStyle = th.topDk; for (let px = 0; px < W; px += 24) g.fillRect(px + 4, 12 + (px % 48 ? 10 : 0), 10, 2); }
  if (idx === 3) { g.fillStyle = '#ffffff'; for (let px = 0; px < W; px += 18) g.fillRect(px, 0, 4, 2); }
  return (RN_LAYERS[idx] = { sky, far, near, mid, gnd, clouds: RN_CLOUD_SPR.map(r => sprite(r, { a: th.cloud, b: th.cloudSh }, 2)) });
}
const rnLayers = idx => RN_LAYERS[idx] || rnBuildLayers(idx);
const RN_PIX_COLS = 16, RN_PIX_ROWS = 8;
const RN_PIX_ORDER = (() => {
  const arr = [];
  for (let r = 0; r < RN_PIX_ROWS; r++) for (let c = 0; c < RN_PIX_COLS; c++) arr.push([r, c]);
  for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
})();
export const RN = {
  state: 'idle', y: 0, vy: 0, onGround: true, duck: false, duckHeld: false,
  speed: RN_BASE_SPEED, dist: 0, obstacles: [], spawnCd: 60, themeIdx: 0, themeStage: 0, pendingTheme: 0,
  transitionT: 0, t: 0, nextPlatformAt: 220
};
const rnMeters = () => Math.floor(RN.dist / RN_PX_PER_M);
function rnReset() {
  RN.y = 0; RN.vy = 0; RN.onGround = true; RN.duck = false;
  RN.speed = RN_BASE_SPEED; RN.dist = 0; RN.obstacles = []; RN.spawnCd = 60;
  RN.themeIdx = 0; RN.themeStage = 0; RN.t = 0;
  RN.nextPlatformAt = 220 + Math.random() * 120;
}
function rnStart() { rnReset(); RN.state = 'playing'; $('#rn-over').hidden = true; SFX.play('start'); }
export function rnJumpPress() {
  if (RN.state !== 'playing') { if (RN.state !== 'transition') rnStart(); return; }
  if (RN.onGround) { RN.vy = -RN_JUMP_V; RN.onGround = false; SFX.play('bump'); }
}
function rnLB() { LB.render($('#rn-lb'), 'runner', false, r => r.score + ' M'); }
function rnGameOver() {
  RN.state = 'over';
  const m = rnMeters();
  $('#rn-over-p').textContent = `LOGRASTE ESCAPAR ${m} M`;
  $('#rn-over').hidden = false;
  SFX.play('lose');
  LB.submit('runner', m, false).then(rnLB);
}
function rnSpawnPlatformSection() {
  let x = RN_CVW + 10;
  const count = 3 + ((Math.random() * 3) | 0);
  // Un salto completo recorre esta distancia a la velocidad actual: la plataforma entre
  // huecos tiene que ser al menos así de ancha, si no, el salto que libra un hueco cae
  // directo en el siguiente (obligaría a saltar con precisión de cuadro por cuadro).
  const jumpDist = RN.speed * (2 * RN_JUMP_V / RN_GRAVITY);
  for (let i = 0; i < count; i++) {
    const gapW = 46 + Math.random() * 18;
    RN.obstacles.push({ type: 'pit', x, w: gapW });
    const platformW = Math.max(90, jumpDist - gapW + 30 + Math.random() * 20);
    x += gapW + platformW;
  }
  RN.spawnCd = (x - RN_CVW) + 120;
}
function rnSpawnObstacle() {
  const m = rnMeters();
  const roll = Math.random();
  if (m > 60 && roll < 0.28) {
    RN.obstacles.push({ type: 'air', x: RN_CVW + 10, w: 24, h: RN_GROUND - 24 });
  } else if (m > 25 && roll < 0.52) {
    RN.obstacles.push({ type: 'pit', x: RN_CVW + 10, w: 36 + Math.random() * 28 });
  } else {
    const kinds = [{ w: 14, h: 24 }, { w: 22, h: 32 }, { w: 30, h: 22 }, { w: 16, h: 40 }];
    const k = kinds[(Math.random() * kinds.length) | 0];
    RN.obstacles.push({ type: 'ground', x: RN_CVW + 10, w: k.w, h: k.h });
  }
}
function rnCheckHit() {
  const bodyH = RN.duck ? RN_DUCK_H : RN_STAND_H;
  const top = RN_GROUND + RN.y - bodyH, bottom = RN_GROUND + RN.y;
  const cx0 = RN_CHAR_X - 8, cx1 = RN_CHAR_X + 8;
  for (const o of RN.obstacles) {
    if (o.type === 'pit') {
      // Zona mortal más angosta que el dibujo: RN_PIT_MARGIN px menos por lado.
      if (RN.onGround && cx1 > o.x + RN_PIT_MARGIN && cx0 < o.x + o.w - RN_PIT_MARGIN) return true;
      continue;
    }
    if (cx1 < o.x || cx0 > o.x + o.w) continue;
    let oTop, oBottom;
    if (o.type === 'ground') { oBottom = RN_GROUND; oTop = RN_GROUND - o.h; }
    else { oBottom = RN_GROUND - 24; oTop = oBottom - o.h; }
    if (top < oBottom && bottom > oTop) return true;
  }
  return false;
}
export function rnStep(dt) {
  RN.t += dt;
  if (RN.state === 'transition') {
    RN.transitionT += dt * 1000;
    if (RN.transitionT >= RN_TRANS_TOTAL) {
      RN.themeIdx = RN.pendingTheme; RN.state = 'playing'; RN.spawnCd = 220;
    }
    return;
  }
  RN.speed = Math.min(RN_MAX_SPEED, RN_BASE_SPEED + rnMeters() * 0.25);
  RN.dist += RN.speed * dt;
  if (!RN.onGround) {
    RN.vy += RN_GRAVITY * dt; RN.y += RN.vy * dt;
    if (RN.y >= 0) { RN.y = 0; RN.vy = 0; RN.onGround = true; }
  }
  RN.duck = RN.onGround && RN.duckHeld;
  RN.spawnCd -= RN.speed * dt;
  if (RN.spawnCd <= 0) {
    if (rnMeters() >= RN.nextPlatformAt) {
      rnSpawnPlatformSection();
      RN.nextPlatformAt = rnMeters() + 300 + Math.random() * 250;
    } else { rnSpawnObstacle(); RN.spawnCd = 150 + Math.random() * 130; }
  }
  for (let i = RN.obstacles.length - 1; i >= 0; i--) {
    const o = RN.obstacles[i]; o.x -= RN.speed * dt;
    if (o.x < -40) RN.obstacles.splice(i, 1);
  }
  if (rnCheckHit()) return rnGameOver();
  const stage = Math.floor(rnMeters() / RN_THEME_METERS);
  if (stage > RN.themeStage) {
    RN.themeStage = stage; RN.pendingTheme = stage % RN_THEMES.length;
    RN.state = 'transition'; RN.transitionT = 0; RN.obstacles = [];
    SFX.play('go');
  }
}
function rnDrawPixelate(ctx, progress, color) {
  const cw = RN_CVW / RN_PIX_COLS, ch = RN_CVH / RN_PIX_ROWS;
  const count = Math.floor(Math.max(0, Math.min(1, progress)) * RN_PIX_ORDER.length);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) { const [r, c] = RN_PIX_ORDER[i]; ctx.fillRect(c * cw, r * ch, cw + 1, ch + 1); }
}
function rnDrawBg(ctx, theme, themeIdx) {
  const L = rnLayers(themeIdx), W = RN_CVW;
  const tile = (img, f, y) => { const off = Math.floor(RN.dist * f) % W; ctx.drawImage(img, -off, y); ctx.drawImage(img, W - off, y); };
  ctx.drawImage(L.sky, 0, 0);
  // Nubes: avanzan despacio aunque el zorro esté quieto (RN.t) y con parallax suave.
  L.clouds.forEach((c, i) => {
    for (let k = 0; k < 2; k++) {
      const span = W + 60, base = i * 170 + k * 250 + 30;
      const cx = Math.floor((((base - RN.dist * 0.04 - RN.t * (6 + i * 3)) % span) + span) % span) - 40;
      ctx.drawImage(c, cx, 14 + ((i * 23 + k * 31) % 46));
    }
  });
  tile(L.far, 0.06, 0);
  tile(L.near, 0.14, 0);
  tile(L.mid, 0.3, 0);
  tile(L.gnd, 1, RN_GROUND);
}
function rnDrawGroundObstacle(ctx, o, themeIdx) {
  const gx = o.x, gy = RN_GROUND - o.h, w = o.w, h = o.h;
  if (themeIdx === 0) {
    ctx.fillStyle = '#3f7d44';
    ctx.fillRect(gx + w * 0.35, gy, w * 0.3, h);
    ctx.fillRect(gx, gy + h * 0.35, w * 0.35, w * 0.35);
    ctx.fillRect(gx + w * 0.65, gy + h * 0.2, w * 0.35, w * 0.3);
    ctx.fillStyle = '#2c5c34';
    for (let i = 4; i < h; i += 6) ctx.fillRect(gx + w * 0.35 - 1, gy + i, 2, 2);
  } else if (themeIdx === 1) {
    ctx.fillStyle = '#e8823c';
    ctx.beginPath(); ctx.moveTo(gx + w / 2, gy); ctx.lineTo(gx + w, gy + h); ctx.lineTo(gx, gy + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(gx + w * 0.2, gy + h * 0.55, w * 0.6, h * 0.14);
  } else if (themeIdx === 2) {
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(gx, gy, w, h);
    ctx.fillStyle = '#4a2f1c'; ctx.fillRect(gx + 2, gy + h * 0.25, w - 4, 2); ctx.fillRect(gx + 2, gy + h * 0.6, w - 4, 2);
  } else {
    ctx.fillStyle = '#bfe6f2';
    ctx.beginPath(); ctx.moveTo(gx + w / 2, gy); ctx.lineTo(gx + w, gy + h * 0.5); ctx.lineTo(gx + w * 0.7, gy + h); ctx.lineTo(gx + w * 0.3, gy + h); ctx.lineTo(gx, gy + h * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eaf9ff'; ctx.fillRect(gx + w * 0.45, gy + h * 0.15, w * 0.12, h * 0.45);
  }
}
function rnDrawAirObstacle(ctx, o, themeIdx) {
  const bottom = RN_GROUND - 24, x = o.x, w = o.w;
  if (themeIdx === 0) {
    ctx.fillStyle = '#4c7a3f'; ctx.fillRect(x + w / 2 - 3, 0, 6, bottom - 10);
    ctx.fillStyle = '#3f7d44'; ctx.fillRect(x, bottom - 14, w, 14);
  } else if (themeIdx === 1) {
    ctx.fillStyle = '#2c2f3a'; ctx.fillRect(x + w / 2 - 2, 0, 4, bottom - 16);
    ctx.fillStyle = '#e8823c'; ctx.fillRect(x, bottom - 16, w, 16);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(x + w / 2 - 3, bottom - 13, 6, 4);
  } else if (themeIdx === 2) {
    ctx.fillStyle = '#5c3a1e'; ctx.fillRect(x + w * 0.3, 0, w * 0.4, bottom - 12);
    ctx.fillStyle = '#3f7d44'; ctx.fillRect(x, bottom - 18, w, 18);
  } else {
    ctx.fillStyle = '#bfe6f2';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 0.5, bottom); ctx.closePath(); ctx.fill();
  }
}
function rnDrawPit(ctx, o, theme) {
  // Hueco 8-bit visto de lado: paredes de tierra (izquierda iluminada, derecha
  // en sombra), interior que se oscurece por escalones con tramado entre ellos
  // y el borde de pasto/arena/acera/hielo que cuelga hacia adentro.
  const x0 = Math.round(o.x / 2) * 2, w = Math.round(o.w / 2) * 2, y0 = RN_GROUND, H = RN_CVH - RN_GROUND, [c1, c2, c3, c4] = theme.pit;
  const x1 = x0 + w;
  ctx.fillStyle = c4; ctx.fillRect(x0, y0, w, H);
  ctx.fillStyle = c2; ctx.fillRect(x0, y0, w, 10);
  ctx.fillStyle = c3; ctx.fillRect(x0 + 6, y0 + 10, w - 12, 10);
  for (let x = x0; x < x1; x += 4) {
    ctx.fillStyle = c2; ctx.fillRect(x, y0 + 10, 2, 2);
    ctx.fillStyle = c3; ctx.fillRect(x + 2, y0 + 20, 2, 2);
  }
  // Paredes: se angostan por escalones hacia el fondo.
  const wallL = [8, 6, 4, 2], wallR = [6, 4, 2, 2];
  for (let i = 0; i < 4; i++) {
    const y = y0 + i * 10;
    ctx.fillStyle = i < 2 ? c1 : c2; ctx.fillRect(x0, y, wallL[i], 10);
    ctx.fillStyle = i < 2 ? c2 : c3; ctx.fillRect(x1 - wallR[i], y, wallR[i], 10);
  }
  ctx.fillStyle = theme.speckHi; ctx.fillRect(x0, y0 + 4, 2, 14); ctx.fillRect(x0 + 2, y0 + 12, 2, 2);
  ctx.fillStyle = c3; ctx.fillRect(x0 + 4, y0 + 16, 2, 2); ctx.fillRect(x1 - 4, y0 + 8, 2, 2); ctx.fillRect(x0 + 2, y0 + 26, 2, 2);
  ctx.fillStyle = c4; ctx.fillRect(x1 - 2, y0 + 4, 2, 6);
  // Borde que sobresale sobre el hueco.
  ctx.fillStyle = theme.top;
  ctx.fillRect(x0, y0, 6, 4); ctx.fillRect(x1 - 6, y0, 6, 4);
  ctx.fillRect(x0 + 6, y0, 2, 2); ctx.fillRect(x1 - 8, y0, 2, 2);
  ctx.fillRect(x0 + 2, y0 + 4, 2, 2); ctx.fillRect(x1 - 4, y0 + 4, 2, 2);
  ctx.fillStyle = theme.topDk;
  ctx.fillRect(x0 + 4, y0 + 4, 2, 2); ctx.fillRect(x1 - 6, y0 + 4, 2, 2);
  ctx.fillRect(x0 + 2, y0 + 6, 2, 2); ctx.fillRect(x1 - 4, y0 + 6, 2, 2);
  // Raíces (o carámbanos en la cueva) colgando del borde.
  ctx.fillStyle = theme === RN_THEMES[3] ? '#dff4fb' : theme.speckHi;
  ctx.fillRect(x0 + 8, y0 + 2, 2, 6); ctx.fillRect(x0 + 10, y0 + 8, 2, 2);
  ctx.fillRect(x1 - 10, y0 + 2, 2, 4);
  if (w > 44) { ctx.fillRect(x0 + (w >> 1), y0, 2, 4); }
}
function rnDrawObstacles(ctx, themeIdx) {
  const theme = RN_THEMES[themeIdx];
  RN.obstacles.forEach(o => {
    if (o.type === 'pit') rnDrawPit(ctx, o, theme);
    else if (o.type === 'ground') rnDrawGroundObstacle(ctx, o, themeIdx);
    else rnDrawAirObstacle(ctx, o, themeIdx);
  });
}
function rnDrawChar(ctx) {
  const x = RN_CHAR_X, gy = Math.round(RN_GROUND + RN.y);
  let spr, bob = 0;
  if (RN.duck) spr = RN_FOX_SPR.duck[Math.floor(RN.dist / 12) % 2];
  else if (!RN.onGround) spr = RN.vy < 0 ? RN_FOX_SPR.up : RN_FOX_SPR.down;
  else if (RN.state === 'playing' || RN.state === 'transition') {
    const f = RN_RUN_CYCLE[Math.floor(RN.dist / 14) % RN_RUN_CYCLE.length];
    spr = RN_FOX_SPR[f]; bob = f === 'a' ? -2 : 0;
  } else spr = RN_FOX_SPR.b;
  // El hitbox (x ± 8) queda sobre el pecho y las patas delanteras; la cola va detrás.
  ctx.drawImage(spr, x - (RN.duck ? 40 : 38), gy - spr.height + bob);
}
export function rnDraw() {
  const cv = $('#rn-cv'); if (!cv || !cv.offsetParent) return;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.textAlign = 'center';
  if (RN.state === 'transition') {
    const cur = RN_THEMES[RN.themeIdx], next = RN_THEMES[RN.pendingTheme];
    if (RN.transitionT < RN_TRANS_OUT) {
      rnDrawBg(ctx, cur, RN.themeIdx); rnDrawObstacles(ctx, RN.themeIdx); rnDrawChar(ctx);
      rnDrawPixelate(ctx, RN.transitionT / RN_TRANS_OUT, cur.ground);
    } else if (RN.transitionT < RN_TRANS_OUT + RN_TRANS_HOLD) {
      ctx.fillStyle = next.sky2; ctx.fillRect(0, 0, RN_CVW, RN_CVH);
      ctx.fillStyle = '#fff4e0'; ctx.font = '15px "Press Start 2P"'; ctx.fillText(next.n, RN_CVW / 2, RN_CVH / 2);
    } else {
      rnDrawBg(ctx, next, RN.pendingTheme); rnDrawChar(ctx);
      const p = 1 - (RN.transitionT - RN_TRANS_OUT - RN_TRANS_HOLD) / RN_TRANS_IN;
      rnDrawPixelate(ctx, p, next.ground);
    }
    $('#rn-status').textContent = ''; $('#rn-score').textContent = rnMeters() + ' M';
    return;
  }
  const theme = RN_THEMES[RN.themeIdx];
  rnDrawBg(ctx, theme, RN.themeIdx);
  rnDrawObstacles(ctx, RN.themeIdx);
  rnDrawChar(ctx);
  if (RN.state === 'idle') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, RN_CVW, RN_CVH);
    ctx.fillStyle = '#fff4e0'; ctx.font = '11px "Press Start 2P"';
    ctx.fillText('ESPACIO O TOCA PARA EMPEZAR', RN_CVW / 2, RN_CVH / 2);
  }
  $('#rn-score').textContent = rnMeters() + ' M';
  $('#rn-status').textContent = RN.state === 'playing' ? theme.n : '';
}
$('#rn-cv').addEventListener('pointerdown', e => { e.preventDefault(); rnJumpPress(); });
$('#rn-jump-btn').addEventListener('pointerdown', e => { e.preventDefault(); rnJumpPress(); });
const rnDuckBtn = $('#rn-duck-btn');
rnDuckBtn.addEventListener('pointerdown', e => { e.preventDefault(); RN.duckHeld = true; });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => rnDuckBtn.addEventListener(ev, () => { RN.duckHeld = false; }));
$('#rn-again').onclick = () => { SFX.play('start'); rnStart(); };
rnLB();
// $('#rn-exit') se conecta desde arcade.html (necesita goTab, que no vive en un archivo aparte todavía).
