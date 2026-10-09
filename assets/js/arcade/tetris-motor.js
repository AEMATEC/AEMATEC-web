// Reglas del Tetris del Arcade (tetris.html), sin nada de pantalla ni de Firebase, para poder probarlas con Node
// (tests/tetris.test.js). El dibujo, el teclado y las salas en línea están en tetris.js.
//
// Para jugar 1 contra 1 las dos personas reciben las MISMAS piezas: la bolsa de 7 se mezcla con una semilla que
// guarda la sala. La "basura" que llega del rival se cuenta con totales (cuántas líneas ha enviado en toda la
// partida), así que nunca se pierde ni se aplica dos veces aunque una lectura de Firestore llegue repetida.

export const COLS = 10, ROWS = 20;
export const TIPOS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
export const CODIGO = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7, basura: 8 };

const MATRICES = {
  I: ['....', 'XXXX', '....', '....'],
  O: ['XX', 'XX'],
  T: ['.X.', 'XXX', '...'],
  S: ['.XX', 'XX.', '...'],
  Z: ['XX.', '.XX', '...'],
  J: ['X..', 'XXX', '...'],
  L: ['..X', 'XXX', '...']
};

// Celdas [x, y] que ocupa una pieza girada `rot` veces (0 a 3) dentro de su cuadro.
export function celdas(tipo, rot) {
  let m = MATRICES[tipo].map(f => [...f]);
  const n = m.length;
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) m = m.map((_, y) => m[0].map((__, x) => m[n - 1 - x][y]));
  const lista = [];
  m.forEach((fila, y) => fila.forEach((c, x) => { if (c === 'X') lista.push([x, y]); }));
  return lista;
}

export const nuevoTablero = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Generador pseudoaleatorio con semilla (mulberry32): misma semilla, misma serie.
export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Bolsa de 7: cada 7 piezas salen las 7 distintas, en orden mezclado.
export function bolsa(semilla) {
  const r = azar(semilla);
  let cola = [];
  return () => {
    if (!cola.length) {
      cola = [...TIPOS];
      for (let i = cola.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cola[i], cola[j]] = [cola[j], cola[i]]; }
    }
    return cola.pop();
  };
}

// ¿La pieza choca con una pared, el piso o un bloque? Arriba del tablero (y < 0) no hay choque.
export function choca(tab, tipo, rot, x, y) {
  return celdas(tipo, rot).some(([cx, cy]) => {
    const px = x + cx, py = y + cy;
    if (px < 0 || px >= COLS || py >= ROWS) return true;
    return py >= 0 && tab[py][px] !== 0;
  });
}

export const gravedad = nivel => Math.max(0.02, Math.pow(0.8 - (nivel - 1) * 0.007, nivel - 1)); // segundos por fila
export const PUNTOS_LINEAS = [0, 100, 300, 500, 800];
export const BASURA_POR_LINEAS = [0, 0, 1, 2, 4];

// Texto de 200 caracteres (0 vacío, 1 a 7 pieza, 8 basura) para mostrar el tablero del rival.
export function serializar(tab, pieza) {
  const copia = tab.map(f => [...f]);
  if (pieza) celdas(pieza.tipo, pieza.rot).forEach(([cx, cy]) => {
    const px = pieza.x + cx, py = pieza.y + cy;
    if (py >= 0 && py < ROWS && px >= 0 && px < COLS) copia[py][px] = CODIGO[pieza.tipo];
  });
  return copia.map(f => f.join('')).join('');
}
export const deserializar = texto => Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (__, x) => Number(texto[y * COLS + x]) || 0));

const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
const KICKS_I = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

export class Partida {
  constructor(semilla) {
    this.siguiente = bolsa(semilla);
    this.huecos = azar((semilla ^ 0x9E3779B9) >>> 0);
    this.tab = nuevoTablero();
    this.puntos = 0; this.lineas = 0; this.nivel = 1; this.combo = -1;
    this.guardada = null; this.puedeGuardar = true;
    this.vivo = true; this.bajando = false;
    this.enviadas = 0;       // líneas de basura que YO he enviado en total
    this.rivalEnvio = 0;     // líneas de basura que el RIVAL ha enviado en total (lo escribe tetris.js)
    this.recibido = 0;       // de las del rival, cuántas ya se aplicaron o se cancelaron
    this.cola = [];
    for (let i = 0; i < 5; i++) this.cola.push(this.siguiente());
    this.acum = 0; this.suelo = 0; this.movimientos = 0;
    this.ultimo = null;      // resumen de la última pieza fijada (para sonidos y efectos)
    this.aparecer();
  }
  get pendiente() { return Math.max(0, this.rivalEnvio - this.recibido); }

  aparecer() {
    const tipo = this.cola.shift();
    this.cola.push(this.siguiente());
    this.pieza = { tipo, rot: 0, x: tipo === 'O' ? 4 : 3, y: tipo === 'I' ? -1 : 0 };
    this.acum = 0; this.suelo = 0; this.movimientos = 0;
    if (choca(this.tab, tipo, 0, this.pieza.x, this.pieza.y)) this.vivo = false;
  }
  enSuelo() { return choca(this.tab, this.pieza.tipo, this.pieza.rot, this.pieza.x, this.pieza.y + 1); }
  // Cada movimiento exitoso estando en el suelo reinicia la espera de 0,5 s (máximo 15 veces, para no alargarla sin fin).
  reiniciarSuelo() { if (this.enSuelo() && this.movimientos < 15) { this.suelo = 0; this.movimientos++; } }

