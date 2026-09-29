// Asistente básico del sitio: ayuda a encontrar páginas y deja reportar un problema.
// Lo carga assets/js/layout.js en todas las páginas que usan el encabezado común
// (no en arcade.html, que no usa layout.js). Es un módulo porque escribe en Firestore.
import { SITE_PAGES } from "./site-pages.js";
import { escapeHtml } from "./util.js";
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function buscarPaginas(textoBuscado) {
  const normalizado = textoBuscado.trim().toLocaleLowerCase("es");
  if (!normalizado) return [];
  return SITE_PAGES
    .filter(pagina => `${pagina.title} ${pagina.desc} ${pagina.kw}`.toLocaleLowerCase("es").includes(normalizado))
    .slice(0, 4);
}

function crearWidget() {
  const wrap = document.createElement("div");
  wrap.className = "chatbot-wrap";
  wrap.innerHTML = `
    <button type="button" class="chatbot-fab" aria-label="Abrir el asistente de AEMATEC" aria-expanded="false">
      <i class="fa-solid fa-comment-dots" aria-hidden="true"></i>
    </button>
    <section class="chatbot-panel" hidden role="dialog" aria-label="Asistente de AEMATEC">
      <header class="chatbot-header">
        <span>Asistente AEMATEC</span>
        <button type="button" class="chatbot-close" aria-label="Cerrar asistente"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <div class="chatbot-body">
        <div class="chatbot-view" data-view="buscar">
          <p class="chatbot-msg">¿Qué estás buscando? Escribe una palabra como "inventario", "préstamos" o "exámenes".</p>
          <form class="chatbot-search-form">
            <input type="text" class="chatbot-input" placeholder="Ej: inventario" aria-label="Buscar en el sitio">
            <button type="submit" class="chatbot-btn">Buscar</button>
          </form>
          <div class="chatbot-results" aria-live="polite"></div>
          <button type="button" class="chatbot-link chatbot-ir-reportar">¿Encontraste un error? Repórtalo aquí</button>
        </div>
        <div class="chatbot-view" data-view="reportar" hidden>
          <p class="chatbot-msg">Cuéntanos qué pasó. Si nos dejas tu correo, podemos responderte.</p>
          <form class="chatbot-report-form">
            <textarea class="chatbot-textarea" placeholder="Ej: al iniciar sesión me sale un error..." aria-label="Describe el problema" required maxlength="600" rows="3"></textarea>
            <input type="email" class="chatbot-input" placeholder="Tu correo (opcional)" aria-label="Tu correo (opcional)" maxlength="160">
            <div class="chatbot-form-actions">
              <button type="button" class="chatbot-link chatbot-ir-buscar">Volver</button>
              <button type="submit" class="chatbot-btn">Enviar reporte</button>
            </div>
          </form>
          <p class="chatbot-confirmacion" hidden>¡Gracias! Le avisamos a los moderadores.</p>
          <button type="button" class="chatbot-link chatbot-volver-tras-reporte" hidden>Volver a buscar</button>
        </div>
      </div>
    </section>`;
  document.body.appendChild(wrap);
  return wrap;
}

function iniciarWidget() {
  const wrap = crearWidget();
  const fab = wrap.querySelector(".chatbot-fab");
  const panel = wrap.querySelector(".chatbot-panel");
  const vistas = { buscar: wrap.querySelector('[data-view="buscar"]'), reportar: wrap.querySelector('[data-view="reportar"]') };
  const resultados = wrap.querySelector(".chatbot-results");
  let abierto = false;

  const mostrarVista = nombre => {
    for (const [id, el] of Object.entries(vistas)) el.hidden = id !== nombre;
  };

  const alternarPanel = abrir => {
    abierto = abrir;
    panel.hidden = !abrir;
    fab.setAttribute("aria-expanded", String(abrir));
    if (abrir) wrap.querySelector('.chatbot-view:not([hidden]) input, .chatbot-view:not([hidden]) textarea')?.focus();
  };

  const formReporte = wrap.querySelector(".chatbot-report-form");
  const confirmacion = wrap.querySelector(".chatbot-confirmacion");
  const volverTrasReporte = wrap.querySelector(".chatbot-volver-tras-reporte");
  const reiniciarVistaReportar = () => {
    formReporte.reset();
    formReporte.hidden = false;
    confirmacion.hidden = true;
    volverTrasReporte.hidden = true;
  };

  fab.addEventListener("click", () => alternarPanel(!abierto));
  wrap.querySelector(".chatbot-close").addEventListener("click", () => alternarPanel(false));
  wrap.querySelector(".chatbot-ir-reportar").addEventListener("click", () => { reiniciarVistaReportar(); mostrarVista("reportar"); });
  wrap.querySelector(".chatbot-ir-buscar").addEventListener("click", () => mostrarVista("buscar"));
  volverTrasReporte.addEventListener("click", () => { reiniciarVistaReportar(); mostrarVista("buscar"); });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && abierto) alternarPanel(false);
  });

  wrap.querySelector(".chatbot-search-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = event.target.querySelector("input");
    const coincidencias = buscarPaginas(input.value);
    resultados.innerHTML = coincidencias.length
      ? coincidencias.map(pagina => `<a class="chatbot-result" href="${escapeHtml(pagina.href)}"><strong>${escapeHtml(pagina.title)}</strong><span>${escapeHtml(pagina.desc)}</span></a>`).join("")
      : '<p class="chatbot-msg">No encontré nada con esa palabra. Prueba con otra, o revisa el menú de arriba.</p>';
  });

  wrap.querySelector(".chatbot-report-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const mensaje = form.querySelector("textarea").value.trim();
    const contacto = form.querySelector('input[type="email"]').value.trim();
    if (!mensaje) return;
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await addDoc(collection(db, "chatbotReportes"), {
        mensaje: mensaje.slice(0, 600),
        contacto: contacto.slice(0, 160),
        pagina: (location.pathname.split("/").pop() || "index.html").slice(0, 200),
        createdAt: serverTimestamp()
      });
      form.hidden = true;
      confirmacion.hidden = false;
      volverTrasReporte.hidden = false;
    } catch (error) {
      console.error("No se pudo enviar el reporte del chatbot:", error);
      window.alert("No se pudo enviar el reporte. Intenta de nuevo en unos minutos.");
    } finally {
      boton.disabled = false;
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarWidget);
else iniciarWidget();
