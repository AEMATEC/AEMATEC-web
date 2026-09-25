// Sección Trámites del panel (admin.html).
// La Junta ve y gestiona "tramites"; la Fiscalía ve y gestiona "fiscaliaCasos" (RI Art. 42: la Junta no los ve).
// Los cambios se guardan directo en Firestore (las reglas limitan qué campos se pueden tocar) y las funciones
// alActualizarTramite / alActualizarCasoFiscalia avisan por correo a la persona.
import { app } from "../firebase.js";
import { escapeHtml } from "../util.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc, arrayUnion, Timestamp, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);
const $ = selector => document.querySelector(selector);

const TIPOS = {
  solicitud_junta: "Solicitud a la Junta", postulacion: "Postulación", agec: "AGEC extraordinaria"
};
const SUBTIPOS = {
  punto_agenda: "Punto de agenda", asistir_sesion: "Asistir a una sesión", rendicion_cuentas: "Rendición de cuentas",
  otra: "Otra", comision: "Comisión", representacion: "Representación estudiantil", consulta: "Consulta", denuncia: "Denuncia"
};
const CAMPOS = {
  asunto: "Asunto", detalle: "Detalle", organo: "Comisión u órgano", motivacion: "Motivación",
  motivo: "Motivo", agenda: "Agenda propuesta"
};
const ESTADOS = { recibido: "Recibido", en_revision: "En revisión", resuelto: "Resuelto", rechazado: "Rechazado" };
const COLOR_ESTADO = {
  recibido: "bg-[#FDF3D8] text-[#8A6D1B]", en_revision: "bg-[#E6F8FA] text-[#087F8C]",
  resuelto: "bg-[#E4F4EA] text-[#2F7A4B]", rechazado: "bg-[#FBE7E6] text-[#C2413B]"
};

const fecha = valor => valor?.toDate ? valor.toDate().toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Costa_Rica" }) : "";

// Días hábiles (lunes a viernes) que faltan hasta el plazo; negativo si ya venció.
function diasHabilesHasta(plazo) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fin = plazo.toDate(); fin.setHours(0, 0, 0, 0);
  const signo = fin >= hoy ? 1 : -1;
  let dias = 0;
  for (const d = new Date(signo > 0 ? hoy : fin); d < (signo > 0 ? fin : hoy); d.setDate(d.getDate() + 1)) {
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) dias++;
  }
  return signo * dias;
}

function plazoHtml(t) {
  if (!t.plazoRespuesta || ["resuelto", "rechazado"].includes(t.estado)) return "";
  const dias = diasHabilesHasta(t.plazoRespuesta);
  const texto = dias < 0 ? `Plazo vencido hace ${-dias} día(s) hábil(es)` : dias === 0 ? "El plazo vence hoy" : `Faltan ${dias} día(s) hábil(es)`;
  const color = dias <= 0 ? "text-[#C2413B]" : dias <= 3 ? "text-[#8A6D1B]" : "text-[#607480]";
  return `<span class="${color} font-semibold">${texto} (vence el ${fecha(t.plazoRespuesta)})</span>${t.prorrogaInformada ? ' · <span class="font-semibold">Prórroga informada</span>' : ""}`;
}

const datosHtml = datos => Object.entries(CAMPOS).filter(([campo]) => datos?.[campo])
  .map(([campo, etiqueta]) => `<p class="mt-2 text-sm"><strong>${etiqueta}:</strong> <span class="whitespace-pre-line">${escapeHtml(datos[campo])}</span></p>`).join("");
const respuestasHtml = respuestas => (respuestas || [])
  .map(r => `<p class="mt-2 rounded-[10px] bg-[#F1F6F8] px-3 py-2 text-sm"><span class="text-xs text-[#607480]">${fecha(r.fecha)}</span><br>${escapeHtml(r.texto)}</p>`).join("");

function accionesHtml(id, estado, { fiscalia = false, prorrogaInformada = false } = {}) {
  if (["resuelto", "rechazado"].includes(estado)) return "";
  return `<div class="mt-4 border-t border-[#E2E9EC] pt-4">
    <label for="respuesta-${id}" class="font-sans text-xs font-bold">${fiscalia ? "Respuesta" : "Respuesta o motivación"}</label>
    <textarea id="respuesta-${id}" rows="3" maxlength="2000" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2 text-sm"></textarea>
    <div class="mt-3 flex flex-wrap gap-2 font-sans text-xs font-bold">
      ${estado === "recibido" ? `<button type="button" data-accion="revision" data-id="${id}" class="h-9 rounded-[8px] border border-[#BFD0D8] px-3">Marcar en revisión</button>` : ""}
      <button type="button" data-accion="responder" data-id="${id}" class="h-9 rounded-[8px] border border-[#0D2B45] px-3">Enviar respuesta</button>
      <button type="button" data-accion="resolver" data-id="${id}" class="h-9 rounded-[8px] bg-[#0D2B45] px-3 text-white">Responder y marcar resuelto</button>
      ${!fiscalia && !prorrogaInformada ? `<button type="button" data-accion="prorroga" data-id="${id}" class="h-9 rounded-[8px] border border-[#BFD0D8] px-3" title="RI Art. 111: si se necesita más tiempo, hay que informar a la persona">Registrar que se informó una prórroga</button>` : ""}
      ${!fiscalia ? `<button type="button" data-accion="rechazar" data-id="${id}" class="h-9 rounded-[8px] border border-[#C2413B] px-3 text-[#C2413B]">Rechazar (con motivación)</button>` : ""}
    </div>
    <p data-estado-accion="${id}" role="status" class="mt-2 text-sm" hidden></p>
  </div>`;
}

