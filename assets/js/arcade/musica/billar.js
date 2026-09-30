// Billar: groove funk/rock de transmisión deportiva. Mi menor (dórico/natural), 120 bpm, 16 compases (32 s).
// A (compases 1-8): riff con gancho y respuesta. B (9-16): frase larga y más aguda. Termina en B4 = empalma con el inicio.
const bajo = {
  Em: 'E2 . . E2 . . E2 . | G2 . E2 . D2 . E2 .',
  G: 'G2 . . G2 . . G2 . | B2 . G2 . D3 . B2 .',
  A: 'A2 . . A2 . . A2 . | C3 . A2 . G2 . E2 .',
  C: 'C3 . . C3 . . C3 . | E3 . C3 . G2 . C3 .',
  D: 'D3 . . D3 . . D3 . | F#3 . D3 . A2 . F#2 .',
};
const raiz = { Em: 'E3', G: 'G3', A: 'A3', C: 'C3', D: 'D3' };
const prog = ['Em', 'Em', 'G', 'A', 'Em', 'Em', 'C', 'D', 'C', 'D', 'Em', 'Em', 'C', 'D', 'G', 'A'];
const stab = r => `. . ${r} . . . ${r} . | . . ${r} . . ${r} . .`;

const melodia = [
  'B4 . B4 D5 . B4 . A4 | G4 . A4 B4 . . . .',
  'E5 . D5 . B4 . A4 . | B4 . . . G4 . E4 .',
  'D5 . B4 . G4 . B4 . | D5 . . E5 D5 . B4 .',
  'E5 . C5 . A4 . C5 . | E5 . . G5 E5 . D5 .',
  'B4 . B4 D5 . B4 . A4 | G4 . A4 B4 . . . .',
  'E5 . G5 . B5 . A5 . | G5 . E5 . D5 . B4 .',
  'G4 . C5 . E5 . C5 . | G5 . E5 . C5 . . .',
  'A4 . D5 . F#5 . D5 . | A5 . F#5 . E5 . D5 .',
  'E5 - - - G5 - - - | E5 . D5 . C5 . . .',
  'D5 - - - F#5 - - - | A5 . F#5 . D5 . . .',
  'B5 - - - G5 - E5 . | G5 . B5 . E5 - - -',
  'E5 . G5 . B5 . A5 . | G5 . E5 . B4 . . .',
  'G5 - - - E5 - - - | C5 . E5 . G5 . . .',
  'A5 - - - F#5 - - - | D5 . F#5 . A5 . . .',
  'B5 . G5 . D5 . G5 . | B5 . D6 . B5 . A5 .',
  'A5 . G5 . E5 . D5 . | C5 . B4 . . . B4 .',
];

const bat = 'k . h . s . h k | . . k . s . h o';
const relleno = 'k . h . s . h . | k . s . s s s s';

export default {
  titulo: 'Flow de Mesa',
  bpm: 120,
  pasos: 4,
  swing: 0.06,
  canales: [
    { onda: 'pulso25', vol: 0.06, env: 'sostenido', vib: 10, notas: melodia.join(' | ') },
    { onda: 'pulso12', vol: 0.03, env: 'punteado', ar: [0, 7, 12], notas: prog.map(c => stab(raiz[c])).join(' | ') },
    { onda: 'triangle', vol: 0.09, notas: prog.map(c => bajo[c]).join(' | ') },
    { onda: 'ruido', vol: 0.05, notas: prog.map((_, i) => (i % 4 === 3 ? relleno : bat)).join(' | ') },
  ],
};
