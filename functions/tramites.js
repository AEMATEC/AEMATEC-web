// Trámites de personas Asociadas (RI Título V, Cap. IV y Título II).
// Los navegadores NO escriben trámites directamente (las reglas lo impiden): todo pasa por estas funciones,
// que verifican el correo institucional, consultan el padrón y garantizan el anonimato de las denuncias.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { gmailAppPassword, correosDe, sendEmail, escapeHtml } = require("./correo");
const { sumarDiasHabiles, generarCodigo, normalizarCodigo, hashCodigo } = require("./tramites-util");

const DOMINIO = "@estudiantec.cr";
const MAX_TRAMITES_POR_DIA = 5;
const DIAS_HABILES_RESPUESTA = 10; // RI Art. 111
const SITIO = "https://aematec.github.io/AEMATEC-web";

const TIPOS = {
  solicitud_junta: {
    nombre: "Solicitud a la Junta Directiva",
    subtipos: ["punto_agenda", "asistir_sesion", "rendicion_cuentas", "otra"],
    campos: { asunto: 120, detalle: 2000 }
  },
  postulacion: {
    nombre: "Postulación",
    subtipos: ["comision", "representacion"],
    campos: { organo: 160, motivacion: 2000 }
  },
  agec: {
    nombre: "Solicitud de AGEC extraordinaria",
    subtipos: [],
    campos: { motivo: 2000, agenda: 2000 }
  },
  fiscalia: {
    nombre: "Consulta o denuncia a Fiscalía",
    subtipos: ["consulta", "denuncia"],
    campos: { asunto: 120, detalle: 4000 }
  }
};

const db = () => getFirestore();
const ahora = () => FieldValue.serverTimestamp();

// ---------- Validación ----------

function texto(valor, max, campo, { requerido = true } = {}) {
  const limpio = String(valor ?? "").trim();
  if (requerido && !limpio) throw new HttpsError("invalid-argument", `Falta el campo "${campo}".`);
  if (limpio.length > max) throw new HttpsError("invalid-argument", `"${campo}" supera ${max} caracteres.`);
  return limpio;
}

function validarDatos(tipo, subtipo, datos) {
  const definicion = TIPOS[tipo];
  if (!definicion) throw new HttpsError("invalid-argument", "Tipo de trámite desconocido.");
  if (definicion.subtipos.length && !definicion.subtipos.includes(subtipo)) {
    throw new HttpsError("invalid-argument", "Subtipo de trámite desconocido.");
  }
  const limpios = {};
  for (const [campo, max] of Object.entries(definicion.campos)) limpios[campo] = texto(datos?.[campo], max, campo);
  return limpios;
}

// Exige una cuenta con correo institucional verificado (el acceso por enlace al correo lo verifica).
function cuentaVerificada(request) {
  const token = request.auth?.token;
  const email = String(token?.email || "").toLowerCase();
  if (!request.auth || !token.email_verified || !email.endsWith(DOMINIO)) {
    throw new HttpsError("unauthenticated", `Verifica tu correo ${DOMINIO} antes de enviar el trámite.`);
  }
  return { uid: request.auth.uid, email };
}

async function registrarEnvio(uid) {
  const hoy = new Date().toISOString().slice(0, 10);
  const ref = db().collection("limites").doc(uid);
  await db().runTransaction(async tx => {
    const actual = (await tx.get(ref)).data();
    const cuenta = actual?.fecha === hoy ? actual.cuenta : 0;
    if (cuenta >= MAX_TRAMITES_POR_DIA) {
      throw new HttpsError("resource-exhausted", "Alcanzaste el máximo de trámites por día. Intenta mañana.");
    }
    tx.set(ref, { fecha: hoy, cuenta: cuenta + 1 });
  });
}

async function estaEnPadron(email) {
  return (await db().collection("padron").doc(email).get()).exists;
}

// Un correo que falla no debe perder el trámite: se registra y se sigue.
async function notificar(asunto, html, destinatarios) {
  try {
    await sendEmail(asunto, html, destinatarios);
  } catch (error) {
    logger.error("No se pudo enviar la notificación", { asunto, error: error.message });
  }
}

// ---------- Funciones ----------

