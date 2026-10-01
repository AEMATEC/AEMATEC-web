// Carrusel de fotos de actividades en el inicio. Sin librerías: solo mueve el track con
// translateX y cambia de foto sola cada 6s, salvo con el mouse o el foco encima, con el botón de pausa
// o si la persona pidió menos movimiento (WCAG 2.2.2).
(function () {
  const raiz = document.getElementById("carrusel-actividades");
  const track = document.getElementById("carrusel-track");
  if (!raiz || !track) return;

  const fotos = track.children.length;
  if (fotos === 0) return;

  const dotsCont = document.getElementById("carrusel-dots");
  const dots = [];
  for (let i = 0; i < fotos; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir a la foto ${i + 1}`);
    dot.className = "w-3 h-3 rounded-full bg-white/50 hover:bg-white/80";
    dot.addEventListener("click", () => ir(i));
    dotsCont.appendChild(dot);
    dots.push(dot);
  }

  let actual = 0;
  let temporizador = null;
  let pausado = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pausa = document.getElementById("carrusel-pausa");

  function pintar() {
    track.style.transform = `translateX(-${actual * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("bg-white", i === actual);
      dot.classList.toggle("bg-white/50", i !== actual);
      dot.setAttribute("aria-current", String(i === actual));
    });
    // Solo la foto visible queda para lectores de pantalla y teclado.
    [...track.children].forEach((foto, i) => { foto.inert = i !== actual; foto.setAttribute("aria-hidden", String(i !== actual)); });
  }

  function ir(indice) {
    actual = (indice + fotos) % fotos;
    pintar();
  }

  function siguiente() {
    ir(actual + 1);
  }

  function reiniciarAuto() {
    clearInterval(temporizador);
    if (!pausado) temporizador = setInterval(siguiente, 6000);
  }

  function pintarPausa() {
    pausa.setAttribute("aria-pressed", String(pausado));
    pausa.setAttribute("aria-label", pausado ? "Reanudar el carrusel" : "Pausar el carrusel");
    pausa.innerHTML = `<i class="fa-solid ${pausado ? "fa-play" : "fa-pause"}" aria-hidden="true"></i>`;
  }
  pausa.addEventListener("click", () => { pausado = !pausado; pintarPausa(); reiniciarAuto(); });

  document.getElementById("carrusel-prev").addEventListener("click", () => {
    ir(actual - 1);
    reiniciarAuto();
  });
  document.getElementById("carrusel-next").addEventListener("click", () => {
    ir(actual + 1);
    reiniciarAuto();
  });

  raiz.addEventListener("mouseenter", () => clearInterval(temporizador));
  raiz.addEventListener("mouseleave", reiniciarAuto);
  raiz.addEventListener("focusin", () => clearInterval(temporizador));
  raiz.addEventListener("focusout", reiniciarAuto);

  pintarPausa();
  pintar();
  reiniciarAuto();
})();
