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

const escapar = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const NOMBRES_TIPO = {
  solicitud_junta: "Solicitud a la Junta Directiva", postulacion: "Postulación",
  agec: "Solicitud de AGEC extraordinaria", fiscalia: "Consulta o denuncia a Fiscalía"
};
const SITIO = "https://aematec.github.io/AEMATEC-web";

// Qué aviso recibe la persona cuando la Junta o la Fiscalía actualizan su trámite (o null si no hay que avisar).
// RI Art. 83: el rechazo se notifica con su motivación, los recursos disponibles y el plazo de 5 días hábiles.
function avisoDeCambio(antes, despues, { fiscalia = false } = {}) {
  const tipo = fiscalia ? "fiscalia" : despues.tipo;
  const titulo = NOMBRES_TIPO[tipo] || "Trámite";
  const nuevas = (despues.respuestas || []).slice((antes.respuestas || []).length);
  const bloqueRespuestas = nuevas.map(r => `<blockquote style="border-left:3px solid #00A6B8;margin:12px 0;padding:4px 12px">${escapar(r.texto)}</blockquote>`).join("");
  const enlace = `<p>Puedes ver tu trámite en <a href="${SITIO}/tramites.html">${SITIO}/tramites.html</a>.</p>`;
  if (!fiscalia && despues.estado === "rechazado" && antes.estado !== "rechazado") {
    return {
      asunto: `Tu trámite fue rechazado: ${titulo} — AEMATEC`,
      html: `<p>La Junta Directiva rechazó tu trámite (<strong>${escapar(titulo)}</strong>).</p>
        <p><strong>Motivación:</strong></p><blockquote style="border-left:3px solid #C2413B;margin:12px 0;padding:4px 12px">${escapar(despues.motivacionRechazo)}</blockquote>
        ${bloqueRespuestas}
        <p><strong>Recursos (RI Art. 83):</strong> puedes pedir a la Junta Directiva que reconsidere esta decisión dentro de los
        <strong>5 días hábiles</strong> siguientes al día hábil posterior a esta notificación. Si la Junta mantiene su decisión,
        puedes apelar ante la AGEC cuando la naturaleza del asunto lo permita.</p>${enlace}`
    };
  }
  if (despues.estado === "resuelto" && antes.estado !== "resuelto") {
    return {
      asunto: `Tu trámite fue resuelto: ${titulo} — AEMATEC`,
      html: `<p>${fiscalia ? "La Fiscalía" : "La Junta Directiva"} marcó tu trámite (<strong>${escapar(titulo)}</strong>) como resuelto.</p>${bloqueRespuestas}${enlace}`
    };
  }
  if (nuevas.length) {
    return {
      asunto: `Nueva respuesta a tu trámite: ${titulo} — AEMATEC`,
      html: `<p>${fiscalia ? "La Fiscalía" : "La Junta Directiva"} respondió tu trámite (<strong>${escapar(titulo)}</strong>):</p>${bloqueRespuestas}${enlace}`
    };
  }
  return null;
}

// Página a la que vuelve el enlace de verificación: la de producción o la de pruebas locales. Cualquier otra
// dirección se ignora, para que nadie pueda usar el correo de la AEMATEC para enviar enlaces a otro sitio.
function destinoDelEnlace(url) {
  const produccion = `${SITIO}/tramites.html`;
  try {
    const destino = new URL(String(url || ""));
    const local = destino.protocol === "http:" && ["localhost", "127.0.0.1"].includes(destino.hostname);
    return local && destino.pathname.endsWith("/tramites.html") ? `${destino.origin}${destino.pathname}` : produccion;
  } catch {
    return produccion;
  }
}

// Convierte el enlace que genera Firebase (que pasa por biblioteca-aematec.firebaseapp.com) en uno que lleva directo
// a tramites.html con el mismo código. El correo del TEC suele poner en cuarentena los correos con enlaces a
// *.firebaseapp.com; así el correo solo enlaza al sitio de la AEMATEC. La página completa el acceso con
// signInWithEmailLink, que solo necesita apiKey, oobCode y mode.
function enlaceDirecto(generado, destino) {
  const origen = new URL(generado).searchParams;
  const enlace = new URL(destino);
  for (const clave of ["apiKey", "oobCode", "mode", "lang"]) {
    if (origen.has(clave)) enlace.searchParams.set(clave, origen.get(clave));
  }
  if (!enlace.searchParams.get("oobCode")) throw new Error("El enlace generado no trae código.");
  return enlace.toString();
}

module.exports = { sumarDiasHabiles, generarCodigo, normalizarCodigo, hashCodigo, avisoDeCambio, destinoDelEnlace, enlaceDirecto };
