// Transición "pixelada" hacia y desde el Arcade AEMATEC (arcade.html).
// La usa el botón flotante ARCADE (assets/js/arcade-launcher.js) y el botón "← AEMATEC" de arcade.html.
// Expone window.arcadeTransition(url): cubre la pantalla con un mosaico de pixeles y luego navega.
(function () {
  function arcadeTransition(url) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.location.href = url;
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "arcade-pixel-overlay";
    const cols = window.innerWidth < 640 ? 10 : 18;
    const rows = window.innerWidth < 640 ? 16 : 10;
    overlay.style.setProperty("--cols", cols);
    overlay.style.setProperty("--rows", rows);
    const total = cols * rows;
    const orden = Array.from({ length: total }, (_, i) => i / total).sort(() => Math.random() - 0.5);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("span");
      cell.style.animationDelay = `${orden[i] * 0.45}s`;
      frag.appendChild(cell);
    }
    overlay.appendChild(frag);
    document.body.appendChild(overlay);
    setTimeout(() => { window.location.href = url; }, 650);
  }
  window.arcadeTransition = arcadeTransition;
})();
