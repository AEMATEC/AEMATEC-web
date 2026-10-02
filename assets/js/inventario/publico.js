// Parte pública del Inventario: pestañas, filtros, grilla, paginación y ficha de cada bien.
import { escapeHtml } from "../util.js";
import {
  db, inv, formatDate, showModal, hideModal, categoriasDe, uniqueValues, Categorias,
  TIPO_LABELS, TIPO_ICON, FILTER_CONFIG, PAGE_SIZE
} from "./estado.js";
import { getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.querySelectorAll(".inv-tab-btn").forEach(b => b.classList.toggle("is-active", b.dataset.tipo === inv.activeTab));

document.querySelectorAll("[data-close-modal]").forEach(button => {
  button.addEventListener("click", () => hideModal(button.closest(".modal-overlay")));
});
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", event => { if (event.target === overlay) hideModal(overlay); });
});

export async function loadInventory() {
  const snapshot = await getDocs(collection(db, "inventario"));
  inv.itemsByTipo = { institucional: [], aematec: [], biblioteca: [], consumible: [] };
  snapshot.forEach(document => {
    const data = { id: document.id, ...document.data() };
    if (inv.itemsByTipo[data.tipo]) inv.itemsByTipo[data.tipo].push(data);
  });
  Object.values(inv.itemsByTipo).forEach(list => list.sort((a, b) =>
    (a.titulo || a.nombre || a.articulo || "").localeCompare(b.titulo || b.nombre || b.articulo || "", "es")
  ));
  populateFilterOptions(inv.activeTab);
  populateSortOptions(inv.activeTab);
  renderGrid();
}

// Filtro de la Biblioteca: las categorías van agrupadas y se puede elegir un grupo entero.
function fillGroupedCategorySelect(select, values) {
  const current = select.value;
  const groups = new Map();
  for (const value of values) {
    const group = Categorias.grupoDe(value) || "Otras";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(value);
  }
  const sorted = [...groups.entries()].sort((a, b) => (a[0] === "Otras") - (b[0] === "Otras") || a[0].localeCompare(b[0], "es"));
  select.innerHTML = `<option value="">Todas las categorías</option>` + sorted.map(([group, list]) =>
    `<optgroup label="${escapeHtml(group)}">`
    + (group === "Otras" ? "" : `<option value="grupo:${escapeHtml(group)}">Todo: ${escapeHtml(group)}</option>`)
    + list.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")
    + "</optgroup>").join("");
  select.value = [...select.options].some(option => option.value === current) ? current : "";
}


function fillSelect(select, values, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = values.includes(current) ? current : "";
}

function populateFilterOptions(tipo) {
  const config = FILTER_CONFIG[tipo];
  const list = inv.itemsByTipo[tipo] || [];
  document.querySelector("#filter-categoria-wrap").hidden = !config.categoria;
  document.querySelector("#filter-estado-wrap").hidden = !config.estado;
  document.querySelector("#filter-ubicacion-wrap").hidden = !config.ubicacion;
  document.querySelector("#filter-disponible-wrap").hidden = !config.disponible;
  document.querySelector("#filter-bajostock-wrap").hidden = !config.bajoStock;
  if (config.categoria && tipo === "biblioteca") fillGroupedCategorySelect(document.querySelector("#filter-categoria"), uniqueValues(list, "categoria"));
  else if (config.categoria) fillSelect(document.querySelector("#filter-categoria"), uniqueValues(list, "categoria"), "Todas las categorías");
  if (config.estado) fillSelect(document.querySelector("#filter-estado"), uniqueValues(list, "estado"), "Todos los estados");
  if (config.ubicacion) fillSelect(document.querySelector("#filter-ubicacion"), uniqueValues(list, "ubicacion"), "Todas las ubicaciones");
}

function resetFilters() {
  document.querySelector("#filter-categoria").value = "";
  document.querySelector("#filter-estado").value = "";
  document.querySelector("#filter-ubicacion").value = "";
  document.querySelector("#filter-disponible").checked = false;
  document.querySelector("#filter-bajostock").checked = false;
}

