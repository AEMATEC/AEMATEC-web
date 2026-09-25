// Utilidades puras de Trámites (sin Firebase), separadas para poder probarlas.
const crypto = require("node:crypto");

// Suma días hábiles (lunes a viernes) en hora de Costa Rica (UTC-6, sin horario de verano).
// No descuenta feriados: el plazo mostrado puede quedar un día antes del real, nunca después.
function sumarDiasHabiles(desde, dias) {
  const cr = new Date(desde.getTime() - 6 * 3600 * 1000);
  let restantes = dias;
  while (restantes > 0) {
    cr.setUTCDate(cr.getUTCDate() + 1);
    const dia = cr.getUTCDay();
    if (dia !== 0 && dia !== 6) restantes--;
  }
  cr.setUTCHours(23, 59, 59, 0);
  return new Date(cr.getTime() + 6 * 3600 * 1000);
}

const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L para evitar confusiones
function generarCodigo() {
  const bytes = crypto.randomBytes(12);
  const chars = [...bytes].map(b => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
const normalizarCodigo = codigo => String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCodigo = codigo => crypto.createHash("sha256").update(normalizarCodigo(codigo)).digest("hex");

module.exports = { sumarDiasHabiles, generarCodigo, normalizarCodigo, hashCodigo };
