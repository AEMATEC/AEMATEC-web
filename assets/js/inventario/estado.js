// Estado y utilidades compartidas del Inventario (inventario.html). Los demás módulos de esta carpeta
// importan de aquí; las variables que cambian viven en el objeto `inv` porque un módulo no puede
// reasignar lo que importa de otro.
import { app } from "../firebase.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const formatDate = timestamp => timestamp?.seconds ? new Date(timestamp.seconds * 1000).toLocaleDateString("es-CR") : "No indicada";

export const TIPO_LABELS = { institucional: "Activo institucional", aematec: "Activo AEMATEC", biblioteca: "Libro", consumible: "Consumible" };
export const TIPO_ICON = { institucional: "fa-building", aematec: "fa-toolbox", consumible: "fa-box-open" };
export const FILTER_CONFIG = {
  institucional: { categoria: false, estado: true, ubicacion: true, disponible: false, bajoStock: false },
  aematec: { categoria: true, estado: true, ubicacion: true, disponible: false, bajoStock: false },
  biblioteca: { categoria: true, estado: false, ubicacion: false, disponible: true, bajoStock: false },
  consumible: { categoria: true, estado: false, ubicacion: true, disponible: false, bajoStock: true }
};
export const PAGE_SIZE = { institucional: 8, aematec: 8, biblioteca: 16, consumible: 8 };

// Sugerencias de los formularios de la Junta. Se suman a los valores que ya existen en el inventario.
export const SUGERENCIAS = {
  categoria: {
    aematec: ["Equipo tecnológico", "Mobiliario", "Electrodoméstico", "Material didáctico", "Decoración", "Herramientas", "Cocina", "Juegos", "Limpieza", "Otro"],
    biblioteca: window.InventarioCategorias.CANONICAS,
    consumible: ["Cocina", "Limpieza", "Oficina", "Otro"]
  },
  estado: ["Excelente", "Bueno", "Regular", "Malo", "En reparación", "Falta comprobar", "Extraviado", "Regalado", "Vendido", "Dado de baja"],
  ubicacion: ["Escritorio", "Biblioteca", "Librería", "Estantería", "Gabinete 1", "Gabinete 2", "Gabinete 3", "Gabinete 4", "Mueble refrigeradora"]
};
// Estado con el que entra un bien duplicado, hasta que la Junta lo revise en físico.
export const ESTADO_POR_REVISAR = "Falta comprobar";
export const Codigos = window.InventarioCodigos;
export const Categorias = window.InventarioCategorias;
export const MAX_CATEGORIAS_LIBRO = Categorias.MAX_CATEGORIAS;
// Permite enlazar directo a una división desde afuera, p. ej. inventario.html?tipo=biblioteca
export const TIPOS_VALIDOS = ["institucional", "aematec", "biblioteca", "consumible"];
const tipoPedido = new URLSearchParams(location.search).get("tipo");

export const inv = {
  itemsByTipo: { institucional: [], aematec: [], biblioteca: [], consumible: [] },
  activeTab: TIPOS_VALIDOS.includes(tipoPedido) ? tipoPedido : "institucional",
  page: 1,
  isJunta: false,
  currentItem: null,
  solicitudes: [],
  loanAdminFilter: "pendiente"
};

export function showModal(modal) {
  modal.classList.add("is-open");
  document.body.classList.add("overflow-hidden");
}
export function hideModal(modal) {
  modal.classList.remove("is-open");
  document.body.classList.remove("overflow-hidden");
}

export const allItems = () => Object.values(inv.itemsByTipo).flat();

// Los libros guardan varias categorías en `categorias` (lista) y se muestran con los nombres unificados
// de assets/js/inventario-categorias.js. Los que aún no se migran tienen `categoria` como texto,
// a veces con varias separadas por "/" (ver scripts/categorias/migrar.js).
export function categoriasDe(item) {
  if (item.tipo === "biblioteca") return Categorias.categoriasDeLibro(item);
  return String(item.categoria || "").split("/").map(value => value.trim()).filter(Boolean);
}

export function uniqueValues(list, field) {
  const values = field === "categoria"
    ? list.flatMap(categoriasDe)
    : list.flatMap(item => field === "ubicacion" || field === "estado"
      ? [item[field], ...(item.ejemplares || []).map(exemplar => exemplar[field])]
      : [item[field]]);
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}
