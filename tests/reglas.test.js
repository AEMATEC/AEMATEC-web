// Pruebas de firestore.rules y storage.rules contra el emulador de Firebase.
// Ejecutar desde esta carpeta: npm install && npm test
import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
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
  test("la lista pública de Fiscalía (config/fiscalia_publica) la escriben la Junta y la persona Fiscal, no el público", async () => {
    const datos = { miembros: [{ nombre: "Luis", puesto: "Fiscalía", foto: "" }] };
    await assertSucceeds(setDoc(doc(usuario(JUNTA).firestore(), "config", "fiscalia_publica"), datos));
    await assertSucceeds(setDoc(doc(usuario(FISCAL).firestore(), "config", "fiscalia_publica"), datos));
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "config", "fiscalia_publica")));
    await assertFails(setDoc(doc(anonimo().firestore(), "config", "fiscalia_publica"), datos));
    await assertFails(setDoc(doc(usuario(MODERADOR).firestore(), "config", "fiscalia_publica"), datos));
    await assertFails(setDoc(doc(usuario(FISCAL).firestore(), "config", "junta_publica"), datos));
  });
  test("el tema del sitio (config/tema) lo leen todas las páginas y solo lo cambia la Junta", async () => {
    await assertSucceeds(setDoc(doc(usuario(JUNTA).firestore(), "config", "tema"), { modo: "apagado", hasta: "" }));
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "config", "tema")));
    await assertFails(setDoc(doc(anonimo().firestore(), "config", "tema"), { modo: "auto" }));
    await assertFails(setDoc(doc(usuario(MODERADOR).firestore(), "config", "tema"), { modo: "auto" }));
  });
});

describe("Pizarra de anuncios", () => {
  const anuncio = cambios => ({ tipo: "noticia", titulo: "Nueva sala de estudio", texto: "Ya abrió la sala.", aprobado: false, creado: serverTimestamp(), ...cambios });
  const crear = (c, datos, id = "a1") => setDoc(doc(c.firestore(), "anuncios", id), datos);
  const sembrar = (id, datos) => env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "anuncios", id), datos));

  test("cualquiera propone un anuncio, pero queda sin aprobar", async () => {
    await assertSucceeds(crear(anonimo(), anuncio({ autor: "Ana", vence: "2026-12-01" })));
    await assertFails(crear(anonimo(), anuncio({ aprobado: true })), "no se aprueba solo");
  });
  test("el contenido debe ser válido", async () => {
    await assertFails(crear(anonimo(), anuncio({ tipo: "otro" })));
    await assertFails(crear(anonimo(), anuncio({ titulo: "ab" })));
    await assertFails(crear(anonimo(), anuncio({ texto: "x".repeat(501) })));
    await assertFails(crear(anonimo(), anuncio({ correo: "a@b.cr" })), "sin campos extra");
    await assertFails(crear(anonimo(), anuncio({ creado: Timestamp.fromDate(new Date("2020-01-01")) })));
  });
  test("el público solo ve los aprobados; la Junta y la moderación ven todos", async () => {
    await sembrar("ok", { ...anuncio(), aprobado: true, creado: Timestamp.now() });
    await sembrar("pend", { ...anuncio(), creado: Timestamp.now() });
    const publico = anonimo().firestore();
    await assertSucceeds(getDocs(query(collection(publico, "anuncios"), where("aprobado", "==", true))));
    await assertFails(getDocs(collection(publico, "anuncios")));
    await assertFails(getDoc(doc(publico, "anuncios", "pend")));
    await assertSucceeds(getDoc(doc(usuario(JUNTA).firestore(), "anuncios", "pend")));
    await assertSucceeds(getDocs(collection(usuario(MODERADOR).firestore(), "anuncios")));
  });
  test("aprobar, editar y borrar: solo Junta y moderación; ellas también publican directo", async () => {
    await sembrar("pend", { ...anuncio(), creado: Timestamp.now() });
    await assertFails(updateDoc(doc(anonimo().firestore(), "anuncios", "pend"), { aprobado: true }));
    await assertSucceeds(updateDoc(doc(usuario(MODERADOR).firestore(), "anuncios", "pend"), { aprobado: true }));
    await assertSucceeds(crear(usuario(JUNTA), anuncio({ aprobado: true }), "directo"));
    await assertFails(deleteDoc(doc(anonimo().firestore(), "anuncios", "pend")));
    await assertSucceeds(deleteDoc(doc(usuario(JUNTA).firestore(), "anuncios", "pend")));
  });
});

