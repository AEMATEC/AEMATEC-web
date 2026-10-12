// Lo que comparten varios juegos del Arcade y las piezas que no viven dentro de uno solo: ayudantes de pantalla (pickRow,
// pedirAbandonar) y sprites/datos que usan a la vez un juego y las miniaturas del menú (portadas.js) o el panel «Records» del
// perfil (arcade.html). Así el menú no depende del código interno de cada juego.
import { sprite, pxCircle } from './core.js';

// Los botones ABANDONAR / SALIR de dentro de una partida piden confirmación: un toque sin querer no debe tirar la partida.
export function pedirAbandonar(salir) { return () => { if (window.confirm('¿ABANDONAR LA PARTIDA?')) salir(); }; }

export function pickRow(el, items, cur, onPick) {
  el.innerHTML = '';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'btn' + (i === cur ? ' on' : '');
    if (it.canvas) b.appendChild(it.canvas);
    if (it.html) { const d = document.createElement('div'); d.innerHTML = it.html; b.appendChild(d); }
    b.onclick = () => onPick(i);
    el.appendChild(b);
  });
}

export const CHARS = [
  { n: 'PACO', hair: '#1a1c2c', skin: '#e8b796', shirt: '#b13e53', helm: '#ffcd75' },
  { n: 'LUNA', hair: '#5d275d', skin: '#f0d0b0', shirt: '#41a6f6', helm: '#f4f4f4' },
  { n: 'RAYO', hair: '#7a4a2a', skin: '#a86a4a', shirt: '#38b764', helm: '#ef7d57' },
];

function vehSprite(ci, vi) {
  const c = document.createElement('canvas'); c.width = 14; c.height = 8;
  const x = c.getContext('2d'), ch = CHARS[ci];
  const f = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  if (vi === 0) {
    f('#1a1c2c', 0, 3, 4, 2); f('#1a1c2c', 10, 3, 4, 2); f('#94b0c2', 3, 3, 8, 2);
    f('#1a1c2c', 10, 1, 1, 6); f(ch.shirt, 5, 1, 4, 6); f(ch.helm, 6, 2, 3, 4);
  } else if (vi === 1) {
    f('#8a5a38', 0, 2, 14, 4); f('#ffcd75', 1, 1, 2, 1); f('#ffcd75', 11, 1, 2, 1); f('#ffcd75', 1, 6, 2, 1); f('#ffcd75', 11, 6, 2, 1);
    f(ch.shirt, 3, 2, 8, 4); f(ch.helm, 5, 2, 4, 4);
  } else {
    f('#f4f4f4', 1, 0, 8, 2); f('#f4f4f4', 1, 6, 8, 2); f('#1a1c2c', 2, 1, 1, 1); f('#1a1c2c', 7, 1, 1, 1); f('#1a1c2c', 2, 7, 1, 1); f('#1a1c2c', 7, 7, 1, 1);
    f(ch.shirt, 4, 1, 4, 6); f(ch.helm, 5, 2, 3, 4);
  }
  return c;
}

const VSPR = {};

export const vspr = (ci, vi) => VSPR[ci + '_' + vi] || (VSPR[ci + '_' + vi] = vehSprite(ci, vi));

export const TEAMC = ['#41a6f6', '#ef7d57', '#a7f070', '#ffcd75'];

const SOLD = {};

export function soldier(team) {
  if (SOLD[team]) return SOLD[team];
  const c = document.createElement('canvas'); c.width = 7; c.height = 9;
  const x = c.getContext('2d'), col = TEAMC[team];
  const f = (k, a, b, w, h) => { x.fillStyle = k; x.fillRect(a, b, w, h); };
  f(col, 1, 0, 5, 2); f('#1a1c2c', 0, 2, 7, 1); f('#f0c8a0', 1, 3, 5, 2); f('#1a1c2c', 4, 3, 1, 1);
  f(col, 1, 5, 5, 2); f('#f4f4f4', 5, 5, 2, 1); f('#333c57', 1, 7, 2, 2); f('#333c57', 4, 7, 2, 2);
  return SOLD[team] = c;
}

