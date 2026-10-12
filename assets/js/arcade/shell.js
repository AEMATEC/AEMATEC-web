// Carcasa común de todas las páginas del Arcade (arcade.html y la página de cada juego): encabezado, barra de
// pestañas, créditos y las ventanas de «subir puntaje» y del huevo de pascua. Cada página solo trae lo suyo dentro de
// <div class="wrap"> y lleva <body data-juego="<id>"> (en arcade.html es "menu").
//
// IMPORTANTE: debe ejecutarse ANTES que core.js (que busca #name, #snd, #net…). Por eso es lo primero que importa el
// módulo de cada página (`import './shell.js';`) y, en arcade.html, su <script> va antes que el de core.js.
import { JUEGOS } from './juegos.js';

const activo = document.body.dataset.juego || 'menu';
const enMenu = activo === 'menu' || activo === 'perfil';

// En arcade.html (menú y perfil) las pestañas «MENÚ» y «PERFIL» cambian de pantalla sin recargar; todo lo demás es un enlace.
const pestana = (id, texto, href) => (enMenu && !href
  ? `<button class="btn tab${activo === id ? ' on' : ''}" data-t="${id}">${texto}</button>`
  : `<a class="btn tab${activo === id ? ' on' : ''}" href="${href || (id === 'menu' ? 'arcade.html' : `arcade.html?juego=${id}`)}"${activo === id ? ' aria-current="page"' : ''}>${texto}</a>`);

const NAV = pestana('menu', '★ MENÚ') + JUEGOS.map(j => pestana(j.g, j.n, j.g === activo && !enMenu ? '#' : j.href)).join('') + pestana('perfil', 'PERFIL');

const CABECERA = `
  <header>
    <h1><img class="logo" alt="" src="assets/img/arcade-logo.png"><span>ARCADE AEMATEC</span></h1>
    <div class="who">
      <button id="arcade-volver" type="button" class="btn gray" title="Volver a la página principal de AEMATEC" aria-label="Volver a la página principal de AEMATEC">← AEMATEC</button>
      <label for="name">JUGADOR</label>
      <input id="name" class="px-in" maxlength="10" placeholder="TU APODO" aria-label="Tu apodo (es público, no uses tu nombre real)" title="ES PÚBLICO: NO USES TU NOMBRE REAL">
      <span id="name-warn" class="net" style="color:var(--red)" hidden aria-live="polite"></span>
      <button class="btn snd" id="snd" type="button" title="Sonido: apaga todo (efectos y música)" aria-label="Sonido (efectos y música)"><svg class="ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 4h2v4H1zM3 3h1v6H3zM4 2h1v8H4zM5 1h1v10H5z"/><path class="ico-on" d="M7 4h1v4H7zM9 2h1v1H9zM10 3h1v6h-1zM9 9h1v1H9z"/><path class="ico-off" d="M7 4h1v1H7zM8 5h1v1H8zM9 6h1v1H9zM10 7h1v1h-1zM10 4h1v1h-1zM9 5h1v1H9zM8 6h1v1H8zM7 7h1v1H7z"/></svg><span class="lbl">SÍ</span></button>
      <button class="btn snd" id="mus" type="button" title="Música: apaga solo la música" aria-label="Música"><svg class="ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1h1v8H5zM6 1h1v1H6zM7 2h1v1H7zM8 3h1v2H8zM2 8h3v1H2zM1 9h4v1H1zM2 10h3v1H2z"/><path class="ico-off" d="M1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3zM9 9h1v1H9zM10 10h1v1h-1zM7 7h1v1H7zM8 8h1v1H8zM4 4h1v1H4zM6 6h1v1H6z"/></svg><span class="lbl">SÍ</span></button>
      <span id="net" class="net">● CONECTANDO…</span>
    </div>
  </header>

  <nav>${NAV}</nav>
`;

const CREDITOS = `
  <footer class="credits">REALIZADO POR <b>ANTONY ARIAS</b> 2026 · CON AYUDA DE CLAUDE PARA EL DISEÑO ESTÉTICO · MÚSICA GENERADA PARA AEMATEC CON CLAUDE · LOS APODOS Y PUNTAJES SON PÚBLICOS: NO USES TU NOMBRE REAL · <a href="legal.html#privacidad">PRIVACIDAD</a></footer>
`;

// Ventanas que usa core.js (LB.confirmar y EGG.show): los mismos ids de siempre.
const VENTANAS = `
<div id="egg" hidden><img id="egg-img" alt="Easter egg"><p>¡EASTER EGG!</p></div>

<div id="lb-confirm" hidden>
  <div class="px lb-confirm-box">
    <p id="lb-confirm-msg"></p>
    <div class="row" id="lb-confirm-choice">
      <button class="btn green" id="lb-confirm-yes">SUBIR</button>
      <button class="btn gray" id="lb-confirm-no">NO SUBIR</button>
    </div>
    <div id="lb-confirm-name-step" hidden>
      <input id="lb-confirm-name" class="px-in" maxlength="10" placeholder="TU APODO">
      <p class="msg" id="lb-confirm-name-msg" aria-live="polite"></p>
      <button class="btn orange" id="lb-confirm-publish">PUBLICAR</button>
    </div>
  </div>
</div>
`;

const wrap = document.querySelector('.wrap');
wrap.insertAdjacentHTML('afterbegin', CABECERA);
wrap.insertAdjacentHTML('beforeend', CREDITOS);
wrap.insertAdjacentHTML('afterend', VENTANAS);
