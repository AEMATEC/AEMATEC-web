// Pizarra de anuncios y pregunta quincenal (pizarra.html y la portada). Todo texto de Firestore se pone con textContent.
// Anuncios: cualquiera propone; se ven cuando la Junta o la moderación los aprueban (colección `anuncios`).
// Pregunta quincenal: la Junta publica config/pregunta; cualquiera responde una vez; las respuestas se ven al cerrar
// (colección `preguntaRespuestas`). Reglas y límites: firestore.rules. Panel de la Junta: assets/js/admin/pizarra.js.
import { db } from "./firebase.js";
import { collection, query, where, getDocs, getDoc, addDoc, setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const el = (etiqueta, clase, texto) => { const e = document.createElement(etiqueta); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };
const TIPOS = { noticia: "Noticia", recordatorio: "Recordatorio", aviso: "Aviso" };
const hoyCR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());
const fechaLarga = d => d.toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" });
const guardar = (clave, valor) => { try { if (valor === undefined) return localStorage.getItem(clave); localStorage.setItem(clave, valor); } catch { return null; } };

function campo(etiqueta, control) {
  const l = el("label", "pz-campo");
  l.append(el("span", "", etiqueta), control);
  return l;
}
function entrada(tipo, atributos = {}) {
  const c = el(tipo === "textarea" ? "textarea" : "input", "pz-control");
  if (tipo !== "textarea") c.type = tipo;
  Object.assign(c, atributos);
  return c;
}
function estado(caja, texto, bien = true) { caja.textContent = texto; caja.className = `pz-estado ${bien ? "pz-estado--bien" : "pz-estado--mal"}`; caja.hidden = !texto; }

// ---------- Anuncios ----------
async function panelAnuncios() {
  const raiz = el("div", "pz-panel");
  const tablero = el("div", "pz-notas");
  raiz.appendChild(tablero);
  try {
    const hoy = hoyCR();
    const docs = (await getDocs(query(collection(db, "anuncios"), where("aprobado", "==", true)))).docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(a => !a.vence || a.vence >= hoy)
      .sort((a, b) => (b.creado?.seconds || 0) - (a.creado?.seconds || 0))
      .slice(0, 30);
    if (!docs.length) tablero.appendChild(el("p", "pz-vacio", "La pizarra está vacía. ¡Sé la primera persona en dejar un anuncio!"));
    docs.forEach((a, i) => {
      const nota = el("article", `pz-nota pz-nota--${TIPOS[a.tipo] ? a.tipo : "aviso"}`);
      nota.style.setProperty("--giro", `${[-1.6, 1.2, -0.8, 1.8, -1.2][i % 5]}deg`);
      nota.append(el("span", "pz-nota__tipo", TIPOS[a.tipo] || "Aviso"), el("h3", "", a.titulo), el("p", "", a.texto));
      const pie = [a.autor, a.creado && fechaLarga(a.creado.toDate())].filter(Boolean).join(" · ");
      if (pie) nota.appendChild(el("p", "pz-nota__pie", pie));
      tablero.appendChild(nota);
    });
  } catch {
    tablero.appendChild(el("p", "pz-vacio", "No se pudieron cargar los anuncios. Intenta de nuevo más tarde."));
  }

  const form = el("form", "pz-form");
  form.appendChild(el("h3", "", "Deja un anuncio"));
  form.appendChild(el("p", "pz-ayuda", "Noticias, recordatorios o avisos para la comunidad. La Junta o la moderación lo revisan antes de publicarlo. No escribas datos personales (correos, teléfonos, carné)."));
  const tipo = el("select", "pz-control");
  Object.entries(TIPOS).forEach(([v, t]) => tipo.add(new Option(t, v)));
  const titulo = entrada("text", { required: true, minLength: 3, maxLength: 80 });
  const texto = entrada("textarea", { required: true, minLength: 3, maxLength: 500, rows: 3 });
  const autor = entrada("text", { maxLength: 40, placeholder: "Opcional" });
  const vence = entrada("date");
  vence.min = hoyCR();
  const boton = el("button", "pz-boton", "Enviar para revisión");
  const aviso = el("p", "pz-estado"); aviso.hidden = true; aviso.setAttribute("role", "status");
  form.append(campo("Tipo", tipo), campo("Título", titulo), campo("Mensaje", texto), campo("Tu nombre", autor), campo("Mostrar hasta (opcional)", vence), boton, aviso);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const ultimo = Number(guardar("pz-ultimo-anuncio")) || 0;
    if (Date.now() - ultimo < 60000) return estado(aviso, "Espera un minuto antes de enviar otro anuncio.", false);
    boton.disabled = true;
    try {
      const datos = { tipo: tipo.value, titulo: titulo.value.trim(), texto: texto.value.trim(), aprobado: false, creado: serverTimestamp() };
      if (autor.value.trim()) datos.autor = autor.value.trim();
      if (vence.value) datos.vence = vence.value;
      await addDoc(collection(db, "anuncios"), datos);
      guardar("pz-ultimo-anuncio", String(Date.now()));
      form.reset();
      estado(aviso, "¡Gracias! Tu anuncio se publicará cuando la Junta o la moderación lo aprueben.");
    } catch {
      estado(aviso, "No se pudo enviar. Revisa los datos e intenta de nuevo.", false);
    }
    boton.disabled = false;
  });
  raiz.appendChild(form);
  return raiz;
}

