// Pruebas de firestore.rules y storage.rules contra el emulador de Firebase.
// Ejecutar desde esta carpeta: npm install && npm test
import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

const JUNTA = "jd@estudiantec.cr";
const MODERADOR = "mod@estudiantec.cr";
const FISCAL = "fiscal@estudiantec.cr";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-aematec",
    firestore: { rules: readFileSync("../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("../storage.rules", "utf8"), host: "127.0.0.1", port: 9199 }
  });
});

after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "junta", JUNTA), { email: JUNTA, nombre: "Ana", puesto: "Presidencia" });
    await setDoc(doc(db, "moderators", MODERADOR), { email: MODERADOR });
    await setDoc(doc(db, "fiscalia", FISCAL), { email: FISCAL });
    await setDoc(doc(db, "resources", "publicado"), { title: "Guía", published: true, status: "approved" });
    await setDoc(doc(db, "resources", "pendiente"), { title: "Borrador", published: false, status: "pending" });
  });
});

const anonimo = () => env.unauthenticatedContext();
const usuario = (email, verificado = true) => env.authenticatedContext(email, { email, email_verified: verificado });

const solicitudPrestamo = cambios => ({
  itemId: "item-1", itemTipo: "aematec", itemNombre: "Proyector", itemCodigo: "ACA-001",
  solicitanteNombre: "Luis", solicitanteCarne: "2024000000", solicitanteContacto: "luis@estudiantec.cr",
  fechaPrevista: "2026-10-01", notas: "", estado: "pendiente", ...cambios
});

const recursoNuevo = cambios => ({
  title: "Práctica de límites", description: "Ejercicios resueltos", section: "academico", type: "Práctica",
  labels: ["Cálculo"], grade: "", educationalCycle: "", course: "Cálculo I", courseCode: "MA1102",
  author: "Comunidad MATEC", materials: "", requiresInternet: false, explanationUrl: "",
  extension: "pdf", size: 1024, status: "pending", published: false, ...cambios
});

describe("Junta Directiva (RI Art. 143)", () => {
  test("cualquiera puede consultar un correo puntual (registro de cuentas)", async () => {
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "junta", JUNTA)));
  });
  test("el público no puede listar los correos de la Junta", async () => {
    await assertFails(getDocs(collection(anonimo().firestore(), "junta")));
  });
  test("la Junta verificada sí lista y edita la Junta", async () => {
    const db = usuario(JUNTA).firestore();
    await assertSucceeds(getDocs(collection(db, "junta")));
    await assertSucceeds(setDoc(doc(db, "junta", "nuevo@estudiantec.cr"), { email: "nuevo@estudiantec.cr" }));
  });
  test("una cuenta de Junta sin verificar no tiene permisos", async () => {
    await assertFails(getDocs(collection(usuario(JUNTA, false).firestore(), "junta")));
  });
  test("la lista pública (config/junta_publica) la lee cualquiera y solo la escribe la Junta", async () => {
    await assertSucceeds(setDoc(doc(usuario(JUNTA).firestore(), "config", "junta_publica"), { miembros: [] }));
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "config", "junta_publica")));
    await assertFails(setDoc(doc(anonimo().firestore(), "config", "junta_publica"), { miembros: [] }));
  });
});

describe("Padrón y Fiscalía", () => {
  test("solo la Junta lee el padrón", async () => {
    await assertFails(getDocs(collection(anonimo().firestore(), "padron")));
    await assertSucceeds(getDocs(collection(usuario(JUNTA).firestore(), "padron")));
  });
  test("la Fiscalía y la Junta pueden registrar a la nueva persona Fiscal; el público no", async () => {
    const nueva = "nueva.fiscal@estudiantec.cr";
    await assertSucceeds(setDoc(doc(usuario(FISCAL).firestore(), "fiscalia", nueva), { email: nueva }));
    await assertSucceeds(deleteDoc(doc(usuario(JUNTA).firestore(), "fiscalia", nueva)));
    await assertFails(setDoc(doc(anonimo().firestore(), "fiscalia", nueva), { email: nueva }));
    await assertFails(setDoc(doc(usuario(FISCAL, false).firestore(), "fiscalia", nueva), { email: nueva }));
  });
  test("Fiscalía necesita correo verificado", async () => {
    await assertFails(getDoc(doc(usuario(FISCAL, false).firestore(), "fiscalia", FISCAL)));
    await assertSucceeds(getDoc(doc(usuario(FISCAL).firestore(), "fiscalia", FISCAL)));
  });
});

