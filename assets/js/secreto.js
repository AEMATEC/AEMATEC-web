/* Secreto de la portada: los mismos códigos que el easter egg del Arcade (assets/js/arcade/core.js) muestran una
   imagen y tocan un pedazo de canción. Solo aparece cuando alguien lo pide; no se descarga nada hasta entonces.
   Códigos: ↑ ↑ ↓ ↓ ← → ← → B A · escribir "gorila" · tocar el título 7 veces (o mantenerlo 2 s) · entrar con
   #gorila en la dirección · tocar con 3 dedos a la vez (celular). */
(() => {
  const IMAGEN = 'assets/img/secreto/secretos.png';
  const CANCION = 'assets/audio/secretos.mp3';
  const INICIO_S = 40;    // segundo de la canción donde empieza el pedazo
  const DURACION_S = 12;  // cuánto suena (la imagen se queda ese mismo tiempo)

  let abierto = null;
  function mostrar() {
    if (abierto) return;
    const capa = document.createElement('div');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', 'Sorpresa');
    capa.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(13,43,69,.88);cursor:pointer;padding:16px';
    const img = document.createElement('img');
    img.src = IMAGEN;
    img.alt = 'Perrito con peluca y traje blanco, parodia de una portada de disco';
    img.style.cssText = 'max-height:88vh;max-width:92vw;border-radius:10px;box-shadow:0 0 0 6px #fff,0 18px 60px rgba(0,0,0,.5)';
    capa.appendChild(img);

    const audio = new Audio(CANCION);
    audio.preload = 'auto';
    let fin = 0;
    function cerrar() {
      clearTimeout(fin);
      const t0 = performance.now(), v0 = audio.volume;
      const baja = () => { // el sonido baja en medio segundo en vez de cortarse de golpe
        const k = Math.min(1, (performance.now() - t0) / 500);
        audio.volume = v0 * (1 - k);
        if (k < 1) requestAnimationFrame(baja); else audio.pause();
      };
      baja();
      capa.remove(); document.removeEventListener('keydown', teclaCerrar); abierto = null;
    }
    const teclaCerrar = e => { if (e.key === 'Escape') cerrar(); };
    capa.addEventListener('click', cerrar);
    document.addEventListener('keydown', teclaCerrar);
    document.body.appendChild(capa);
    abierto = capa;

    audio.currentTime = INICIO_S;
    audio.play().catch(() => {}); // si el navegador bloquea el sonido (p. ej. entrando con #gorila), igual se ve la imagen
    fin = setTimeout(cerrar, DURACION_S * 1000);
  }

  // 1) Código Konami y 2) escribir "gorila" (fuera de los campos de texto)
  const K = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let ki = 0, escrito = '';
  window.addEventListener('keydown', e => {
    ki = e.code === K[ki] ? ki + 1 : (e.code === K[0] ? 1 : 0);
    if (ki === K.length) { ki = 0; mostrar(); }
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.key.length === 1) {
      escrito = (escrito + e.key.toLowerCase()).slice(-6);
      if (escrito === 'gorila') mostrar();
    }
  });
  // 3) Tocar el título 7 veces seguidas, o mantenerlo presionado 2 segundos
  const h1 = document.querySelector('h1');
  if (h1) {
    let toques = [], mantener = null;
    h1.addEventListener('pointerdown', () => {
      const ahora = Date.now(); toques = toques.filter(t => ahora - t < 2500); toques.push(ahora);
      if (toques.length >= 7) { toques = []; mostrar(); }
      mantener = setTimeout(mostrar, 2000);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h1.addEventListener(ev, () => clearTimeout(mantener)));
  }
  // 4) Entrar con #gorila en la dirección
  const revisarHash = () => { if (/gorila/i.test(location.hash)) mostrar(); };
  window.addEventListener('hashchange', revisarHash); setTimeout(revisarHash, 600);
  // 5) En celular: tocar la pantalla con 3 dedos a la vez
  window.addEventListener('touchstart', e => { if (e.touches.length >= 3) mostrar(); }, { passive: true });
})();