exports.enviarTramite = onCall({ secrets: [gmailAppPassword] }, async request => {
  const { uid, email } = cuentaVerificada(request);
  const { tipo, subtipo = "", datos = {}, anonimo = false } = request.data || {};
  const limpios = validarDatos(tipo, subtipo, datos);
  const esAnonimo = tipo === "fiscalia" && anonimo === true;
  const nombre = esAnonimo ? "" : texto(datos.nombre, 120, "nombre");
  await registrarEnvio(uid);
  const enPadron = await estaEnPadron(email);

  if (tipo === "fiscalia") {
    // RI Art. 42: solo Fiscalía. Si es anónima no se guarda NADA que identifique a la persona
    // (ni correo, ni nombre, ni uid); el seguimiento es con un código que solo conoce quien envía.
    const codigo = esAnonimo ? generarCodigo() : null;
    const caso = await db().collection("fiscaliaCasos").add({
      subtipo, datos: limpios, anonimo: esAnonimo,
      remitente: esAnonimo ? null : { email, nombre },
      remitenteUid: esAnonimo ? null : uid,
      codigoHash: esAnonimo ? hashCodigo(codigo) : null,
      enPadron, estado: "recibido", respuestas: [], createdAt: ahora(), actualizadoEn: ahora()
    });
    await notificar(
      `Nueva ${subtipo === "denuncia" ? "denuncia" : "consulta"} a Fiscalía — AEMATEC`,
      `<p>Se recibió una ${subtipo} dirigida a Fiscalía.</p>
       <ul><li>Asunto: <strong>${escapeHtml(limpios.asunto)}</strong></li>
       <li>Remitente: ${esAnonimo ? "anónimo (persona con correo institucional verificado)" : `${escapeHtml(nombre)} &lt;${escapeHtml(email)}&gt;`}</li>
       <li>${enPadron ? "Está en el padrón de Asociados." : "No está en el padrón actual (verificar)."}</li></ul>
       <p>Ingresa al panel de administración para leerla completa.</p>`,
      await correosDe("fiscalia", { respaldo: false })
    );
    logger.info("Caso de Fiscalía recibido", { id: caso.id, anonimo: esAnonimo });
    return { id: caso.id, codigo };
  }

  const creado = new Date();
  const doc = {
    tipo, subtipo, datos: limpios,
    solicitante: { email, nombre }, solicitanteUid: uid, enPadron,
    estado: "recibido", prorrogaInformada: false, respuestas: [],
    plazoRespuesta: tipo === "agec" ? null : Timestamp.fromDate(sumarDiasHabiles(creado, DIAS_HABILES_RESPUESTA)),
    createdAt: ahora(), actualizadoEn: ahora()
  };
  const ref = db().collection("tramites").doc();

  if (tipo === "agec") {
    // RI Art. 13 c: la AGEC extraordinaria se convoca si la pide al menos el 10 % del padrón.
    const tamanoPadron = (await db().collection("padron").count().get()).data().count;
    Object.assign(doc, {
      umbral: Math.max(1, Math.ceil(tamanoPadron * 0.1)),
      adhesionesPadron: enPadron ? 1 : 0, adhesionesSinPadron: enPadron ? 0 : 1, alcanzado: false
    });
    const batch = db().batch();
    batch.set(ref, doc);
    batch.set(ref.collection("adhesiones").doc(email), { email, nombre, enPadron, createdAt: ahora() });
    batch.set(db().collection("agecPublicas").doc(ref.id), publicaDeAgec(doc));
    await batch.commit();
    await revisarUmbralAgec(ref.id);
  } else {
    await ref.set(doc);
  }

  await notificar(
    `Nuevo trámite: ${TIPOS[tipo].nombre} — AEMATEC`,
    `<p>Se recibió un trámite de <strong>${escapeHtml(nombre)}</strong> (${escapeHtml(email)}).</p>
     <p>${enPadron ? "Está en el padrón de Asociados." : "<strong>No está en el padrón actual</strong>: verificar su condición de persona Asociada."}</p>
     <p>Ingresa al panel de administración para revisarlo. Plazo de respuesta: ${DIAS_HABILES_RESPUESTA} días hábiles (RI Art. 111).</p>`,
    await correosDe("junta")
  );
  await notificar(
    `Recibimos tu trámite: ${TIPOS[tipo].nombre} — AEMATEC`,
    `<p>Hola ${escapeHtml(nombre)}, la Junta Directiva recibió tu trámite y debe responderte en un máximo de
     ${DIAS_HABILES_RESPUESTA} días hábiles (RI Art. 111).</p>
     <p>Puedes ver su estado en <a href="${SITIO}/tramites.html">${SITIO}/tramites.html</a>.</p>`,
    [email]
  );
  return { id: ref.id, codigo: null };
});

