// Lo que une a TODOS los juegos del Arcade dentro de arcade.html (una sola página con pestañas): qué pestaña está abierta, cómo
// volver al menú y el bucle de dibujo. arcade.html lo rellena (arcade.tab / arcade.goTab); cada juego lo lee y registra su
// parte del bucle con registrarBucle().
export const arcade = { tab: 'menu', goTab: () => {} };

const bucles = [];
export const registrarBucle = fn => { bucles.push(fn); };
export const correrBucles = (dt, now) => { for (const fn of bucles) fn(dt, now); };

// ¿La pantalla de inicio (portada con el botón INICIAR) de ese juego sigue a la vista?
export const splashOn = g => { const sp = document.querySelector(`.splash[data-g="${g}"]`); return !!sp && !sp.hidden; };
