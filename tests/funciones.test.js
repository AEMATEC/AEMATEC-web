// Pruebas de las Cloud Functions de Trámites contra el emulador de Firestore (no envían correos).
// Se ejecutan con `npm test` junto a las pruebas de reglas; necesitan `npm install` en ../functions.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

process.env.GCLOUD_PROJECT = "demo-aematec-funciones"; // proyecto distinto al de las pruebas de reglas
process.env.AEMATEC_SIN_CORREO = "1";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const fft = require("firebase-functions-test")({ projectId: "demo-aematec-funciones" });
const funciones = require("../functions/index.js");
const util = require("../functions/tramites-util.js");
const admin = require("firebase-admin");
const db = admin.firestore();

const enviar = fft.wrap(funciones.enviarTramite);
const adherir = fft.wrap(funciones.adherirAgec);
const seguimiento = fft.wrap(funciones.consultarSeguimiento);
const enviarEnlace = fft.wrap(funciones.enviarEnlaceCorreo);
const alActualizarTramite = fft.wrap(funciones.alActualizarTramite);

let contador = 0;
const cuenta = (email, { verificado = true } = {}) => ({ uid: `uid-${++contador}`, token: { email, email_verified: verificado } });
const llamar = (fn, data, auth) => fn({ data, auth, rawRequest: {} });
const solicitud = datos => ({ tipo: "solicitud_junta", subtipo: "punto_agenda", datos: { nombre: "Ana", asunto: "Punto", detalle: "Detalle", ...datos } });

async function limpiar() {
  for (const coleccion of ["tramites", "agecPublicas", "fiscaliaCasos", "limites", "padron"]) {
    const docs = await db.collection(coleccion).listDocuments();
    await Promise.all(docs.map(d => db.recursiveDelete(d)));
  }
}
async function padron(...emails) { await Promise.all(emails.map(e => db.doc(`padron/${e}`).set({ email: e }))); }
const rechaza = (promesa, codigo) => assert.rejects(promesa, error => error.code === codigo);

before(limpiar);
beforeEach(limpiar);
after(() => fft.cleanup());

