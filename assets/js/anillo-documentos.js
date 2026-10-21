// Anillo de carpetas de documentacion.html: la carpeta elegida queda grande al frente y las demás giran
// alrededor, por una elipse. Sin JavaScript la página muestra las mismas tarjetas en cuadrícula.
(() => {
  const anillo = document.querySelector("#pp-anillo");
  if (!anillo) return;
  const items = [...anillo.children], n = items.length;
  const flechas = document.querySelector(".pp-anillo__flechas");
  const reducir = matchMedia("(prefers-reduced-motion: reduce)");
  let actual = 0, desde = 0, hasta = 0, inicio = 0, cuadro = 0;

  anillo.classList.add("pp-anillo");
  document.querySelector(".pp-anillo__ayuda").hidden = false;
  flechas.hidden = false;

  // Línea de la elipse que une las carpetas (decorativa, como en el boceto de la Junta).
  const pista = Object.assign(document.createElement("li"), { className: "pp-anillo__pista", ariaHidden: "true" });
  anillo.prepend(pista);

  // Medidas del anillo según el ancho disponible (el frente arriba, como en el boceto). La altura de la elipse
  // es la mínima con la que ninguna carpeta queda encima de otra cuando el anillo está quieto.
  function medidas() {
    const ancho = anillo.clientWidth, chico = ancho < 640, aire = chico ? 12 : 20;
    const frente = { w: Math.min(chico ? 300 : 360, ancho), h: chico ? 250 : 240 };
    const atras = { w: chico ? 124 : 180, h: chico ? 104 : 96 };
    const rx = Math.min(chico ? 999 : 430, (ancho / 2 - atras.w / 2) / 0.95);
    const cajas = ry => items.map((_, k) => {
      const ang = 2 * Math.PI * k / n, t = k ? atras : frente;
      return { x: rx * Math.sin(ang), y: -ry * Math.cos(ang), w: t.w + 4, h: t.h + aire };
    });
    const chocan = c => c.some((a, i) => c.slice(i + 1).some(b => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h));
    let ry = 40;
    while (ry < 600 && chocan(cajas(ry))) ry += 4;
    return { ancho, frente, atras, rx, ry, cy: ry + frente.h / 2 };
  }

  function dibujar(pos) {
    const m = medidas();
    anillo.style.height = `${Math.ceil(m.cy - m.ry * Math.cos(Math.PI * (n - 1) / n) + m.atras.h / 2 + 8)}px`;
    Object.assign(pista.style, { left: `${m.ancho / 2 - m.rx}px`, top: `${m.cy - m.ry}px`, width: `${2 * m.rx}px`, height: `${2 * m.ry}px` });
    items.forEach((item, i) => {
      const ang = 2 * Math.PI * (i - pos) / n, cerca = (Math.cos(ang) + 1) / 2; // 1 = al frente, 0 = al fondo
      const esFrente = item.classList.contains("es-frente"), t = esFrente ? m.frente : m.atras;
      item.style.width = `${t.w}px`;
      item.style.height = `${t.h}px`;
      item.style.transform = `translate(${m.ancho / 2 + m.rx * Math.sin(ang) - t.w / 2}px, ${m.cy - m.ry * Math.cos(ang) - t.h / 2}px) scale(${0.88 + 0.12 * cerca})`;
      item.style.zIndex = String(Math.round(cerca * 10));
      item.style.opacity = String(0.75 + 0.25 * cerca);
    });
  }

  function elegir(i, enfocar) {
    i = (i % n + n) % n;
    let paso = i - actual;
    if (paso > n / 2) paso -= n;
    if (paso < -n / 2) paso += n;
    desde = hasta; hasta += paso; actual = i; inicio = performance.now();
    items.forEach((item, j) => {
      const frente = j === i;
      item.classList.toggle("es-frente", frente);
      item.querySelector(".pp-doc__detalle").hidden = !frente;
      item.querySelector(".pp-doc__elegir").setAttribute("aria-current", String(frente));
    });
    if (enfocar) items[i].querySelector(".pp-doc__elegir").focus({ preventScroll: true });
    cancelAnimationFrame(cuadro);
    const dura = reducir.matches ? 0 : 650;
    const mover = ahora => {
      const t = dura ? Math.min(1, (ahora - inicio) / dura) : 1, suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      dibujar(desde + (hasta - desde) * suave);
      if (t < 1) cuadro = requestAnimationFrame(mover);
    };
    cuadro = requestAnimationFrame(mover);
  }

  items.forEach((item, i) => item.querySelector(".pp-doc__elegir").addEventListener("click", () => elegir(i, true)));
  flechas.addEventListener("click", e => { const b = e.target.closest("[data-paso]"); if (b) elegir(actual + Number(b.dataset.paso), false); });
  anillo.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); elegir(actual + (e.key === "ArrowRight" ? 1 : -1), true); }
  });
  addEventListener("resize", () => dibujar(hasta));
  elegir(0, false);
})();
