// Moderación del Repositorio: materiales pendientes, edición de metadatos y equipo de moderación.
// La carga admin.html (vía panel.js) solo para cuentas con rol de moderación.
import { app } from "../firebase.js";
import { escapeHtml } from "../util.js";
import { esDueno } from "../roles.js";
import { getFirestore, collection, getDocs, getDoc, query, where, updateDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);
const pendingList = document.querySelector("#pending-list");
const panelStatus = document.querySelector("#panel-status");
const fileSize = bytes => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "Tamaño no indicado";

const docentesLabels = ["Actividad inicial / Exploratorio", "Juego", "Cotidiano", "Guía didáctica", "Unidad didáctica", "Planeamiento", "Tarea", "Recurso tecnológico", "Movilización de Conocimientos", "Debate", "Discusión matemática", "Trabajo independiente", "Guía de Trabajo Autónomo"];
const academicoLabels = ["Solución", "Prueba escrita", "Quiz", "Reposición", "Investigación", "Apuntes", "Resumen"];
const typeMap = {
  "Actividad inicial / Exploratorio": "Actividad", Cotidiano: "Actividad", Tarea: "Actividad",
  Juego: "Juego", "Guía didáctica": "Guía didáctica", "Unidad didáctica": "Planeamiento",
  Planeamiento: "Planeamiento", "Recurso tecnológico": "Recurso digital",
  "Movilización de Conocimientos": "Actividad", Debate: "Actividad",
  "Discusión matemática": "Actividad", "Trabajo independiente": "Actividad",
  "Guía de Trabajo Autónomo": "Guía didáctica",
  Solución: "Solución", "Prueba escrita": "Examen", Quiz: "Examen",
  Reposición: "Examen", Investigación: "Apuntes", Apuntes: "Apuntes", Resumen: "Apuntes"
};
const editModal = document.querySelector("#edit-modal");
const editForm = document.querySelector("#edit-form");
const editStatus = document.querySelector("#edit-status");
const editLabelsWrap = document.querySelector("#edit-labels");
const editDocentesFields = document.querySelector("#edit-docentes-fields");
const editAcademicoFields = document.querySelector("#edit-academico-fields");
let editingId = null;

function closeEditModal() {
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
  editingId = null;
  const params = new URLSearchParams(window.location.search);
  if (params.has("edit")) {
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
  }
}

function openEditModal(id, resource) {
  editingId = id;
  editStatus.hidden = true;
  document.querySelector("#edit-title").value = resource.title || "";
  document.querySelector("#edit-description").value = resource.description || "";
  document.querySelector("#edit-explanation-url").value = resource.explanationUrl || "";
  const isDocente = resource.section === "docentes";
  editDocentesFields.classList.toggle("hidden", !isDocente);
  editAcademicoFields.classList.toggle("hidden", isDocente);
  document.querySelector("#edit-grade").value = resource.grade || "";
  document.querySelector("#edit-materials").value = resource.materials || "";
  document.querySelector("#edit-requires-internet").checked = Boolean(resource.requiresInternet);
  document.querySelector("#edit-course").value = resource.course || "";
  document.querySelector("#edit-course-code").value = resource.courseCode || "";
  const availableLabels = isDocente ? docentesLabels : academicoLabels;
  const currentLabels = Array.isArray(resource.labels) ? resource.labels : [];
  editLabelsWrap.innerHTML = availableLabels.map(label => `<label><input type="checkbox" data-edit-label="${escapeHtml(label)}" ${currentLabels.includes(label) ? "checked" : ""} class="accent-[#00AFC1]"> ${escapeHtml(label)}</label>`).join("");
  editModal.classList.remove("hidden");
  editModal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
  document.querySelector("#edit-title").focus();
}

document.querySelector("#edit-modal-close").addEventListener("click", closeEditModal);
document.querySelector("#edit-cancel").addEventListener("click", closeEditModal);
editModal.addEventListener("click", event => { if (event.target === editModal) closeEditModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !editModal.classList.contains("hidden")) closeEditModal(); });

editForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!editingId) return;
  const isDocente = !editDocentesFields.classList.contains("hidden");
  const labels = [...editLabelsWrap.querySelectorAll("[data-edit-label]:checked")].map(input => input.dataset.editLabel);
  if (!labels.length) {
    editStatus.textContent = "Selecciona al menos una etiqueta.";
    editStatus.className = "text-sm text-[#C2413B]";
    editStatus.hidden = false;
    return;
  }
  const updates = {
    title: document.querySelector("#edit-title").value.trim(),
    description: document.querySelector("#edit-description").value.trim(),
    labels, type: typeMap[labels[0]],
    explanationUrl: document.querySelector("#edit-explanation-url").value.trim()
  };
  if (isDocente) {
    updates.grade = document.querySelector("#edit-grade").value;
    updates.materials = document.querySelector("#edit-materials").value.trim();
    updates.requiresInternet = document.querySelector("#edit-requires-internet").checked;
  } else {
    updates.course = document.querySelector("#edit-course").value.trim();
    updates.courseCode = document.querySelector("#edit-course-code").value.trim();
  }
  try {
    await updateDoc(doc(db, "resources", editingId), updates);
    closeEditModal();
    await loadPending();
  } catch (error) {
    editStatus.textContent = `No se pudo guardar: ${error.message}`;
    editStatus.className = "text-sm text-[#C2413B]";
    editStatus.hidden = false;
  }
});

async function openEditFromId(id) {
  const resourceDocument = await getDoc(doc(db, "resources", id));
  if (!resourceDocument.exists()) {
    panelStatus.textContent = "El recurso solicitado no existe.";
    return;
  }
  openEditModal(id, resourceDocument.data());
}

document.querySelector("#moderator-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#moderator-status");
  const email = document.querySelector("#moderator-email").value.trim().toLowerCase();
  try {
    await setDoc(doc(db, "moderators", email), { email, addedAt: new Date().toISOString() });
    event.target.reset();
    await loadModerators();
    status.textContent = "Moderador agregado.";
    status.className = "mt-3 text-sm text-[#087F8C]";
    status.hidden = false;
  } catch (error) {
    status.textContent = `No se pudo agregar el moderador: ${error.message}`;
    status.className = "mt-3 text-sm text-[#C2413B]";
    status.hidden = false;
  }
});

async function loadModerators() {
  const list = document.querySelector("#moderator-list");
  const snapshot = await getDocs(collection(db, "moderators"));
  list.innerHTML = snapshot.docs.map(item => `<li class="flex items-center justify-between gap-4 py-3"><span class="font-sans text-sm">${escapeHtml(item.id)}</span><button type="button" data-remove-moderator="${escapeHtml(item.id)}" class="font-sans text-xs font-bold text-[#C2413B]">Quitar</button></li>`).join("");
  list.querySelectorAll("[data-remove-moderator]").forEach(button => button.addEventListener("click", async () => {
    if (esDueno(button.dataset.removeModerator)) {
      document.querySelector("#moderator-status").textContent = "No puedes quitar al administrador principal.";
      document.querySelector("#moderator-status").className = "mt-3 text-sm text-[#C2413B]";
      document.querySelector("#moderator-status").hidden = false;
      return;
    }
    if (!confirm(`¿Quitar a ${button.dataset.removeModerator} como moderador?`)) return;
    await deleteDoc(doc(db, "moderators", button.dataset.removeModerator));
    await loadModerators();
  }));
}

