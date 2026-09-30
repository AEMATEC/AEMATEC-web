/* Golf: bossa nova suave "de ascensor". Do mayor, 100 bpm, 16 compases (sección A + sección B), ~38 s.
   Armonía: A = Cmaj9 Am9 Dm9 G13 | Em7 A7 Dm9 G7   B = Fmaj9 Em7 Dm9 G7 | Cmaj9 Am7 Dm7 G7sus */
const M7 = [0, 4, 7, 14], m7 = [0, 3, 7, 14], D7 = [0, 4, 7, 10];
// Un compás de acompañamiento: golpes de bossa en los pasos 0, 6 y 10.
const comp = n => `${n} . . . . . ${n} . . . ${n} . . . . .`;
const bajo = (r, q) => `${r} - - - - - ${q} - ${r} - - - - - ${q} -`;

const armonia = [
  ['C4', M7], ['A3', m7], ['D4', m7], ['G3', D7], ['E4', m7], ['A3', D7], ['D4', m7], ['G3', D7],
  ['F3', M7], ['E4', m7], ['D4', m7], ['G3', D7], ['C4', M7], ['A3', m7], ['D4', m7], ['G3', D7],
];
// Un canal para acordes mayores/dominantes y otro para menores (cada uno con su arpegio); el otro queda en silencio.
const canalComp = (tipo) => armonia.map(([n, a]) => (a === tipo || (tipo === M7 && a === D7) ? comp(n) : '. '.repeat(16).trim())).join(' | ');

export default {
  titulo: 'Green Suave',
  bpm: 100,
  pasos: 4,
  swing: 0.08,
  canales: [
    { onda: 'pulso25', vol: .046, env: 'sostenido', vib: 12, notas: `
      E5 - - - - - - - G5 - - - - - D5 - |
      C5 - - - - - - - B4 - - - A4 - - - |
      D5 - - - - - E5 - F5 - - - - - E5 - |
      D5 - - - - - - - B4 - - - . . . . |
      G5 - - - - - E5 - D5 - - - - - E5 - |
      C#5 - - - - - - - E5 - - - D5 - C#5 - |
      D5 - - - - - F5 - A5 - - - - - - - |
      G5 - - - F5 - - - E5 - - - D5 - - - |
      A5 - - - - - - - G5 - - - - - E5 - |
      G5 - - - - - - - E5 - - - - - D5 - |
      F5 - - - - - - - E5 - - - D5 - - - |
      D5 - - - - - E5 - F5 - - - - - D5 - |
      E5 - - - - - G5 - - - - - E5 - D5 - |
      C5 - - - - - E5 - - - - - D5 - C5 - |
      D5 - - - - - F5 - - - E5 - D5 - - - |
      B4 - - - - - - - D5 - - - - - . . |` },
    { onda: 'pulso12', vol: .026, env: 'punteado', ar: M7, notas: canalComp(M7) },
    { onda: 'pulso12', vol: .026, env: 'punteado', ar: m7, notas: canalComp(m7) },
    { onda: 'triangle', vol: .08, notas: [
      ['C2', 'G2'], ['A1', 'E2'], ['D2', 'A2'], ['G1', 'D2'], ['E2', 'B2'], ['A1', 'E2'], ['D2', 'A2'], ['G1', 'D2'],
      ['F2', 'C3'], ['E2', 'B2'], ['D2', 'A2'], ['G1', 'D2'], ['C2', 'G2'], ['A1', 'E2'], ['D2', 'A2'], ['G1', 'D2'],
    ].map(([r, q]) => bajo(r, q)).join(' | ') },
    { onda: 'ruido', vol: .012, notas: Array(16).fill('h . . . h . . . h . . . h . . h').join(' | ') },
  ],
};
