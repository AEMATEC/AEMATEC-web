// Pruebas de firestore.rules y storage.rules contra el emulador de Firebase.
// Ejecutar desde esta carpeta: npm install && npm test
import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
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
  test("el público no puede consultar si un correo es de la Junta", async () => {
    await assertFails(getDoc(doc(anonimo().firestore(), "junta", JUNTA)));
    await assertFails(getDoc(doc(usuario("otra@estudiantec.cr").firestore(), "junta", JUNTA)));
  });
  test("cada cuenta puede leer su propio documento de la Junta (aunque no esté en la lista o sin verificar)", async () => {
    await assertSucceeds(getDoc(doc(usuario(JUNTA).firestore(), "junta", JUNTA)));
    await assertSucceeds(getDoc(doc(usuario(JUNTA, false).firestore(), "junta", JUNTA)));
    await assertSucceeds(getDoc(doc(usuario("otra@estudiantec.cr").firestore(), "junta", "otra@estudiantec.cr")));
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
  test("el tema del sitio (config/tema) lo leen todas las páginas y solo lo cambia la Junta", async () => {
    await assertSucceeds(setDoc(doc(usuario(JUNTA).firestore(), "config", "tema"), { modo: "apagado", hasta: "" }));
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "config", "tema")));
    await assertFails(setDoc(doc(anonimo().firestore(), "config", "tema"), { modo: "auto" }));
    await assertFails(setDoc(doc(usuario(MODERADOR).firestore(), "config", "tema"), { modo: "auto" }));
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

describe("Asistente básico (reportar un problema)", () => {
  const reporte = cambios => ({ mensaje: "No puedo abrir un archivo del Repositorio", contacto: "", pagina: "repositorio.html", ...cambios });

  test("cualquiera puede reportar un problema, sin dar su correo", async () => {
    await assertSucceeds(addDoc(collection(anonimo().firestore(), "chatbotReportes"), reporte()));
  });
  test("el mensaje es obligatorio", async () => {
    await assertFails(addDoc(collection(anonimo().firestore(), "chatbotReportes"), reporte({ mensaje: "" })));
  });
  test("no se aceptan campos fuera de lo esperado (por ejemplo, un uid)", async () => {
    await assertFails(addDoc(collection(anonimo().firestore(), "chatbotReportes"), reporte({ uid: "algo" })));
  });
  test("solo Moderadores leen los reportes (pueden traer datos de contacto)", async () => {
    await assertFails(getDocs(collection(anonimo().firestore(), "chatbotReportes")));
    await assertSucceeds(getDocs(collection(usuario(MODERADOR).firestore(), "chatbotReportes")));
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
  test("los enlaces de un material propuesto deben ser https (se muestran como href públicos)", async () => {
    const db = anonimo().firestore();
    await assertSucceeds(addDoc(collection(db, "resources"), recursoNuevo({ fileUrl: "https://ejemplo.com/guia.pdf", explanationUrl: "https://youtu.be/abc" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ fileUrl: "javascript:alert(1)" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ fileUrl: "http://ejemplo.com/guia.pdf" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ explanationUrl: "javascript:alert(1)" })));
    const explicacion = { storagePath: "recursos/academico/0f3a-explicacion.pdf", fileUrl: "https://ejemplo.com/explicacion.pdf", extension: "pdf", size: 10 };
    await assertSucceeds(addDoc(collection(db, "resources"), recursoNuevo({ explanation: explicacion })));
    await assertSucceeds(addDoc(collection(db, "resources"), recursoNuevo({ explanation: null })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ explanation: { ...explicacion, fileUrl: "javascript:alert(1)" } })));
  });
  test("las rutas de archivo de un material solo apuntan a la carpeta de recursos de su sección", async () => {
    const db = anonimo().firestore();
    const explicacion = { storagePath: "recursos/academico/0f3a-1b2c-explicacion.pdf", fileUrl: "https://ejemplo.com/e.pdf", extension: "pdf", size: 10 };
    await assertSucceeds(addDoc(collection(db, "resources"), recursoNuevo({ storagePath: "recursos/academico/0f3a-1b2c.pdf", explanation: explicacion })));
    await assertSucceeds(addDoc(collection(db, "resources"), recursoNuevo({ storagePath: "" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ storagePath: "inventario/biblioteca/portada.jpg" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ storagePath: "recursos/docentes/0f3a-1b2c.pdf" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ storagePath: "recursos/academico/../otro.pdf" })));
    await assertFails(addDoc(collection(db, "resources"), recursoNuevo({ explanation: { ...explicacion, storagePath: "recursos/academico/0f3a-1b2c.pdf" } })));
  });
  test("un moderador puede buscar qué materiales usan un archivo (antes de borrarlo)", async () => {
    const db = usuario(MODERADOR).firestore();
    await assertSucceeds(getDocs(query(collection(db, "resources"), where("storagePath", "==", "recursos/academico/0f3a.pdf"))));
    await assertSucceeds(getDocs(query(collection(db, "resources"), where("explanation.storagePath", "==", "recursos/academico/0f3a.pdf"))));
    await assertFails(getDocs(query(collection(anonimo().firestore(), "resources"), where("storagePath", "==", "recursos/academico/0f3a.pdf"))));
  });
  test("un moderador no puede poner un enlace de explicación inseguro", async () => {
    const db = usuario(MODERADOR).firestore();
    await assertSucceeds(updateDoc(doc(db, "resources", "pendiente"), { explanationUrl: "https://ejemplo.com/explicacion" }));
    await assertFails(updateDoc(doc(db, "resources", "pendiente"), { explanationUrl: "javascript:alert(1)" }));
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

describe("Trámites (los crea solo el servidor)", () => {
  const DUENO = "angeloyeshuac@gmail.com";
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, "tramites", "t1"), { tipo: "solicitud_junta", solicitanteUid: "uid-ana", solicitante: { email: "ana@estudiantec.cr" }, estado: "recibido", respuestas: [] });
      await setDoc(doc(db, "fiscaliaCasos", "f1"), { subtipo: "denuncia", anonimo: true, remitenteUid: null, estado: "recibido", respuestas: [] });
      await setDoc(doc(db, "fiscaliaCasos", "f2"), { subtipo: "consulta", anonimo: false, remitenteUid: "uid-luis", estado: "recibido", respuestas: [] });
      await setDoc(doc(db, "agecPublicas", "a1"), { motivo: "M", umbral: 2 });
    });
  });
  const cuentaUid = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true }).firestore();

  test("nadie crea trámites ni casos desde el navegador, ni siquiera la Junta", async () => {
    await assertFails(setDoc(doc(usuario(JUNTA).firestore(), "tramites", "x"), { tipo: "solicitud_junta" }));
    await assertFails(setDoc(doc(anonimo().firestore(), "fiscaliaCasos", "x"), { subtipo: "denuncia" }));
  });
  test("la Junta y quien lo envió leen el trámite; otra persona no", async () => {
    await assertSucceeds(getDoc(doc(usuario(JUNTA).firestore(), "tramites", "t1")));
    await assertSucceeds(getDoc(doc(cuentaUid("uid-ana", "ana@estudiantec.cr"), "tramites", "t1")));
    await assertFails(getDoc(doc(cuentaUid("uid-otro", "otro@estudiantec.cr"), "tramites", "t1")));
  });
  test("la Junta cambia el estado y responde, pero no puede alterar al solicitante", async () => {
    const db = usuario(JUNTA).firestore();
    await assertSucceeds(updateDoc(doc(db, "tramites", "t1"), { estado: "en_revision" }));
    await assertFails(updateDoc(doc(db, "tramites", "t1"), { solicitante: { email: "otro@estudiantec.cr" } }));
    await assertFails(updateDoc(doc(db, "tramites", "t1"), { estado: "inventado" }));
  });
  test("RI Art. 82: la Junta no puede rechazar sin motivación", async () => {
    const db = usuario(JUNTA).firestore();
    await assertFails(updateDoc(doc(db, "tramites", "t1"), { estado: "rechazado" }));
    await assertFails(updateDoc(doc(db, "tramites", "t1"), { estado: "rechazado", motivacionRechazo: "No." }));
    await assertSucceeds(updateDoc(doc(db, "tramites", "t1"), { estado: "rechazado", motivacionRechazo: "No cumple el requisito del Art. 30." }));
  });
  test("RI Art. 42: solo la Fiscalía lee los casos; ni la Junta ni un dueño", async () => {
    await assertSucceeds(getDoc(doc(usuario(FISCAL).firestore(), "fiscaliaCasos", "f1")));
    await assertFails(getDoc(doc(usuario(JUNTA).firestore(), "fiscaliaCasos", "f1")));
    await assertFails(getDoc(doc(usuario(DUENO).firestore(), "fiscaliaCasos", "f1")));
    await assertFails(getDocs(collection(usuario(JUNTA).firestore(), "fiscaliaCasos")));
  });
  test("quien envió un caso identificado lo puede ver; el anónimo no queda ligado a nadie", async () => {
    await assertSucceeds(getDoc(doc(cuentaUid("uid-luis", "luis@estudiantec.cr"), "fiscaliaCasos", "f2")));
    await assertFails(getDoc(doc(cuentaUid("uid-luis", "luis@estudiantec.cr"), "fiscaliaCasos", "f1")));
  });
  test("la Fiscalía actualiza el estado de un caso; la Junta no", async () => {
    await assertSucceeds(updateDoc(doc(usuario(FISCAL).firestore(), "fiscaliaCasos", "f1"), { estado: "en_revision" }));
    await assertFails(updateDoc(doc(usuario(JUNTA).firestore(), "fiscaliaCasos", "f1"), { estado: "resuelto" }));
  });
  test("el avance de una AGEC es público pero de solo lectura; los límites son privados", async () => {
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "agecPublicas", "a1")));
    await assertFails(setDoc(doc(usuario(JUNTA).firestore(), "agecPublicas", "a1"), { umbral: 1 }));
    await assertFails(getDoc(doc(usuario(JUNTA).firestore(), "limites", "cualquiera")));
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
