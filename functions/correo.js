// Envío de correos de notificación desde la cuenta Gmail de la Junta.
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

// La contraseña es una "contraseña de aplicación" de Google guardada en Secret Manager
// (ver README → Correos de notificación).
// "aeemac" no es un error: la cuenta viene de cuando la carrera se llamaba EMAC (Enseñanza de la
// Matemática Asistida por Computadora) y la asociación, AEEMAC. Es la cuenta vigente de la Junta.
const gmailAddress = "aeemac.tec@gmail.com";
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

// Correo de respaldo si una lista está vacía (no aplica a Fiscalía: RI Art. 42).
const CORREO_RESPALDO = "angeloyeshuac@gmail.com";

async function correosDe(coleccion, { respaldo = true } = {}) {
  const snapshot = await getFirestore().collection(coleccion).get();
  const emails = snapshot.docs.map(document => document.id);
  return emails.length || !respaldo ? emails : [CORREO_RESPALDO];
}

// `text` es la versión en texto plano (opcional); ayuda a que los filtros de correo no lo marquen como spam.
async function sendEmail(subject, html, recipients, { text } = {}) {
  if (!recipients.length) {
    logger.warn("No hay destinatarios configurados; correo no enviado", { subject });
    return;
  }
  // Pruebas automáticas: no se envían correos reales.
  if (process.env.AEMATEC_SIN_CORREO) {
    logger.info("Correo omitido (modo de prueba)", { subject, recipients: recipients.length });
    return;
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailAddress, pass: gmailAppPassword.value() }
  });
  // Con varios destinatarios van en copia oculta para no exponer los correos entre sí. Con uno solo va en "Para":
  // un correo que llega solo en copia oculta tiene más probabilidad de terminar en cuarentena (Microsoft 365 del TEC).
  const unico = recipients.length === 1;
  await transporter.sendMail({
    from: `AEMATEC <${gmailAddress}>`,
    to: unico ? recipients[0] : gmailAddress,
    bcc: unico ? undefined : recipients,
    subject,
    html,
    text
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

module.exports = { gmailAppPassword, correosDe, sendEmail, escapeHtml };
