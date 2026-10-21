// Enlaces al Arcade AEMATEC con transición pixelada (assets/js/arcade-transition.js).
// Lo carga assets/js/layout.js en todas las páginas (menos arcade.html). Ya no hay botón flotante (decisión de la
// Junta, 2026-10: el único flotante es el asistente); cualquier <a href="arcade.html" data-arcade> usa la transición.
(function () {
  if (/(^|\/)arcade\.html$/.test(window.location.pathname)) return;

  function cargarEstilos() {
    if (!document.querySelector('link[href="assets/css/arcade.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "assets/css/arcade.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[href*="Press+Start+2P"]')) {
      const fuente = document.createElement("link");
      fuente.rel = "stylesheet";
      fuente.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
      document.head.appendChild(fuente);
    }
  }

  function cargarTransicion(listo) {
    if (window.arcadeTransition) return listo();
    const script = document.createElement("script");
    script.src = "assets/js/arcade-transition.js";
    script.onload = listo;
    document.body.appendChild(script);
  }

  function conectarEnlaces() {
    const enlaces = document.querySelectorAll("a[data-arcade]");
    if (!enlaces.length) return;
    cargarEstilos();
    enlaces.forEach(enlace => enlace.addEventListener("click", evento => {
      evento.preventDefault();
      cargarTransicion(() => window.arcadeTransition(enlace.href));
    }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", conectarEnlaces);
  else conectarEnlaces();
})();
