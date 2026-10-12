// Lo común de la página de un juego del Arcade (la que trae <body data-juego="<id>">): portada con el botón INICIAR,
// música del juego, bucle de dibujo y los ayudantes que antes vivían dentro de arcade.html (goTab, pickRow…).
// El módulo de cada juego lo importa después de './shell.js' y './core.js'.
import { $, SFX, fitSoon, setUpdateMenuMusicHook } from './core.js';
import { MUSIC, setMusicToggleHook } from './musica.js';
import { drawSplash } from './portadas.js';

export const tab = document.body.dataset.juego; // id del juego de esta página (el mismo de la canción: musica/<id>.js)

// Volver al menú del Arcade (antes cambiaba de pestaña sin recargar).
export function goTab(destino) { location.href = destino === 'menu' ? 'arcade.html' : `arcade.html?juego=${destino}`; }

// Confirmación al abandonar una partida (la misma para todos los juegos).
export function pedirAbandonar(salir) { return () => { if (window.confirm('¿ABANDONAR LA PARTIDA?')) salir(); }; }

// Fila de botones para elegir una opción (personaje, pista, formato…): items = [{ canvas?, html? }].
export function pickRow(el, items, cur, onPick) {
  el.innerHTML = '';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'btn' + (i === cur ? ' on' : '');
    if (it.canvas) b.appendChild(it.canvas);
    if (it.html) { const d = document.createElement('div'); d.innerHTML = it.html; b.appendChild(d); }
    b.onclick = () => onPick(i);
    el.appendChild(b);
  });
}

const portada = document.querySelector('.splash');
export const splashOn = () => Boolean(portada && !portada.hidden);

// Música como siempre: a volumen normal en la portada y más baja ya dentro de la partida.
function actualizarMusica() { MUSIC.play(tab, splashOn() ? 'full' : 'low'); }
setUpdateMenuMusicHook(actualizarMusica);
setMusicToggleHook(actualizarMusica);
document.addEventListener('visibilitychange', actualizarMusica);
window.addEventListener('pagehide', () => MUSIC.stop());

if (portada) {
  const dibujar = () => drawSplash(portada.dataset.g, portada.querySelector('canvas'));
  dibujar();
  document.fonts && document.fonts.ready.then(dibujar); // la letra de las portadas llega después
  portada.querySelector('.btn').onclick = () => {
    SFX.play('start');
    portada.hidden = true; portada.nextElementSibling.hidden = false;
    fitSoon();
    actualizarMusica();
  };
} else { fitSoon(); }

// Bucle de dibujo: llama a `fn(dt, now)` en cada cuadro (dt en segundos, máximo 0,05) mientras la página está abierta.
let ultimo = 0;
const bucles = [];
function cuadro(now) {
  requestAnimationFrame(cuadro);
  const dt = Math.min(.05, (now - (ultimo || now)) / 1000); ultimo = now;
  for (const fn of bucles) fn(dt, now);
}
requestAnimationFrame(cuadro);
export const bucle = fn => { bucles.push(fn); };

void $;