async function loadPending() {
  panelStatus.textContent = "Cargando materiales...";
  const snapshot = await getDocs(query(collection(db, "resources"), where("status", "==", "pending")));
  if (snapshot.empty) {
    panelStatus.textContent = "No hay materiales pendientes de revisión.";
    pendingList.innerHTML = "";
    return;
  }
  panelStatus.textContent = `${snapshot.size} material(es) pendiente(s).`;
  pendingList.innerHTML = snapshot.docs.map(item => {
    const resource = item.data();
    return `<article class="rounded-[16px] border border-[#D7E2E7] bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><span class="font-sans text-[10px] font-bold uppercase text-[#00A6B8]">${escapeHtml(resource.type)}</span><h2 class="mt-2 font-sans text-xl font-bold">${escapeHtml(resource.title)}</h2></div><span class="rounded-full bg-[#FFF1D9] px-3 py-1 font-sans text-[10px] font-bold text-[#946316]">PENDIENTE</span></div>
      <p class="mt-3 leading-6 text-[#607480]">${escapeHtml(resource.description)}</p>
      <dl class="mt-4 grid gap-2 text-sm text-[#405968] sm:grid-cols-2"><div><strong>Autor:</strong> ${escapeHtml(resource.author)}</div><div><strong>Curso:</strong> ${escapeHtml(resource.course || "No indicado")}</div><div><strong>Materiales:</strong> ${escapeHtml(resource.materials || "No indicados")}</div><div><strong>Internet:</strong> ${resource.requiresInternet ? "Sí" : "No"} · ${escapeHtml((resource.extension || "").toUpperCase())} · ${fileSize(resource.size)}</div></dl>
      <div class="mt-5 flex flex-wrap gap-3"><a href="${escapeHtml(resource.fileUrl)}" target="_blank" rel="noopener" class="rounded-[8px] border border-[#9DB6C1] px-4 py-2 font-sans text-xs font-bold">Ver archivo</a><button data-edit-id="${item.id}" class="rounded-[8px] border border-[#9DB6C1] px-4 py-2 font-sans text-xs font-bold"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button data-action="approved" data-id="${item.id}" class="rounded-[8px] bg-[#00AFC1] px-4 py-2 font-sans text-xs font-bold text-white">Aprobar y publicar</button><button data-action="rejected" data-id="${item.id}" class="rounded-[8px] border border-[#C2413B] px-4 py-2 font-sans text-xs font-bold text-[#C2413B]">Rechazar</button><button data-action="delete" data-id="${item.id}" class="rounded-[8px] border border-[#AFC2CB] px-4 py-2 font-sans text-xs font-bold">Eliminar</button></div>
    </article>`;
  }).join("");
  pendingList.querySelectorAll("button[data-action]").forEach(button => button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.id)));
  pendingList.querySelectorAll("[data-edit-id]").forEach(button => button.addEventListener("click", () => openEditFromId(button.dataset.editId)));
}

async function handleAction(action, id) {
  const resourceDocument = await getDoc(doc(db, "resources", id));
  if (!resourceDocument.exists()) return;
  const resource = resourceDocument.data();
  try {
    if (action === "delete") {
      if (!confirm("¿Eliminar este material y su archivo definitivamente?")) return;
      if (resource.storagePath) await deleteObject(ref(storage, resource.storagePath));
      await deleteDoc(doc(db, "resources", id));
    } else {
      await updateDoc(doc(db, "resources", id), { status: action, published: action === "approved" });
    }
    await loadPending();
  } catch (error) {
    panelStatus.textContent = `No se pudo completar la acción: ${error.message}`;
  }
}

export function iniciarModeracion() {
  loadPending().catch(error => { panelStatus.textContent = `No se pudieron cargar los pendientes: ${error.message}`; });
  loadModerators().catch(error => { document.querySelector("#moderator-status").textContent = `No se pudieron cargar los moderadores: ${error.message}`; });
  // Los botones "Editar" del Repositorio abren admin.html?edit=<id>.
  const editId = new URLSearchParams(window.location.search).get("edit");
  if (editId) openEditFromId(editId).catch(error => { panelStatus.textContent = `No se pudo abrir el recurso: ${error.message}`; });
}
