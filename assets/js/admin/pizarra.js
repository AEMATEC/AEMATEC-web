// Pizarra y pregunta quincenal, lado de la Junta y la moderación.
// - Anuncios (colección `anuncios`): aprobar, publicar directo o eliminar. Junta y moderación.
// - Pregunta quincenal (config/pregunta + `preguntaRespuestas`): solo la Junta. Al publicar una pregunta nueva se
//   borran las respuestas anteriores. Reglas: firestore.rules.
import { db } from "../firebase.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, where, Timestamp, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHtml } from "../util.js";

const $ = selector => document.querySelector(selector);
const TIPOS = { noticia: "Noticia", recordatorio: "Recordatorio", aviso: "Aviso" };
const fecha = d => d.toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" });

export function iniciarPizarra({ junta }) {
  const estado = $("#pz-estado-admin");
  const avisar = (texto, bien = true) => { estado.textContent = texto; estado.className = `mt-3 text-sm ${bien ? "text-[#00798A]" : "text-[#C2413B]"}`; estado.hidden = false; };

  // ----- Anuncios -----
  const pendientes = $("#pz-pendientes"), publicados = $("#pz-publicados");
  const fila = (a, aprobado) => `<li class="flex flex-wrap items-start justify-between gap-2 py-3">
      <span class="max-w-[640px]"><strong class="font-sans text-sm">${escapeHtml(a.titulo)}</strong>
        <span class="ml-2 rounded-full bg-[#EEF4F6] px-2 py-0.5 font-sans text-[11px] font-bold text-[#405769]">${escapeHtml(TIPOS[a.tipo] || a.tipo)}</span>
        <span class="block text-sm text-[#405769]">${escapeHtml(a.texto)}</span>
        <span class="block text-xs text-[#607480]">${escapeHtml([a.autor, a.vence && `hasta ${a.vence}`].filter(Boolean).join(" · ") || "Sin nombre")}</span></span>
      <span class="flex gap-4">
        ${aprobado ? "" : `<button data-accion="aprobar" data-id="${escapeHtml(a.id)}" class="font-sans text-xs font-bold text-[#00798A] underline">Aprobar</button>`}
        <button data-accion="borrar" data-id="${escapeHtml(a.id)}" class="font-sans text-xs font-bold text-[#C2413B] underline">Eliminar</button></span></li>`;
  async function cargarAnuncios() {
    const todos = (await getDocs(collection(db, "anuncios"))).docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.creado?.seconds || 0) - (a.creado?.seconds || 0));
    const pend = todos.filter(a => !a.aprobado), ok = todos.filter(a => a.aprobado);
    pendientes.innerHTML = pend.length ? pend.map(a => fila(a, false)).join("") : '<li class="py-3 text-sm text-[#607480]">No hay anuncios esperando revisión.</li>';
    publicados.innerHTML = ok.length ? ok.map(a => fila(a, true)).join("") : '<li class="py-3 text-sm text-[#607480]">Todavía no hay anuncios publicados.</li>';
  }
  $("#pizarra").addEventListener("click", async event => {
    const boton = event.target.closest("button[data-accion]");
    if (!boton) return;
    const ref = doc(db, "anuncios", boton.dataset.id);
    try {
      if (boton.dataset.accion === "aprobar") { await updateDoc(ref, { aprobado: true }); avisar("Aprobado: ya se ve en la pizarra."); }
      else if (boton.dataset.accion === "borrar") {
        if (!confirm("¿Eliminar este anuncio? No se puede deshacer.")) return;
        await deleteDoc(ref); avisar("Eliminado.");
      } else return;
      await cargarAnuncios();
    } catch { avisar("No se pudo hacer el cambio.", false); }
  });
  $("#pz-form-anuncio").addEventListener("submit", async event => {
    event.preventDefault();
    const f = event.target.elements;
    try {
      const datos = { tipo: f.tipo.value, titulo: f.titulo.value.trim(), texto: f.texto.value.trim(), aprobado: true, creado: serverTimestamp() };
      if (f.vence.value) datos.vence = f.vence.value;
      await addDoc(collection(db, "anuncios"), datos);
      event.target.reset();
      avisar("Publicado en la pizarra.");
      await cargarAnuncios();
    } catch { avisar("No se pudo publicar. Revisa el título (3 a 80 letras) y el mensaje (3 a 500).", false); }
  });
  cargarAnuncios().catch(() => { pendientes.innerHTML = '<li class="py-3 text-sm text-[#C2413B]">No se pudieron leer los anuncios.</li>'; });

  // ----- Pregunta quincenal (solo la Junta) -----
  const bloque = $("#pz-bloque-pregunta");
  bloque.hidden = !junta;
  if (!junta) return;
  const actual = $("#pz-pregunta-actual"), respuestas = $("#pz-respuestas");
  async function cargarPregunta() {
    const snap = await getDoc(doc(db, "config", "pregunta"));
    if (!snap.exists()) { actual.textContent = "Todavía no hay pregunta publicada."; respuestas.innerHTML = ""; return; }
    const p = snap.data(), fin = p.fin.toDate(), abierta = Date.now() < fin.getTime();
    actual.textContent = `«${p.texto}» · ${abierta ? `abierta hasta el ${fecha(fin)}` : `cerró el ${fecha(fin)}`}`;
    const lista = (await getDocs(query(collection(db, "preguntaRespuestas"), where("preguntaId", "==", p.id)))).docs.map(d => d.data());
    respuestas.innerHTML = `<p class="mt-3 font-sans text-sm font-bold">${lista.length} respuesta(s)${abierta ? " (el público las verá al cerrar el plazo)" : ""}</p>` +
      `<ul class="mt-1 divide-y divide-[#E2E9EC]">${lista.map(r => `<li class="py-2 text-sm">${escapeHtml(r.texto)} <span class="text-xs text-[#607480]">— ${escapeHtml(r.autor || "Anónimo")}</span></li>`).join("")}</ul>`;
  }
  $("#pz-form-pregunta").addEventListener("submit", async event => {
    event.preventDefault();
    const f = event.target.elements, texto = f.texto.value.trim(), dias = Number(f.dias.value) || 15;
    if (texto.length < 5) return avisar("Escribe la pregunta (al menos 5 letras).", false);
    if (!confirm("Al publicar una pregunta nueva se BORRAN todas las respuestas de la anterior. ¿Continuar?")) return;
    try {
      // 1) borrar las respuestas anteriores; 2) publicar la pregunta nueva
      const viejas = (await getDocs(collection(db, "preguntaRespuestas"))).docs;
      for (let i = 0; i < viejas.length; i += 400) {
        const lote = writeBatch(db);
        viejas.slice(i, i + 400).forEach(d => lote.delete(d.ref));
        await lote.commit();
      }
      const ahora = Date.now();
      await setDoc(doc(db, "config", "pregunta"), { id: `q${ahora.toString(36)}`, texto, inicio: Timestamp.fromMillis(ahora), fin: Timestamp.fromMillis(ahora + dias * 86400000) });
      event.target.reset(); f.dias.value = 15;
      avisar(`Pregunta publicada. Se recibirán respuestas durante ${dias} días y se mostrarán al terminar.`);
      await cargarPregunta();
    } catch { avisar("No se pudo publicar la pregunta. Solo la Junta Directiva puede hacerlo.", false); }
  });
  cargarPregunta().catch(() => { actual.textContent = "No se pudo leer la pregunta."; });
}
