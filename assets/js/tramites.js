// Página pública de Trámites (tramites.html).
// La persona verifica su correo @estudiantec.cr con un enlace (sin contraseña) y envía el trámite a las
// Cloud Functions de functions/tramites.js, que revisan el padrón y guardan todo. El navegador no escribe trámites.
import { app } from "./firebase.js";
import { escapeHtml } from "./util.js";
import {
  getAuth, onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const enviarTramite = httpsCallable(functions, "enviarTramite");
const adherirAgec = httpsCallable(functions, "adherirAgec");
const consultarSeguimiento = httpsCallable(functions, "consultarSeguimiento");
// El enlace lo envía la Cloud Function desde el Gmail de la Junta (el correo del TEC bloqueaba el de Firebase).
const enviarEnlaceCorreo = httpsCallable(functions, "enviarEnlaceCorreo");

const DOMINIO = "@estudiantec.cr";
const CLAVE_CORREO = "aematecCorreoTramites";
const $ = selector => document.querySelector(selector);

const TIPOS = {
  solicitud_junta: {
    titulo: "Solicitud a la Junta Directiva",
    aviso: "La Junta debe responderte en un máximo de 10 días hábiles (RI Art. 111). Si rechaza la solicitud, debe explicarte los motivos y cómo pedir que la reconsidere (Art. 82-83).",
    subtipos: { punto_agenda: "Incluir un punto en la agenda de una sesión", asistir_sesion: "Asistir a una sesión (para exponer o como oyente)", rendicion_cuentas: "Solicitar rendición de cuentas", otra: "Otra solicitud" },
    campos: ["asunto", "detalle"]
  },
  postulacion: {
    titulo: "Postulación",
    aviso: "Puedes pedir presentar tu candidatura en una sesión de la Junta (RI Art. 93). La Junta responde en un máximo de 10 días hábiles.",
    subtipos: { comision: "Comisión de la AEMATEC", representacion: "Representación estudiantil" },
    campos: ["organo", "motivacion"]
  },
  agec: {
    titulo: "Solicitud de AGEC extraordinaria",
    aviso: "La Asamblea extraordinaria se convoca cuando la pide al menos el 10 % del padrón (RI Art. 13). Al crearla, tu adhesión cuenta como la primera; comparte esta página para que otras personas se adhieran.",
    subtipos: null,
    campos: ["motivo", "agenda"]
  },
  fiscalia: {
    titulo: "Consulta o denuncia a Fiscalía",
    aviso: "Solo la persona Fiscal puede leerla: la Junta Directiva no tiene acceso (RI Art. 42).",
    subtipos: { consulta: "Consulta", denuncia: "Denuncia" },
    campos: ["asunto", "detalle"]
  }
};
const ESTADOS = { recibido: "Recibido", en_revision: "En revisión", resuelto: "Resuelto", rechazado: "Rechazado" };

let tipoActual = null;
let cuenta = null; // { email } cuando el correo está verificado

const guardarCorreo = email => { try { localStorage.setItem(CLAVE_CORREO, email); } catch { /* sin almacenamiento */ } };
const leerCorreo = () => { try { return localStorage.getItem(CLAVE_CORREO); } catch { return null; } };
const fecha = valor => valor?.toDate ? valor.toDate().toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Costa_Rica" }) : "";
function mensaje(elemento, texto, tipo = "info") {
  elemento.textContent = texto;
  elemento.className = `text-sm ${tipo === "error" ? "text-[#C2413B]" : tipo === "ok" ? "text-[#087F8C]" : "text-[#607480]"}`;
  elemento.hidden = false;
}
// Los errores de las funciones traen un mensaje en español preparado en el servidor.
const textoError = error => error?.message?.replace(/^Firebase:\s*/, "") || "Ocurrió un error. Intenta de nuevo.";

// ---------- Paso 1: verificación por enlace al correo ----------
$("#form-correo").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#correo").value.trim().toLowerCase();
  if (!email.endsWith(DOMINIO)) return mensaje($("#estado-correo"), `Usa tu correo institucional ${DOMINIO}.`, "error");
  const boton = event.submitter;
  if (boton) boton.disabled = true;
  mensaje($("#estado-correo"), "Enviando el enlace...");
  try {
    await enviarEnlaceCorreo({ email, url: location.origin + location.pathname });
    guardarCorreo(email);
    mensaje($("#estado-correo"), `Te enviamos un enlace a ${email} desde aeemac.tec@gmail.com. Ábrelo en este dispositivo para continuar. Puede tardar unos minutos; revisa también la carpeta de correo no deseado.`, "ok");
  } catch (error) {
    mensaje($("#estado-correo"), `No se pudo enviar el enlace: ${textoError(error)}`, "error");
  } finally {
    if (boton) boton.disabled = false;
  }
});

