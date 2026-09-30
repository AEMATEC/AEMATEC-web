/* Duelo del Oeste: spaghetti western en Re menor, 96 bpm, 16 compases (unos 40 s por vuelta).
   Trompeta/silbido solista con vibrato, guitarra punteada, bajo al galope (bum-ba-dum) y caja lejana.
   Acordes por compás: A = Dm Dm Bb A | Dm Gm A Dm ; B = Gm Dm Bb A | Dm Gm A Dm. */
const guitarra = {
  Dm: 'D3 . A3 . D4 . F4 . D4 . A3 . D4 . A3 .',
  Gm: 'G2 . D3 . G3 . Bb3 . G3 . D3 . G3 . D3 .',
  Bb: 'Bb2 . F3 . Bb3 . D4 . Bb3 . F3 . Bb3 . F3 .',
  A: 'A2 . E3 . A3 . C#4 . A3 . E3 . A3 . E3 .',
};
const bajo = {
  Dm: 'D2 . D2 D2 | D2 . D2 D2 | D2 . D2 D2 | A2 . A2 A2',
  Gm: 'G2 . G2 G2 | G2 . G2 G2 | G2 . G2 G2 | D2 . D2 D2',
  Bb: 'Bb2 . Bb2 Bb2 | Bb2 . Bb2 Bb2 | Bb2 . Bb2 Bb2 | F2 . F2 F2',
  A: 'A2 . A2 A2 | A2 . A2 A2 | A2 . A2 A2 | E2 . E2 E2',
};
const acordes = 'Dm Dm Bb A Dm Gm A Dm Gm Dm Bb A Dm Gm A Dm'.split(' ');

export default {
  titulo: 'Mediodía en Polvo',
  bpm: 96,
  pasos: 4,
  swing: 0,
  canales: [
    { // trompeta solista
      onda: 'pulso25', vol: .06, env: 'sostenido', vib: 14,
      notas: `
        A4 - - - D5 - - - C5 - A4 - G4 - - -
        A4 - - - F4 - G4 - A4 - - - . . . .
        D5 - - - F5 - - - E5 - D5 - C5 - - -
        E5 - - - C#5 - - - E5 - - - . . . .
        A4 - - - D5 - - - C5 - A4 - G4 - - -
        Bb4 - - - D5 - - - C5 - Bb4 - A4 - - -
        C#5 - D5 - E5 - - - F5 - E5 - C#5 - - -
        D5 - - - . . . . A4 . . . . . . .
        G5 - - - - - F5 - G5 - - - Bb5 - - -
        A5 - - - - - G5 - F5 - - - D5 - - -
        F5 - - - - - E5 - D5 - - - Bb4 - - -
        A4 - - - C#5 - - - E5 - - - G5 - - -
        F5 - - - E5 - D5 - A4 - - - . . . .
        Bb4 - - - A4 - G4 - D5 - - - . . . .
        E5 - - - . . E5 E5 C#5 - D5 - E5 - - -
        D5 - - - - - - - A4 - - - - - - -`,
    },
    { // guitarra punteada
      onda: 'pulso12', vol: .05, env: 'punteado',
      notas: acordes.map(a => guitarra[a]).join('\n'),
    },
    { // bajo al galope
      onda: 'triangle', vol: .09,
      notas: acordes.map(a => bajo[a]).join('\n'),
    },
    { // caja lejana
      onda: 'ruido', vol: .03,
      notas: 'k . x x . . x x s . x x . . x x',
    },
  ],
};
