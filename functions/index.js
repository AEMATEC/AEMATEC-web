const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");
// El remitente debe pertenecer a un dominio verificado en Resend. Con el dominio de
// prueba (onboarding@resend.dev) Resend solo entrega al correo dueño de la cuenta.
const senderEmail = defineString("RESEND_FROM", { default: "AEMATEC <onboarding@resend.dev>" });

async function getModeratorEmails() {
  const snapshot = await admin.firestore().collection("moderators").get();
  const emails = snapshot.docs.map(document => document.id);
  return emails.length ? emails : ["angeloyeshuac@gmail.com"];
}

async function getJuntaEmails() {
  const snapshot = await admin.firestore().collection("junta").get();
  const emails = snapshot.docs.map(document => document.id);
  return emails.length ? emails : ["angeloyeshuac@gmail.com"];
}

async function sendEmail(subject, html, recipients) {
  const resend = new Resend(resendApiKey.value());
  if (!recipients.length) {
    logger.warn("No hay destinatarios configurados; correo no enviado");
    return;
  }
  const { error } = await resend.emails.send({
    from: senderEmail.value(),
    to: recipients,
    subject,
    html
  });
  if (error) {
    throw new Error(`Resend rechazó el correo: ${error.message}`);
  }
}

exports.notifyPendingResource = onDocumentCreated(
  { document: "resources/{resourceId}", secrets: [resendApiKey] },
  async event => {
    const resource = event.data?.data();
    if (!resource || resource.status !== "pending") return;
    await sendEmail(
      "Nuevo material pendiente de revisión — Biblioteca AEMATEC",
      `<p>Hay un nuevo material pendiente de revisión:</p>
       <ul><li><strong>${escapeHtml(resource.title)}</strong></li>
       <li>Autor: ${escapeHtml(resource.author)}</li>
       <li>Tipo: ${escapeHtml(resource.type)}</li></ul>
       <p>Ingresa al panel de moderación para aprobarlo o rechazarlo.</p>`,
      await getModeratorEmails()
    );
    logger.info("Notificación enviada", { resourceId: event.params.resourceId });
  }
);

exports.sendPendingSummary = onSchedule(
  { schedule: "0 8 * * *", timeZone: "America/Costa_Rica", secrets: [resendApiKey] },
  async () => {
    const snapshot = await admin.firestore()
      .collection("resources")
      .where("status", "==", "pending")
      .get();
    if (snapshot.empty) return;
    await sendEmail(
      `${snapshot.size} material(es) pendiente(s) — Biblioteca AEMATEC`,
      `<p>Hay <strong>${snapshot.size}</strong> material(es) pendiente(s) de revisión.</p>
       <p>Ingresa al panel de moderación para revisarlos.</p>`,
      await getModeratorEmails()
    );
    logger.info("Resumen diario enviado", { pending: snapshot.size });
  }
);

exports.notifyLoanRequest = onDocumentCreated(
  { document: "prestamoSolicitudes/{solicitudId}", secrets: [resendApiKey] },
  async event => {
    const solicitud = event.data?.data();
    if (!solicitud || solicitud.estado !== "pendiente") return;
    await sendEmail(
      "Nueva solicitud de préstamo — Inventario AEMATEC",
      `<p>Hay una nueva solicitud de préstamo del inventario:</p>
       <ul>
         <li>Bien: <strong>${escapeHtml(solicitud.itemNombre)}</strong> (${escapeHtml(solicitud.itemCodigo)})</li>
         <li>Solicitante: ${escapeHtml(solicitud.solicitanteNombre)} — Carné: ${escapeHtml(solicitud.solicitanteCarne)}</li>
         <li>Contacto: ${escapeHtml(solicitud.solicitanteContacto)}</li>
         <li>Fecha prevista de devolución: ${escapeHtml(solicitud.fechaPrevista) || "No indicada"}</li>
       </ul>
       <p>El préstamo se coordina en físico. Ingresa al inventario para contactar al solicitante.</p>`,
      await getJuntaEmails()
    );
    logger.info("Notificación de préstamo enviada", { solicitudId: event.params.solicitudId });
  }
);

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}