describe("Utilidades", () => {
  test("10 días hábiles desde un viernes llegan al viernes de dos semanas después (hora CR)", () => {
    const plazo = util.sumarDiasHabiles(new Date("2026-09-25T15:00:00Z"), 10);
    assert.equal(plazo.toISOString(), "2026-10-10T05:59:59.000Z"); // 9 oct 23:59:59 en Costa Rica
  });
  test("el código de seguimiento tiene formato XXXX-XXXX-XXXX y su hash ignora guiones y mayúsculas", () => {
    const codigo = util.generarCodigo();
    assert.match(codigo, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.equal(util.hashCodigo(codigo), util.hashCodigo(codigo.toLowerCase().replaceAll("-", "")));
  });
});

describe("Enlace de verificación del correo", () => {
  test("solo a correos @estudiantec.cr", async () => {
    await rechaza(llamar(enviarEnlace, { email: "ana@gmail.com" }), "invalid-argument");
    await rechaza(llamar(enviarEnlace, { email: "ana@estudiantec.cr.malo.com" }), "invalid-argument");
    assert.deepEqual(await llamar(enviarEnlace, { email: "Ana@estudiantec.cr" }), { enviado: true });
  });
  test("hay que esperar antes de pedir otro enlace al mismo correo", async () => {
    await llamar(enviarEnlace, { email: "ana@estudiantec.cr" });
    await rechaza(llamar(enviarEnlace, { email: "ana@estudiantec.cr" }), "resource-exhausted");
    await llamar(enviarEnlace, { email: "otra@estudiantec.cr" });
  });
  test("el enlace lleva directo a tramites.html y nunca a otro sitio", () => {
    const generado = "https://biblioteca-aematec.firebaseapp.com/__/auth/action?apiKey=K&mode=signIn&oobCode=ABC&continueUrl=x&lang=es";
    const destino = util.destinoDelEnlace("https://sitio-falso.com/tramites.html");
    assert.equal(destino, "https://aematec.github.io/AEMATEC-web/tramites.html");
    assert.equal(util.destinoDelEnlace("http://localhost:5500/tramites.html"), "http://localhost:5500/tramites.html");
    assert.equal(util.enlaceDirecto(generado, destino), `${destino}?apiKey=K&oobCode=ABC&mode=signIn&lang=es`);
  });
});

describe("enviarTramite: verificación de la cuenta", () => {
  test("sin sesión, sin verificar o fuera de @estudiantec.cr se rechaza", async () => {
    await rechaza(llamar(enviar, solicitud()), "unauthenticated");
    await rechaza(llamar(enviar, solicitud(), cuenta("a@estudiantec.cr", { verificado: false })), "unauthenticated");
    await rechaza(llamar(enviar, solicitud(), cuenta("a@gmail.com")), "unauthenticated");
  });
  test("faltan campos o el tipo no existe", async () => {
    await rechaza(llamar(enviar, solicitud({ asunto: "" }), cuenta("a@estudiantec.cr")), "invalid-argument");
    await rechaza(llamar(enviar, { tipo: "otro", datos: {} }, cuenta("a@estudiantec.cr")), "invalid-argument");
  });
  test("máximo 5 trámites por día por cuenta", async () => {
    const auth = cuenta("a@estudiantec.cr");
    for (let i = 0; i < 5; i++) await llamar(enviar, solicitud(), auth);
    await rechaza(llamar(enviar, solicitud(), auth), "resource-exhausted");
  });
});

describe("Solicitud a la Junta", () => {
  test("se guarda con plazo de respuesta y marca si está en el padrón", async () => {
    await padron("ana@estudiantec.cr");
    const { id } = await llamar(enviar, solicitud(), cuenta("ana@estudiantec.cr"));
    const doc = (await db.doc(`tramites/${id}`).get()).data();
    assert.equal(doc.estado, "recibido");
    assert.equal(doc.enPadron, true);
    assert.equal(doc.solicitante.email, "ana@estudiantec.cr");
    assert.ok(doc.plazoRespuesta.toDate() > new Date());
  });
  test("si no está en el padrón (padrón atrasado) se acepta igual, marcado", async () => {
    const { id } = await llamar(enviar, solicitud(), cuenta("nuevo@estudiantec.cr"));
    assert.equal((await db.doc(`tramites/${id}`).get()).data().enPadron, false);
  });
});

describe("Fiscalía", () => {
  const caso = anonimo => ({ tipo: "fiscalia", subtipo: "denuncia", anonimo, datos: { nombre: "Luis", asunto: "Asunto", detalle: "Hechos" } });

  test("una denuncia anónima no guarda nada que identifique a la persona", async () => {
    await padron("luis@estudiantec.cr");
    const auth = cuenta("luis@estudiantec.cr");
    const { id, codigo } = await llamar(enviar, caso(true), auth);
    const guardado = JSON.stringify((await db.doc(`fiscaliaCasos/${id}`).get()).data());
    assert.ok(!guardado.includes("luis"), "no debe contener el correo ni el nombre");
    assert.ok(!guardado.includes(auth.uid), "no debe contener el uid");
    assert.ok(!guardado.includes(codigo), "no debe contener el código en claro");
    assert.match(guardado, /"enPadron":true/);
  });
  test("con el código se consulta el estado; con otro código no", async () => {
    const { codigo } = await llamar(enviar, caso(true), cuenta("luis@estudiantec.cr"));
    const resultado = await llamar(seguimiento, { codigo: codigo.toLowerCase() });
    assert.equal(resultado.estado, "recibido");
    assert.equal(resultado.asunto, "Asunto");
    await rechaza(llamar(seguimiento, { codigo: "AAAA-BBBB-CCCC" }), "not-found");
  });
  test("una denuncia identificada guarda al remitente y no genera código", async () => {
    const { id, codigo } = await llamar(enviar, caso(false), cuenta("luis@estudiantec.cr"));
    assert.equal(codigo, null);
    assert.equal((await db.doc(`fiscaliaCasos/${id}`).get()).data().remitente.email, "luis@estudiantec.cr");
  });
});

describe("AGEC extraordinaria (RI Art. 13 c)", () => {
  const agec = { tipo: "agec", datos: { nombre: "Ana", motivo: "Motivo", agenda: "1. Punto" } };

  test("se convoca al llegar al 10 % del padrón; las adhesiones fuera del padrón cuentan aparte", async () => {
    const emails = Array.from({ length: 20 }, (_, i) => `p${i}@estudiantec.cr`);
    await padron(...emails); // 20 personas → umbral 2
    const { id } = await llamar(enviar, agec, cuenta(emails[0]));
    let publica = (await db.doc(`agecPublicas/${id}`).get()).data();
    assert.deepEqual([publica.umbral, publica.adhesionesPadron, publica.alcanzado], [2, 1, false]);
    assert.ok(!JSON.stringify(publica).includes("@"), "la versión pública no tiene correos");

    await llamar(adherir, { id, nombre: "Externo" }, cuenta("fuera@estudiantec.cr"));
    publica = (await db.doc(`agecPublicas/${id}`).get()).data();
    assert.deepEqual([publica.adhesionesSinPadron, publica.alcanzado], [1, false]);

    await llamar(adherir, { id, nombre: "Beto" }, cuenta(emails[1]));
    publica = (await db.doc(`agecPublicas/${id}`).get()).data();
    assert.deepEqual([publica.adhesionesPadron, publica.alcanzado], [2, true]);
    assert.ok((await db.doc(`tramites/${id}`).get()).data().plazoRespuesta, "al alcanzarse, corre el plazo");
  });
  test("una persona no puede adherirse dos veces", async () => {
    await padron("p@estudiantec.cr");
    const { id } = await llamar(enviar, agec, cuenta("p@estudiantec.cr"));
    await rechaza(llamar(adherir, { id, nombre: "Ana" }, cuenta("p@estudiantec.cr")), "already-exists");
  });
});

describe("Avisos cuando la Junta o la Fiscalía actualizan un trámite", () => {
  const base = { tipo: "solicitud_junta", estado: "en_revision", respuestas: [], solicitante: { email: "ana@estudiantec.cr" } };
  test("rechazo: incluye la motivación y los recursos del RI Art. 83", () => {
    const aviso = util.avisoDeCambio(base, { ...base, estado: "rechazado", motivacionRechazo: "Falta un requisito <b>" });
    assert.match(aviso.asunto, /rechazado/);
    assert.match(aviso.html, /Falta un requisito &lt;b&gt;/, "la motivación va escapada");
    assert.match(aviso.html, /5 días hábiles/);
    assert.match(aviso.html, /apelar ante la AGEC/);
  });
  test("respuesta nueva y resolución generan aviso; sin cambios, no", () => {
    const respondido = { ...base, respuestas: [{ texto: "Lo vemos en la sesión del lunes" }] };
    assert.match(util.avisoDeCambio(base, respondido).asunto, /Nueva respuesta/);
    assert.match(util.avisoDeCambio(respondido, { ...respondido, estado: "resuelto" }).asunto, /resuelto/);
    assert.equal(util.avisoDeCambio(base, { ...base }), null);
  });
  test("al cambiar el estado de una AGEC se actualiza su versión pública", async () => {
    await db.doc("agecPublicas/a1").set({ estado: "recibido" });
    const antes = { ...base, tipo: "agec", estado: "recibido" };
    const despues = { ...antes, estado: "resuelto", respuestas: [{ texto: "Convocada para el 3 de octubre" }] };
    const cambio = fft.makeChange(
      fft.firestore.makeDocumentSnapshot(antes, "tramites/a1"),
      fft.firestore.makeDocumentSnapshot(despues, "tramites/a1")
    );
    await alActualizarTramite({ data: cambio, params: { id: "a1" } });
    assert.equal((await db.doc("agecPublicas/a1").get()).data().estado, "resuelto");
  });
});
