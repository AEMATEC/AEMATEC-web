// Carreras: La menor, 168 bpm. A (8 compases, llamada y respuesta) + B (8, semicorcheas) + A otra vez = 24 compases (~34 s).
// Acordes: A = Am F C G | Am F G E ; B = F G Em Am | F G C E. El último compás (E) empalma con el Am del inicio.
const A = [
  'A4 . C5 E5 - A5 - G5 E5 . C5 . E5 - . .',
  'F5 . A5 C6 - A5 - F5 A5 . F5 . C5 - . .',
  'G5 . E5 G5 - C6 - B5 G5 . E5 . G5 - . .',
  'D5 . G5 B5 - D6 - B5 G5 - D5 . B4 - . .',
  'E5 E5 . A5 - . C6 . E6 - D6 C6 - A5 . .',
  'C6 - A5 . F5 A5 C6 . A5 - F5 . A5 - . .',
  'B5 - G5 . D5 G5 B5 . D6 - B5 G5 . B5 D6 .',
  'E5 - G#5 B5 - . B5 G#5 E5 . G#5 . B5 - . .',
];
const B = [
  'C6 A5 F5 A5 C6 A5 F5 A5 C6 - . C6 D6 C6 A5 F5',
  'D6 B5 G5 B5 D6 B5 G5 B5 D6 - . D6 E6 D6 B5 G5',
  'E6 B5 G5 B5 E6 B5 G5 B5 G6 - E6 . D6 - B5 .',
  'C6 - E6 . A5 - C6 . E6 - . . A5 - . .',
  'A5 . C6 . F6 - E6 F6 . C6 . A5 . F5 . .',
  'G5 . B5 . D6 - C6 D6 . B5 . G5 . D5 . .',
  'E6 - D6 C6 - G5 . E5 G5 - C6 . E6 - G6 .',
  'B5 . G#5 . B5 . E6 . D6 B5 G#5 B5 D6 E6 - .',
];
const melodia = [...A, ...B, ...A].join(' | ');

// [raíz grave, raíz media, tipo de acorde] de cada compás
const AC_A = [['A', 'm'], ['F', 'M'], ['C', 'M'], ['G', 'M'], ['A', 'm'], ['F', 'M'], ['G', 'M'], ['E', 'M']];
const AC_B = [['F', 'M'], ['G', 'M'], ['E', 'm'], ['A', 'm'], ['F', 'M'], ['G', 'M'], ['C', 'M'], ['E', 'M']];
const ACORDES = [...AC_A, ...AC_B, ...AC_A];

// Bajo que salta de octava, con síncopa; el compás 8 de cada sección baja/sube al siguiente acorde
const bajo = ACORDES.map(([r], i) => {
  const g = r + '2', o = r + '3';
  return i % 8 === 7
    ? `${g} . ${o} ${g} . ${o} . ${g} ${g} . ${o} . ${g} ${o} ${g} ${o}`
    : `${g} . ${o} . ${g} . ${o} ${g} . ${o} . ${g} ${o} ${g} ${g} .`;
}).join(' | ');

// Un canal con 'ar' fijo no cambia de tipo de acorde: se usa uno menor y otro mayor y cada uno suena solo donde toca.
const arpTipo = (t) => ACORDES.map(([r, k], i) => {
  const n = r + (r === 'C' ? '4' : '3');
  const patron = `${n} - . ${n} - . ${n} . . ${n} - . ${n} . ${n} .`;
  return k === t ? patron : Array(16).fill('.').join(' ');
}).join(' | ');

// Batería: bombo y caja con platillos en semicorchea; relleno al final de cada sección
const base = 'k . x . s . x k . x k . s . x .';
const relleno = 'k . x . s . s . s s s s s x x x';
const bateria = Array.from({ length: 24 }, (_, i) => (i % 8 === 7 ? relleno : base)).join(' | ');

export default {
  titulo: 'Carreras a toda velocidad',
  bpm: 168,
  pasos: 4,
  swing: 0,
  canales: [
    { onda: 'pulso25', vol: .11, env: 'sostenido', vib: 8, notas: melodia },
    { onda: 'square', vol: .03, env: 'punteado', ar: [0, 3, 7], notas: arpTipo('m') },
    { onda: 'square', vol: .03, env: 'punteado', ar: [0, 4, 7], notas: arpTipo('M') },
    { onda: 'triangle', vol: .055, notas: bajo },
    { onda: 'ruido', vol: .04, notas: bateria },
  ],
};
