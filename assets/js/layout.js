// Encabezado, sub-navegación y pie de página comunes del sitio AEMATEC.
//
// Uso en cada página (script normal, no módulo, para que se dibuje sin parpadeo):
//   <script src="assets/js/layout.js" data-part="header" data-active="repositorio" data-sub="docentes"></script>
//   ...contenido...
//   <script src="assets/js/layout.js" data-part="footer"></script>
//
// data-active: inicio | repositorio | inventario | junta | tramites
// data-sub (solo Repositorio): inicio | docentes | academicos | subir
// Para agregar o renombrar una página del menú, edita solo las listas de abajo.
(() => {
  const script = document.currentScript;
  const { part, active = "", sub = "" } = script.dataset;

  const MENU = [
    { id: "inicio", label: "Inicio", href: "index.html" },
    { id: "repositorio", label: "Repositorio", href: "repositorio.html" },
    { id: "inventario", label: "Inventario", href: "inventario.html" },
    { id: "junta", label: "Junta Directiva", href: "junta-directiva.html" },
    { id: "tramites", label: "Trámites", href: "tramites.html", icon: "fa-file-signature", cta: true }
  ];

  const SUBMENUS = {
    repositorio: {
      title: "Repositorio",
      items: [
        { id: "inicio", label: "Inicio", href: "repositorio.html" },
        { id: "docentes", label: "Recursos docentes", href: "repositorio-docentes.html" },
        { id: "academicos", label: "Recursos académicos", href: "repositorio-academicos.html" },
        { spacer: true },
        { id: "subir", label: "Subir material", href: "repositorio-subir.html", icon: "fa-arrow-up-from-bracket", cta: true },
        { id: "moderacion", label: "Moderación", href: "admin.html#moderacion", icon: "fa-user-shield" }
      ]
    }
  };

  const link = (item, current, ctaClass) => {
    const classes = item.cta ? ` class="${ctaClass}"` : "";
    const aria = item.id === current ? ' aria-current="page"' : "";
    const icon = item.icon ? `<i class="fa-solid ${item.icon}" aria-hidden="true"></i> ` : "";
    return `<a href="${item.href}"${classes}${aria}>${icon}${item.label}</a>`;
  };

  function renderHeader() {
    const submenu = SUBMENUS[active];
    const subnav = submenu ? `
      <nav class="site-subnav" aria-label="${submenu.title}">
        <div class="site-container site-subnav__bar">
          <span class="site-subnav__title">${submenu.title}</span>
          ${submenu.items.map(item => item.spacer ? '<span class="site-subnav__spacer"></span>' : link(item, sub, "site-subnav__cta")).join("")}
        </div>
      </nav>` : "";

    return `
      <a href="#contenido" class="skip-link">Saltar al contenido</a>
      <header class="site-header">
        <div class="site-container site-header__bar">
          <a href="index.html" class="site-brand" aria-label="AEMATEC, ir al inicio">
            <img src="assets/logo-aematec.svg" alt="">
            <span class="site-brand__divider" aria-hidden="true"></span>
            <span class="site-brand__name">AEMATEC</span>
          </a>
          <button id="mobile-menu-toggle" type="button" class="site-menu-toggle" aria-expanded="false"
            aria-controls="primary-navigation" aria-label="Menú"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
          <nav id="primary-navigation" class="site-nav" aria-label="Principal">
            ${MENU.map(item => link(item, active, "site-nav__cta")).join("")}
          </nav>
        </div>
        ${subnav}
      </header>`;
  }

  function renderFooter() {
    return `
      <footer class="site-footer">
        <div class="site-container site-footer__bar">
          <div class="site-footer__brand">
            <img src="assets/logo-aematec.svg" alt="">
            <span>Asociación de Estudiantes de Enseñanza de la Matemática con Entornos Tecnológicos</span>
          </div>
          <address class="site-footer__meta">
            <p>Instituto Tecnológico de Costa Rica</p>
            <p>Costado oeste de la Escuela de Matemática, junto al cajero del BN, campus central del TEC, Cartago, Costa Rica</p>
            <p><a href="mailto:aematec@estudiantec.cr">aematec@estudiantec.cr</a></p>
            <p><a href="legal.html#privacidad">Privacidad</a> · <a href="legal.html#terminos">Términos de uso</a> · <a href="legal.html#cookies">Cookies</a></p>
            <p>Protegido por reCAPTCHA de Google: se aplican su <a href="https://policies.google.com/privacy" rel="noopener">Política de privacidad</a> y sus <a href="https://policies.google.com/terms" rel="noopener">Condiciones</a>.</p>
          </address>
        </div>
      </footer>`;
  }

  if (part === "header") {
    script.insertAdjacentHTML("beforebegin", renderHeader());
    const toggle = document.querySelector("#mobile-menu-toggle");
    const nav = document.querySelector("#primary-navigation");
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.innerHTML = `<i class="fa-solid ${isOpen ? "fa-xmark" : "fa-bars"}" aria-hidden="true"></i>`;
    });
    // Temas de temporada (Navidad, mes patrio, Semana de la Carrera…): ver assets/js/temas.js.
    const temas = document.createElement("script");
    temas.src = "assets/js/temas.js";
    document.head.appendChild(temas);
    // Botón flotante del Arcade AEMATEC: ver assets/js/arcade-launcher.js.
    const arcade = document.createElement("script");
    arcade.src = "assets/js/arcade-launcher.js";
    document.head.appendChild(arcade);
    // Asistente básico (buscar páginas, reportar un problema): ver assets/js/chatbot.js.
    const chatbot = document.createElement("script");
    chatbot.type = "module";
    chatbot.src = "assets/js/chatbot.js";
    document.head.appendChild(chatbot);
  } else if (part === "footer") {
    script.insertAdjacentHTML("beforebegin", renderFooter());
    // Destino del enlace "Saltar al contenido" del encabezado.
    const main = document.querySelector("main");
    if (main && !main.id) main.id = "contenido";
    main?.setAttribute("tabindex", "-1");
  }
})();