function getLabel(item) {
  return (item.titulo || item.nombre || item.articulo || "").toLowerCase();
}
function getCodigo(item) {
  return (item.codigo || item.ejemplares?.[0]?.codigo || "").toLowerCase();
}

function populateSortOptions(tipo) {
  const sortSelect = document.querySelector("#inv-sort");
  const anioOptions = sortSelect.querySelectorAll("[data-anio-only]");
  const showAnio = tipo === "biblioteca";
  anioOptions.forEach(option => { option.hidden = !showAnio; });
  if (!showAnio && sortSelect.value.startsWith("anio")) sortSelect.value = "alpha-asc";
}

function sortItems(list) {
  const [field, direction] = document.querySelector("#inv-sort").value.split("-");
  const factor = direction === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    if (field === "codigo") return getCodigo(a).localeCompare(getCodigo(b), "es") * factor;
    if (field === "anio") return ((Number(a.anio) || 0) - (Number(b.anio) || 0)) * factor;
    return getLabel(a).localeCompare(getLabel(b), "es") * factor;
  });
}

function searchableText(item) {
  return [
    item.codigo, item.nombre, item.titulo, item.autor, ...categoriasDe(item), item.articulo,
    item.ubicacion, item.descripcion, item.marca
  ].filter(Boolean).join(" ").toLowerCase();
}

