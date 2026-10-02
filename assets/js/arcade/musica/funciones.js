// Combate de Funciones: "Meditación en Re menor". Barroco a dos voces sobre bajo de Alberti, 20 compases.
// Compás = 16 pasos. A (1-8) y B en Fa mayor (9-16) y A' (17-20) con cadencia final que empalma con el inicio.
const ACORDES = { // [bajo, quinta grave, tercera, quinta alta] para el Alberti; bajo continuo en 2 octavas
  Dm: ['D3', 'A3', 'F3', 'A3', 'D2', 'A2'], Gm: ['G3', 'D4', 'Bb3', 'D4', 'G2', 'D3'],
  A: ['A3', 'E4', 'C#4', 'E4', 'A2', 'E3'], Bb: ['Bb3', 'F4', 'D4', 'F4', 'Bb2', 'F3'],
  F: ['F3', 'C4', 'A3', 'C4', 'F2', 'C3'], C: ['C3', 'G3', 'E3', 'G3', 'C2', 'G2'],
  Am: ['A3', 'E4', 'C4', 'E4', 'A2', 'E3'],
};
const ARMONIA = 'Dm Gm Dm A Dm Bb Gm A F C Dm Am Bb Gm A A Dm Gm A Dm'.split(' ');
const alberti = ARMONIA.map(a => ACORDES[a].slice(0, 4).join(' ').repeat(1)).map(g => `${g} ${g} ${g} ${g}`).join(' | ');
const bajo = ARMONIA.map(a => `${ACORDES[a][4]} - - - - - - - ${ACORDES[a][5]} - - - - - - -`).join(' | ');

const melodia = `
F4 - - - | A4 - D5 - | F5 - - - | E5 - D5 - |
Bb4 - - - | D5 - - - | C5 - Bb4 - | A4 - G4 - |
F4 - A4 - | D5 - - - | E5 - F5 - | F5 - E5 - |
E5 - - - | C#5 - D5 - | E5 - A4 - | A4 - - - |
F4 - - - | A4 - D5 - | F5 - - - | G5 - A5 - |
D5 - F5 - | Bb5 - - - | A5 - G5 - | F5 - D5 - |
G5 - - - | Bb4 - D5 - | G5 - F5 - | E5 - D5 - |
C#5 - - - | E5 - - - | A5 - G5 - | F5 - E5 - |
A4 - C5 - | F5 - - - | E5 - F5 - | A5 - - - |
G5 - E5 - | C5 - - - | D5 - E5 - | G5 - - - |
F5 - - - | D5 - F5 - | A5 - - - | G5 - F5 - |
E5 - - - | C5 - E5 - | A5 - - - | G5 - E5 - |
D5 - - - | F5 - D5 - | Bb4 - D5 - | F5 - - - |
D5 - - - | Bb4 - G4 - | Bb4 - D5 - | G5 - F5 - |
E5 - - - | A4 - C#5 - | E5 - - - | G5 - E5 - |
F5 - E5 - | D5 - C#5 - | E5 - - - | - - - - |
F4 - - - | A4 - D5 - | F5 - - - | E5 - D5 - |
Bb4 - - - | D5 - - - | C5 - Bb4 - | A4 - G4 - |
E5 - - - | C#5 - D5 - | E5 - G5 - | F5 - E5 - |
D5 - - - | - - - - | A4 - - - | - - - - |`.replace(/\n/g, ' ').trim();

export default {
  titulo: 'Meditación en Re menor',
  bpm: 72, pasos: 4, swing: 0,
  canales: [
    { onda: 'pulso25', vol: .062, env: 'sostenido', vib: 12, notas: melodia },
    { onda: 'pulso12', vol: .03, env: 'punteado', notas: alberti },
    { onda: 'triangle', vol: .078, notas: bajo },
  ],
};
