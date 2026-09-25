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
      <header class="site-header">
        <div class="site-container site-header__bar">
          <a href="index.html" class="site-brand" aria-label="AEMATEC, ir al inicio">
            <img src="assets/logo-aematec.svg" alt="Logo AEMATEC">
            <span class="site-brand__divider" aria-hidden="true"></span>
            <span class="site-brand__name">AEMATEC</span>
          </a>
          <button id="mobile-menu-toggle" type="button" class="site-menu-toggle" aria-expanded="false"
            aria-controls="primary-navigation" aria-label="Abrir menú"><i class="fa-solid fa-bars"></i></button>
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
            <img src="assets/logo-aematec.svg" alt="AEMATEC">
            <span>Asociación de Estudiantes de Enseñanza de la Matemática con Entornos Tecnológicos</span>
          </div>
          <div class="site-footer__meta">
            <p>Instituto Tecnológico de Costa Rica</p>
            <p><a href="mailto:aematec@estudiantec.cr" style="color: inherit;">aematec@estudiantec.cr</a></p>
          </div>
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
      toggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
      toggle.innerHTML = `<i class="fa-solid ${isOpen ? "fa-xmark" : "fa-bars"}"></i>`;
    });
  } else if (part === "footer") {
    script.insertAdjacentHTML("beforebegin", renderFooter());
  }
})();
