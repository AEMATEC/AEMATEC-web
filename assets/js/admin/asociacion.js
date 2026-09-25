// Asociación: Padrón, Junta Directiva, Fiscalía y Medios Oficiales.
// La Junta ve las cuatro pestañas; la Fiscalía solo la suya (RI Art. 42: registra a la persona Fiscal entrante).
import { app } from "../firebase.js";
import { escapeHtml, safeHttpsUrl } from "../util.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);
const currentTab = { value: "padron" };

document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => {
  currentTab.value = btn.dataset.tab;
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active", "border-[#00A6B8]", "text-[#00A6B8]");
    b.classList.add("border-transparent", "text-[#607480]");
  });
  btn.classList.add("active", "border-[#00A6B8]", "text-[#00A6B8]");
  btn.classList.remove("border-transparent", "text-[#607480]");

  const csvBtn = document.querySelector("#upload-csv-btn");
  const sectionForm = document.querySelector("#section-form");
  const mediosForm = document.querySelector("#medios-form");
  const sectionList = document.querySelector("#section-list");

  if (currentTab.value === "medios") {
    sectionForm.style.display = "none";
    mediosForm.style.display = "block";
    sectionList.style.display = "none";
    loadMedios();
  } else {
    sectionForm.style.display = "flex";
    mediosForm.style.display = "none";
    sectionList.style.display = "block";
    csvBtn.classList.toggle("hidden", currentTab.value !== "padron");
    loadSection(currentTab.value);
    if (currentTab.value !== "padron") loadPadron();
  }
}));

let padronEmails = [];
async function loadPadron() {
  try {
    const snapshot = await getDocs(collection(db, "padron"));
    padronEmails = snapshot.docs.map(d => d.id);
  } catch (error) {
    padronEmails = [];
  }
}

document.querySelector("#section-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#section-status");
  const input = document.querySelector("#section-email").value.trim();
  if (!input) return;

  const emails = input.split(";").map(e => e.trim().toLowerCase()).filter(e => e);
  if (!emails.length) return;

  const results = { success: 0, failed: 0, errors: [] };

  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.failed++;
      results.errors.push(`${escapeHtml(email)}: formato inválido`);
      continue;
    }
    try {
      await setDoc(doc(db, currentTab.value, email), { email, addedAt: new Date().toISOString() }, { merge: true });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`${escapeHtml(email)}: ${error.message}`);
    }
  }

  document.querySelector("#section-form").reset();
  if (currentTab.value === "junta") await syncJuntaPublica();
  await loadSection(currentTab.value);

  let message = `✓ ${results.success} agregado(s)`;
  if (results.failed > 0) message += `, ${results.failed} error(es)`;
  if (results.errors.length > 0) message += `: ${results.errors.slice(0, 2).join("; ")}${results.errors.length > 2 ? "..." : ""}`;

  status.textContent = message;
  status.className = results.failed === 0 ? "text-sm text-[#087F8C]" : "text-sm text-[#946316]";
  status.hidden = false;
  setTimeout(() => status.hidden = true, 4000);
});

const suggestionsList = document.querySelector("#suggestions-list");
const emailInput = document.querySelector("#section-email");

emailInput.addEventListener("input", () => {
  const value = emailInput.value.trim();
  if (!value || currentTab.value === "padron") {
    suggestionsList.classList.add("hidden");
    return;
  }

  const lastEmail = value.split(";").pop().trim().toLowerCase();
  if (lastEmail.length < 2) {
    suggestionsList.classList.add("hidden");
    return;
  }

  const matches = padronEmails.filter(e => e.toLowerCase().includes(lastEmail) && !value.includes(e)).slice(0, 8);
  if (matches.length === 0) {
    suggestionsList.classList.add("hidden");
    return;
  }

  suggestionsList.innerHTML = matches.map(email => `
    <li class="px-3 py-2 hover:bg-[#F0F4F7] cursor-pointer text-sm" data-email="${escapeHtml(email)}">
      ${escapeHtml(email)}
    </li>
  `).join("");
  suggestionsList.classList.remove("hidden");

  suggestionsList.querySelectorAll("li").forEach(item => {
    item.addEventListener("click", () => {
      const parts = value.split(";");
      parts[parts.length - 1] = item.dataset.email;
      emailInput.value = parts.join("; ") + "; ";
      suggestionsList.classList.add("hidden");
      emailInput.focus();
    });
  });
});