const DIG = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '-': '000000111000000', 'x': '000101010101000', 'y': '101101111001111', 'π': '111101101101101', '/': '001001010100100' };

export function tinyText(g, str, x, y, col) {
  g.fillStyle = col;
  [...str].forEach((ch, k) => { const b = DIG[ch]; if (!b) return; for (let i = 0; i < 15; i++) if (b[i] === '1') g.fillRect(x + k * 4 + (i % 3), y + ((i / 3) | 0), 1, 1); });
}

export const BL_R = 7, BL_POCKET_R = 12, BL_FRICTION = 170, BL_MAXV = 900, BL_REST = 0.9;

const BL_COLORS = {
  1: '#e3b619', 2: '#1e5fbf', 3: '#c81e2c', 4: '#6a2c91', 5: '#e0700a', 6: '#1f7a3d', 7: '#7a2e1a', 8: '#1a1c2c',
  9: '#e3b619', 10: '#1e5fbf', 11: '#c81e2c', 12: '#6a2c91', 13: '#e0700a', 14: '#1f7a3d', 15: '#7a2e1a',
};

const blStripe = n => n >= 9 && n <= 15;

// Pintar una bola pixel por pixel son cientos de fillRect; blDraw corre en cada fotograma con 16 bolas, y eso
// era lo que daba tirones. Cada bola (y la mesa con sus agujeros) se pinta UNA vez en un canvas aparte y luego
// solo se copia con drawImage. Se ve idéntico: las posiciones ya se redondeaban al píxel.
// Aclara (t > 0, mezcla con blanco) u oscurece (t < 0, mezcla con negro) un color '#rrggbb'.
function blShade(hex, t) {
  const n = parseInt(hex.slice(1), 16), k = t < 0 ? 0 : 255, a = Math.abs(t);
  const ch = s => Math.round(((n >> s) & 255) * (1 - a) + k * a);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Bola con luz desde arriba a la izquierda: tres tonos (claro, base, sombra), contorno negro, disco blanco con el
// número, brillo y una sombra suave sobre el paño. Se pinta una sola vez (ver blBallImg).
function blPaintBall(g, cx, cy, num) {
  const R = BL_R, base = num === 0 ? '#f4f4f4' : BL_COLORS[num], stripe = blStripe(num);
  const dentro = (x, y, r) => x * x + y * y <= r * r + r * .6;
  g.fillStyle = 'rgba(0,0,0,.28)';
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (dentro(x - 1, y - 2, R)) g.fillRect(cx + x, cy + y, 1, 1);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    if (!dentro(x, y, R)) continue;
    if (!dentro(x, y, R - 1)) { g.fillStyle = '#0a0a0a'; g.fillRect(cx + x, cy + y, 1, 1); continue; }
    const luz = (-x * .6 - y * .8) / R; // > 0 mira a la luz
    const t = luz > .5 ? .35 : luz < -.6 ? -.5 : luz < -.25 ? -.28 : 0;
    g.fillStyle = blShade(stripe ? (Math.abs(y) <= 2 ? base : '#f4f4f4') : base, t);
    g.fillRect(cx + x, cy + y, 1, 1);
  }
  if (num !== 0) {
    g.fillStyle = '#f4f4f4';
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (dentro(x, y, 3)) g.fillRect(cx + x, cy + y, 1, 1);
    const str = String(num); tinyText(g, str, cx - str.length * 2, cy - 2, BL_COLORS[num]);
  }
  g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(cx - 4, cy - 4, 2, 2); g.fillRect(cx - 2, cy - 5, 1, 1);
}

const blBallImgs = {};

export function blBallImg(num) {
  if (blBallImgs[num]) return blBallImgs[num];
  const c = document.createElement('canvas'); c.width = BL_R * 2 + 2; c.height = BL_R * 2 + 3; // margen derecho/abajo para la sombra
  blPaintBall(c.getContext('2d'), BL_R, BL_R, num);
  return blBallImgs[num] = c;
}