// ---------- Junta: tramites ----------
let tramites = [];

async function cargarTramites() {
  const estado = $("#estado-tramites");
  try {
    const snapshot = await getDocs(collection(db, "tramites"));
    tramites = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    pintarTramites();
  } catch (error) {
    estado.textContent = `No se pudieron cargar los trámites: ${error.message}`;
  }
}

function pintarTramites() {
  const filtro = $("#filtro-tramites").value;
  const visibles = tramites.filter(t => filtro === "todos" || (filtro === "abiertos" ? ["recibido", "en_revision"].includes(t.estado) : t.estado === filtro));
  const abiertos = tramites.filter(t => ["recibido", "en_revision"].includes(t.estado)).length;
  $("#estado-tramites").textContent = `${abiertos} trámite(s) abierto(s) de ${tramites.length} en total.`;
  $("#lista-tramites").innerHTML = visibles.length ? visibles.map(t => `
    <li class="rounded-[14px] border border-[#D8E3E9] bg-white p-5" data-tramite="${escapeHtml(t.id)}">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-sans text-sm font-bold">${escapeHtml(TIPOS[t.tipo] || t.tipo)}${t.subtipo ? ` · ${escapeHtml(SUBTIPOS[t.subtipo] || t.subtipo)}` : ""}</p>
        <span class="rounded-full px-3 py-1 font-sans text-xs font-bold ${COLOR_ESTADO[t.estado] || ""}">${escapeHtml(ESTADOS[t.estado] || t.estado)}</span>
      </div>
      <p class="mt-1 text-xs text-[#607480]">${escapeHtml(t.solicitante?.nombre)} &lt;${escapeHtml(t.solicitante?.email)}&gt; · Recibido el ${fecha(t.createdAt)}</p>
      ${t.enPadron === false ? `<p class="mt-2 rounded-[8px] bg-[#FDF3D8] px-3 py-1 text-xs font-semibold text-[#8A6D1B]">No está en el padrón actual: verificar su condición de persona Asociada.</p>` : ""}
      <p class="mt-1 text-xs">${plazoHtml(t)}</p>
      ${t.tipo === "agec" ? `<p class="mt-2 text-sm"><strong>Adhesiones:</strong> ${t.adhesionesPadron} de ${t.umbral} del padrón${t.adhesionesSinPadron ? ` · ${t.adhesionesSinPadron} fuera del padrón (por verificar)` : ""}${t.alcanzado ? " · <strong>Alcanzó el 10 % (RI Art. 13 c)</strong>" : ""}
        <button type="button" data-adhesiones="${escapeHtml(t.id)}" class="ml-2 font-sans text-xs font-bold text-[#087F8C] underline">Ver adhesiones</button></p>
        <ul data-lista-adhesiones="${escapeHtml(t.id)}" class="mt-2 space-y-1 text-xs" hidden></ul>` : ""}
      ${datosHtml(t.datos)}
      ${t.motivacionRechazo ? `<p class="mt-2 text-sm"><strong>Motivación del rechazo:</strong> ${escapeHtml(t.motivacionRechazo)}</p>` : ""}
      ${respuestasHtml(t.respuestas)}
      ${accionesHtml(escapeHtml(t.id), t.estado, { prorrogaInformada: t.prorrogaInformada })}
    </li>`).join("") : `<li class="text-sm text-[#607480]">No hay trámites en esta vista.</li>`;
  $("#lista-tramites").querySelectorAll("[data-accion]").forEach(boton => boton.addEventListener("click", () => accion("tramites", boton)));
  $("#lista-tramites").querySelectorAll("[data-adhesiones]").forEach(boton => boton.addEventListener("click", () => verAdhesiones(boton.dataset.adhesiones)));
}

async function verAdhesiones(id) {
  const lista = document.querySelector(`[data-lista-adhesiones="${CSS.escape(id)}"]`);
  lista.hidden = !lista.hidden;
  if (lista.hidden) return;
  try {
    const snapshot = await getDocs(collection(db, "tramites", id, "adhesiones"));
    lista.innerHTML = snapshot.docs.map(d => d.data())
      .map(a => `<li>${escapeHtml(a.nombre)} &lt;${escapeHtml(a.email)}&gt;${a.enPadron ? "" : ' · <strong class="text-[#8A6D1B]">no está en el padrón</strong>'}</li>`).join("");
  } catch (error) {
    lista.innerHTML = `<li class="text-[#C2413B]">No se pudieron cargar: ${escapeHtml(error.message)}</li>`;
  }
}