function publicaDeAgec(doc) {
  // Versión pública (sin correos ni nombres) para mostrar el avance de las adhesiones.
  return {
    motivo: doc.datos.motivo, agenda: doc.datos.agenda, umbral: doc.umbral,
    adhesionesPadron: doc.adhesionesPadron, adhesionesSinPadron: doc.adhesionesSinPadron,
    alcanzado: doc.alcanzado, estado: doc.estado, createdAt: doc.createdAt
  };
}

async function revisarUmbralAgec(id) {
  const ref = db().collection("tramites").doc(id);
  const alcanzadoAhora = await db().runTransaction(async tx => {
    const actual = (await tx.get(ref)).data();
    if (!actual || actual.alcanzado || actual.adhesionesPadron < actual.umbral) return false;
    const plazo = Timestamp.fromDate(sumarDiasHabiles(new Date(), DIAS_HABILES_RESPUESTA));
    tx.update(ref, { alcanzado: true, plazoRespuesta: plazo, actualizadoEn: ahora() });
    tx.update(db().collection("agecPublicas").doc(id), { alcanzado: true });
    return true;
  });
  if (alcanzadoAhora) {
    await notificar(
      "Una solicitud de AGEC extraordinaria alcanzó el 10 % del padrón — AEMATEC",
      `<p>La solicitud de AGEC extraordinaria alcanzó las adhesiones necesarias (RI Art. 13 c).</p>
       <p>Ingresa al panel de administración para convocarla según el Art. 14.</p>`,
      await correosDe("junta")
    );
  }
}

exports.adherirAgec = onCall({ secrets: [gmailAppPassword] }, async request => {
  const { email } = cuentaVerificada(request);
  const id = texto(request.data?.id, 64, "id");
  const nombre = texto(request.data?.nombre, 120, "nombre");
  const enPadron = await estaEnPadron(email);
  const ref = db().collection("tramites").doc(id);
  await db().runTransaction(async tx => {
    const actual = (await tx.get(ref)).data();
    if (!actual || actual.tipo !== "agec") throw new HttpsError("not-found", "No existe esa solicitud de AGEC.");
    if (!["recibido", "en_revision"].includes(actual.estado)) throw new HttpsError("failed-precondition", "Esta solicitud ya está cerrada.");
    const adhesion = ref.collection("adhesiones").doc(email);
    if ((await tx.get(adhesion)).exists) throw new HttpsError("already-exists", "Ya te habías adherido a esta solicitud.");
    const campo = enPadron ? "adhesionesPadron" : "adhesionesSinPadron";
    tx.set(adhesion, { email, nombre, enPadron, createdAt: ahora() });
    tx.update(ref, { [campo]: FieldValue.increment(1), actualizadoEn: ahora() });
    tx.update(db().collection("agecPublicas").doc(id), { [campo]: FieldValue.increment(1) });
  });
  await revisarUmbralAgec(id);
  return { enPadron };
});

// Seguimiento de casos anónimos de Fiscalía con el código privado. No requiere cuenta.
exports.consultarSeguimiento = onCall(async request => {
  const codigo = normalizarCodigo(request.data?.codigo);
  if (codigo.length !== 12) throw new HttpsError("invalid-argument", "El código tiene el formato XXXX-XXXX-XXXX.");
  const snapshot = await db().collection("fiscaliaCasos").where("codigoHash", "==", hashCodigo(codigo)).limit(1).get();
  if (snapshot.empty) throw new HttpsError("not-found", "No encontramos un caso con ese código.");
  const caso = snapshot.docs[0].data();
  return {
    subtipo: caso.subtipo, asunto: caso.datos.asunto, estado: caso.estado,
    createdAt: caso.createdAt?.toDate().toISOString() || null,
    respuestas: (caso.respuestas || []).map(r => ({ texto: r.texto, fecha: r.fecha?.toDate?.().toISOString?.() || r.fecha || null }))
  };
});

