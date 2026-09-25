const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const { gmailAppPassword, correosDe, sendEmail, escapeHtml } = require("./correo");

exports.notifyPendingResource = onDocumentCreated(
  { document: "resources/{resourceId}", secrets: [gmailAppPassword] },
  async event => {
    const resource = event.data?.data();
    if (!resource || resource.status !== "pending") return;
    await sendEmail(
      "Nuevo material pendiente de revisión — Repositorio AEMATEC",
      `<p>Hay un nuevo material pendiente de revisión:</p>
       <ul><li><strong>${escapeHtml(resource.title)}</strong></li>
       <li>Autor: ${escapeHtml(resource.author)}</li>
       <li>Tipo: ${escapeHtml(resource.type)}</li></ul>
       <p>Ingresa al panel de moderación para aprobarlo o rechazarlo.</p>`,
      await correosDe("moderators")
    );
    logger.info("Notificación enviada", { resourceId: event.params.resourceId });
  }
);

exports.sendPendingSummary = onSchedule(
  { schedule: "0 8 * * *", timeZone: "America/Costa_Rica", secrets: [gmailAppPassword] },
  async () => {
    const snapshot = await admin.firestore()
      .collection("resources")
      .where("status", "==", "pending")
      .get();
    if (snapshot.empty) return;
    await sendEmail(
      `${snapshot.size} material(es) pendiente(s) — Repositorio AEMATEC`,
      `<p>Hay <strong>${snapshot.size}</strong> material(es) pendiente(s) de revisión.</p>
       <p>Ingresa al panel de moderación para revisarlos.</p>`,
      await correosDe("moderators")
    );
    logger.info("Resumen diario enviado", { pending: snapshot.size });
  }
);

exports.notifyLoanRequest = onDocumentCreated(
  { document: "prestamoSolicitudes/{solicitudId}", secrets: [gmailAppPassword] },
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
      await correosDe("junta")
    );
    logger.info("Notificación de préstamo enviada", { solicitudId: event.params.solicitudId });
  }
);

Object.assign(exports, require("./tramites"));
