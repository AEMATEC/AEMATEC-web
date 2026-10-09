// Botón «Pizarra» en el borde de la página y panel que baja desde arriba (se usa en la portada).
// El contenido (pizarra.js, que usa Firebase) se carga recién la primera vez que se abre.
(function () {
  if (document.getElementById("pz-colgante")) return;
  document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "assets/css/pizarra.css" }));
  const raiz = document.createElement("div");
  raiz.id = "pz-colgante";
  raiz.innerHTML = `<button type="button" class="pz-asa" aria-haspopup="dialog" aria-expanded="false"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i><span>PIZARRA</span></button>
    <div class="pz-fondo"></div>
    <div class="pz-caida" role="dialog" aria-modal="true" aria-label="Pizarra de anuncios" hidden>
      <div class="pz"><div class="pz-pizarra">
        <button type="button" class="pz-cerrar" aria-label="Cerrar la pizarra"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        <h2 class="pz-titulo">Pizarra de AEMATEC<small>Noticias, recordatorios y la pregunta de la quincena. <a href="pizarra.html" style="color:#FFD866;text-decoration:underline">Abrir en su propia página</a></small></h2>
        <div id="pz-contenido"></div>
      </div></div>
    </div>`;
  document.body.appendChild(raiz);
  const asa = raiz.querySelector(".pz-asa"), caida = raiz.querySelector(".pz-caida");
  let cargada = false;
  const abrir = async () => {
    caida.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("pz-abierta")));
    asa.setAttribute("aria-expanded", "true");
    if (!cargada) {
      cargada = true;
      try { (await import("./pizarra.js")).montarPizarra(raiz.querySelector("#pz-contenido")); }
      catch { cargada = false; raiz.querySelector("#pz-contenido").textContent = "No se pudo cargar la pizarra."; }
    }
    caida.querySelector(".pz-cerrar").focus();
  };
  const cerrar = () => {
    document.body.classList.remove("pz-abierta");
    asa.setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!document.body.classList.contains("pz-abierta")) caida.hidden = true; }, 650);
    asa.focus();
  };
  asa.addEventListener("click", abrir);
  raiz.querySelector(".pz-cerrar").addEventListener("click", cerrar);
  raiz.querySelector(".pz-fondo").addEventListener("click", cerrar);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("pz-abierta")) cerrar(); });
  if (location.hash === "#pizarra") abrir();
})();