$("#cambiar-correo").addEventListener("click", () => signOut(auth));

async function completarEnlace() {
  if (!isSignInWithEmailLink(auth, location.href)) return;
  let email = leerCorreo();
  if (!email) email = window.prompt("Para confirmar, escribe el correo al que llegó el enlace:");
  if (!email) return;
  try {
    await signInWithEmailLink(auth, email.trim().toLowerCase(), location.href);
  } catch (error) {
    mensaje($("#estado-correo"), `El enlace no es válido o ya se usó. Pide uno nuevo. (${textoError(error)})`, "error");
  } finally {
    history.replaceState(null, "", location.pathname); // quita el código del enlace de la barra de direcciones
  }
}

onAuthStateChanged(auth, async user => {
  const email = user?.email?.toLowerCase() || "";
  cuenta = user && user.emailVerified && email.endsWith(DOMINIO) ? { email } : null;
  $("#form-correo").hidden = Boolean(cuenta);
  $("#estado-correo").hidden = Boolean(cuenta);
  $("#correo-verificado").hidden = !cuenta;
  $("#correo-actual").textContent = email;
  if (user && !cuenta) mensaje($("#estado-correo"), `Esta cuenta no usa un correo ${DOMINIO} verificado.`, "error");
  actualizarBoton();
  await cargarMisTramites();
  if (tipoActual === "agec") await cargarAgec();
});

// ---------- Paso 2: formulario según el tipo ----------
document.querySelectorAll(".tipo-tramite").forEach(boton => boton.addEventListener("click", () => elegirTipo(boton.dataset.tipo)));

function elegirTipo(tipo) {
  tipoActual = tipo;
  const definicion = TIPOS[tipo];
  document.querySelectorAll(".tipo-tramite").forEach(b => b.setAttribute("aria-checked", String(b.dataset.tipo === tipo)));
  $("#titulo-form").textContent = definicion.titulo;
  $("#aviso-form").textContent = definicion.aviso;
  document.querySelectorAll("#form-tramite [data-tipos]").forEach(campo => { campo.hidden = !campo.dataset.tipos.split(" ").includes(tipo); });
  $("#subtipo").innerHTML = definicion.subtipos
    ? Object.entries(definicion.subtipos).map(([valor, texto]) => `<option value="${valor}">${escapeHtml(texto)}</option>`).join("")
    : "";
  $("#anonimo").checked = false;
  $("#campo-nombre").hidden = false;
  $("#estado-envio").hidden = true;
  $("#resultado").hidden = true;
  $("#form-tramite").hidden = false;
  $("#agec-abiertas").hidden = tipo !== "agec";
  if (tipo === "agec") cargarAgec();
  actualizarBoton();
}

$("#anonimo").addEventListener("change", () => { $("#campo-nombre").hidden = $("#anonimo").checked; });

function actualizarBoton() {
  const boton = $("#boton-enviar");
  boton.disabled = !cuenta;
  boton.textContent = cuenta ? "Enviar trámite" : "Primero verifica tu correo (paso 1)";
}

