// Portadas de los juegos del Arcade: el dibujo de cada miniatura (tarjetas del menú) y de la pantalla de inicio de cada juego.
import { scaled, pxCircle, SPR } from './core.js';
import { vspr, soldier, BL_R, blBallImg, crDrawFrog, tgt, RN_FOX_SPR } from './compartido-juegos.js';

export function drawSplash(g, c) {
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const put = (img, px, py, s) => x.drawImage(img, Math.round(px), Math.round(py), img.width * s, img.height * s);
  if (g === 'tetris') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#0b0c18'; x.fillRect(0, 0, 160, 72);
    const bl = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 8, 8); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(X, Y, 8, 1); x.fillRect(X, Y, 1, 8); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(X, Y + 7, 8, 1); x.fillRect(X + 7, Y, 1, 8); };
    const pz = (X, Y, col, f) => f.forEach(([i, j]) => bl(X + i * 8, Y + j * 8, col));
    pz(28, 40, '#ef7d57', [[0,0],[1,0],[2,0],[2,-1]]); pz(52, 48, '#73eff7', [[0,0],[1,0],[2,0],[3,0]]); pz(84, 48, '#ffcd75', [[0,0],[1,0],[0,-1],[1,-1]]);
    pz(100, 40, '#b55fd0', [[0,0],[1,0],[2,0],[1,-1]]); pz(124, 48, '#38b764', [[0,0],[1,0],[1,-1],[2,-1]]); pz(36, 56, '#b13e53', [[0,0],[1,0],[1,1],[2,1]]); pz(18, 8, '#3b5dc9', [[0,0],[0,1],[0,2],[1,2]]);
    pz(120, 4, '#b55fd0', [[0,0],[1,0],[2,0],[1,1]]); pz(66, 10, '#ffcd75', [[0,0],[1,0],[0,1],[1,1]]);
  } else if (g === 'minas') {
    c.width = 160; c.height = 72;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) {
      const X = 8 + i * 16, Y = 6 + j * 16, open = (i + j * 3) % 4 === 1;
      x.fillStyle = open ? '#94b0c2' : '#566c86'; x.fillRect(X, Y, 15, 15);
      if (!open) { x.fillStyle = '#8aa0b8'; x.fillRect(X, Y, 15, 2); x.fillRect(X, Y, 2, 15); x.fillStyle = '#29304a'; x.fillRect(X, Y + 13, 15, 2); x.fillRect(X + 13, Y, 2, 15); }
    }
    x.fillStyle = 'rgba(26,28,44,.55)'; x.fillRect(0, 0, 160, 72);
    put(SPR.mine, 18, 12, 5); put(SPR.flag, 100, 16, 5);
    x.font = '16px "Press Start 2P"'; x.fillStyle = '#3b5dc9'; x.fillText('1', 70, 30); x.fillStyle = '#38b764'; x.fillText('2', 76, 58); x.fillStyle = '#b13e53'; x.fillText('3', 140, 66);
  } else if (g === 'batalla') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#257179'; x.fillRect(0, 0, 160, 72);
    x.fillStyle = '#2f8b93'; for (let i = 0; i < 40; i++) x.fillRect((i * 37) % 160, (i * 23) % 72, 6, 1);
    const ship = (X, Y, L) => {
      x.fillStyle = '#566c86'; x.fillRect(X, Y + 8, L, 8); x.fillStyle = '#94b0c2'; x.fillRect(X + 4, Y + 8, L - 8, 3);
      x.fillStyle = '#333c57'; x.fillRect(X + 2, Y + 16, L - 4, 3); x.fillStyle = '#94b0c2'; x.fillRect(X + L / 3, Y, L / 4, 8); x.fillStyle = '#1a1c2c'; x.fillRect(X + L / 3 + 3, Y + 3, 3, 2); x.fillRect(X + L / 3 + 9, Y + 3, 3, 2);
      x.fillStyle = '#f4f4f4'; x.fillRect(X - 4, Y + 18, 6, 1); x.fillRect(X + L - 2, Y + 18, 8, 1);
    };
    ship(14, 10, 64); ship(92, 40, 48);
    put(SPR.boom, 100, 4, 3); put(SPR.splash, 30, 42, 3); put(SPR.splash, 130, 12, 2);
  } else if (g === 'tiro') {
    c.width = 200; c.height = 72;
    x.fillStyle = '#41a6f6'; x.fillRect(0, 0, 200, 50); x.fillStyle = '#73eff7'; x.fillRect(0, 36, 200, 14);
    x.fillStyle = '#38b764'; x.fillRect(0, 50, 200, 22); x.fillStyle = '#a7f070'; x.fillRect(0, 50, 200, 2);
    put(SPR.llama, 4, 50 - 64 + 14, 2);
    put(SPR.erizo, 70, 50 - 48 + 18, 2);
    put(tgt, 140, 6, 2);
    x.fillStyle = '#a7f070'; x.fillRect(66, 17, 3, 3); x.fillRect(88, 12, 3, 3); x.fillRect(110, 11, 3, 3);
    x.fillStyle = '#5a3a22'; for (let k = 0; k < 5; k++) x.fillRect(118 + k, 34 - k, 1, 1);
  } else if (g === 'funciones') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#1f4d3a'; x.fillRect(0, 0, 160, 72);
    x.fillStyle = '#2c6b50'; for (let i = 0; i < 160; i += 16) x.fillRect(i, 0, 1, 72); for (let j = 0; j < 72; j += 16) x.fillRect(0, j, 160, 1);
    x.fillStyle = '#a7f070'; x.fillRect(80, 0, 1, 72); x.fillRect(0, 40, 160, 1);
    pxCircle(x, 70, 20, 7, '#29304a'); pxCircle(x, 70, 20, 6, '#566c86');
    x.fillStyle = '#41a6f6';
    for (let i = 0; i <= 118; i++) { const X = 18 + i, Y = 52 - 16 * Math.sin(i / 19) - i * .12; x.fillRect(X, Math.round(Y), 2, 2); }
    put(scaled(soldier(0), 1), 10, 47, 2); put(scaled(soldier(1), 1), 132, 32, 2); put(scaled(soldier(1), 1), 120, 56, 2);
    put(SPR.boom, 128, 24, 3);
  } else if (g === 'carreras') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#38b764'; x.fillRect(0, 0, 160, 72);
    x.fillStyle = '#566c86'; x.fillRect(0, 14, 160, 46);
    x.fillStyle = '#f4f4f4'; for (let i = 0; i < 160; i += 12) { x.fillRect(i, 14, 6, 2); x.fillRect(i + 6, 58, 6, 2); }
    x.fillStyle = '#b13e53'; for (let i = 6; i < 160; i += 12) { x.fillRect(i, 14, 6, 2); x.fillRect(i - 6, 58, 6, 2); }
    for (let j = 0; j < 23; j++) for (let i = 0; i < 3; i++) { x.fillStyle = (i + j) % 2 ? '#1a1c2c' : '#f4f4f4'; x.fillRect(130 + i * 2, 16 + j * 2, 2, 2); }
    put(vspr(0, 0), 16, 16, 3); put(vspr(1, 1), 60, 30, 3); put(vspr(2, 2), 22, 40, 3);
  } else if (g === '21') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#0b3d2e'; x.fillRect(0, 0, 160, 72);
    x.strokeStyle = '#d4af37'; x.lineWidth = 3; x.strokeRect(5, 5, 150, 62);
    const cardMini = (X, Y, rot, txt, red) => {
      x.save(); x.translate(X, Y); x.rotate(rot);
      x.fillStyle = '#f4f4f4'; x.fillRect(-15, -20, 30, 40);
      x.fillStyle = red ? '#b13e53' : '#1a1c2c';
      x.font = '11px "Press Start 2P"'; x.textAlign = 'left'; x.fillText(txt, -11, -6);
      x.restore();
    };
    cardMini(54, 42, -0.18, 'A♠', false);
    cardMini(76, 38, 0.12, 'K♥', true);
    x.fillStyle = '#ffcd75'; x.font = '18px "Press Start 2P"'; x.textAlign = 'center'; x.fillText('21', 122, 46);
    pxCircle(x, 26, 20, 7, '#d4af37'); pxCircle(x, 26, 20, 5, '#0b3d2e');
    pxCircle(x, 132, 16, 5, '#d4af37'); pxCircle(x, 132, 16, 3, '#0b3d2e');
  } else if (g === 'billar') {
    c.width = 160; c.height = 72;
    const r = (rx, ry, w, h, col) => { x.fillStyle = col; x.fillRect(rx, ry, w, h); };
    r(0, 0, 160, 72, '#2a170c'); r(1, 1, 158, 70, '#6b4226'); r(1, 1, 158, 1, '#a0703f'); r(1, 1, 1, 70, '#a0703f'); // marco de madera
    r(5, 5, 150, 62, '#2a170c'); r(6, 6, 148, 60, '#0b5d3e'); r(6, 6, 148, 1, '#1a8a5c');                              // banda
    r(8, 8, 144, 56, '#14784f');
    for (let py = 8; py < 64; py += 2) for (let px = 8; px < 152; px += 2) {                                             // textura del paño
      const n = (px * 7 + py * 13) % 11; if (n === 0) r(px, py, 2, 2, '#168258'); else if (n === 5) r(px, py, 2, 2, '#11704a');
    }
    [30, 55, 105, 130].forEach(dx => { r(dx, 2, 2, 2, '#efe3c2'); r(dx, 68, 2, 2, '#efe3c2'); });                      // rombos
    [28, 36, 44].forEach(dy => { r(2, dy, 2, 2, '#efe3c2'); r(156, dy, 2, 2, '#efe3c2'); });
    [[8, 8], [80, 8], [152, 8], [8, 64], [80, 64], [152, 64]].forEach(([px, py]) => {
      pxCircle(x, px, py, 9, '#1a0e07'); pxCircle(x, px, py, 8, '#4a3019'); pxCircle(x, px, py, 6, '#050505');
    });
    // las mismas bolas sombreadas del juego (blBallImg) y un taco
    const ball = (px, py, num) => x.drawImage(blBallImg(num), px - BL_R, py - BL_R);
    ball(70, 40, 8); ball(90, 30, 9); ball(100, 48, 3); ball(46, 36, 0);
    for (let i = 0; i < 40; i++) {
      const sx = 38 - i, sy = 33 - Math.round(i * .12);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(sx + 1, sy + 2, 2, 2);
      x.fillStyle = i < 2 ? '#6fb1e8' : i < 4 ? '#f4f4f4' : i < 28 ? (i % 2 ? '#f0cf8e' : '#e6c27c') : '#6b3d1e'; x.fillRect(sx, sy, 2, 2);
    }
  } else if (g === 'duelo') {
    c.width = 160; c.height = 72;
    const grad = x.createLinearGradient(0, 0, 0, 72);
    grad.addColorStop(0, '#f2a65a'); grad.addColorStop(.55, '#e8834f'); grad.addColorStop(1, '#c96a3e');
    x.fillStyle = grad; x.fillRect(0, 0, 160, 72);
    x.fillStyle = 'rgba(255,235,180,.85)'; pxCircle(x, 80, 18, 9, '#fff4e0');
    x.fillStyle = '#8a5a3c'; x.fillRect(0, 52, 160, 20);
    const cowboy = (px, col) => {
      x.fillStyle = col; x.fillRect(px - 5, 20, 10, 26); pxCircle(x, px, 14, 6, col);
      x.fillRect(px - 9, 9, 18, 4); x.fillRect(px - 4, 3, 8, 7); x.fillRect(px - 2, 46, 4, 8);
    };
    cowboy(46, '#241c18'); cowboy(114, '#3a2a1e');
    x.fillStyle = '#ffe14d'; x.font = '13px "Press Start 2P"'; x.textAlign = 'center'; x.fillText('¡YA!', 80, 40);
  } else if (g === 'runner') {
    c.width = 160; c.height = 72;
    const grad = x.createLinearGradient(0, 0, 0, 72);
    grad.addColorStop(0, '#f2c675'); grad.addColorStop(1, '#f6dca0');
    x.fillStyle = grad; x.fillRect(0, 0, 160, 72);
    x.fillStyle = '#caa15b'; x.fillRect(0, 56, 160, 16);
    x.fillStyle = '#3f7d44';
    x.fillRect(110, 30, 6, 26); x.fillRect(104, 38, 6, 7); x.fillRect(116, 34, 6, 7);
    x.fillStyle = '#2c5c34'; x.fillRect(112, 34, 2, 2); x.fillRect(112, 44, 2, 2);
    const fox = RN_FOX_SPR.b; x.drawImage(fox, 34 - fox.width / 2, 58 - fox.height); // mismo zorro que en el juego
    x.fillStyle = '#ffe14d'; x.font = '8px "Press Start 2P"'; x.textAlign = 'center'; x.fillText('LA HUIDA DEL ZORRO', 80, 16);
  } else if (g === 'golf') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#1f4d3a'; x.fillRect(0, 0, 160, 72);
    x.fillStyle = '#38b764'; x.fillRect(8, 8, 144, 56);
    x.fillStyle = '#e8c170'; x.fillRect(58, 42, 26, 16);
    pxCircle(x, 128, 28, 8, '#0a0a0a'); pxCircle(x, 128, 28, 6, '#123018');
    x.fillStyle = '#caa15b'; x.fillRect(127, 6, 2, 22);
    x.fillStyle = '#e83b3b'; x.fillRect(129, 6, 11, 7);
    pxCircle(x, 28, 50, 5, '#f4f4f4');
  } else if (g === 'cruce') {
    c.width = 160; c.height = 72;
    x.fillStyle = '#2f8b93'; x.fillRect(0, 0, 160, 24);
    x.fillStyle = '#8a5a3c'; x.fillRect(20, 6, 26, 10); x.fillRect(90, 14, 30, 10);
    x.fillStyle = '#38b764'; x.fillRect(0, 24, 160, 10);
    x.fillStyle = '#333c57'; x.fillRect(0, 34, 160, 30);
    x.fillStyle = '#f4f4f4'; for (let i = 6; i < 160; i += 16) x.fillRect(i, 48, 8, 2);
    x.fillStyle = '#b13e53'; x.fillRect(30, 36, 22, 10); x.fillStyle = '#73eff7'; x.fillRect(32, 37, 6, 4); x.fillRect(42, 37, 6, 4);
    x.fillStyle = '#41a6f6'; x.fillRect(110, 56, 22, 10); x.fillStyle = '#73eff7'; x.fillRect(112, 57, 6, 4); x.fillRect(122, 57, 6, 4);
    x.fillStyle = '#38b764'; x.fillRect(0, 64, 160, 8);
    crDrawFrog(x, 70, 51, '#a7f070');
    x.fillStyle = '#ffe14d'; x.font = '8px "Press Start 2P"'; x.textAlign = 'center'; x.fillText('CRUZAR LA CALLE', 80, 18);
  }
}