describe("Pregunta quincenal", () => {
  const dia = 86400000;
  const pregunta = (cambios = {}) => ({ id: "p1", texto: "¿Cuál es tu número favorito?", inicio: Timestamp.now(), fin: Timestamp.fromMillis(Date.now() + 15 * dia), ...cambios });
  const respuesta = cambios => ({ preguntaId: "p1", texto: "El 7", creado: serverTimestamp(), ...cambios });
  const ID = "p1_abcdefghijklmnopqrst";
  const poner = pregunta_ => env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "config", "pregunta"), pregunta_));
  const responder = (c, datos, id = ID) => setDoc(doc(c.firestore(), "preguntaRespuestas", id), datos);

  test("solo la Junta publica la pregunta; cualquiera la lee", async () => {
    await assertSucceeds(setDoc(doc(usuario(JUNTA).firestore(), "config", "pregunta"), pregunta()));
    await assertFails(setDoc(doc(usuario(MODERADOR).firestore(), "config", "pregunta"), pregunta()));
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "config", "pregunta")));
  });
  test("cualquiera responde mientras la pregunta está abierta, y solo a la pregunta vigente", async () => {
    await poner(pregunta());
    await assertSucceeds(responder(anonimo(), respuesta({ autor: "Ana" })));
    await assertFails(responder(anonimo(), respuesta({ preguntaId: "vieja" }), "vieja_abcdefghijklmnopqrst"), "otra pregunta");
    await assertFails(responder(anonimo(), respuesta(), "p1_corto"), "id demasiado corto");
    await assertFails(responder(anonimo(), respuesta({ texto: "" })));
    await assertFails(responder(anonimo(), respuesta({ texto: "x".repeat(501) })));
    await assertFails(responder(anonimo(), respuesta({ correo: "a@b.cr" })));
  });
  test("no se puede responder después del cierre, ni cambiar una respuesta", async () => {
    await poner(pregunta({ fin: Timestamp.fromMillis(Date.now() - dia) }));
    await assertFails(responder(anonimo(), respuesta()));
    await poner(pregunta());
    await assertSucceeds(responder(anonimo(), respuesta()));
    await assertFails(updateDoc(doc(anonimo().firestore(), "preguntaRespuestas", ID), { texto: "otra" }));
  });
  test("las respuestas no se ven hasta que pasen los 15 días (la Junta sí las ve)", async () => {
    await poner(pregunta());
    await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "preguntaRespuestas", ID), { preguntaId: "p1", texto: "El 7", creado: Timestamp.now() }));
    await assertFails(getDocs(collection(anonimo().firestore(), "preguntaRespuestas")));
    await assertFails(getDocs(collection(usuario(MODERADOR).firestore(), "preguntaRespuestas")));
    await assertSucceeds(getDocs(collection(usuario(JUNTA).firestore(), "preguntaRespuestas")));
    await poner(pregunta({ fin: Timestamp.fromMillis(Date.now() - 1000) }));
    await assertSucceeds(getDocs(collection(anonimo().firestore(), "preguntaRespuestas")));
  });
  test("solo la Junta borra respuestas", async () => {
    await poner(pregunta());
    await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "preguntaRespuestas", ID), { preguntaId: "p1", texto: "El 7", creado: Timestamp.now() }));
    await assertFails(deleteDoc(doc(anonimo().firestore(), "preguntaRespuestas", ID)));
    await assertFails(deleteDoc(doc(usuario(MODERADOR).firestore(), "preguntaRespuestas", ID)));
    await assertSucceeds(deleteDoc(doc(usuario(JUNTA).firestore(), "preguntaRespuestas", ID)));
  });
});

