/* Batalla Naval: canto marinero épico en re dórico (D E F G A B C), 84 bpm, 16 compases (~46 s).
   A (1-8): la voz llama y el mar responde. B (9-16): sube al agudo y vuelve a la tónica para empalmar. */
const M = [ // melodía: 16 pasos por compás
  'D4 - - - A4 - - - F4 - - - E4 - D4 -', 'F4 - - - G4 - - - A4 - - - - - - -',
  'G4 - - - E4 - - - C5 - - - B4 - A4 -', 'G4 - - - E4 - - - G4 - - - - - - -',
  'D5 - - - B4 - - - G4 - - - A4 - B4 -', 'A4 - - - G4 - - - D4 - - - - - - -',
  'E4 - - - A4 - - - C5 - - - B4 - A4 -', 'A4 - - - - - E4 - A4 - - - - - - -',
  'A4 - C5 - D5 - - - C5 - A4 - F4 - - -', 'A4 - C5 - F5 - - - E5 - D5 - C5 - - -',
  'E5 - - - G5 - - - E5 - - - D5 - C5 -', 'D5 - - - E5 - - - C5 - - - - - - -',
  'B4 - D5 - G5 - - - F5 - E5 - D5 - B4 -', 'C5 - E5 - A5 - - - G5 - E5 - C5 - - -',
  'D5 - - - F5 - - - E5 - - - D5 - C5 -', 'D5 - - - A4 - - - F4 - - - E4 - - -',
];
const ACORDES = [ // [raíz grave, quinta, raíz media] por compás
  ['D2', 'A2', 'D3'], ['D2', 'A2', 'D3'], ['C2', 'G2', 'C3'], ['C2', 'G2', 'C3'],
  ['G2', 'D3', 'G3'], ['G2', 'D3', 'G3'], ['A2', 'E3', 'A3'], ['A2', 'E3', 'A3'],
  ['F2', 'C3', 'F3'], ['F2', 'C3', 'F3'], ['C2', 'G2', 'C3'], ['C2', 'G2', 'C3'],
  ['G2', 'D3', 'G3'], ['A2', 'E3', 'A3'], ['D2', 'A2', 'D3'], ['D2', 'A2', 'D3'],
];
const bajo = ACORDES.map(([r, q]) => `${r} - - - - - - - ${q} - - - ${r} - - -`).join(' | ');
const bordon = ACORDES.map(([, , m]) => `${m} - - - - - - - - - - - - - - -`).join(' | ');
const tambor = ACORDES.map((_, i) => i % 2
  ? 'k . . . . . x . k . . . x . x .'
  : 'k . . . . . x . k . . . . . . .').map((p, i) => i % 4 === 3 ? p.replace(/\.$/, 'o') : p).join(' | ');

export default {
  titulo: 'Canto del Mar del Norte',
  bpm: 84, pasos: 4, swing: 0,
  canales: [
    { onda: 'pulso25', vol: .052, env: 'sostenido', vib: 14, notas: M.join(' | ') },
    { onda: 'pulso12', vol: .019, env: 'punteado', ar: [0, 7, 12], notas: bordon },
    { onda: 'triangle', vol: .078, notas: bajo },
    { onda: 'ruido', vol: .043, notas: tambor },
  ],
};
