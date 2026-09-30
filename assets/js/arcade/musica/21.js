// Casino 21: lounge/jazz de casino en Do mayor, swing, contrabajo caminando y melodía pícara.
// Cada compás = 8 pasos (corcheas). 16 compases: A (1-8) y B (9-16), ~32 s por vuelta.
export default {
  titulo: 'Casino Lounge',
  bpm: 120,
  pasos: 2,
  swing: .3,
  canales: [
    { onda: 'pulso25', vol: .045, env: 'punteado', vib: 12, notas: `
      G4 . C5 E5 - D5 C5 . | E5 - C#5 . A4 C#5 E5 - | F5 . E5 D5 - F5 A5 - | G5 . F5 D5 - B4 . . |
      G4 . B4 D5 - B4 G4 . | A4 C#5 E5 G5 - E5 C#5 . | F5 A5 - C6 A5 F5 D5 . | D5 - B4 . G4 B4 D5 . |
      C6 - A5 . F5 A5 C6 . | D6 - C6 . Bb5 F5 D5 . | B5 - G5 . E5 G5 B5 . | C#6 - A5 G5 E5 . C#5 . |
      D5 F5 A5 . D6 - C6 A5 | Bb5 - A5 Ab5 G5 . F5 . | F5 E5 D5 . A4 D5 F5 . | G5 - F5 D5 . B4 C5 . |` },
    { onda: 'pulso12', vol: .022, env: 'punteado', notas: `
      . E4 . G4 . B4 . G4 | . C#4 . E4 . G4 . E4 | . F4 . A4 . C5 . A4 | . B3 . D4 . F4 . D4 |
      . G4 . B4 . D5 . B4 | . C#4 . E4 . G4 . E4 | . F4 . A4 . C5 . A4 | . B3 . D4 . F4 . D4 |
      . A3 . C4 . E4 . C4 | . D4 . F4 . Ab4 . F4 | . G4 . B4 . D5 . B4 | . C#4 . E4 . G4 . E4 |
      . F4 . A4 . C5 . A4 | . D4 . F4 . Ab4 . F4 | . F4 . A4 . C5 . A4 | . B3 . D4 . F4 . D4 |` },
    { onda: 'triangle', vol: .08, notas: `
      C3 - E3 - G3 - E3 - | A2 - C#3 - E3 - C#3 - | D3 - F3 - A3 - F3 - | G2 - B2 - D3 - F3 - |
      E2 - G2 - B2 - D3 - | A2 - C#3 - E3 - G3 - | D3 - F3 - A3 - F3 - | G2 - B2 - D3 - B2 - |
      F2 - A2 - C3 - E3 - | Bb2 - D3 - F3 - D3 - | E2 - G2 - B2 - D3 - | A2 - C#3 - E3 - C#3 - |
      D3 - F3 - A3 - F3 - | Bb2 - D3 - F3 - D3 - | D3 - F3 - A3 - F3 - | G2 - B2 - D3 - B2 - |` },
    { onda: 'ruido', vol: .025, notas: `
      h . h h h . h h | h . h h h . h h | h . h h h . h h | h . h h h . h s |` },
  ],
};
