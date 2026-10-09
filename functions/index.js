const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
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
         <li>Solicitante: ${escapeHtml(solicitud.solicitanteNombre)}</li>
         <li>Fecha prevista de devolución: ${escapeHtml(solicitud.fechaPrevista) || "No indicada"}</li>
       </ul>
       <p>El préstamo se coordina en físico. Ingresa al inventario para contactar al solicitante.</p>`,
      await correosDe("junta")
    );
    logger.info("Notificación de préstamo enviada", { solicitudId: event.params.solicitudId });
  }
);

// Cuando la Junta aprueba una solicitud, avisa a la persona que puede recoger el bien en 1 semana.
// El contacto es texto libre (correo o teléfono): si no hay un correo, deja avisoCorreo=false para que la Junta avise por teléfono.
exports.notifyLoanApproved = onDocumentUpdated(
  { document: "prestamoSolicitudes/{solicitudId}", secrets: [gmailAppPassword] },
  async event => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!despues || despues.estado !== "aprobada" || antes?.estado === "aprobada") return;
    const correo = String(despues.solicitanteContacto || "").match(/[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+/)?.[0];
    if (!correo) {
      await event.data.after.ref.update({ avisoCorreo: false });
      return;
    }
    await sendEmail(
      "Tu préstamo fue aceptado — AEMATEC",
      `<p>Hola, ${escapeHtml(despues.solicitanteNombre)}:</p>
       <p>Tu solicitud de préstamo de <strong>${escapeHtml(despues.itemNombre)}</strong> fue aceptada.</p>
       <p>Puedes pasar a recogerlo en un plazo de <strong>1 semana</strong>${despues.fechaLimiteRecogida ? ` (hasta el ${escapeHtml(despues.fechaLimiteRecogida)})` : ""}.
       Si no puedes, escríbenos a ${escapeHtml("aematec@estudiantec.cr")} para coordinar.</p>`,
      [correo]
    );
    await event.data.after.ref.update({ avisoCorreo: true });
    logger.info("Aviso de préstamo aprobado enviado", { solicitudId: event.params.solicitudId });
  }
);

exports.notifyProblemReport =onDocumentCreated(
  { document: "chatbotReportes/{reporteId}", secrets: [gmailAppPassword] },
  async event => {
    const reporte = event.data?.data();
    if (!reporte) return;
    const destinatarios = await correosDe("moderators");
    logger.info("Reporte del asistente recibido, enviando correo", { reporteId: event.params.reporteId, destinatarios: destinatarios.length });
    await sendEmail(
      "Nuevo reporte desde el asistente del sitio — AEMATEC",
      `<p>Alguien reportó un problema desde el asistente básico del sitio:</p>
       <p style="white-space:pre-wrap">${escapeHtml(reporte.mensaje)}</p>
       <ul>
         <li>Página: ${escapeHtml(reporte.pagina || "No indicada")}</li>
         <li>Contacto: ${escapeHtml(reporte.contacto || "No indicado")}</li>
       </ul>`,
      destinatarios
    );
    logger.info("Notificación de reporte del asistente enviada", { reporteId: event.params.reporteId });
  }
);

// Cada 1 de diciembre: recuerda a la Junta cargar el calendario del MEP y del TEC del año que viene
// (no hay forma de leerlos solos: ver README, módulo Efemérides). No avisa de lo que ya esté cargado.
exports.recordatorioCalendarios = onSchedule(
  { schedule: "0 8 1 12 *", timeZone: "America/Costa_Rica", secrets: [gmailAppPassword] },
  async () => {
    const siguiente = String(new Date().getFullYear() + 1);
    const snapshot = await admin.firestore().collection("efemerides").get();
    const cargados = new Set(snapshot.docs.map(d => d.data()).filter(d => String(d.desde || "").startsWith(siguiente) || String(d.hasta || "").startsWith(siguiente)).map(d => d.tipo));
    const faltan = [["mep", "MEP", `https://calendario.mep.go.cr/${siguiente}`], ["tec", "TEC", "https://www.tec.ac.cr/semestre-verano"]].filter(([tipo]) => !cargados.has(tipo));
    if (!faltan.length) return;
    await sendEmail(
      `Falta cargar el calendario ${siguiente} (${faltan.map(f => f[1]).join(" y ")}) — sitio AEMATEC`,
      `<p>Ya casi empieza el ${siguiente} y en el sitio todavía no están las fechas de: <strong>${faltan.map(f => f[1]).join(" y ")}</strong>.</p>
       <ol><li>Abre la página oficial: ${faltan.map(f => `<a href="${f[2]}">${f[1]}</a>`).join(" · ")}.</li>
       <li>Entra a <a href="https://aematec.github.io/AEMATEC-web/admin.html#efemerides">el panel</a>, sección «Efemérides, MEP y TEC».</li>
       <li>Pega la lista de fechas y toca «Guardar la lista».</li></ol>`,
      await correosDe("junta")
    );
    logger.info("Recordatorio de calendarios enviado", { siguiente, faltan: faltan.map(f => f[0]) });
  }
);

Object.assign(exports, require("./tramites"));
exports.borrarDatosVencidos = require("./retencion").borrarDatosVencidos;