describe("Préstamos (RI Art. 120-123)", () => {
  test("cualquiera puede enviar una solicitud completa", async () => {
    await assertSucceeds(addDoc(collection(anonimo().firestore(), "prestamoSolicitudes"), solicitudPrestamo()));
  });
  test("la fecha prevista de devolución es obligatoria", async () => {
    await assertFails(addDoc(collection(anonimo().firestore(), "prestamoSolicitudes"), solicitudPrestamo({ fechaPrevista: "" })));
  });
  test("no se puede crear una solicitud ya aprobada", async () => {
    await assertFails(addDoc(collection(anonimo().firestore(), "prestamoSolicitudes"), solicitudPrestamo({ estado: "entregado" })));
  });
  test("solo la Junta ve las solicitudes (tienen datos personales)", async () => {
    await assertFails(getDocs(collection(anonimo().firestore(), "prestamoSolicitudes")));
    await assertSucceeds(getDocs(collection(usuario(JUNTA).firestore(), "prestamoSolicitudes")));
  });
});

describe("Inventario", () => {
  test("lectura pública, escritura solo Junta", async () => {
    await assertSucceeds(getDocs(collection(anonimo().firestore(), "inventario")));
    await assertFails(addDoc(collection(anonimo().firestore(), "inventario"), { tipo: "aematec" }));
    await assertSucceeds(addDoc(collection(usuario(JUNTA).firestore(), "inventario"), { tipo: "aematec" }));
  });
});

describe("Biblioteca: recursos y moderación", () => {
  test("el público lee lo publicado pero no lo pendiente", async () => {
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "resources", "publicado")));
    await assertFails(getDoc(doc(anonimo().firestore(), "resources", "pendiente")));
  });
  test("cualquiera propone material, que queda pendiente", async () => {
    await assertSucceeds(addDoc(collection(anonimo().firestore(), "resources"), recursoNuevo()));
  });
  test("nadie puede autopublicar material", async () => {
    await assertFails(addDoc(collection(anonimo().firestore(), "resources"), recursoNuevo({ status: "approved", published: true })));
  });
  test("un moderador aprueba, pero no puede cambiar el autor", async () => {
    const db = usuario(MODERADOR).firestore();
    await assertSucceeds(updateDoc(doc(db, "resources", "pendiente"), { status: "approved", published: true }));
    await assertFails(updateDoc(doc(db, "resources", "pendiente"), { author: "Otra persona" }));
  });
  test("el público no puede borrar recursos", async () => {
    await assertFails(deleteDoc(doc(anonimo().firestore(), "resources", "publicado")));
  });
});

describe("Storage", () => {
  const pdf = new Uint8Array([37, 80, 68, 70]);
  test("se puede subir un PDF de material con nombre válido", async () => {
    const storage = anonimo().storage("biblioteca-aematec.firebasestorage.app");
    await assertSucceeds(uploadBytes(ref(storage, "recursos/academico/0f3a-1b2c.pdf"), pdf, { contentType: "application/pdf" }));
  });
  test("no se aceptan tipos de archivo ejecutables", async () => {
    const storage = anonimo().storage("biblioteca-aematec.firebasestorage.app");
    await assertFails(uploadBytes(ref(storage, "recursos/academico/0f3a-1b2c.html"), pdf, { contentType: "text/html" }));
  });
  test("solo la Junta sube fotos del inventario", async () => {
    const foto = ["inventario/biblioteca/0f3a.png", new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }];
    await assertFails(uploadBytes(ref(anonimo().storage("biblioteca-aematec.firebasestorage.app"), foto[0]), foto[1], foto[2]));
    await assertSucceeds(uploadBytes(ref(usuario(JUNTA).storage("biblioteca-aematec.firebasestorage.app"), foto[0]), foto[1], foto[2]));
  });
});
