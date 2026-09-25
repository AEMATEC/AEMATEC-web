// Botón flotante "ARCADE" en todas las páginas del sitio (menos arcade.html).
// Lo carga assets/js/layout.js en todas las páginas; no hay que agregarlo a mano.
// Al hacer clic, cubre la pantalla con una transición pixelada (assets/js/arcade-transition.js)
// y luego navega a arcade.html.
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

  function agregarBoton() {
    cargarEstilos();
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "arcade-fab";
    boton.setAttribute("aria-label", "Ir al Arcade AEMATEC");
    boton.innerHTML = '<i class="fa-solid fa-gamepad" aria-hidden="true"></i> ARCADE';
    boton.addEventListener("click", () => cargarTransicion(() => window.arcadeTransition("arcade.html")));
    document.body.appendChild(boton);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", agregarBoton);
  else agregarBoton();
})();
