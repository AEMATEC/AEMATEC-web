// Préstamos: solicitud pública desde la ficha de un bien y gestión de solicitudes por la Junta (RI Art. 120-123).
import { escapeHtml } from "../util.js";
import { db, auth, inv, formatDate, showModal } from "./estado.js";
import { loadInventory } from "./publico.js";
import {
  collection, getDocs, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.querySelector("#item-modal-loan").addEventListener("click", () => {
  if (!inv.currentItem) return;
  document.querySelector("#loan-modal-title").textContent = inv.currentItem.tipo === "biblioteca" ? inv.currentItem.titulo : (inv.currentItem.nombre || inv.currentItem.articulo);
  document.querySelector("#loan-form").reset();
  document.querySelector("#loan-fecha").min = new Date().toLocaleDateString("en-CA");
  document.querySelector("#loan-status").hidden = true;
  showModal(document.querySelector("#loan-modal"));
});

document.querySelector("#loan-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#loan-status");
  const submitButton = event.target.querySelector("button[type=submit]");
  submitButton.disabled = true;
  try {
    await addDoc(collection(db, "prestamoSolicitudes"), {
      itemId: inv.currentItem.id,
      itemTipo: inv.currentItem.tipo,
      itemNombre: inv.currentItem.tipo === "biblioteca" ? inv.currentItem.titulo : (inv.currentItem.nombre || inv.currentItem.articulo),
      itemCodigo: inv.currentItem.codigo || (inv.currentItem.ejemplares?.[0]?.codigo || ""),
      solicitanteNombre: document.querySelector("#loan-nombre").value.trim(),
      solicitanteCarne: document.querySelector("#loan-carne").value.trim(),
      solicitanteContacto: document.querySelector("#loan-contacto").value.trim(),
      fechaPrevista: document.querySelector("#loan-fecha").value,
      notas: document.querySelector("#loan-notas").value.trim(),
      estado: "pendiente",
      createdAt: serverTimestamp()
    });
    status.hidden = false;
    status.className = "text-sm text-[#087F8C]";
    status.textContent = "Solicitud enviada. La Junta Directiva se pondrá en contacto contigo para coordinar la entrega.";
    event.target.reset();
  } catch (error) {
    status.hidden = false;
    status.className = "text-sm text-[#C2413B]";
    status.textContent = `No se pudo enviar la solicitud: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});

export async function loadSolicitudes() {
  const snapshot = await getDocs(collection(db, "prestamoSolicitudes"));
  inv.solicitudes = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
  inv.solicitudes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  updateLoanBadge();
}

export function updateLoanBadge() {
  const pending = inv.solicitudes.filter(solicitud => solicitud.estado === "pendiente").length;
  const badge = document.querySelector("#loan-admin-badge");
  badge.hidden = pending === 0;
  badge.textContent = String(pending);
}

function estadoBadgeHtml(solicitud) {
  const hoy = new Date().toISOString().slice(0, 10);
  const atrasado = solicitud.estado === "entregado" && solicitud.fechaPrevista && solicitud.fechaPrevista < hoy;
  if (atrasado) return `<span class="font-sans text-[11px] font-bold bg-[#FCE9E7] text-[#C2413B] px-2.5 py-1 rounded-full">Atrasado</span>`;
  const estados = {
    pendiente: ["bg-[#FDF3D8]", "text-[#8A6D1B]", "Pendiente"],
    entregado: ["bg-[#DCEBFB]", "text-[#215C99]", "Entregado"],
    devuelto: ["bg-[#DFF6F8]", "text-[#087F8C]", "Devuelto"],
    rechazada: ["bg-[#EAF1F4]", "text-[#5F7480]", "Rechazada"]
  };
  const [bg, color, label] = estados[solicitud.estado] || estados.pendiente;
  return `<span class="font-sans text-[11px] font-bold ${bg} ${color} px-2.5 py-1 rounded-full">${label}</span>`;
}

function loanAdminRowHtml(solicitud) {
  const item = inv.itemsByTipo[solicitud.itemTipo]?.find(entry => entry.id === solicitud.itemId);
  let actionsHtml = "";
  if (solicitud.estado === "pendiente") {
    if (solicitud.itemTipo === "biblioteca") {
      const disponibles = (item?.ejemplares || []).filter(exemplar => exemplar.disponible);
      actionsHtml = disponibles.length
        ? `<select data-ejemplar-select class="h-9 rounded-[8px] border border-[#CBD9DF] px-2 text-xs">
             ${disponibles.map(exemplar => `<option value="${escapeHtml(exemplar.codigo)}">${escapeHtml(exemplar.codigo)}</option>`).join("")}
           </select>
           <button type="button" data-action="entregar" data-id="${solicitud.id}" class="h-9 px-3 rounded-[8px] bg-[#0D2B45] text-white font-sans text-xs font-bold">Marcar entregado</button>`
        : `<span class="text-xs text-[#C2413B] font-semibold">Sin ejemplares disponibles</span>`;
    } else {
      actionsHtml = item?.disponible === false
        ? `<span class="text-xs text-[#C2413B] font-semibold">Bien no disponible</span>`
        : `<button type="button" data-action="entregar" data-id="${solicitud.id}" class="h-9 px-3 rounded-[8px] bg-[#0D2B45] text-white font-sans text-xs font-bold">Marcar entregado</button>`;
    }
    actionsHtml += `<button type="button" data-action="rechazar" data-id="${solicitud.id}" class="h-9 px-3 rounded-[8px] border border-[#E2A0A0] text-[#C2413B] font-sans text-xs font-bold">Rechazar</button>`;
  } else if (solicitud.estado === "entregado") {
    actionsHtml = `<button type="button" data-action="devolver" data-id="${solicitud.id}" class="h-9 px-3 rounded-[8px] bg-[#087F8C] text-white font-sans text-xs font-bold">Marcar devuelto</button>`;
  }
  return `
    <article data-row-id="${solicitud.id}" class="border border-[#D6E2E7] rounded-[14px] p-4">
      <div class="flex flex-wrap justify-between gap-3">
        <div class="min-w-0">
          <p class="font-sans font-bold text-sm">${escapeHtml(solicitud.itemNombre)} <span class="text-[#607480] font-normal">(${escapeHtml(solicitud.itemCodigo || "s/c")})</span></p>
          <p class="text-xs text-[#607480] mt-1">${escapeHtml(solicitud.solicitanteNombre)} · Carné ${escapeHtml(solicitud.solicitanteCarne)} · ${escapeHtml(solicitud.solicitanteContacto)}</p>
          <p class="text-xs text-[#7C8D97] mt-1">Solicitado: ${formatDate(solicitud.createdAt)}${solicitud.fechaPrevista ? ` · Devolución prevista: ${escapeHtml(solicitud.fechaPrevista)}` : ""}</p>
          ${solicitud.ejemplarCodigo ? `<p class="text-xs text-[#7C8D97] mt-1">Ejemplar entregado: ${escapeHtml(solicitud.ejemplarCodigo)}</p>` : ""}
          ${solicitud.notas ? `<p class="text-xs text-[#7C8D97] mt-1">Notas: ${escapeHtml(solicitud.notas)}</p>` : ""}
        </div>
        <div class="flex flex-col items-end gap-2 flex-shrink-0">
          ${estadoBadgeHtml(solicitud)}
          <div class="flex items-center gap-2">${actionsHtml}</div>
        </div>
      </div>
    </article>`;
}

function renderLoanAdmin() {
  const list = document.querySelector("#loan-admin-list");
  const filtered = inv.solicitudes.filter(solicitud => inv.loanAdminFilter === "historial"
    ? ["devuelto", "rechazada"].includes(solicitud.estado)
    : solicitud.estado === inv.loanAdminFilter);
  list.innerHTML = filtered.length
    ? filtered.map(loanAdminRowHtml).join("")
    : `<p class="text-center text-[#607480] py-8"><i class="fa-solid fa-inbox text-2xl mb-3 block"></i>No hay inv.solicitudes en esta categoría.</p>`;
}

async function marcarEntregado(solicitud, rowElement) {
  const item = inv.itemsByTipo[solicitud.itemTipo]?.find(entry => entry.id === solicitud.itemId);
  if (!item) throw new Error("El bien ya no existe en el inventario.");
  const updates = { estado: "entregado", fechaEntrega: serverTimestamp(), atendidoPor: auth.currentUser?.email || "" };
  if (solicitud.itemTipo === "biblioteca") {
    const codigo = rowElement.querySelector("[data-ejemplar-select]")?.value;
    if (!codigo) throw new Error("Selecciona un ejemplar disponible para entregar.");
    const ejemplares = (item.ejemplares || []).map(exemplar => exemplar.codigo === codigo ? { ...exemplar, disponible: false } : exemplar);
    await updateDoc(doc(db, "inventario", item.id), { ejemplares });
    updates.ejemplarCodigo = codigo;
  } else if (solicitud.itemTipo === "aematec") {
    if (item.disponible === false) throw new Error("Este bien ya está prestado.");
    await updateDoc(doc(db, "inventario", item.id), { disponible: false });
  }
  await updateDoc(doc(db, "prestamoSolicitudes", solicitud.id), updates);
  await Promise.all([loadInventory(), loadSolicitudes()]);
  renderLoanAdmin();
}

async function marcarDevuelto(solicitud) {
  const item = inv.itemsByTipo[solicitud.itemTipo]?.find(entry => entry.id === solicitud.itemId);
  if (item) {
    if (solicitud.itemTipo === "biblioteca" && solicitud.ejemplarCodigo) {
      const ejemplares = (item.ejemplares || []).map(exemplar => exemplar.codigo === solicitud.ejemplarCodigo ? { ...exemplar, disponible: true } : exemplar);
      await updateDoc(doc(db, "inventario", item.id), { ejemplares });
    } else if (solicitud.itemTipo === "aematec") {
      await updateDoc(doc(db, "inventario", item.id), { disponible: true });
    }
  }
  await updateDoc(doc(db, "prestamoSolicitudes", solicitud.id), { estado: "devuelto", fechaDevolucion: serverTimestamp() });
  await Promise.all([loadInventory(), loadSolicitudes()]);
  renderLoanAdmin();
}

async function rechazarSolicitud(solicitud) {
  if (!confirm("¿Rechazar esta solicitud de préstamo?")) return;
  await updateDoc(doc(db, "prestamoSolicitudes", solicitud.id), { estado: "rechazada", fechaResolucion: serverTimestamp() });
  await loadSolicitudes();
  renderLoanAdmin();
}

document.querySelector("#loan-admin-btn").addEventListener("click", async () => {
  await loadSolicitudes();
  renderLoanAdmin();
  showModal(document.querySelector("#loan-admin-modal"));
});
document.querySelectorAll(".loan-admin-tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".loan-admin-tab").forEach(other => other.classList.remove("is-active"));
    button.classList.add("is-active");
    inv.loanAdminFilter = button.dataset.estado;
    renderLoanAdmin();
  });
});
document.querySelector("#loan-admin-list").addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const solicitud = inv.solicitudes.find(entry => entry.id === button.dataset.id);
  if (!solicitud) return;
  const row = button.closest("[data-row-id]");
  button.disabled = true;
  try {
    if (button.dataset.action === "entregar") await marcarEntregado(solicitud, row);
    if (button.dataset.action === "devolver") await marcarDevuelto(solicitud);
    if (button.dataset.action === "rechazar") await rechazarSolicitud(solicitud);
  } catch (error) {
    alert(`No se pudo completar la acción: ${error.message}`);
  } finally {
    button.disabled = false;
  }
});
