/* La Huida del Zorro: Do mayor, 140 bpm, 16 compases (~27 s).
   A (1-8): I-V-vi-IV dos veces, la 2.ª frase responde y sube. B (9-16): IV-V-iii-vi, IV-V-I-V,
   que termina en V y empalma con el Do del inicio. */
const acordes = [ // [raíz grave, nota del acorde, arpegio]
  ['C', 'C4', [0, 4, 7]], ['G', 'G4', [0, 4, 7]], ['A', 'A3', [0, 3, 7]], ['F', 'F4', [0, 4, 7]],
  ['C', 'C4', [0, 4, 7]], ['G', 'G4', [0, 4, 7]], ['A', 'A3', [0, 3, 7]], ['F', 'F4', [0, 4, 7]],
  ['F', 'F4', [0, 4, 7]], ['G', 'G4', [0, 4, 7]], ['E', 'E4', [0, 3, 7]], ['A', 'A3', [0, 3, 7]],
  ['F', 'F4', [0, 4, 7]], ['G', 'G4', [0, 4, 7]], ['C', 'C4', [0, 4, 7]], ['G', 'G4', [0, 4, 7]],
];
const bajo = acordes.map(([r]) => {
  const o = r === 'A' || r === 'E' || r === 'G' ? 2 : 2;
  return `${r}${o} . ${r}${o + 1} . ${r}${o} . ${r}${o + 1} . ${r}${o} . ${r}${o + 1} . ${r}${o} ${r}${o + 1} ${r}${o} .`;
}).join(' | ');
const armonia = acordes.map(([, n]) => `. . ${n} - . . ${n} - . . ${n} - . . ${n} -`).join(' | ');
const bateria = acordes.map((_, i) => i === 15
  ? 'k . h . s . h . k . s s s s s s' : 'k . h . s . h . k . h k s . h .').join(' | ');
const melodia = [
  'G4 - . G4 C5 - E5 - G5 - - - E5 - D5 -',
  'D5 - . D5 G5 - B4 - D5 - - - . . B4 D5',
  'E5 - . E5 A5 - E5 - C6 - - - B5 - A5 -',
  'A5 - . F5 A5 - C6 - A5 - - - G5 - F5 -',
  'E5 - . E5 G5 - C6 - E6 - - - D6 - C6 -',
  'B5 - . B5 D6 - B5 - G5 - - - A5 - B5 -',
  'C6 - B5 A5 - E5 - A5 - C6 - E6 - - - -',
  'A5 - . A5 C6 - A5 - F5 - - - . . G5 A5',
  'C6 - . C6 A5 - C6 - F6 - - - E6 - D6 -',
  'D6 - . D6 B5 - D6 - G6 - - - F6 - E6 -',
  'E6 - . E6 B5 - G5 - B5 - E6 - D6 - B5 -',
  'C6 - . E6 A5 - C6 - E6 - - - . . D6 E6',
  'F6 - . E6 F6 - A6 - G6 - F6 - E6 - D6 -',
  'D6 - . B5 D6 - G6 - F6 - - - D6 - B5 -',
  'C6 - E6 - G6 - - - E6 - . . C6 - - -',
  'D6 - . D6 B5 - G5 - B5 - D6 - . . G5 -',
].join(' | ');

export default {
  titulo: 'Huida por el desierto',
  bpm: 140,
  pasos: 4,
  swing: 0,
  canales: [
    { onda: 'pulso25', vol: .06, env: 'sostenido', vib: 10, notas: melodia },
    { onda: 'pulso12', vol: .028, env: 'punteado', ar: [0, 7, 12], notas: armonia },
    { onda: 'triangle', vol: .08, notas: bajo },
    { onda: 'ruido', vol: .04, notas: bateria },
  ],
};