export function crDrawFrog(ctx, x, y, color) {
  const gx = Math.round(x), gy = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(gx - 9, gy + 6, 18, 4);
  ctx.fillStyle = color;
  ctx.fillRect(gx - 11, gy + 1, 5, 6); ctx.fillRect(gx + 6, gy + 1, 5, 6);
  ctx.fillRect(gx - 9, gy - 7, 5, 6); ctx.fillRect(gx + 4, gy - 7, 5, 6);
  pxCircle(ctx, gx, gy, 8, color);
  pxCircle(ctx, gx - 4, gy - 6, 3, color); pxCircle(ctx, gx + 4, gy - 6, 3, color);
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(gx - 5, gy - 7, 2, 2); ctx.fillRect(gx + 3, gy - 7, 2, 2);
}

export const TRACKS = [
  { n: 'PARQUE', pal: { g1: '#38b764', g2: '#2f9e56', road: '#566c86', road2: '#4f637c', deco: 'tree' },
    pts: [[70, 55], [190, 38], [315, 50], [352, 115], [320, 190], [220, 204], [160, 170], [95, 205], [38, 160], [36, 95]] },
  { n: 'BOSQUE', pal: { g1: '#257179', g2: '#1f6269', road: '#8a6a4a', road2: '#7d5f42', deco: 'pine' },
    pts: [[45, 45], [140, 32], [190, 100], [245, 35], [345, 42], [352, 120], [285, 135], [345, 180], [320, 212], [190, 205], [130, 150], [75, 205], [30, 170], [70, 110]] },
  { n: 'PLAYA', pal: { g1: '#ffcd75', g2: '#efb95f', road: '#566c86', road2: '#4f637c', deco: 'palm' },
    pts: [[40, 60], [110, 30], [185, 70], [255, 30], [345, 50], [330, 115], [255, 125], [215, 165], [290, 170], [340, 205], [190, 212], [110, 175], [40, 205], [25, 130]] },
  // Lago helado: fuera del circuito no hay césped sino hielo resbaloso (ver RC_ICE en drive()).
  { n: 'LAGO HELADO', ice: true, pal: { g1: '#c2ecf5', g2: '#a9dcea', road: '#566c86', road2: '#4f637c', deco: 'ice', curb: ['#41a6f6', '#f4f4f4'] },
    pts: [[50, 40], [150, 30], [230, 55], [300, 30], [350, 70], [340, 130], [280, 120], [240, 150], [300, 180], [330, 215], [220, 212], [150, 190], [90, 215], [35, 190], [60, 130], [30, 90]] },
];

// Claves: 'carrera_{i}' = mejor vuelta (la de siempre); 'carrera_{i}_total' = tiempo total. Menor es mejor.
export const rcLbKey = (i, m) => 'carrera_' + i + (m === 'total' ? '_total' : '');

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

/* Modo interno 'cont' = "DIANA CONTINUA". Su puntaje es ACIERTOS × PRECISIÓN%, con la precisión redondeada a
   entero (la misma que se ve en el HUD): p. ej. 30 aciertos en 40 disparos → 75% → 30 × 75 = 2250 puntos.
   Como cambió la escala, usa la clave de tabla 'tiro_diana' (la vieja 'tiro' ya no se muestra). */
// Exportado para que el panel "Records" de perfiles (arcade.html) sepa qué claves de tabla existen,
// sin tener que repetir esta lista a mano en otro archivo.
export const MODES = {
  cont: { n: 'DIANA CONTINUA', key: 'tiro_diana', help: 'EL BLANCO SE MUEVE SIN PARAR Y CADA VEZ MÁS RÁPIDO.<br>PUNTOS = ACIERTOS × PRECISIÓN % (SE REDONDEA A ENTERO)' },
  uno:  { n: 'UNO A UNO', key: 'tiro_uno', help: 'APARECEN BLANCOS AL AZAR QUE SE MUEVEN CADA VEZ MÁS RÁPIDO: DESAPARECEN SI LOS ACIERTAS O SI SE ACABA SU TIEMPO.<br>AMARILLO 10 · ROJO 5 · BLANCO 3 · BORDE 1' },
};

export const tgt = document.createElement('canvas');
tgt.width = 29;
