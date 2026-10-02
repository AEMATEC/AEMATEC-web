// Filtro de contenido para los textos públicos del Arcade AEMATEC (apodo de jugador, autor y nombre
// de un hoyo propuesto en el creador de Golf). Esto es aparte de las reglas de Firestore: las reglas
// validan tamaño y caracteres permitidos, pero no pueden revisar si el texto es una grosería, un
// teléfono o un correo — eso se revisa aquí, en el cliente, antes de guardar nada.
//
// Sin dependencias del DOM a propósito, para poder probarlo con un script de Node (ver
// tests/revisar-filtro.mjs) y para que tanto core.js como arcade.html lo puedan usar igual.

const LEET = { '4': 'A', '0': 'O', '1': 'I', '3': 'E', '5': 'S' };

// Lista corta de groserías comunes en Costa Rica. A propósito no es exhaustiva: el objetivo es
// evitar los casos más obvios, no reemplazar criterio humano (los moderadores siguen pudiendo
// borrar cualquier apodo o propuesta a mano).
const GROSERIAS = [
  'PENDEJO', 'HIJUEPUTA', 'HIJODEPUTA', 'HPTA', 'MIERDA', 'PUTA', 'PUTO', 'VERGA', 'PERRA',
  'CULERO', 'GUEVON', 'HUEVON', 'PIJA', 'CARAJO', 'ZORRA', 'CABRON', 'MALPARIDO', 'PUTAMADRE',
  'CONCHA', 'CHUCHA', 'MAMAHUEVO', 'MAMAVERGA', 'VERGUIADO',
];

function quitarTildes(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizarParaGroserias(s) {
  const sinTildes = quitarTildes(s).toUpperCase();
  return [...sinTildes].map(ch => LEET[ch] || ch).join('');
}

// Devuelve { ok: true } si el texto se puede guardar, o { ok: false, motivo } con un mensaje
// simple para mostrarle a la persona si no.
export function filtrarTexto(s) {
  const texto = String(s || '').trim();
  if (!texto) return { ok: true };
  if (texto.includes('@')) return { ok: false, motivo: 'No escribas correos ni usuarios con @.' };
  if (/\d{7,}/.test(texto)) return { ok: false, motivo: 'No escribas números de teléfono ni de carné.' };
  const normal = normalizarParaGroserias(texto);
  if (GROSERIAS.some(g => normal.includes(g))) return { ok: false, motivo: 'Ese texto no se puede usar aquí.' };
  return { ok: true };
}
