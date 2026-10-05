// Prueba mínima de la puntería del bot de Batalla Naval: node tests/batalla-cpu.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const h = fs.readFileSync(new URL('../arcade.html', import.meta.url), 'utf8');
const grab = (a, b) => h.slice(h.indexOf(a), h.indexOf(b));
const src = grab('const SHIPS = [', 'const BS_LVLS') + grab('function shipCells(', 'function occ(') + grab('function sunkIds(', 'function mkGrid(') + grab('function cpuPick(', 'function cpuShoot(');
const { cpuPick } = new Function(src + '; return { cpuPick };')();
const board = Array(100).fill('.'); [43, 44, 45].forEach(k => board[k] = '2'); // crucero horizontal en la fila 4
const b = board.join('');
for (let n = 0; n < 200; n++) for (const lvl of [1, 2]) {
  assert.ok([43 - 1, 45].includes(cpuPick(b, [43, 44], lvl)), 'tras 2 aciertos seguidos solo dispara en la línea');
  // extremo izquierdo ya fallado: solo queda el derecho
  assert.equal(cpuPick(b, [43, 44, 42], lvl), 45);
  // hundido el crucero, queda otro acierto suelto (77): solo se atacan sus vecinos
  const b2 = board.slice(); b2[77] = '4'; b2[78] = '4';
  assert.ok([67, 87, 76, 78].includes(cpuPick(b2.join(''), [43, 44, 45, 77], lvl)), 'conserva el acierto sin resolver');
}
console.log('batalla-cpu: ok');