// ---------- Pregunta quincenal ----------
async function panelPregunta() {
  const raiz = el("div", "pz-panel");
  let p;
  try {
    const snap = await getDoc(doc(db, "config", "pregunta"));
    p = snap.exists() ? snap.data() : null;
  } catch { p = null; }
  if (!p || !p.id || !p.fin || !p.texto) {
    raiz.appendChild(el("p", "pz-vacio", "Todavía no hay pregunta quincenal. ¡Vuelve pronto!"));
    return raiz;
  }
  const fin = p.fin.toDate(), abierta = Date.now() < fin.getTime();
  const caja = el("div", "pz-pregunta");
  caja.append(el("span", "pz-nota__tipo", "Pregunta de la quincena"), el("h3", "", p.texto));
  raiz.appendChild(caja);

  if (abierta) {
    caja.appendChild(el("p", "pz-ayuda", `Puedes responder hasta el ${fechaLarga(fin)}. Las respuestas de todas las personas se mostrarán aquí cuando termine el plazo.`));
    const clave = `pz-respondio-${p.id}`;
    if (guardar(clave)) {
      raiz.appendChild(el("p", "pz-estado pz-estado--bien", "¡Gracias por responder! Vuelve el " + fechaLarga(fin) + " para ver las respuestas."));
      return raiz;
    }
    const form = el("form", "pz-form");
    const texto = entrada("textarea", { required: true, maxLength: 500, rows: 3 });
    const autor = entrada("text", { maxLength: 40, placeholder: "Opcional" });
    const boton = el("button", "pz-boton", "Enviar mi respuesta");
    const aviso = el("p", "pz-estado"); aviso.hidden = true; aviso.setAttribute("role", "status");
    form.append(campo("Tu respuesta", texto), campo("Tu nombre", autor), boton, aviso);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      boton.disabled = true;
      try {
        const azar = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join("");
        const datos = { preguntaId: p.id, texto: texto.value.trim(), creado: serverTimestamp() };
        if (autor.value.trim()) datos.autor = autor.value.trim();
        await setDoc(doc(db, "preguntaRespuestas", `${p.id}_${azar}${Date.now().toString(36)}`), datos);
        guardar(clave, "1");
        form.replaceWith(el("p", "pz-estado pz-estado--bien", "¡Gracias por responder! Vuelve el " + fechaLarga(fin) + " para ver las respuestas."));
      } catch {
        estado(aviso, "No se pudo enviar. Quizás el plazo ya terminó.", false);
        boton.disabled = false;
      }
    });
    raiz.appendChild(form);
    return raiz;
  }

  caja.appendChild(el("p", "pz-ayuda", `El plazo terminó el ${fechaLarga(fin)}. Estas son las respuestas:`));
  const lista = el("div", "pz-notas");
  raiz.appendChild(lista);
  try {
    const docs = (await getDocs(query(collection(db, "preguntaRespuestas"), where("preguntaId", "==", p.id)))).docs.map(d => d.data())
      .sort((a, b) => (a.creado?.seconds || 0) - (b.creado?.seconds || 0));
    if (!docs.length) lista.appendChild(el("p", "pz-vacio", "Nadie respondió esta vez."));
    docs.forEach((r, i) => {
      const nota = el("article", "pz-nota pz-nota--recordatorio");
      nota.style.setProperty("--giro", `${[-1.2, 1.4, -0.6, 1.1][i % 4]}deg`);
      nota.append(el("p", "pz-resp", r.texto), el("p", "pz-nota__pie", r.autor || "Anónimo"));
      lista.appendChild(nota);
    });
  } catch {
    lista.appendChild(el("p", "pz-vacio", "No se pudieron cargar las respuestas."));
  }
  return raiz;
}

// ---------- Montaje ----------
export function montarPizarra(contenedor) {
  contenedor.replaceChildren();
  const tabs = el("div", "pz-tabs");
  tabs.setAttribute("role", "tablist");
  const cuerpo = el("div", "pz-cuerpo");
  const vistas = [["anuncios", "Anuncios", panelAnuncios], ["pregunta", "Pregunta quincenal", panelPregunta]];
  const hechas = {};
  const botones = vistas.map(([id, texto, crear]) => {
    const b = el("button", "pz-tab", texto);
    b.type = "button"; b.setAttribute("role", "tab");
    b.addEventListener("click", async () => {
      botones.forEach(o => o.setAttribute("aria-selected", String(o === b)));
      cuerpo.replaceChildren(el("p", "pz-vacio", "Cargando…"));
      hechas[id] = hechas[id] || await crear();
      cuerpo.replaceChildren(hechas[id]);
    });
    tabs.appendChild(b);
    return b;
  });
  contenedor.append(tabs, cuerpo);
  const inicial = new URLSearchParams(location.search).get("seccion") === "pregunta" ? 1 : 0;
  botones[inicial].click();
}