// ---------- Fiscalía: fiscaliaCasos ----------
let casos = [];

async function cargarCasos() {
  const estado = $("#estado-casos");
  try {
    const snapshot = await getDocs(collection(db, "fiscaliaCasos"));
    casos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    pintarCasos();
  } catch (error) {
    // Los dueños del sitio tienen el rol de Fiscalía en el panel, pero las reglas solo dejan leer a la persona Fiscal.
    estado.textContent = error.code === "permission-denied"
      ? "Solo la persona Fiscal registrada puede leer estos casos (RI Art. 42)."
      : `No se pudieron cargar los casos: ${error.message}`;
  }
}

function pintarCasos() {
  $("#estado-casos").textContent = `${casos.filter(c => c.estado !== "resuelto").length} caso(s) abierto(s) de ${casos.length} en total.`;
  $("#lista-casos").innerHTML = casos.length ? casos.map(c => `
    <li class="rounded-[14px] border border-[#D8E3E9] bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-sans text-sm font-bold">${escapeHtml(SUBTIPOS[c.subtipo] || c.subtipo)}${c.anonimo ? ' · <span class="rounded-full bg-[#0D2B45] px-2 py-0.5 text-xs text-white">Anónima</span>' : ""}</p>
        <span class="rounded-full px-3 py-1 font-sans text-xs font-bold ${COLOR_ESTADO[c.estado] || ""}">${escapeHtml(ESTADOS[c.estado] || c.estado)}</span>
      </div>
      <p class="mt-1 text-xs text-[#607480]">${c.anonimo ? "Remitente anónimo con correo institucional verificado" : `${escapeHtml(c.remitente?.nombre)} &lt;${escapeHtml(c.remitente?.email)}&gt;`} · Recibido el ${fecha(c.createdAt)}
        · ${c.enPadron ? "Está en el padrón" : "<strong>No está en el padrón actual</strong>"}</p>
      ${c.anonimo ? '<p class="mt-1 text-xs text-[#607480]">La persona ve tus respuestas con su código de seguimiento; no recibe correos.</p>' : ""}
      ${datosHtml(c.datos)}
      ${respuestasHtml(c.respuestas)}
      ${accionesHtml(escapeHtml(c.id), c.estado, { fiscalia: true })}
    </li>`).join("") : `<li class="text-sm text-[#607480]">No hay casos.</li>`;
  $("#lista-casos").querySelectorAll("[data-accion]").forEach(boton => boton.addEventListener("click", () => accion("fiscaliaCasos", boton)));
}

// ---------- Acciones ----------
async function accion(coleccion, boton) {
  const id = boton.dataset.id;
  const texto = document.querySelector(`#respuesta-${CSS.escape(id)}`).value.trim();
  const estado = document.querySelector(`[data-estado-accion="${CSS.escape(id)}"]`);
  const avisar = (mensaje, error = false) => { estado.textContent = mensaje; estado.className = `mt-2 text-sm ${error ? "text-[#C2413B]" : "text-[#087F8C]"}`; estado.hidden = false; };
  const respuesta = texto ? { respuestas: arrayUnion({ texto, fecha: Timestamp.now() }) } : {};
  let cambios;
  switch (boton.dataset.accion) {
    case "revision": cambios = { estado: "en_revision", ...respuesta }; break;
    case "responder":
      if (!texto) return avisar("Escribe la respuesta primero.", true);
      cambios = respuesta; break;
    case "resolver":
      if (!texto) return avisar("Escribe la respuesta con la que se resuelve el trámite.", true);
      cambios = { estado: "resuelto", ...respuesta }; break;
    case "prorroga":
      if (!confirm("¿Confirmas que ya se le informó a la persona que la respuesta tomará más tiempo (RI Art. 111)?")) return;
      cambios = { prorrogaInformada: true, ...respuesta }; break;
    case "rechazar":
      if (texto.length < 10) return avisar("Para rechazar, escribe la motivación (RI Art. 82). Se le enviará a la persona.", true);
      if (!confirm("La persona recibirá la motivación por correo junto con su derecho a pedir reconsideración en 5 días hábiles (RI Art. 83). ¿Rechazar?")) return;
      cambios = { estado: "rechazado", motivacionRechazo: texto }; break;
    default: return;
  }
  boton.disabled = true;
  try {
    await updateDoc(doc(db, coleccion, id), { ...cambios, actualizadoEn: serverTimestamp() });
    if (coleccion === "tramites") await cargarTramites(); else await cargarCasos();
  } catch (error) {
    avisar(`No se pudo guardar: ${error.message}`, true);
    boton.disabled = false;
  }
}

export function iniciarTramites({ junta, fiscalia }) {
  $("#tramites-junta").hidden = !junta;
  $("#casos-fiscalia").hidden = !fiscalia;
  if (junta) {
    $("#filtro-tramites").addEventListener("change", pintarTramites);
    cargarTramites();
  }
  if (fiscalia) cargarCasos();
}