$("#form-tramite").addEventListener("submit", async event => {
  event.preventDefault();
  if (!cuenta || !tipoActual) return;
  const anonimo = tipoActual === "fiscalia" && $("#anonimo").checked;
  const datos = { nombre: anonimo ? "" : $("#nombre").value.trim() };
  for (const campo of TIPOS[tipoActual].campos) datos[campo] = $(`#${campo}`).value.trim();
  const faltantes = [...(anonimo ? [] : ["nombre"]), ...TIPOS[tipoActual].campos].filter(campo => !datos[campo]);
  if (faltantes.length) return mensaje($("#estado-envio"), "Completa todos los campos antes de enviar.", "error");

  const boton = $("#boton-enviar");
  boton.disabled = true;
  boton.textContent = "Enviando...";
  try {
    const { data } = await enviarTramite({ tipo: tipoActual, subtipo: $("#subtipo").value, datos, anonimo });
    $("#form-tramite").reset();
    $("#form-tramite").hidden = true;
    mostrarResultado(data);
    await cargarMisTramites();
    if (tipoActual === "agec") await cargarAgec();
  } catch (error) {
    mensaje($("#estado-envio"), textoError(error), "error");
  } finally {
    actualizarBoton();
  }
});

function mostrarResultado({ codigo }) {
  const resultado = $("#resultado");
  resultado.innerHTML = codigo
    ? `<h3 class="font-sans text-lg font-bold">Tu caso anónimo fue enviado a la Fiscalía</h3>
       <p class="mt-2 text-sm">Guarda este código. Es la única forma de seguir tu caso y <strong>no podemos recuperarlo</strong>:</p>
       <p class="mt-3 flex flex-wrap items-center gap-3"><code id="codigo-nuevo" class="rounded-[8px] bg-white px-4 py-2 font-sans text-xl font-bold tracking-[0.15em]">${escapeHtml(codigo)}</code>
       <button type="button" id="copiar-codigo" class="font-sans text-xs font-bold text-[#087F8C] underline">Copiar</button></p>`
    : `<h3 class="font-sans text-lg font-bold">¡Trámite enviado!</h3>
       <p class="mt-2 text-sm">Te enviamos una confirmación por correo. Puedes ver su estado abajo, en "Mis trámites".</p>`;
  resultado.hidden = false;
  $("#copiar-codigo")?.addEventListener("click", () => navigator.clipboard?.writeText(codigo));
  resultado.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- AGEC abiertas y adhesiones ----------
async function cargarAgec() {
  const lista = $("#lista-agec");
  try {
    const snapshot = await getDocs(collection(db, "agecPublicas"));
    const abiertas = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => ["recibido", "en_revision"].includes(a.estado));
    lista.innerHTML = abiertas.length ? abiertas.map(a => {
      const porcentaje = Math.min(100, Math.round((a.adhesionesPadron / a.umbral) * 100));
      return `<li class="rounded-[14px] border border-[#D8E3E9] bg-white p-5">
        <p class="font-sans text-sm font-bold">${escapeHtml(a.motivo)}</p>
        <p class="mt-1 whitespace-pre-line text-sm text-[#5B6E7B]">${escapeHtml(a.agenda)}</p>
        <div class="mt-3 h-2 rounded-full bg-[#E6EEF2]" role="progressbar" aria-valuemin="0" aria-valuemax="${a.umbral}" aria-valuenow="${a.adhesionesPadron}"><div class="h-2 rounded-full bg-[#00A6B8]" style="width:${porcentaje}%"></div></div>
        <p class="mt-2 text-xs text-[#607480]">${a.adhesionesPadron} de ${a.umbral} adhesiones del padrón${a.adhesionesSinPadron ? ` · ${a.adhesionesSinPadron} por confirmar (no están en el padrón)` : ""}${a.alcanzado ? " · <strong>Alcanzó el 10 %</strong>" : ""}</p>
        <button type="button" data-adherir="${escapeHtml(a.id)}" class="mt-3 h-10 rounded-[9px] border border-[#0D2B45] px-4 font-sans text-xs font-bold disabled:opacity-50" ${cuenta ? "" : "disabled"}>${cuenta ? "Adherirme" : "Verifica tu correo para adherirte"}</button>
        <p data-estado-adhesion="${escapeHtml(a.id)}" class="mt-2 text-sm" hidden></p>
      </li>`;
    }).join("") : `<li class="text-sm text-[#607480]">No hay solicitudes abiertas. Puedes iniciar una con el formulario.</li>`;
    lista.querySelectorAll("[data-adherir]").forEach(boton => boton.addEventListener("click", () => adherir(boton)));
  } catch (error) {
    lista.innerHTML = `<li class="text-sm text-[#C2413B]">No se pudieron cargar las solicitudes: ${escapeHtml(textoError(error))}</li>`;
  }
}