emailInput.addEventListener("blur", () => {
  setTimeout(() => suggestionsList.classList.add("hidden"), 200);
});

// La página pública de Junta Directiva lee config/junta_publica, que solo contiene nombre y
// puesto. Los correos de la colección "junta" no se publican (RI Art. 143).
async function syncJuntaPublica() {
  try {
    const snapshot = await getDocs(collection(db, "junta"));
    const miembros = snapshot.docs.map(item => ({
      nombre: String(item.data().nombre || "").trim(),
      puesto: String(item.data().puesto || "").trim()
    }));
    await setDoc(doc(db, "config", "junta_publica"), { miembros, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("No se pudo publicar la lista pública de la Junta:", error);
  }
}

async function loadSection(section) {
  const list = document.querySelector("#section-list");
  try {
    const snapshot = await getDocs(collection(db, section));
    if (snapshot.empty) {
      list.innerHTML = `<li class="py-3 text-sm text-[#607480]">Aún no hay registros.</li>`;
      return;
    }

    if (section === "junta") {
      list.innerHTML = snapshot.docs.map(item => {
        const data = item.data();
        return `
          <li class="flex flex-wrap items-center justify-between gap-3 py-4" data-row="${escapeHtml(item.id)}">
            <span class="font-sans text-sm font-semibold w-full sm:w-auto sm:min-w-[220px]">${escapeHtml(item.id)}</span>
            <input type="text" data-field="nombre" placeholder="Nombre completo" value="${escapeHtml(data.nombre)}" class="h-9 flex-1 min-w-[160px] rounded-[8px] border border-[#BFD0D8] px-2 text-sm">
            <input type="text" data-field="puesto" list="puestos-junta" placeholder="Puesto (ej. Presidencia)" value="${escapeHtml(data.puesto)}" class="h-9 flex-1 min-w-[160px] rounded-[8px] border border-[#BFD0D8] px-2 text-sm">
            <button type="button" data-save-item="${escapeHtml(item.id)}" class="font-sans text-xs font-bold text-[#087F8C]">Guardar</button>
            <button type="button" data-remove-item="${escapeHtml(item.id)}" class="font-sans text-xs font-bold text-[#C2413B]">Quitar</button>
          </li>
        `;
      }).join("");

      list.querySelectorAll("[data-save-item]").forEach(button => button.addEventListener("click", async () => {
        const email = button.dataset.saveItem;
        const row = list.querySelector(`[data-row="${CSS.escape(email)}"]`);
        const nombre = row.querySelector('[data-field="nombre"]').value.trim();
        const puesto = row.querySelector('[data-field="puesto"]').value.trim();
        try {
          await setDoc(doc(db, "junta", email), { email, nombre, puesto }, { merge: true });
          await syncJuntaPublica();
          document.querySelector("#section-status").textContent = `✓ Datos de ${email} guardados.`;
          document.querySelector("#section-status").className = "text-sm text-[#087F8C]";
          document.querySelector("#section-status").hidden = false;
          setTimeout(() => document.querySelector("#section-status").hidden = true, 2500);
        } catch (error) {
          document.querySelector("#section-status").textContent = `Error al guardar: ${error.message}`;
          document.querySelector("#section-status").className = "text-sm text-[#C2413B]";
          document.querySelector("#section-status").hidden = false;
        }
      }));
    } else {
      list.innerHTML = snapshot.docs.map(item => `
        <li class="flex items-center justify-between gap-4 py-3">
          <span class="font-sans text-sm">${escapeHtml(item.id)}</span>
          <button type="button" data-remove-item="${escapeHtml(item.id)}" class="font-sans text-xs font-bold text-[#C2413B]">Quitar</button>
        </li>
      `).join("");
    }

    list.querySelectorAll("[data-remove-item]").forEach(button => button.addEventListener("click", async () => {
      if (!confirm(`¿Quitar ${button.dataset.removeItem} de ${section}?`)) return;
      try {
        await deleteDoc(doc(db, section, button.dataset.removeItem));
        if (section === "junta") await syncJuntaPublica();
        await loadSection(section);
      } catch (error) {
        document.querySelector("#section-status").textContent = `Error al quitar: ${error.message}`;
        document.querySelector("#section-status").className = "text-sm text-[#C2413B]";
        document.querySelector("#section-status").hidden = false;
      }
    }));
  } catch (error) {
    list.innerHTML = `<li class="py-3 text-sm text-[#C2413B]">Error al cargar: ${escapeHtml(error.message)}</li>`;
  }
}


async function loadMedios() {
  try {
    const doc_snap = await getDoc(doc(db, "config", "medios_oficiales"));
    const data = doc_snap.exists() ? doc_snap.data() : {};
    document.querySelector("#medios-email").value = data.email || "aematec@estudiantec.cr";
    document.querySelector("#medios-phone").value = data.phone || "2550-2463";
    document.querySelector("#medios-whatsapp").value = data.whatsapp || "https://chat.whatsapp.com/HyBk6tUHyf44MlURrVgiTi";
    document.querySelector("#medios-instagram").value = data.instagram || "https://www.instagram.com/aematec?stkn=enY1bDVmY3p1a3J4";
    document.querySelector("#medios-telegram").value = data.telegram || "https://t.me/comunidadmatec";
  } catch (error) {
    console.error("Error cargando medios:", error);
  }
}

document.querySelector("#medios-save").addEventListener("click", async () => {
  const status = document.querySelector("#medios-status");
  const medios = {
    email: document.querySelector("#medios-email").value.trim().toLowerCase(),
    phone: document.querySelector("#medios-phone").value.trim(),
    whatsapp: document.querySelector("#medios-whatsapp").value.trim(),
    instagram: document.querySelector("#medios-instagram").value.trim(),
    telegram: document.querySelector("#medios-telegram").value.trim()
  };
  // RI Art. 102: el correo oficial es el institucional (@estudiantec.cr).
  const errores = [];
  if (!/^[^\s@<>"']+@estudiantec\.cr$/.test(medios.email)) errores.push("el correo debe ser institucional (@estudiantec.cr)");
  for (const medio of ["whatsapp", "instagram", "telegram"]) {
    if (!safeHttpsUrl(medios[medio])) errores.push(`el enlace de ${medio} debe empezar con https://`);
  }
  if (errores.length) {
    status.textContent = `No se guardó: ${errores.join("; ")}.`;
    status.className = "text-sm text-[#C2413B]";
    status.hidden = false;
    return;
  }
  try {
    await setDoc(doc(db, "config", "medios_oficiales"), { ...medios, updatedAt: new Date().toISOString() });
    status.textContent = "✓ Medios oficiales guardados.";
    status.className = "text-sm text-[#087F8C]";
    status.hidden = false;
    setTimeout(() => status.hidden = true, 3000);
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
    status.className = "text-sm text-[#C2413B]";
    status.hidden = false;
  }
});

// CSV upload handling
const uploadModal = document.querySelector("#upload-modal");
const uploadBtn = document.querySelector("#upload-csv-btn");
const csvFileInput = document.querySelector("#csv-file");

uploadBtn.addEventListener("click", () => {
  uploadBtn.disabled = uploadBtn.dataset.tabOnly !== currentTab.value;
  if (uploadBtn.disabled) {
    document.querySelector("#csv-status").textContent = "La carga CSV está disponible solo para Padrón.";
    document.querySelector("#csv-status").className = "text-sm text-[#C2413B]";
    document.querySelector("#csv-status").hidden = false;
    return;
  }
  csvFileInput.value = "";
  document.querySelector("#csv-preview").classList.add("hidden");
  document.querySelector("#modal-apply").disabled = true;
  uploadModal.showModal();
});

document.querySelector("#modal-cancel").addEventListener("click", () => uploadModal.close());

csvFileInput.addEventListener("change", async () => {
  const file = csvFileInput.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const csvEmails = new Set();

  for (const line of lines) {
    const parts = line.split(/[,;]/).map(p => p.trim().toLowerCase());
    for (const part of parts) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
        csvEmails.add(part);
        break;
      }
    }
  }

  if (csvEmails.size === 0) {
    document.querySelector("#csv-status").textContent = "No se encontraron correos válidos en el archivo.";
    document.querySelector("#csv-status").className = "text-sm text-[#C2413B]";
    document.querySelector("#csv-status").hidden = false;
    return;
  }

  const snapshot = await getDocs(collection(db, currentTab.value));
  const currentEmails = new Set(snapshot.docs.map(d => d.id));

  const toAdd = Array.from(csvEmails).filter(e => !currentEmails.has(e)).sort();
  const toRemove = Array.from(currentEmails).filter(e => !csvEmails.has(e)).sort();
  const toKeep = Array.from(csvEmails).filter(e => currentEmails.has(e)).length;

  const preview = document.querySelector("#csv-preview");
  preview.classList.remove("hidden");

  if (toAdd.length > 0) {
    document.querySelector("#preview-add").classList.remove("hidden");
    document.querySelector("#count-add").textContent = toAdd.length;
    document.querySelector("#list-add").innerHTML = toAdd.slice(0, 10).map(e => `<li>• ${escapeHtml(e)}</li>`).join("") + (toAdd.length > 10 ? `<li class="text-[#607480]">... y ${toAdd.length - 10} más</li>` : "");
  } else {
    document.querySelector("#preview-add").classList.add("hidden");
  }

  if (toRemove.length > 0) {
    document.querySelector("#preview-remove").classList.remove("hidden");
    document.querySelector("#count-remove").textContent = toRemove.length;
    document.querySelector("#list-remove").innerHTML = toRemove.slice(0, 10).map(e => `<li>• ${escapeHtml(e)}</li>`).join("") + (toRemove.length > 10 ? `<li class="text-[#607480]">... y ${toRemove.length - 10} más</li>` : "");
  } else {
    document.querySelector("#preview-remove").classList.add("hidden");
  }

  if (toKeep > 0) {
    document.querySelector("#preview-keep").classList.remove("hidden");
    document.querySelector("#count-keep-total").textContent = toKeep;
  } else {
    document.querySelector("#preview-keep").classList.add("hidden");
  }

  document.querySelector("#csv-status").hidden = true;
  document.querySelector("#modal-apply").disabled = false;
  document.querySelector("#modal-apply").dataset.toAdd = JSON.stringify(toAdd);
  document.querySelector("#modal-apply").dataset.toRemove = JSON.stringify(toRemove);
});

document.querySelector("#modal-apply").addEventListener("click", async () => {
  const btn = document.querySelector("#modal-apply");
  const toAdd = JSON.parse(btn.dataset.toAdd || "[]");
  const toRemove = JSON.parse(btn.dataset.toRemove || "[]");

  btn.disabled = true;
  const status = document.querySelector("#csv-status");
  status.hidden = false;
  status.textContent = "Sincronizando...";

  let addedCount = 0, removedCount = 0, errors = [];

  for (const email of toAdd) {
    try {
      await setDoc(doc(db, currentTab.value, email), { email, addedAt: new Date().toISOString() }, { merge: true });
      addedCount++;
    } catch (error) {
      errors.push(`${email}: ${error.message}`);
    }
  }

  for (const email of toRemove) {
    try {
      await deleteDoc(doc(db, currentTab.value, email));
      removedCount++;
    } catch (error) {
      errors.push(`${email}: ${error.message}`);
    }
  }

  await loadSection(currentTab.value);

  if (errors.length === 0) {
    status.textContent = `✓ Sincronización completa: +${addedCount} agregado(s), -${removedCount} eliminado(s).`;
    status.className = "text-sm text-[#087F8C]";
    setTimeout(() => {
      uploadModal.close();
      status.hidden = true;
    }, 2000);
  } else {
    status.textContent = `⚠ Completado con errores: +${addedCount}, -${removedCount}. Errores: ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? "..." : ""}`;
    status.className = "text-sm text-[#946316]";
  }

  btn.disabled = false;
});

export async function iniciarAsociacion({ junta }) {
  const permitidas = junta ? ["padron", "junta", "fiscalia", "medios"] : ["fiscalia"];
  document.querySelectorAll(".tab-btn").forEach(button => { button.hidden = !permitidas.includes(button.dataset.tab); });
  document.querySelector(`.tab-btn[data-tab="${permitidas[0]}"]`).click();
  if (junta) await syncJuntaPublica();
}
