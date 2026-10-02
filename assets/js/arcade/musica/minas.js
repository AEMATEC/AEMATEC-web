/* Buscaminas: "Campo de dudas". La menor, 96 bpm, 16 compases (40 s).
   A (1-8): pregunta y respuesta sobre Am F Dm E. B (9-16): F G Am E, más aguda, para que la vuelta no canse. */
const arpA = [ // arpegio de 8vos, un compás cada uno
  'A3 . E4 . C5 . E4 . A3 . E4 . C5 . E4 .',   // Am
  'F3 . C4 . A4 . C4 . F3 . C4 . A4 . C4 .',   // F
  'D4 . A4 . F4 . A4 . D4 . A4 . F4 . A4 .',   // Dm
  'E4 . B4 . G#4 . B4 . E4 . B4 . G#4 . B4 .', // E
];
const arpB = [ // ritmo 3+3+2 (más inquieto)
  'F3 . . C4 . . A4 . F3 . . C4 . . A4 .',     // F
  'G3 . . D4 . . B4 . G3 . . D4 . . B4 .',     // G
  'A3 . . E4 . . C5 . A3 . . E4 . . C5 .',     // Am
  'E4 . . B4 . . G#4 . E4 . . B4 . . G#4 .',   // E
];
const bajo = {
  Am: 'A2 - - . C3 - - . E3 - - . C3 - - .',
  F: 'F2 - - . A2 - - . C3 - - . A2 - - .',
  Dm: 'D2 - - . F2 - - . A2 - - . F2 - - .',
  E: 'E2 - - . G#2 - - . B2 - - . G#2 - - .',
  G: 'G2 - - . B2 - - . D3 - - . B2 - - .',
};
const melodia = [
  // A: pregunta (1-4)
  'E5 - - - D5 - C5 - B4 - - - C5 - - .',
  'A4 - - - C5 - - - A4 - - - . . . .',
  'D5 - - - F5 - E5 - D5 - - - C5 - - .',
  'B4 - - - G#4 - - - B4 - - - . . . .',
  // A': respuesta (5-8)
  'E5 - - - A5 - G5 - E5 - - - C5 - - .',
  'F5 - - - E5 - C5 - A4 - - - C5 - - .',
  'D5 - - - E5 - F5 - A5 - - - G5 - F5 -',
  'E5 - - - D5 - B4 - G#4 - - - . . . .',
  // B: sube la tensión (9-16)
  'C5 - - - . . A4 - C5 - - - F5 - - .',
  'D5 - - - . . B4 - D5 - - - G5 - - .',
  'E5 - - - . . C5 - E5 - - - A5 - - .',
  'G#5 - - - E5 - - - B4 - - - . . . .',
  'A5 - - - C6 - A5 - F5 - - - A5 - - .',
  'B5 - - - G5 - D5 - B4 - - - D5 - - .',
  'F5 - - - D5 - F5 - A5 - - - G5 - F5 .',
  'E5 - - - D5 - B4 - G#4 - - - . . . .',
];
export default {
  titulo: 'Campo de dudas',
  bpm: 96,
  pasos: 4,
  swing: 0,
  canales: [
    { onda: 'pulso25', vol: .06, env: 'punteado', vib: 12, notas: melodia.join(' | ') },
    { onda: 'pulso12', vol: .03, env: 'punteado',
      notas: [...arpA, ...arpA, ...arpB, ...arpB].join(' | ') },
    { onda: 'triangle', vol: .09,
      notas: [bajo.Am, bajo.F, bajo.Dm, bajo.E, bajo.Am, bajo.F, bajo.Dm, bajo.E,
              bajo.F, bajo.G, bajo.Am, bajo.E, bajo.F, bajo.G, bajo.Dm, bajo.E].join(' | ') },
    { onda: 'ruido', vol: .03, notas: 'k . . . . . h . . . k . . . h .' },
  ],
};
