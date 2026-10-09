// Tetris: melodía folclórica rusa (dominio público) en La menor, 150 bpm, 8 compases en bucle (~13 s).
// Melodía en onda cuadrada de pulso 25 %, bajo en triángulo y percusión suave.
const melodia = [
  'E5 - - - B4 - C5 - D5 - - - C5 - B4 -',
  'A4 - - - A4 - C5 - E5 - - - D5 - C5 -',
  'B4 - - - - - C5 - D5 - - - E5 - - -',
  'C5 - - - A4 - - - A4 - - - - - - -',
  'D5 - - - - - F5 - A5 - - - G5 - F5 -',
  'E5 - - - - - C5 - E5 - - - D5 - C5 -',
  'B4 - - - B4 - C5 - D5 - - - E5 - - -',
  'C5 - - - A4 - - - A4 - - - - - - -',
];
const bajo = (a, b) => `${a} . ${b} . ${a} . ${b} . ${a} . ${b} . ${a} . ${b} .`;
const bajos = [bajo('A2', 'A3'), bajo('A2', 'A3'), bajo('E2', 'E3'), bajo('A2', 'A3'), bajo('D2', 'D3'), bajo('C2', 'C3'), bajo('E2', 'E3'), bajo('A2', 'A3')];
const ritmo = 'k . h . s . h . k . h . s . h .';

export default {
  titulo: 'Tetris',
  bpm: 150,
  pasos: 4,
  canales: [
    { onda: 'pulso25', vol: .05, env: 'sostenido', notas: melodia.join(' | ') },
    { onda: 'triangle', vol: .08, notas: bajos.join(' | ') },
    { onda: 'ruido', vol: .05, notas: Array(8).fill(ritmo).join(' | ') },
  ],
};
