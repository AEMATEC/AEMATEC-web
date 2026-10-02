// Moderación del "Creador de hoyos" de Golf en el Arcade (proyecto de Firebase "arcade-matec", separado
// del sitio). El Arcade no tiene cuentas reales (todo el mundo entra anónimo), así que la moderación
// vive aquí: la persona inicia sesión con su cuenta de ESTE proyecto (biblioteca-aematec, la misma de
// admin.html) y estas funciones, usando una cuenta de servicio de arcade-matec guardada como secreto,
// leen/escriben directo en su Firestore. Así nunca hace falta tocar la sesión anónima del Arcade ni dar
// cuentas reales a ese proyecto — solo hay que cerrar sus reglas (golfHoyosPropuestos:
// allow update, delete: if false), porque la única forma de cambiar algo pasa por aquí.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp, getApps, cert } = require("firebase-admin/app");

const arcadeMatecSA = defineSecret("ARCADE_MATEC_SA");

// Dueños del sitio: igual que en assets/js/roles.js y firestore.rules. Si cambian, actualízalos también
// ahí (ver skill traspaso-de-junta).
const OWNER_EMAILS = ["angeloyeshuac@gmail.com", "angcalderon@estudiantec.cr"];

const dbPrincipal = () => getFirestore();

// Conexión aparte a arcade-matec, con su propia cuenta de servicio (secreto ARCADE_MATEC_SA, el JSON
// completo que se descarga de Google Cloud Console). Un solo nombre de app reutilizado entre llamadas
// (las Cloud Functions "calientes" reusan el proceso).
function dbArcade() {
  const nombre = "arcadeMatec";
  const app = getApps().find(a => a.name === nombre)
    || initializeApp({ credential: cert(JSON.parse(arcadeMatecSA.value())) }, nombre);
  return getFirestore(app);
}

async function moderadorVerificado(request) {
  const token = request.auth?.token;
  const email = String(token?.email || "").toLowerCase();
  if (!request.auth || !token.email_verified) {
    throw new HttpsError("unauthenticated", "Inicia sesión con tu cuenta de moderador antes de votar.");
  }
  if (!OWNER_EMAILS.includes(email)) {
    const esModerador = (await dbPrincipal().collection("moderators").doc(email).get()).exists;
    if (!esModerador) throw new HttpsError("permission-denied", "Esa cuenta no tiene permiso de moderador.");
  }
  return email;
}

// Cuórum: 50% de los moderadores actuales, redondeado siempre hacia arriba. Con 3 moderadores son 2
// votos (igual que pedían "2 de 3"); con 4 o 5 también suben a 2 o 3. Se cuenta la lista `moderators`
// del sitio principal en el momento del voto, no un número fijo guardado en ningún lado.
async function umbralDeVotos() {
  const total = (await dbPrincipal().collection("moderators").get()).size;
  return Math.max(1, Math.ceil(total / 2));
}

exports.arcadeVotarPropuesta = onCall({ secrets: [arcadeMatecSA] }, async request => {
  const email = await moderadorVerificado(request);
  const id = String(request.data?.id || "").trim();
  const voto = request.data?.voto;
  if (!id) throw new HttpsError("invalid-argument", "Falta el id de la propuesta.");
  if (voto !== "aprobado" && voto !== "rechazado") {
    throw new HttpsError("invalid-argument", "El voto debe ser 'aprobado' o 'rechazado'.");
  }
  const umbral = await umbralDeVotos();
  const ref = dbArcade().collection("golfHoyosPropuestos").doc(id);
  return dbArcade().runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new HttpsError("not-found", "Esa propuesta ya no existe.");
    const d = doc.data();
    let votosAprobar = d.votosAprobar || [], votosRechazar = d.votosRechazar || [], estado = d.estado;
    if (estado === "pendiente") {
      // Cambiar de opinión mueve el voto de una lista a la otra, nunca cuenta en las dos.
      votosAprobar = votosAprobar.filter(correo => correo !== email);
      votosRechazar = votosRechazar.filter(correo => correo !== email);
      (voto === "aprobado" ? votosAprobar : votosRechazar).push(email);
      const gano = (voto === "aprobado" ? votosAprobar : votosRechazar).length >= umbral;
      if (gano) estado = voto;
      tx.update(ref, { votosAprobar, votosRechazar, estado });
    }
    return { estado, votosAprobar: votosAprobar.length, votosRechazar: votosRechazar.length, umbral };
  });
});

exports.arcadeBorrarRegistro = onCall({ secrets: [arcadeMatecSA] }, async request => {
  await moderadorVerificado(request);
  const tipo = request.data?.tipo;
  const id = String(request.data?.id || "").trim();
  if (!id) throw new HttpsError("invalid-argument", "Falta el id.");
  if (tipo === "propuesta") {
    await dbArcade().collection("golfHoyosPropuestos").doc(id).delete();
  } else if (tipo === "puntaje") {
    const juego = String(request.data?.juego || "").trim();
    if (!juego) throw new HttpsError("invalid-argument", "Falta el juego del puntaje.");
    await dbArcade().collection("leaderboards").doc(juego).collection("scores").doc(id).delete();
  } else {
    throw new HttpsError("invalid-argument", "Tipo desconocido (usa 'propuesta' o 'puntaje').");
  }
  return { ok: true };
});