async function adherir(boton) {
  const id = boton.dataset.adherir;
  const estado = document.querySelector(`[data-estado-adhesion="${CSS.escape(id)}"]`);
  const nombre = $("#nombre").value.trim() || window.prompt("Escribe tu nombre completo para la adhesión:")?.trim();
  if (!nombre) return;
  boton.disabled = true;
  try {
    const { data } = await adherirAgec({ id, nombre });
    mensaje(estado, data.enPadron ? "¡Listo! Tu adhesión quedó registrada." : "Tu adhesión quedó registrada. Como tu correo no está en el padrón actual, la Junta la confirmará.", "ok");
    await cargarAgec();
  } catch (error) {
    mensaje(estado, textoError(error), "error");
    boton.disabled = false;
  }
}

// ---------- Mis trámites ----------
async function cargarMisTramites() {
  const seccion = $("#mis-tramites");
  if (!cuenta) { seccion.hidden = true; return; }
  const uid = auth.currentUser.uid;
  try {
    const [tramites, casos] = await Promise.all([
      getDocs(query(collection(db, "tramites"), where("solicitanteUid", "==", uid))),
      getDocs(query(collection(db, "fiscaliaCasos"), where("remitenteUid", "==", uid)))
    ]);
    const items = [
      ...tramites.docs.map(d => ({ ...d.data(), nombre: TIPOS[d.data().tipo]?.titulo })),
      ...casos.docs.map(d => ({ ...d.data(), nombre: TIPOS.fiscalia.titulo }))
    ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    seccion.hidden = !items.length;
    $("#lista-mis").innerHTML = items.map(t => `<li class="rounded-[14px] border border-[#D8E3E9] bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-sans text-sm font-bold">${escapeHtml(t.nombre)}${t.datos?.asunto ? ` — ${escapeHtml(t.datos.asunto)}` : ""}</p>
        <span class="rounded-full bg-[#EDF3F5] px-3 py-1 font-sans text-xs font-bold">${escapeHtml(ESTADOS[t.estado] || t.estado)}</span>
      </div>
      <p class="mt-1 text-xs text-[#607480]">Enviado el ${fecha(t.createdAt)}${t.plazoRespuesta ? ` · Plazo de respuesta: ${fecha(t.plazoRespuesta)}` : ""}${t.enPadron === false ? " · Tu correo no está en el padrón actual: la Junta lo verificará" : ""}</p>
      ${t.motivacionRechazo ? `<p class="mt-2 text-sm"><strong>Motivo del rechazo:</strong> ${escapeHtml(t.motivacionRechazo)}</p>` : ""}
      ${(t.respuestas || []).map(r => `<p class="mt-2 rounded-[10px] bg-[#F1F6F8] px-3 py-2 text-sm">${escapeHtml(r.texto)}</p>`).join("")}
    </li>`).join("");
  } catch (error) {
    seccion.hidden = false;
    $("#lista-mis").innerHTML = `<li class="text-sm text-[#C2413B]">No se pudieron cargar tus trámites: ${escapeHtml(textoError(error))}</li>`;
  }
}

// ---------- Seguimiento anónimo ----------
$("#form-seguimiento").addEventListener("submit", async event => {
  event.preventDefault();
  const salida = $("#resultado-seguimiento");
  try {
    const { data } = await consultarSeguimiento({ codigo: $("#codigo").value });
    salida.innerHTML = `<p><strong>${escapeHtml(data.subtipo === "denuncia" ? "Denuncia" : "Consulta")}:</strong> ${escapeHtml(data.asunto)}</p>
      <p class="mt-1">Estado: <strong>${escapeHtml(ESTADOS[data.estado] || data.estado)}</strong></p>
      ${data.respuestas.map(r => `<p class="mt-2 rounded-[10px] bg-[#F1F6F8] px-3 py-2">${escapeHtml(r.texto)}</p>`).join("") || `<p class="mt-2 text-[#607480]">Todavía no hay respuestas de la Fiscalía.</p>`}`;
    salida.className = "mt-4 text-sm";
  } catch (error) {
    salida.textContent = textoError(error);
    salida.className = "mt-4 text-sm text-[#C2413B]";
  }
  salida.hidden = false;
});

completarEnlace();
