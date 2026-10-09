// Lógica que comparten las páginas del Repositorio (portada, recursos docentes y recursos académicos)
// y los buscadores de la portada del sitio. El HTML de las tarjetas NO está aquí: cada página
// conserva su propio diseño.
import { collection, deleteDoc, doc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, db } from "./firebase.js";
import { escapeHtml, safeHttpsUrl } from "./util.js";
import { tieneRol } from "./roles.js";

// Recursos publicados. Con { section: "docentes" | "academico" } pide solo esa sección
// (dos igualdades no necesitan índice compuesto). Sin sección devuelve todos los publicados.
// Las reglas de Firestore solo dejan leer los publicados, así que el filtro es obligatorio.
export async function cargarPublicados({ section } = {}) {
  const filtros = [where("published", "==", true)];
  if (section) filtros.push(where("section", "==", section));
  const snapshot = await getDocs(query(collection(db, "resources"), ...filtros));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

// Avisa cada vez que cambia la sesión si la persona es moderadora (para mostrar editar y eliminar), y
// dibuja la barra "Sesión de moderación" en `barra` (si se pasa). La sesión se inicia en
// repositorio-moderacion.html. Solo decide qué se muestra: los permisos reales los aplican las reglas.
export async function alCambiarModeracion(callback, barra) {
  const { getAuth, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  const auth = getAuth(app);
  onAuthStateChanged(auth, async user => {
    const moderador = await tieneRol(user, "moderators");
    if (barra) {
      barra.hidden = !moderador;
      barra.innerHTML = moderador ? `<i class="fa-solid fa-circle-check text-[#63E0E1]"></i><span>Sesión de moderación · ${escapeHtml(user.email)}</span>
        <a href="repositorio-moderacion.html" class="font-bold text-white underline">Pendientes</a>
        <button type="button" data-salir-moderacion class="font-bold text-white underline">Salir</button>` : "";
      barra.querySelector("[data-salir-moderacion]")?.addEventListener("click", () => signOut(auth));
    }
    callback(moderador, user);
  });
}

// Botones de moderador para la tarjeta de un recurso (editar abre repositorio-moderacion.html?edit=<id>).
export const botonesModeracion = (resource, clase) => `<a href="repositorio-moderacion.html?edit=${encodeURIComponent(resource.id)}" class="${clase}" title="Editar (moderación)" aria-label="Editar (moderación)"><i class="fa-solid fa-pen"></i></a><button type="button" data-delete-resource="${escapeHtml(resource.id)}" class="${clase} text-[#C2413B]" title="Eliminar (moderación)" aria-label="Eliminar (moderación)"><i class="fa-solid fa-trash"></i></button>`;

// Las rutas de los archivos las escribe quien propone el material, así que no se confía en ellas: solo se borra
// un archivo de la carpeta de recursos y si ningún otro material lo usa (evita que una propuesta falsa que
// apunte al archivo de un material bueno lo haga borrar).
async function borrarArchivosDe(resource) {
  const { getStorage, ref, deleteObject } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js");
  const storage = getStorage(app);
  const rutas = [resource.storagePath, resource.explanation?.storagePath]
    .filter(ruta => typeof ruta === "string" && /^recursos\/(docentes|academico)\/[a-f0-9-]+(-explicacion)?\.[a-z]+$/.test(ruta));
  const noBorrados = [];
  for (const ruta of rutas) {
    try {
      const [comoArchivo, comoExplicacion] = await Promise.all([
        getDocs(query(collection(db, "resources"), where("storagePath", "==", ruta))),
        getDocs(query(collection(db, "resources"), where("explanation.storagePath", "==", ruta)))
      ]);
      if (comoArchivo.empty && comoExplicacion.empty) await deleteObject(ref(storage, ruta));
      else noBorrados.push(ruta);
    } catch (error) {
      if (error.code !== "storage/object-not-found") noBorrados.push(ruta);
    }
  }
  if (noBorrados.length) console.warn("Archivos que no se borraron (en uso o con error):", noBorrados);
}

// Elimina un material y su archivo (solo moderación; lo exigen firestore.rules y storage.rules).
// Primero el documento: si algo falla después, queda a lo sumo un archivo sin usar, nunca un material
// publicado cuyo archivo ya no existe.
export async function eliminarRecurso(id, resource) {
  await deleteDoc(doc(db, "resources", id));
  await borrarArchivosDe(resource);
}

// Ícono de Font Awesome según la extensión del archivo (sin la clase de estilo).
export const iconFor = extension => extension === "pdf" ? "fa-file-pdf" : extension === "pptx" ? "fa-file-powerpoint" : extension === "docx" ? "fa-file-word" : extension === "ggb" ? "fa-shapes" : "fa-file-lines";

// Clases completas del ícono: "fa-shapes" solo existe en el estilo sólido.
export const claseIcono = extension => `${extension === "ggb" ? "fa-solid" : "fa-regular"} ${iconFor(extension)}`;

export const formatDate = timestamp => timestamp?.seconds ? new Date(timestamp.seconds * 1000).toLocaleDateString("es-CR") : "No indicada";
export const formatSize = bytes => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "No indicado";

// Enlace del archivo de un recurso: solo https (viene de datos), si no, "#".
export const enlaceArchivo = resource => safeHttpsUrl(resource?.fileUrl) || "#";

// Botones de paginación (anterior, 1, 2, …, última, siguiente). `atributo` es el data-* que lleva
// el número de página en cada botón, para que la página los enganche con querySelectorAll.
export function botonesPaginacion(pagina, totalPaginas, atributo = "data-page") {
  if (totalPaginas <= 1) return "";
  const botones = [`<button type="button" ${atributo}="${Math.max(1, pagina - 1)}" aria-label="Página anterior" class="w-10 h-10 border border-[#CBD9DF] rounded-[8px] bg-white flex items-center justify-center"><i class="fa-solid fa-chevron-left text-xs"></i></button>`];
  const paginas = totalPaginas <= 3 ? Array.from({ length: totalPaginas }, (_, indice) => indice + 1) : [1, 2, totalPaginas];
  paginas.forEach((numero, indice) => {
    if (indice && numero - paginas[indice - 1] > 1) botones.push('<span class="px-1 text-[#566B78]">...</span>');
    botones.push(`<button type="button" ${atributo}="${numero}" class="w-10 h-10 rounded-[8px] ${pagina === numero ? "bg-[#0D2B45] text-white" : "bg-white border border-[#CBD9DF]"}">${numero}</button>`);
  });
  botones.push(`<button type="button" ${atributo}="${Math.min(totalPaginas, pagina + 1)}" aria-label="Página siguiente" class="w-10 h-10 border border-[#CBD9DF] rounded-[8px] bg-white flex items-center justify-center"><i class="fa-solid fa-chevron-right text-xs"></i></button>`);
  return botones.join("");
}

// Explicación de un recurso (opcional): `explanation` es null o { storagePath, fileUrl, extension, size }
// (archivo subido) y `explanationUrl` es '' o un enlace. Devuelve { href, descarga, etiqueta, icono } o
// null si no hay nada que mostrar. Los enlaces se validan como https (vienen de datos).
export function enlaceExplicacion(resource) {
  const archivo = safeHttpsUrl(resource?.explanation?.fileUrl);
  if (archivo) return { href: archivo, descarga: true, etiqueta: "Descargar explicación", icono: claseIcono(resource.explanation.extension) };
  const enlace = safeHttpsUrl(resource?.explanationUrl);
  if (enlace) return { href: enlace, descarga: false, etiqueta: "Ver explicación", icono: "fa-solid fa-arrow-up-right-from-square" };
  return null;
}

// Bloque "Explicación" para la ventana de detalle de un recurso; "" si no hay explicación.
// `claseEnlace` son las clases del enlace, para que coincida con los botones de cada página.
export function htmlExplicacion(resource, claseEnlace) {
  const explicacion = enlaceExplicacion(resource);
  if (!explicacion) return "";
  const atributos = explicacion.descarga ? "download" : 'target="_blank" rel="noopener"';
  return `<p class="font-sans text-xs font-bold uppercase text-[#566B78]">Explicación</p>
    <a href="${escapeHtml(explicacion.href)}" ${atributos} class="mt-2 ${claseEnlace}"><i class="${explicacion.icono} mr-2"></i>${explicacion.etiqueta}</a>`;
}