export function renderGrid() {
  const searchValue = document.querySelector("#inv-search").value.trim().toLowerCase();
  let list = inv.itemsByTipo[inv.activeTab] || [];
  if (searchValue) list = list.filter(item => searchableText(item).includes(searchValue));

  const categoriaFilter = document.querySelector("#filter-categoria").value;
  const estadoFilter = document.querySelector("#filter-estado").value;
  const ubicacionFilter = document.querySelector("#filter-ubicacion").value;
  const disponibleFilter = document.querySelector("#filter-disponible").checked;
  const bajoStockFilter = document.querySelector("#filter-bajostock").checked;
  if (categoriaFilter.startsWith("grupo:")) {
    const group = categoriaFilter.slice("grupo:".length);
    list = list.filter(item => categoriasDe(item).some(categoria => Categorias.grupoDe(categoria) === group));
  } else if (categoriaFilter) {
    list = list.filter(item => categoriasDe(item).includes(categoriaFilter));
  }
  if (estadoFilter) list = list.filter(item => (item.estado || "") === estadoFilter);
  if (ubicacionFilter) list = list.filter(item => (item.ubicacion || "") === ubicacionFilter);
  if (disponibleFilter) list = list.filter(item => (item.ejemplares || []).some(exemplar => exemplar.disponible));
  if (bajoStockFilter) list = list.filter(item => Number(item.existenciaActual) <= Number(item.existenciaMinima));

  list = sortItems(list);

  const pageSize = PAGE_SIZE[inv.activeTab] || 8;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  inv.page = Math.min(inv.page, totalPages);
  const pageItems = list.slice((inv.page - 1) * pageSize, inv.page * pageSize);

  const grid = document.querySelector("#inv-grid");
  grid.className = inv.activeTab === "biblioteca"
    ? "mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    : "mt-6 grid grid-cols-1 gap-4";

  document.querySelector("#inv-count").textContent = `${list.length} ${list.length === 1 ? "resultado" : "resultados"}`;
  document.querySelector("#inv-add-btn").hidden = !inv.isJunta;

  if (!pageItems.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-[#607480] py-10"><i class="fa-solid fa-box-open text-2xl mb-3 block"></i>No hay bienes registrados en este apartado todavía.</p>`;
  } else {
    grid.innerHTML = pageItems.map(item => inv.activeTab === "biblioteca" ? bookCardHtml(item) : itemCardHtml(item)).join("");
  }
  renderPagination(totalPages);
  attachCardEvents();
}

function bookCardHtml(item) {
  const disponibles = (item.ejemplares || []).filter(exemplar => exemplar.disponible).length;
  const copias = (item.ejemplares || []).length;
  return `
    <article class="bg-white border border-[#D6E2E7] rounded-[16px] overflow-hidden flex flex-col hover:border-[#8ED5DD]">
      <div class="book-cover bg-[#EAF1F4] flex items-center justify-center overflow-hidden">
        ${item.portadaUrl
      ? `<img src="${escapeHtml(item.portadaUrl)}" alt="Portada de ${escapeHtml(item.titulo)}" class="w-full h-full object-cover">`
      : `<i class="fa-solid fa-book text-[#9DB6C1] text-4xl"></i>`}
      </div>
      <div class="p-4 flex flex-col flex-1">
        <h3 class="font-sans font-bold text-[15px] leading-tight line-clamp-2">${escapeHtml(item.titulo)}</h3>
        <p class="text-xs text-[#607480] mt-1 line-clamp-2">${escapeHtml(item.autor)}</p>
        <span class="mt-3 inline-block w-fit font-sans text-[11px] font-bold ${disponibles > 0 ?"bg-[#DFF6F8] text-[#00798A]" : "bg-[#F5E4E4] text-[#A0403A]"} px-2.5 py-1 rounded-full">${disponibles}/${copias} copia${copias === 1 ? "" : "s"} disponible${disponibles === 1 ? "" : "s"}</span>
        <button type="button" data-view="${item.id}" class="mt-4 h-9 border border-[#9DB6C1] rounded-[8px] font-sans font-bold text-xs">Ver detalle</button>
      </div>
    </article>`;
}

function itemCardHtml(item) {
  const nombre = item.nombre || item.articulo || "Sin nombre";
  const bajoStock = inv.activeTab === "consumible" && Number(item.existenciaActual) <= Number(item.existenciaMinima);
  return `
    <article class="bg-white border border-[#D6E2E7] rounded-[14px] p-5 flex items-center gap-4 hover:border-[#8ED5DD]">
      <div class="h-12 w-12 rounded-[10px] bg-[#E6F8FA] text-[#009CAD] flex items-center justify-center text-lg flex-shrink-0"><i class="fa-solid ${TIPO_ICON[inv.activeTab] ||"fa-cube"}"></i></div>
      <div class="flex-1 min-w-0">
        <p class="font-sans font-bold text-[15px] truncate">${escapeHtml(nombre)}</p>
        <p class="text-xs text-[#607480] mt-0.5 truncate">${escapeHtml(item.codigo || "")} · ${escapeHtml(item.ubicacion || "Sin ubicación")}</p>
      </div>
      ${bajoStock ? `<span class="font-sans text-[11px] font-bold bg-[#FCE9E7] text-[#C2413B] px-2.5 py-1 rounded-full flex-shrink-0">Bajo stock</span>` : ""}
      ${item.estado ? `<span class="hidden sm:inline-block font-sans text-[11px] font-bold bg-[#EAF1F4] text-[#405968] px-2.5 py-1 rounded-full flex-shrink-0">${escapeHtml(item.estado)}</span>` : ""}
      <button type="button" data-view="${item.id}" class="h-9 px-4 border border-[#9DB6C1] rounded-[8px] font-sans font-bold text-xs flex-shrink-0">Ver detalle</button>
    </article>`;
}

function attachCardEvents() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      const item = inv.itemsByTipo[inv.activeTab].find(entry => entry.id === button.dataset.view);
      if (item) openItemModal(item);
    });
  });
}

function getPaginationRange(current, total) {
  const delta = 2;
  const pages = [];
  for (let index = 1; index <= total; index += 1) {
    if (index === 1 || index === total || (index >= current - delta && index <= current + delta)) pages.push(index);
  }
  const withDots = [];
  let previous = 0;
  for (const index of pages) {
    if (previous && index - previous > 1) withDots.push("...");
    withDots.push(index);
    previous = index;
  }
  return withDots;
}

