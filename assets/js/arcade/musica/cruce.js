// Cruzar la Calle: cumbia en La menor, 100 bpm, 16 compases (A x8 + B x8), unos 38 s.
// Progresion: A = Am Am Dm E | Am Am Dm E ; B = Dm E Am Am | Dm E Am E (el E final empuja de vuelta al inicio).
const acordes = 'Am Am Dm E Am Am Dm E Dm E Am Am Dm E Am E'.split(' ');
const bajo = { Am: 'A2 - - . . . . . . . E3 - - . . .', Dm: 'D2 - - . . . . . . . A2 - - . . .', E: 'E2 - - . . . . . . . B2 - - . . .' };
const raiz = { Am: 'A3', Dm: 'D4', E: 'E4' };
const rasgueo = a => `. . ${raiz[a]} . . . ${raiz[a]} . . . ${raiz[a]} . . . ${raiz[a]} .`;
const guira = 'k h x h s h x h k h x h s h x h';

const melodia = [
  // A: pregunta y respuesta
  'E5 - . E5 A5 - G5 E5 D5 - C5 - A4 - . .',
  'C5 . D5 E5 - - . . . . E5 D5 C5 - A4 -',
  'D5 - . D5 F5 - E5 D5 C5 - . . A4 . . .',
  'B4 - . B4 E5 - D5 B4 G#4 - B4 - E5 - - .',
  'E5 - . E5 A5 - G5 E5 D5 - C5 - A4 - . .',
  'C5 . D5 E5 - - G5 - A5 - - . E5 - - .',
  'F5 - . F5 A5 - G5 F5 E5 - D5 - C5 - D5 .',
  'E5 . E5 . D5 . B4 . G#4 - B4 - D5 - E5 -',
  // B: mas aguda y sincopada
  'A5 - A5 . A5 - F5 . D5 - F5 - A5 - . .',
  'G#5 - G#5 . G#5 - E5 . B4 - E5 - G#5 - . .',
  'A5 - A5 . A5 - E5 . C5 - E5 - A5 - G5 -',
  'E5 - D5 - C5 - D5 E5 - - - - . . . .',
  'F5 - F5 . F5 - D5 . A4 - D5 - F5 - . .',
  'E5 - E5 . E5 - B4 . G#4 - B4 - E5 - . .',
  'C6 - . C6 B5 - A5 - G5 - E5 - C5 - D5 -',
  'E5 - . . D5 - B4 . G#4 . B4 . D5 . E5 -',
];

export default {
  titulo: 'Rana Cumbiambera',
  bpm: 100,
  pasos: 4,
  swing: 0.06,
  canales: [
    { onda: 'pulso25', vol: .08, env: 'punteado', vib: 12, notas: melodia.join(' | ') },
    { onda: 'pulso12', vol: .035, env: 'punteado', ar: [0, 7, 12], notas: acordes.map(rasgueo).join(' | ') },
    { onda: 'triangle', vol: .09, notas: acordes.map(a => bajo[a]).join(' | ') },
    { onda: 'ruido', vol: .05, notas: acordes.map(() => guira).join(' | ') },
  ],
};