  mover(dx) {
    if (!this.vivo) return false;
    const p = this.pieza;
    if (choca(this.tab, p.tipo, p.rot, p.x + dx, p.y)) return false;
    p.x += dx; this.reiniciarSuelo();
    return true;
  }
  girar(dir = 1) {
    if (!this.vivo || this.pieza.tipo === 'O') return false;
    const p = this.pieza, rot = (p.rot + dir + 4) % 4;
    for (const [dx, dy] of p.tipo === 'I' ? KICKS_I : KICKS) {
      if (!choca(this.tab, p.tipo, rot, p.x + dx, p.y + dy)) { p.rot = rot; p.x += dx; p.y += dy; this.reiniciarSuelo(); return true; }
    }
    return false;
  }
  bajar() {
    if (!this.vivo) return false;
    const p = this.pieza;
    if (choca(this.tab, p.tipo, p.rot, p.x, p.y + 1)) return false;
    p.y++;
    return true;
  }
  fantasma() {
    const p = this.pieza;
    let y = p.y;
    while (!choca(this.tab, p.tipo, p.rot, p.x, y + 1)) y++;
    return y;
  }
  caer() {
    if (!this.vivo) return;
    let n = 0;
    while (this.bajar()) n++;
    this.puntos += 2 * n;
    this.fijar();
  }
  guardar() {
    if (!this.vivo || !this.puedeGuardar) return false;
    const actual = this.pieza.tipo;
    if (this.guardada) {
      const tipo = this.guardada;
      this.pieza = { tipo, rot: 0, x: tipo === 'O' ? 4 : 3, y: tipo === 'I' ? -1 : 0 };
      if (choca(this.tab, tipo, 0, this.pieza.x, this.pieza.y)) this.vivo = false;
      this.acum = 0; this.suelo = 0; this.movimientos = 0;
    } else { this.cola.push(this.siguiente()); this.aparecerDesdeCola(); }
    this.guardada = actual;
    this.puedeGuardar = false;
    return true;
  }
  aparecerDesdeCola() { // como aparecer(), pero sin sacar una pieza más de la bolsa
    const tipo = this.cola.shift();
    this.pieza = { tipo, rot: 0, x: tipo === 'O' ? 4 : 3, y: tipo === 'I' ? -1 : 0 };
    this.acum = 0; this.suelo = 0; this.movimientos = 0;
    if (choca(this.tab, tipo, 0, this.pieza.x, this.pieza.y)) this.vivo = false;
  }

  // Avanza `dt` segundos: gravedad, caída suave y espera en el suelo.
  tick(dt) {
    if (!this.vivo) return;
    const intervalo = this.bajando ? Math.min(gravedad(this.nivel), 0.03) : gravedad(this.nivel);
    this.acum += dt;
    while (this.acum >= intervalo) {
      this.acum -= intervalo;
      if (this.bajar()) { if (this.bajando) this.puntos += 1; } else { this.acum = 0; break; }
    }
    if (this.enSuelo()) { this.suelo += dt; if (this.suelo >= 0.5) this.fijar(); } else this.suelo = 0;
  }

  fijar() {
    const p = this.pieza;
    let fuera = true;
    celdas(p.tipo, p.rot).forEach(([cx, cy]) => {
      const px = p.x + cx, py = p.y + cy;
      if (py >= 0) { this.tab[py][px] = CODIGO[p.tipo]; fuera = false; }
    });
    if (fuera) { this.vivo = false; return; }
    // limpiar líneas llenas
    const antes = this.tab.length;
    this.tab = this.tab.filter(f => f.some(c => c === 0));
    const n = antes - this.tab.length;
    while (this.tab.length < ROWS) this.tab.unshift(Array(COLS).fill(0));
    const nivelAntes = this.nivel;
    if (n > 0) {
      this.combo++;
      this.puntos += PUNTOS_LINEAS[n] * nivelAntes + (this.combo > 0 ? 50 * this.combo * nivelAntes : 0);
      this.lineas += n;
      this.nivel = 1 + Math.floor(this.lineas / 10);
    } else this.combo = -1;
    // basura: lo que envío primero cancela lo que me falta recibir
    let envio = BASURA_POR_LINEAS[n] + (n > 0 && this.combo >= 4 ? 1 : 0);
    if (envio > 0 && this.pendiente > 0) { const c = Math.min(envio, this.pendiente); envio -= c; this.recibido += c; }
    this.enviadas += envio;
    let recibe = 0;
    if (n === 0 && this.pendiente > 0) { recibe = Math.min(this.pendiente, 8); this.agregarBasura(recibe); this.recibido += recibe; }
    this.ultimo = { lineas: n, envio, recibe, nivelSubio: this.nivel > nivelAntes, combo: this.combo };
    this.puedeGuardar = true;
    if (this.vivo) this.aparecer();
  }

  // Sube `n` filas grises con un hueco al azar; si algún bloque sale por arriba, se acabó la partida.
  agregarBasura(n) {
    for (let i = 0; i < n; i++) {
      const hueco = Math.floor(this.huecos() * COLS);
      const fila = Array.from({ length: COLS }, (_, x) => (x === hueco ? 0 : CODIGO.basura));
      if (this.tab[0].some(c => c !== 0)) this.vivo = false;
      this.tab.shift();
      this.tab.push(fila);
    }
  }
}