function renderPagination(totalPages) {
  const pagination = document.querySelector("#inv-pagination");
  if (totalPages <= 1) { pagination.innerHTML = ""; return; }
  const arrowClass = "w-10 h-10 rounded-[8px] border border-[#CBD9DF] bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed";
  let html = `<button type="button" data-page="${inv.page - 1}" ${inv.page === 1 ? "disabled" : ""} class="${arrowClass}" aria-label="Página anterior"><i class="fa-solid fa-chevron-left text-xs"></i></button>`;
  html += getPaginationRange(inv.page, totalPages).map(entry => entry === "..."
    ? `<span class="w-10 h-10 flex items-center justify-center text-[#566B78]">…</span>`
    : `<button type="button" data-page="${entry}" class="w-10 h-10 rounded-[8px] ${entry === inv.page ?"bg-[#0D2B45] text-white" : "bg-white border border-[#CBD9DF]"} flex items-center justify-center">${entry}</button>`
  ).join("");
  html += `<button type="button" data-page="${inv.page + 1}" ${inv.page === totalPages ? "disabled" : ""} class="${arrowClass}" aria-label="Página siguiente"><i class="fa-solid fa-chevron-right text-xs"></i></button>`;
  pagination.innerHTML = html;
  pagination.querySelectorAll("[data-page]:not([disabled])").forEach(button => {
    button.addEventListener("click", () => { inv.page = Number(button.dataset.page); renderGrid(); });
  });
}

document.querySelectorAll(".inv-tab-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".inv-tab-btn").forEach(other => other.classList.remove("is-active"));
    button.classList.add("is-active");
    inv.activeTab = button.dataset.tipo;
    inv.page = 1;
    resetFilters();
    populateFilterOptions(inv.activeTab);
    document.querySelector("#inv-sort").value = "alpha-asc";
    populateSortOptions(inv.activeTab);
    renderGrid();
  });
});

document.querySelector("#inv-search-form").addEventListener("submit", event => {
  event.preventDefault();
  inv.page = 1;
  renderGrid();
});
document.querySelector("#inv-search").addEventListener("input", () => { inv.page = 1; renderGrid(); });
document.querySelector("#inv-sort").addEventListener("change", () => { inv.page = 1; renderGrid(); });

const invFilterPanel = document.querySelector("#inv-filter-panel");
const invFilterBackdrop = document.querySelector("#inv-filter-backdrop");
function openInvFilters() {
  invFilterPanel.classList.add("is-open");
  invFilterBackdrop.classList.add("is-open");
  document.body.classList.add("overflow-hidden");
  document.querySelector("#close-inv-filters").focus();
}
function closeInvFilters() {
  invFilterPanel.classList.remove("is-open");
  invFilterBackdrop.classList.remove("is-open");
  document.body.classList.remove("overflow-hidden");
}
document.querySelector("#open-inv-filters").addEventListener("click", openInvFilters);
document.querySelector("#close-inv-filters").addEventListener("click", closeInvFilters);
invFilterBackdrop.addEventListener("click", closeInvFilters);
document.querySelector("#apply-inv-filters").addEventListener("click", () => {
  inv.page = 1;
  closeInvFilters();
  renderGrid();
});
document.querySelector("#clear-inv-filters").addEventListener("click", event => {
  event.preventDefault();
  resetFilters();
  inv.page = 1;
  renderGrid();
});

