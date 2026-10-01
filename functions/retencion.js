// Plazos de conservación de datos personales (Ley 8968 Art. 6; plazos aprobados por la Junta, 2026-10).
// Una vez al día borra lo vencido. Los casos de Fiscalía no están aquí: la persona Fiscal los borra al
// archivarlos, después de guardar su informe (panel → Trámites → "Archivar y borrar del sitio").
// Si cambias un plazo, cámbialo también en legal.html ("Cuánto tiempo los guardamos").
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const DIA_MS = 24 * 60 * 60 * 1000;
const PLAZOS_DIAS = { prestamos: 365, reportes: 90, tramites: 730, limites: 2 };

async function borrarVencidos(db, ahora = new Date()) {
  const antesDe = dias => admin.firestore.Timestamp.fromMillis(ahora.getTime() - dias * DIA_MS);
  const docs = async (coleccion, campo, dias) => (await db.collection(coleccion).where(campo, "<", antesDe(dias)).get()).docs;
  const borrados = {};

  // Préstamos: 1 año después de devolverse, de rechazarse o, si nadie la atendió, de pedirse.
  const prestamos = [
    ...await docs("prestamoSolicitudes", "fechaDevolucion", PLAZOS_DIAS.prestamos),
    ...await docs("prestamoSolicitudes", "fechaResolucion", PLAZOS_DIAS.prestamos),
    ...(await docs("prestamoSolicitudes", "createdAt", PLAZOS_DIAS.prestamos)).filter(d => d.get("estado") === "pendiente")
  ];
  await Promise.all(prestamos.map(d => d.ref.delete()));
  borrados.prestamos = prestamos.length;

  const reportes = await docs("chatbotReportes", "createdAt", PLAZOS_DIAS.reportes);
  await Promise.all(reportes.map(d => d.ref.delete()));
  borrados.reportes = reportes.length;

  // Trámites: 2 años desde que se enviaron, con sus adhesiones y su versión pública de AGEC.
  const tramites = await docs("tramites", "createdAt", PLAZOS_DIAS.tramites);
  await Promise.all(tramites.map(d => Promise.all([db.recursiveDelete(d.ref), db.collection("agecPublicas").doc(d.id).delete()])));
  borrados.tramites = tramites.length;

  // Límites diarios (`fecha` es "AAAA-MM-DD"): solo sirven el mismo día.
  const limiteFecha = new Date(ahora.getTime() - PLAZOS_DIAS.limites * DIA_MS).toISOString().slice(0, 10);
  const limites = (await db.collection("limites").where("fecha", "<", limiteFecha).get()).docs;
  await Promise.all(limites.map(d => d.ref.delete()));
  borrados.limites = limites.length;

  return borrados;
}

exports.borrarDatosVencidos = onSchedule({ schedule: "30 3 * * *", timeZone: "America/Costa_Rica" }, async () => {
  logger.info("Datos vencidos borrados", await borrarVencidos(admin.firestore()));
});
exports.borrarVencidos = borrarVencidos;
