/* Buscaminas: "Marcha del campo minado". Re menor, 120 bpm, 16 compases (32 s).
   Marcha de guerra: tambor de caja constante, bajo al galope y trompeta con ritmo de fanfarria.
   A (1-8): Dm Dm Bb A | Dm Dm Gm A. B (9-16): Bb C Dm A | Bb Gm A Dm, más aguda; cada 4 compases un redoble. */
const ACORDES = ['D2', 'D2', 'Bb2', 'A2', 'D2', 'D2', 'G2', 'A2', 'Bb2', 'C3', 'D2', 'A2', 'Bb2', 'G2', 'A2', 'D2'];
const trompeta = [
  // A: la fanfarria llama (1-4) y responde (5-8)
  'D4 - . D4 D4 - A4 - - - F4 - A4 - - -', 'D5 - - - C5 - A4 - F4 - - - . . . .',
  'Bb4 - . Bb4 Bb4 - D5 - - - C5 - Bb4 - - -', 'A4 - - - E5 - - - C#5 - - - . . . .',
  'D4 - . D4 D4 - A4 - - - F4 - A4 - - -', 'F5 - - - E5 - D5 - A4 - - - D5 - - -',
  'G4 - . G4 G4 - Bb4 - D5 - - - C5 - Bb4 -', 'A4 - - - C#5 - E5 - A5 - - - . . . .',
  // B: carga al agudo (9-16)
  'D5 - . D5 D5 - F5 - - - D5 - Bb4 - - -', 'E5 - . E5 E5 - G5 - - - E5 - C5 - - -',
  'F5 - - - A5 - - - F5 - - - D5 - - -', 'E5 - - - C#5 - - - A4 - - - . . . .',
  'D5 - F5 - Bb5 - - - A5 - F5 - D5 - - -', 'G5 - F5 - D5 - Bb4 - G4 - . . D5 - - -',
  'A5 - . A5 A5 - G5 - F5 - E5 - D5 - C#5 -', 'D5 - - - A4 - - - D4 - - - . . . .',
];
const galope = ACORDES.map(r => `${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r}`).join(' | ');
const golpes = ACORDES.map(r => `${r.replace('2', '3')} - - - . . . . ${r.replace('2', '3')} - - - . . . .`).join(' | ');
// Caja de marcha; el último compás de cada frase de 4 lleva redoble.
const marcha = 'k . x x s . x x k . x x s . x x';
const redoble = 'k . x x s x s x s x s x s s s s';
const tambor = ACORDES.map((_, i) => i % 4 === 3 ? redoble : marcha).join(' | ');

export default {
  titulo: 'Marcha del campo minado',
  bpm: 120,
  pasos: 4,
  swing: 0,
  canales: [
    { onda: 'pulso25', vol: .06, env: 'sostenido', vib: 8, notas: trompeta.join(' | ') },
    { onda: 'pulso12', vol: .03, env: 'punteado', ar: [0, 7, 12], notas: golpes },
    { onda: 'triangle', vol: .09, notas: galope },
    { onda: 'ruido', vol: .045, notas: tambor },
  ],
};