describe("Efemérides (calendario público, editable por Junta y moderación)", () => {
  const efemeride = cambios => ({
    tipo: "mep", titulo: "Inicio de lecciones", desc: "Comienza el curso lectivo.", desde: "2026-02-23", hasta: "2026-02-23",
    anual: false, actualizado: serverTimestamp(), ...cambios
  });
  const nueva = (contexto, datos) => setDoc(doc(contexto.firestore(), "efemerides", "prueba"), datos);

  test("cualquiera puede leer el calendario", async () => {
    await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "efemerides", "ya"), { tipo: "cr", titulo: "Algo", desde: "2026-01-01", hasta: "2026-01-01" }));
    await assertSucceeds(getDoc(doc(anonimo().firestore(), "efemerides", "ya")));
    await assertSucceeds(getDocs(collection(anonimo().firestore(), "efemerides")));
  });
  test("la Junta y la moderación agregan fechas; el público y otras cuentas no", async () => {
    await assertSucceeds(nueva(usuario(JUNTA), efemeride()));
    await assertSucceeds(nueva(usuario(MODERADOR), efemeride({ tipo: "tec" })));
    await assertFails(nueva(anonimo(), efemeride()));
    await assertFails(nueva(usuario("otra@estudiantec.cr"), efemeride()));
    await assertFails(nueva(usuario(JUNTA, false), efemeride()));
    await assertFails(nueva(usuario(FISCAL), efemeride()), "la Fiscalía no edita el calendario");
  });
  test("se aceptan varios días, la repetición anual de un solo día y la descripción vacía u omitida", async () => {
    await assertSucceeds(nueva(usuario(JUNTA), efemeride({ desde: "2026-07-06", hasta: "2026-07-17" })));
    await assertSucceeds(nueva(usuario(JUNTA), efemeride({ tipo: "aematec", anual: true, tema: "navidad" })));
    const { desc, ...sinDesc } = efemeride();
    await assertSucceeds(nueva(usuario(JUNTA), sinDesc));
  });
  test("el contenido debe ser válido: tipo, título, fechas, repetición y tamaños", async () => {
    const junta = usuario(JUNTA);
    await assertFails(nueva(junta, efemeride({ tipo: "otro" })));
    await assertFails(nueva(junta, efemeride({ titulo: "ab" })));
    await assertFails(nueva(junta, efemeride({ titulo: "x".repeat(121) })));
    await assertFails(nueva(junta, efemeride({ desc: "x".repeat(401) })));
    await assertFails(nueva(junta, efemeride({ desde: "23/02/2026" })));
    await assertFails(nueva(junta, efemeride({ desde: "2026-02-23", hasta: "2026-02-20" })), "el fin no puede ser antes del inicio");
    await assertFails(nueva(junta, efemeride({ anual: true, desde: "2026-07-06", hasta: "2026-07-17" })), "solo un día se repite cada año");
    await assertFails(nueva(junta, efemeride({ anual: "si" })));
    await assertFails(nueva(junta, efemeride({ tema: "x".repeat(41) })));
  });
  test("no se guardan campos extra (por ejemplo, el correo de quien la cambió) ni una hora inventada", async () => {
    const junta = usuario(JUNTA);
    await assertFails(nueva(junta, efemeride({ por: JUNTA })));
    await assertFails(nueva(junta, efemeride({ actualizado: new Date("2020-01-01") })));
    await assertFails(nueva(junta, { tipo: "mep", titulo: "Sin fechas", actualizado: serverTimestamp() }));
  });
  test("una efeméride de fábrica se oculta con { oculta: true } y nada más", async () => {
    await assertSucceeds(nueva(usuario(MODERADOR), { oculta: true, actualizado: serverTimestamp() }));
    await assertFails(nueva(usuario(MODERADOR), { oculta: false, actualizado: serverTimestamp() }));
    await assertFails(nueva(usuario(MODERADOR), { oculta: true, titulo: "otra cosa", actualizado: serverTimestamp() }));
    await assertFails(nueva(anonimo(), { oculta: true, actualizado: serverTimestamp() }));
  });
  test("la Junta y la moderación editan y borran; el público no", async () => {
    await assertSucceeds(nueva(usuario(JUNTA), efemeride()));
    await assertSucceeds(updateDoc(doc(usuario(MODERADOR).firestore(), "efemerides", "prueba"), { titulo: "Inicio del curso 2026", actualizado: serverTimestamp() }));
    await assertFails(deleteDoc(doc(anonimo().firestore(), "efemerides", "prueba")));
    await assertSucceeds(deleteDoc(doc(usuario(MODERADOR).firestore(), "efemerides", "prueba")));
    await assertSucceeds(nueva(usuario(JUNTA), efemeride()));
    await assertSucceeds(deleteDoc(doc(usuario(JUNTA).firestore(), "efemerides", "prueba")));
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
  const DUENO = "aematec@estudiantec.cr";
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
  test("un dueño necesita el correo verificado (si no, cualquiera podría crear antes esa cuenta)", async () => {
    await assertSucceeds(getDocs(collection(usuario(DUENO).firestore(), "padron")));
    await assertFails(getDocs(collection(usuario(DUENO, false).firestore(), "padron")));
  });
  test("solo la persona Fiscal borra un caso al archivarlo; ni la Junta, ni un dueño, ni quien lo envió", async () => {
    await assertFails(deleteDoc(doc(usuario(JUNTA).firestore(), "fiscaliaCasos", "f2")));
    await assertFails(deleteDoc(doc(usuario(DUENO).firestore(), "fiscaliaCasos", "f2")));
    await assertFails(deleteDoc(doc(cuentaUid("uid-luis", "luis@estudiantec.cr"), "fiscaliaCasos", "f2")));
    await assertSucceeds(deleteDoc(doc(usuario(FISCAL).firestore(), "fiscaliaCasos", "f2")));
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
  test("solo la Junta o la Fiscalía suben fotos de perfil, y solo imágenes", async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const sube = (contexto, ruta, tipo) => uploadBytes(ref(contexto.storage("biblioteca-aematec.firebasestorage.app"), ruta), png, { contentType: tipo });
    await assertFails(sube(anonimo(), "perfiles/junta/0f3a.png", "image/png"));
    await assertFails(sube(usuario("otra@estudiantec.cr"), "perfiles/junta/0f3a.png", "image/png"));
    await assertSucceeds(sube(usuario(JUNTA), "perfiles/junta/0f3a.png", "image/png"));
    await assertSucceeds(sube(usuario(FISCAL), "perfiles/fiscalia/0f3b.webp", "image/webp"));
    await assertFails(sube(usuario(JUNTA), "perfiles/junta/0f3a.html", "text/html"));
    await assertFails(sube(usuario(JUNTA), "perfiles/junta/0f3a.png", "text/html"));
    await assertFails(sube(usuario(JUNTA), "perfiles/junta/Foto.png", "image/png"));
    // RI Art. 42: la persona Fiscal no toca las fotos de la Junta; la Junta sí las de Fiscalía (excepción acordada).
    await assertFails(sube(usuario(FISCAL), "perfiles/junta/0f3c.png", "image/png"));
    await assertSucceeds(sube(usuario(JUNTA), "perfiles/fiscalia/0f3d.png", "image/png"));
    await assertFails(sube(usuario(JUNTA), "perfiles/otra/0f3e.png", "image/png"));
  });
});