function fieldRow(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${value ?? "No indicado"}</dd></div>`;
}

function fieldsHtmlFor(item) {
  if (item.tipo === "institucional") {
    return [
      fieldRow("Código interno", escapeHtml(item.codigo)),
      fieldRow("Placa institucional", escapeHtml(item.placa)),
      fieldRow("Descripción", escapeHtml(item.descripcion)),
      fieldRow("Marca", escapeHtml(item.marca)),
      fieldRow("Estado", escapeHtml(item.estado)),
      fieldRow("Ubicación", escapeHtml(item.ubicacion)),
      fieldRow("Custodio", escapeHtml(item.responsable)),
      fieldRow("Última revisión", escapeHtml(item.fecha)),
      fieldRow("Observaciones", escapeHtml(item.observaciones))
    ].join("");
  }
  if (item.tipo === "aematec") {
    return [
      fieldRow("Código", escapeHtml(item.codigo)),
      fieldRow("Categoría", escapeHtml(item.categoria)),
      fieldRow("Descripción", escapeHtml(item.descripcion)),
      fieldRow("Marca", escapeHtml(item.marca)),
      fieldRow("Fecha compra/donación", escapeHtml(item.fecha)),
      fieldRow("Valor", item.valor ? `₡${Number(item.valor).toLocaleString("es-CR")}` : "No indicado"),
      fieldRow("Estado", escapeHtml(item.estado)),
      fieldRow("Disponibilidad", item.disponible === false ? "Prestado" : "Disponible"),
      fieldRow("Ubicación", escapeHtml(item.ubicacion)),
      fieldRow("Responsable", escapeHtml(item.responsable)),
      fieldRow("Observaciones", escapeHtml(item.observaciones))
    ].join("");
  }
  if (item.tipo === "biblioteca") {
    const ejemplaresHtml = (item.ejemplares || []).map(exemplar =>
      `<li class="flex justify-between gap-3 py-1.5 border-b border-[#EEF2F4] last:border-0">
        <span>${escapeHtml(exemplar.codigo)} · ${escapeHtml(exemplar.ubicacion)}</span>
        <span class="${exemplar.disponible ?"text-[#00798A]" : "text-[#A0403A]"} font-semibold">${escapeHtml(exemplar.estado)} · ${exemplar.disponible ? "Disponible" : "No disponible"}</span>
      </li>`).join("") || "<li>Sin ejemplares registrados.</li>";
    return [
      fieldRow("Autor", escapeHtml(item.autor)),
      fieldRow("Edición", escapeHtml(item.edicion)),
      fieldRow("Año", escapeHtml(item.anio)),
      fieldRow("Categorías", escapeHtml(categoriasDe(item).join(", ")) || null),
      fieldRow("Observaciones", escapeHtml(item.observaciones))
    ].join("") + `<div class="col-span-2"><dt>Ejemplares</dt><dd><ul class="mt-1 text-sm">${ejemplaresHtml}</ul></dd></div>`;
  }
  return [
    fieldRow("Código", escapeHtml(item.codigo)),
    fieldRow("Categoría", escapeHtml(item.categoria)),
    fieldRow("Unidad", escapeHtml(item.unidad)),
    fieldRow("Existencia actual", escapeHtml(item.existenciaActual)),
    fieldRow("Existencia mínima", escapeHtml(item.existenciaMinima)),
    fieldRow("Ubicación", escapeHtml(item.ubicacion)),
    fieldRow("Última actualización", formatDate(item.updatedAt)),
    fieldRow("Observaciones", escapeHtml(item.observaciones))
  ].join("");
}

function isPrestable(item) {
  if (item.tipo === "aematec") return item.disponible !== false;
  if (item.tipo === "biblioteca") return (item.ejemplares || []).some(exemplar => exemplar.disponible);
  return false;
}

export function openItemModal(item) {
  inv.currentItem = item;
  const cover = document.querySelector("#item-modal-cover");
  cover.hidden = item.tipo !== "biblioteca";
  if (item.tipo === "biblioteca") cover.src = item.portadaUrl || "";
  document.querySelector("#item-modal-kicker").textContent = TIPO_LABELS[item.tipo];
  document.querySelector("#item-modal-title").textContent = item.tipo === "biblioteca" ? item.titulo : (item.nombre || item.articulo);
  document.querySelector("#item-modal-subtitle").textContent = item.tipo === "biblioteca" ? (item.autor || "") : (item.codigo || "");
  document.querySelector("#item-modal-fields").innerHTML = fieldsHtmlFor(item);
  document.querySelector("#item-modal-loan").hidden = !isPrestable(item);
  document.querySelector("#item-modal-edit").hidden = !inv.isJunta;
  document.querySelector("#item-modal-delete").hidden = !inv.isJunta;
  showModal(document.querySelector("#item-modal"));
}
