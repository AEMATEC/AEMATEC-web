// Administración del Inventario por la Junta: formularios de bienes, ejemplares, portadas, duplicar y eliminar.
// Los permisos reales los aplican firestore.rules y storage.rules; aquí solo se decide qué se muestra.
import { escapeHtml } from "../util.js";
import { conectarSugerencias } from "../sugerencias.js";
import {
  db, storage, inv, showModal, hideModal, allItems, categoriasDe, uniqueValues,
  Codigos, Categorias, MAX_CATEGORIAS_LIBRO, SUGERENCIAS, ESTADO_POR_REVISAR, TIPO_LABELS
} from "./estado.js";
import { loadInventory } from "./publico.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let exemplarRowCount = 0;
function exemplarRowHtml(exemplar = {}) {
  exemplarRowCount += 1;
  const rowId = `ex-row-${exemplarRowCount}`;
  return `
    <div class="exemplar-row" id="${rowId}">
      <input type="text" placeholder="Código" value="${escapeHtml(exemplar.codigo || "")}" data-exemplar="codigo" required class="h-10 rounded-[8px] border border-[#BFD0D8] px-2 text-sm">
      <input type="text" data-sugerencias="estado" placeholder="Estado" value="${escapeHtml(exemplar.estado || "")}" data-exemplar="estado" class="h-10 rounded-[8px] border border-[#BFD0D8] px-2 text-sm">
      <input type="text" data-sugerencias="ubicacion" placeholder="Ubicación" value="${escapeHtml(exemplar.ubicacion || "Biblioteca")}" data-exemplar="ubicacion" class="h-10 rounded-[8px] border border-[#BFD0D8] px-2 text-sm">
      <label class="flex items-center gap-1 text-xs"><input type="checkbox" data-exemplar="disponible" ${exemplar.disponible !== false ? "checked" : ""} class="accent-[#00AFC1]">Disp.</label>
      <button type="button" data-remove-row="${rowId}" class="h-9 w-9 rounded-[8px] border border-[#E2A0A0] text-[#C2413B]"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
}

function fieldsFormFor(tipo, item = {}) {
  if (tipo === "institucional") {
    return `
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Código interno</label><input name="codigo" required value="${escapeHtml(item.codigo)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Placa institucional</label><input name="placa" value="${escapeHtml(item.placa)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div><label class="font-sans text-xs font-bold">Nombre del activo</label><input name="nombre" required value="${escapeHtml(item.nombre)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      <div><label class="font-sans text-xs font-bold">Descripción</label><textarea name="descripcion" rows="2" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2">${escapeHtml(item.descripcion)}</textarea></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Marca</label><input name="marca" value="${escapeHtml(item.marca)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Estado</label><input name="estado" data-sugerencias="estado" value="${escapeHtml(item.estado)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Ubicación</label><input name="ubicacion" data-sugerencias="ubicacion" value="${escapeHtml(item.ubicacion)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Custodio</label><input name="responsable" value="${escapeHtml(item.responsable || "AEMATEC")}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div><label class="font-sans text-xs font-bold">Observaciones</label><textarea name="observaciones" rows="2" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2">${escapeHtml(item.observaciones)}</textarea></div>`;
  }
  if (tipo === "aematec") {
    return `
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Código</label><input name="codigo" required value="${escapeHtml(item.codigo)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Categoría</label><input name="categoria" data-sugerencias="categoria" required value="${escapeHtml(item.categoria)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div><label class="font-sans text-xs font-bold">Nombre del activo</label><input name="nombre" required value="${escapeHtml(item.nombre)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      <div><label class="font-sans text-xs font-bold">Descripción</label><textarea name="descripcion" rows="2" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2">${escapeHtml(item.descripcion)}</textarea></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Marca</label><input name="marca" value="${escapeHtml(item.marca)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Valor (₡)</label><input name="valor" type="number" min="0" value="${escapeHtml(item.valor)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Estado</label><input name="estado" data-sugerencias="estado" value="${escapeHtml(item.estado)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Ubicación</label><input name="ubicacion" data-sugerencias="ubicacion" value="${escapeHtml(item.ubicacion)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div><label class="font-sans text-xs font-bold">Responsable</label><input name="responsable" value="${escapeHtml(item.responsable || "AEMATEC")}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      <div><label class="font-sans text-xs font-bold">Observaciones</label><textarea name="observaciones" rows="2" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2">${escapeHtml(item.observaciones)}</textarea></div>`;
  }
  if (tipo === "consumible") {
    return `
      <div class="grid grid-cols-2 gap-4">
        <div><label class="font-sans text-xs font-bold">Código</label><input name="codigo" required value="${escapeHtml(item.codigo)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Categoría</label><input name="categoria" data-sugerencias="categoria" required value="${escapeHtml(item.categoria)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div><label class="font-sans text-xs font-bold">Artículo</label><input name="articulo" required value="${escapeHtml(item.articulo)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="font-sans text-xs font-bold">Unidad</label><input name="unidad" value="${escapeHtml(item.unidad)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Existencia actual</label><input name="existenciaActual" type="number" min="0" value="${escapeHtml(item.existenciaActual ?? 0)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
        <div><label class="font-sans text-xs font-bold">Existencia mínima</label><input name="existenciaMinima" type="number" min="0" value="${escapeHtml(item.existenciaMinima ?? 0)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      </div>
      <div><label class="font-sans text-xs font-bold">Ubicación</label><input name="ubicacion" data-sugerencias="ubicacion" value="${escapeHtml(item.ubicacion)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      <div><label class="font-sans text-xs font-bold">Observaciones</label><textarea name="observaciones" rows="2" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2">${escapeHtml(item.observaciones)}</textarea></div>`;
  }
  exemplarRowCount = 0;
  const exemplarRows = (item.ejemplares && item.ejemplares.length ? item.ejemplares : [{ codigo: "", estado: "Bueno", ubicacion: "Biblioteca", disponible: true }])
    .map(exemplarRowHtml).join("");
  return `
    <div><label class="font-sans text-xs font-bold">Título</label><input name="titulo" required value="${escapeHtml(item.titulo)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
    <div><label class="font-sans text-xs font-bold">Autor</label><input name="autor" required value="${escapeHtml(item.autor)}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
    <div class="grid grid-cols-2 gap-4">
      <div><label class="font-sans text-xs font-bold">Edición</label><input name="edicion" value="${escapeHtml(item.edicion || "N/A")}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
      <div><label class="font-sans text-xs font-bold">Año</label><input name="anio" value="${escapeHtml(item.anio || "N/A")}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
    </div>
    <div><label class="font-sans text-xs font-bold">Categorías <span class="font-normal text-[#607480]">(hasta ${MAX_CATEGORIAS_LIBRO}, separadas por coma)</span></label><input name="categorias" data-sugerencias="categoria" data-multiple value="${escapeHtml(categoriasDe(item).join(", "))}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3"></div>
    <div>
      <label class="font-sans text-xs font-bold">Portada</label>
      ${item.portadaUrl ? `<img src="${escapeHtml(item.portadaUrl)}" alt="Portada actual" class="mt-2 h-24 w-16 rounded-[8px] border border-[#E2E9EC] object-cover">` : ""}
      <input type="file" id="portada-file" accept="image/jpeg,image/png,image/webp" class="mt-2 w-full text-sm">
      <p class="mt-1 text-xs text-[#607480]">Imagen JPG, PNG o WEBP de máximo 5 MB, o pega un enlace abajo (el archivo tiene prioridad si eliges ambos).</p>
      <input type="url" id="portada-url" placeholder="https://ejemplo.com/portada.jpg" value="${escapeHtml(item.portadaPath ? "" : (item.portadaUrl || ""))}" class="mt-2 h-11 w-full rounded-[9px] border border-[#BFD0D8] px-3">
    </div>
    <div><label class="font-sans text-xs font-bold">Observaciones</label><textarea name="observaciones" rows="2" class="mt-2 w-full rounded-[9px] border border-[#BFD0D8] px-3 py-2">${escapeHtml(item.observaciones)}</textarea></div>
    <div class="border-t border-[#E2E9EC] pt-4">
      <div class="flex justify-between items-center">
        <label class="font-sans text-xs font-bold">Ejemplares</label>
        <button type="button" id="add-exemplar-btn" class="font-sans text-xs font-bold text-[#008F9E]"><i class="fa-solid fa-plus mr-1"></i>Añadir ejemplar</button>
      </div>
      <div id="ejemplares-rows" class="mt-3 space-y-2">${exemplarRows}</div>
    </div>`;
}

function attachExemplarEvents() {
  const addButton = document.querySelector("#add-exemplar-btn");
  if (!addButton) return;
  addButton.addEventListener("click", () => {
    // El ejemplar nuevo sigue la numeración del libro (BIB-001-01 → BIB-001-02) o, si el libro
    // aún no tiene ejemplares, recibe el siguiente código libre de la Biblioteca.
    const inputs = [...document.querySelectorAll("[data-exemplar=codigo]")].filter(input => input.value.trim());
    const todos = [...Codigos.codigosConEstado(allItems()).map(entrada => entrada.codigo), ...inputs.map(input => input.value.trim())];
    let codigo;
    if (inputs.length) {
      const ultimo = inputs.at(-1);
      const familia = Codigos.codigosAlDuplicar(ultimo.value.trim(), todos);
      // Si el ejemplar no tenía sufijo (BIB-050), pasa a BIB-050-01 y el nuevo es BIB-050-02. Uno prestado no
      // se renombra, porque la solicitud de préstamo guarda su código para marcar la devolución.
      const prestado = !ultimo.closest(".exemplar-row").querySelector("[data-exemplar=disponible]").checked;
      if (familia.original !== ultimo.value.trim() && !prestado) ultimo.value = familia.original;
      codigo = familia.copia;
    } else {
      codigo = Codigos.siguienteCodigo("biblioteca", inv.itemsByTipo.biblioteca, allItems()).codigo;
    }
    document.querySelector("#ejemplares-rows").insertAdjacentHTML("beforeend", exemplarRowHtml({ codigo, estado: "Bueno", ubicacion: "Biblioteca" }));
    attachRemoveEvents();
    connectSuggestions(document.querySelector("#ejemplares-rows"), "biblioteca");
  });
  attachRemoveEvents();
}
function attachRemoveEvents() {
  document.querySelectorAll("[data-remove-row]").forEach(button => {
    button.onclick = () => document.querySelector(`#${button.dataset.removeRow}`)?.remove();
  });
}

function suggestionOptions(field, tipo) {
  if (field === "categoria") return [...(SUGERENCIAS.categoria[tipo] || []), ...uniqueValues(inv.itemsByTipo[tipo] || [], "categoria")];
  return [...(SUGERENCIAS[field] || []), ...uniqueValues(allItems(), field)];
}

function connectSuggestions(container, tipo) {
  container.querySelectorAll("[data-sugerencias], [data-exemplar=estado], [data-exemplar=ubicacion]").forEach(input => {
    const field = input.dataset.sugerencias || input.dataset.exemplar;
    conectarSugerencias(input, () => suggestionOptions(field, tipo),
      input.hasAttribute("data-multiple") ? { multiple: true, maximo: MAX_CATEGORIAS_LIBRO } : {});
  });
}

// Al agregar un bien se propone el código: primero uno libre de un bien dado de baja
// (regalado, extraviado, vendido…) y, si no hay, el siguiente número (ACA-065 → ACA-066).
function suggestCode(tipo) {
  const input = tipo === "biblioteca"
    ? document.querySelector("[data-exemplar=codigo]")
    : document.querySelector("#admin-fields [name=codigo]");
  if (!input) return;
  const { codigo, reutilizaDe } = Codigos.siguienteCodigo(tipo, inv.itemsByTipo[tipo] || [], allItems());
  input.value = codigo;
  const hint = document.createElement("p");
  hint.className = "mt-1 text-xs text-[#607480]";
  hint.textContent = reutilizaDe
    ? `Código libre de «${reutilizaDe.titulo || reutilizaDe.nombre || reutilizaDe.articulo || "un bien"}» (${reutilizaDe.estado || "dado de baja"}). Puedes cambiarlo.`
    : "Siguiente código disponible. Puedes cambiarlo.";
  (tipo === "biblioteca" ? input.closest(".exemplar-row") : input).insertAdjacentElement("afterend", hint);
}

function openAdminModal(tipo, item = null) {
  document.querySelector("#admin-modal-kicker").textContent = TIPO_LABELS[tipo];
  document.querySelector("#admin-modal-title").textContent = item ? "Editar bien" : "Agregar bien";
  const fields = document.querySelector("#admin-fields");
  fields.innerHTML = fieldsFormFor(tipo, item || {});
  document.querySelector("#admin-item-form").dataset.tipo = tipo;
  document.querySelector("#admin-item-form").dataset.itemId = item?.id || "";
  document.querySelector("#admin-status").hidden = true;
  // En la Biblioteca las copias de un libro se agregan como ejemplares, no duplicando el libro.
  document.querySelector("#admin-duplicate-btn").hidden = !item || tipo === "biblioteca";
  if (tipo === "biblioteca") attachExemplarEvents();
  if (!item) suggestCode(tipo);
  connectSuggestions(fields, tipo);
  showModal(document.querySelector("#admin-item-modal"));
}

document.querySelector("#inv-add-btn").addEventListener("click", async () => {
  // Se recarga el inventario para no proponer un código que otra persona de la Junta acaba de usar.
  const addButton = document.querySelector("#inv-add-btn");
  addButton.disabled = true;
  try {
    await loadInventory();
  } catch (error) {
    console.warn("No se pudo recargar el inventario", error);
  } finally {
    addButton.disabled = false;
  }
  openAdminModal(inv.activeTab);
});

// Duplicar: copia todos los datos del bien guardado excepto código y estado. El original y la copia
// quedan numerados como familia (ACA-065 → ACA-065-01 y la copia ACA-065-02) y la copia entra como
// "Falta comprobar" para que la Junta la revise en físico.
document.querySelector("#admin-duplicate-btn").addEventListener("click", async () => {
  const form = document.querySelector("#admin-item-form");
  const status = document.querySelector("#admin-status");
  const button = document.querySelector("#admin-duplicate-btn");
  button.disabled = true;
  try {
    await loadInventory();
    const original = allItems().find(entry => entry.id === form.dataset.itemId);
    if (!original) throw new Error("El bien ya no existe en el inventario.");
    const todos = Codigos.codigosConEstado(allItems()).map(entrada => entrada.codigo);
    const codigos = Codigos.codigosAlDuplicar(original.codigo, todos);
    const renombrar = codigos.original !== original.codigo;
    const mensaje = `Se creará una copia con el código ${codigos.copia}`
      + (renombrar ? ` y el bien actual pasará de ${original.codigo} a ${codigos.original}` : "")
      + `. La copia queda en estado «${ESTADO_POR_REVISAR}».\n\nLos cambios sin guardar en este formulario no se copian. ¿Continuar?`;
    if (!confirm(mensaje)) return;
    const { id, codigo, estado, disponible, createdAt, updatedAt, ...datos } = original;
    const copia = { ...datos, codigo: codigos.copia, estado: ESTADO_POR_REVISAR, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const nuevo = await addDoc(collection(db, "inventario"), copia);
    if (renombrar) await updateDoc(doc(db, "inventario", original.id), { codigo: codigos.original, updatedAt: serverTimestamp() });
    await loadInventory();
    const creado = allItems().find(entry => entry.id === nuevo.id);
    if (creado) openAdminModal(creado.tipo, creado);
    status.hidden = false;
    status.className = "text-sm text-[#087F8C]";
    status.textContent = `Copia creada con el código ${codigos.copia}. Revisa sus datos y guarda si cambias algo.`;
  } catch (error) {
    status.hidden = false;
    status.className = "text-sm text-[#C2413B]";
    status.textContent = `No se pudo duplicar: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#item-modal-edit").addEventListener("click", () => {
  hideModal(document.querySelector("#item-modal"));
  openAdminModal(inv.currentItem.tipo, inv.currentItem);
});
document.querySelector("#item-modal-delete").addEventListener("click", async () => {
  if (!inv.currentItem || !confirm("¿Eliminar este bien del inventario? Esta acción no se puede deshacer.")) return;
  try {
    if (inv.currentItem.tipo === "biblioteca" && inv.currentItem.portadaPath) {
      await deleteObject(ref(storage, inv.currentItem.portadaPath)).catch(() => { });
    }
    await deleteDoc(doc(db, "inventario", inv.currentItem.id));
    hideModal(document.querySelector("#item-modal"));
    await loadInventory();
  } catch (error) {
    alert(`No se pudo eliminar: ${error.message}`);
  }
});

async function uploadCover(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["jpg", "jpeg", "png", "webp"].includes(extension) || file.size > 5 * 1024 * 1024) {
    throw new Error("La portada debe ser JPG, PNG o WEBP de máximo 5 MB.");
  }
  const fileId = crypto.randomUUID();
  const storagePath = `inventario/biblioteca/${fileId}.${extension}`;
  const upload = uploadBytesResumable(ref(storage, storagePath), file, { contentType: file.type });
  await new Promise((resolve, reject) => upload.on("state_changed", () => { }, reject, resolve));
  return { storagePath, portadaUrl: await getDownloadURL(upload.snapshot.ref) };
}

document.querySelector("#admin-item-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target;
  const tipo = form.dataset.tipo;
  const itemId = form.dataset.itemId;
  const status = document.querySelector("#admin-status");
  const submitButton = document.querySelector("#admin-submit-btn");
  submitButton.disabled = true;
  try {
    const fields = Object.fromEntries(new FormData(form).entries());
    const payload = { tipo, ...fields, updatedAt: serverTimestamp() };
    if (tipo === "aematec") payload.valor = Number(fields.valor) || 0;
    if (tipo === "consumible") {
      payload.existenciaActual = Number(fields.existenciaActual) || 0;
      payload.existenciaMinima = Number(fields.existenciaMinima) || 0;
    }
    if (tipo === "biblioteca") {
      payload.ejemplares = [...document.querySelectorAll(".exemplar-row")].map(row => ({
        codigo: row.querySelector("[data-exemplar=codigo]").value.trim(),
        estado: row.querySelector("[data-exemplar=estado]").value.trim(),
        ubicacion: row.querySelector("[data-exemplar=ubicacion]").value.trim(),
        disponible: row.querySelector("[data-exemplar=disponible]").checked
      })).filter(exemplar => exemplar.codigo);
      // Categorías como lista (máx. 3), con los nombres unificados ("Tercer ciclio" → "Tercer ciclo");
      // se acepta coma o "/" al escribirlas.
      const categorias = Categorias.normalizarLista(fields.categorias);
      if (categorias.length > MAX_CATEGORIAS_LIBRO) throw new Error(`Un libro puede tener como máximo ${MAX_CATEGORIAS_LIBRO} categorías.`);
      payload.categorias = categorias;
    }
    // El código no puede ser el de otro bien activo (sí el de uno dado de baja, que queda libre).
    await loadInventory();
    const codigos = tipo === "biblioteca" ? payload.ejemplares.map(exemplar => exemplar.codigo) : [String(payload.codigo || "").trim()];
    const repetido = Codigos.codigoRepetido(codigos.filter(Boolean), allItems(), itemId);
    if (repetido) throw new Error(`El código ${repetido} ya lo usa otro bien. Usa otro código.`);
    if (tipo === "biblioteca") {
      const coverFile = document.querySelector("#portada-file")?.files[0];
      const coverUrl = document.querySelector("#portada-url")?.value.trim();
      if (coverFile) {
        const uploaded = await uploadCover(coverFile);
        payload.portadaUrl = uploaded.portadaUrl;
        payload.portadaPath = uploaded.storagePath;
      } else if (coverUrl) {
        if (!/^https?:\/\//i.test(coverUrl)) throw new Error("El enlace de la portada debe comenzar con http:// o https://.");
        const previousItem = itemId ? inv.itemsByTipo.biblioteca.find(book => book.id === itemId) : null;
        if (previousItem?.portadaPath) {
          await deleteObject(ref(storage, previousItem.portadaPath)).catch(() => { });
        }
        payload.portadaUrl = coverUrl;
        payload.portadaPath = "";
      }
    }
    if (itemId) {
      await updateDoc(doc(db, "inventario", itemId), payload);
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "inventario"), payload);
    }
    hideModal(document.querySelector("#admin-item-modal"));
    await loadInventory();
  } catch (error) {
    status.hidden = false;
    status.className = "text-sm text-[#C2413B]";
    status.textContent = `No se pudo guardar: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});
