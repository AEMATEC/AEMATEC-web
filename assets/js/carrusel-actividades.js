// Carrusel de fotos de actividades en el inicio. Sin librerías: solo mueve el track con
// translateX y cambia de foto sola cada 6s, salvo cuando el mouse está encima.
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
    dot.className = "w-2.5 h-2.5 rounded-full bg-white/50 hover:bg-white/80";
    dot.addEventListener("click", () => ir(i));
    dotsCont.appendChild(dot);
    dots.push(dot);
  }

  let actual = 0;
  let temporizador = null;

  function pintar() {
    track.style.transform = `translateX(-${actual * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("bg-white", i === actual);
      dot.classList.toggle("bg-white/50", i !== actual);
    });
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
    temporizador = setInterval(siguiente, 6000);
  }

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

  pintar();
  reiniciarAuto();
})();
