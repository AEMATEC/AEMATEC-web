// Calendario de efemérides: la Junta y la moderación agregan, cambian, ocultan o borran fechas, y cargan de una vez
// el calendario del MEP o del TEC de un año nuevo pegando una lista. Se guarda en la colección `efemerides`
// (firestore.rules, match /efemerides), que efemerides.html lee sin iniciar sesión. Datos de fábrica y lector de
// listas: assets/js/efemerides-datos.js (lo carga admin.html como script normal).
import { db } from "../firebase.js";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHtml } from "../util.js";

const $ = selector => document.querySelector(selector);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corta = f => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`;
const rango = e => (e.desde === e.hasta ? corta(e.desde) : `${corta(e.desde)} → ${corta(e.hasta)}`);

export function iniciarEfemerides() {
  const D = window.aematecEfemerides;
  if (!D) return;
  const anioInput = $("#ef-anio"), tipoSelect = $("#ef-tipo-filtro"), lista = $("#ef-lista");
  const form = $("#ef-form"), estado = $("#ef-estado"), importar = $("#ef-importar");
  let docs = [];

  const avisar = (texto, bien = true) => {
    estado.textContent = texto;
    estado.className = `mt-3 text-sm ${bien ? "text-[#00798A]" : "text-[#C2413B]"}`;
    estado.hidden = false;
  };
  const hoy = new Date().getFullYear();
  anioInput.value = hoy;
  const opcionesTipo = Object.entries(D.TIPOS).map(([id, t]) => `<option value="${id}">${escapeHtml(t.nombre)}</option>`).join("");
  tipoSelect.innerHTML = `<option value="">Todos los tipos</option>${opcionesTipo}`;
  $("#ef-tipo").innerHTML = opcionesTipo;
  $("#ef-imp-tipo").innerHTML = opcionesTipo;
  $("#ef-imp-tipo").value = "mep";

  async function cargar() {
    docs = (await getDocs(collection(db, "efemerides"))).docs.map(d => ({ id: d.id, ...d.data() }));
    dibujar();
  }

  function dibujar() {
    const anio = Number(anioInput.value) || hoy;
    const tipo = tipoSelect.value;
    const deFabrica = new Set(D.fabrica(anio).map(e => e.id));
    const propios = new Map(docs.map(d => [d.id, d]));
    const filas = D.delAnio(anio, docs).filter(e => !tipo || e.tipo === tipo);
    // Las de fábrica que se ocultaron ya no salen en delAnio: se agregan aparte para poder restaurarlas.
    const ocultas = docs.filter(d => d.oculta && deFabrica.has(d.id)).map(d => D.fabrica(anio).find(e => e.id === d.id)).filter(e => e && (!tipo || e.tipo === tipo));
    if (!filas.length && !ocultas.length) {
      lista.innerHTML = '<li class="py-4 text-sm text-[#607480]">No hay fechas de este tipo en este año. Agrega una o pega una lista más abajo.</li>';
      return;
    }
    const fila = (e, oculta) => {
      const propio = propios.get(e.id);
      const origen = oculta ? "Oculta" : propio ? (deFabrica.has(e.id) ? "Cambiada" : "Agregada") : "De fábrica";
      const botones = oculta
        ? `<button data-accion="restaurar" data-id="${escapeHtml(e.id)}" class="font-sans text-xs font-bold text-[#00798A] underline">Volver a mostrar</button>`
        : `<button data-accion="editar" data-id="${escapeHtml(e.id)}" class="font-sans text-xs font-bold text-[#00798A] underline">Editar</button>
           ${propio && deFabrica.has(e.id)
             ? `<button data-accion="restaurar" data-id="${escapeHtml(e.id)}" class="font-sans text-xs font-bold text-[#00798A] underline">Volver al original</button>`
             : propio
               ? `<button data-accion="borrar" data-id="${escapeHtml(e.id)}" class="font-sans text-xs font-bold text-[#C2413B] underline">Eliminar</button>`
               : `<button data-accion="ocultar" data-id="${escapeHtml(e.id)}" class="font-sans text-xs font-bold text-[#C2413B] underline">Ocultar</button>`}`;
      return `<li class="flex flex-wrap items-center justify-between gap-2 py-3 ${oculta ? "opacity-60" : ""}">
        <span><strong class="font-sans text-sm">${escapeHtml(e.titulo)}</strong>
          <span class="ml-2 rounded-full bg-[#EEF4F6] px-2 py-0.5 font-sans text-[11px] font-bold text-[#405769]">${escapeHtml(D.TIPOS[e.tipo].nombre)}</span>
          <span class="ml-1 font-sans text-[11px] text-[#607480]">${origen}${e.anual ? " · cada año" : ""}</span>
          <span class="block text-sm text-[#607480]">${escapeHtml(rango(e))}</span></span>
        <span class="flex gap-4">${botones}</span></li>`;
    };
    lista.innerHTML = filas.map(e => fila(e, false)).join("") + ocultas.map(e => fila(e, true)).join("");
  }

  // ----- Formulario (agregar / editar) -----
  const campos = { id: $("#ef-id"), tipo: $("#ef-tipo"), titulo: $("#ef-titulo-campo"), desde: $("#ef-desde"), hasta: $("#ef-hasta"), anual: $("#ef-anual"), desc: $("#ef-desc") };
  const limpiar = () => { form.reset(); campos.id.value = ""; $("#ef-form-titulo").textContent = "Agregar una fecha"; $("#ef-cancelar").hidden = true; actualizarAnual(); };
  const actualizarAnual = () => {
    const unDia = !campos.hasta.value || campos.hasta.value === campos.desde.value;
    campos.anual.disabled = !unDia;
    if (!unDia) campos.anual.checked = false;
  };
  campos.desde.addEventListener("input", actualizarAnual);
  campos.hasta.addEventListener("input", actualizarAnual);
  $("#ef-cancelar").addEventListener("click", limpiar);

  function paraEditar(id) {
    const anio = Number(anioInput.value) || hoy;
    const e = D.delAnio(anio, docs).find(x => x.id === id);
    if (!e) return;
    campos.id.value = e.id; campos.tipo.value = e.tipo; campos.titulo.value = e.titulo; campos.desde.value = e.desde;
    campos.hasta.value = e.hasta; campos.anual.checked = Boolean(e.anual); campos.desc.value = e.desc || "";
    actualizarAnual();
    $("#ef-form-titulo").textContent = "Editar la fecha";
    $("#ef-cancelar").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const datosDe = c => ({
    tipo: c.tipo, titulo: c.titulo.trim(), desc: c.desc.trim(), desde: c.desde, hasta: c.hasta || c.desde,
    ...(c.anual ? { anual: true } : {}), ...(c.tema ? { tema: c.tema } : {}), actualizado: serverTimestamp()
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const dato = datosDe({ tipo: campos.tipo.value, titulo: campos.titulo.value, desc: campos.desc.value, desde: campos.desde.value, hasta: campos.hasta.value, anual: campos.anual.checked });
    if (dato.titulo.length < 3) return avisar("Escribe un título de al menos 3 letras.", false);
    if (dato.hasta < dato.desde) return avisar("La fecha final no puede ser antes de la inicial.", false);
    const existente = campos.id.value && D.delAnio(Number(anioInput.value) || hoy, docs).find(e => e.id === campos.id.value);
    if (existente && existente.tema) dato.tema = existente.tema;
    try {
      const referencia = campos.id.value ? doc(db, "efemerides", campos.id.value) : doc(collection(db, "efemerides"));
      await setDoc(referencia, dato);
      avisar("Guardado. Ya se ve en el calendario público.");
      limpiar();
      await cargar();
    } catch {
      avisar("No se pudo guardar. Revisa los datos y que tu cuenta sea de la Junta o de moderación.", false);
    }
  });

  lista.addEventListener("click", async event => {
    const boton = event.target.closest("button[data-accion]");
    if (!boton) return;
    const { accion, id } = boton.dataset;
    if (accion === "editar") return paraEditar(id);
    try {
      if (accion === "ocultar") {
        await setDoc(doc(db, "efemerides", id), { oculta: true, actualizado: serverTimestamp() });
        avisar("Oculta. Puedes volver a mostrarla desde esta lista.");
      } else if (accion === "restaurar") {
        await deleteDoc(doc(db, "efemerides", id));
        avisar("Listo, volvió a como estaba de fábrica.");
      } else if (accion === "borrar") {
        if (!confirm("¿Eliminar esta fecha del calendario? No se puede deshacer.")) return;
        await deleteDoc(doc(db, "efemerides", id));
        avisar("Eliminada.");
      }
      await cargar();
    } catch {
      avisar("No se pudo hacer el cambio. Solo la Junta y la moderación pueden editar el calendario.", false);
    }
  });

  anioInput.addEventListener("input", dibujar);
  tipoSelect.addEventListener("change", dibujar);

  // ----- Pegar una lista (calendario MEP o TEC de un año) -----
  const vista = $("#ef-imp-vista");
  let pendientes = [];
  function revisar() {
    const anio = Number(anioInput.value) || hoy;
    const { items, errores } = D.leerLineas(importar.value, anio);
    const tipo = $("#ef-imp-tipo").value;
    pendientes = items.map(e => ({ ...e, tipo }));
    vista.innerHTML = (pendientes.length
      ? `<p class="font-sans text-sm font-bold">Se van a guardar ${pendientes.length} fechas:</p><ul class="mt-1 text-sm text-[#405769]">${pendientes.map(e => `<li>${escapeHtml(rango(e))} — ${escapeHtml(e.titulo)}</li>`).join("")}</ul>`
      : "") + errores.map(e => `<p class="mt-1 text-sm text-[#C2413B]">Línea ${e.linea}: ${escapeHtml(e.motivo)}</p>`).join("");
    $("#ef-imp-guardar").disabled = !pendientes.length || errores.length > 0;
  }
  importar.addEventListener("input", revisar);
  $("#ef-imp-tipo").addEventListener("change", revisar);
  anioInput.addEventListener("input", revisar);
  $("#ef-imp-guardar").addEventListener("click", async () => {
    revisar();
    if (!pendientes.length) return;
    try {
      // Cada fecha lleva un id que sale de su tipo, fecha y título: pegar la misma lista otra vez la actualiza, no la duplica.
      for (let i = 0; i < pendientes.length; i += 400) {
        const lote = writeBatch(db);
        pendientes.slice(i, i + 400).forEach(e => lote.set(doc(db, "efemerides", D.idImportado(e.tipo, e)), datosDe(e)));
        await lote.commit();
      }
      avisar(`Listo: ${pendientes.length} fechas guardadas.`);
      importar.value = "";
      revisar();
      await cargar();
    } catch {
      avisar("No se pudo guardar la lista. Revisa que cada título tenga entre 3 y 120 letras.", false);
    }
  });

  cargar().catch(() => { lista.innerHTML = '<li class="py-4 text-sm text-[#C2413B]">No se pudo leer el calendario.</li>'; });
}
