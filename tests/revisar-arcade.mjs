// Revisa que cada juego del Arcade tenga todo lo que necesita: su sección en arcade.html, su módulo (importado), su canción
// y su miniatura. Uso: node tests/revisar-arcade.mjs   (no necesita emulador ni navegador)
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const leer = f => readFileSync(resolve(raiz, f), "utf8");
const arcade = leer("arcade.html");
const portadas = leer("assets/js/arcade/portadas.js");
const catalogo = [...arcade.matchAll(/\{ g: '([^']+)', n: '[^']+'(?:, href: '[^']+')? \}/g)].map(m => m[1]);
const MODULOS = { minas: "minas", batalla: "batalla", tiro: "tiro", carreras: "carreras", funciones: "funciones", "21": "casino21", billar: "billar", duelo: "duelo", runner: "runner", golf: "golf", cruce: "cruce", tetris: "tetris" };
const errores = [];
const falla = t => errores.push(t);

if (catalogo.length < 12) falla(`GAMES en arcade.html: se esperaban 12 juegos y se leyeron ${catalogo.length}`);
for (const g of catalogo) {
  const modulo = MODULOS[g];
  if (!modulo) { falla(`${g}: no está en MODULOS de este chequeo`); continue; }
  if (!arcade.includes(`<section class="game" id="g-${g}">`)) falla(`${g}: falta su sección <section id="g-${g}"> en arcade.html`);
  if (!arcade.includes(`data-g="${g}"`)) falla(`${g}: falta su portada (.splash data-g="${g}")`);
  if (!existsSync(resolve(raiz, `assets/js/arcade/${modulo}.js`))) falla(`${g}: falta assets/js/arcade/${modulo}.js`);
  else if (!arcade.includes(`./assets/js/arcade/${modulo}.js`)) falla(`${g}: arcade.html no importa ${modulo}.js`);
  if (!arcade.includes(`data-t="${g}"`)) falla(`${g}: falta su pestaña (data-t="${g}") en la barra`);
  if (!existsSync(resolve(raiz, `assets/js/arcade/musica/${g}.js`))) falla(`${g}: falta la canción musica/${g}.js`);
  if (!new RegExp(`g === '${g}'`).test(portadas)) falla(`${g}: drawSplash (portadas.js) no tiene su miniatura`);
}
// los módulos de juego no deben cargar nada de la página (arcade.html) ni depender unos de otros
for (const modulo of Object.values(MODULOS)) {
  const ruta = `assets/js/arcade/${modulo}.js`;
  if (!existsSync(resolve(raiz, ruta))) continue;
  for (const m of leer(ruta).matchAll(/from '\.\/([a-z0-9-]+)\.js'/g)) {
    if (!["core", "estado", "compartido-juegos", "moderacion", "musica", "filtro", "tetris-motor"].includes(m[1])) falla(`${modulo}.js importa './${m[1]}.js': un juego solo debe importar de core, estado y compartido-juegos`);
  }
}
if (errores.length) { console.error(`✖ ${errores.length} problema(s) en el Arcade:\n  ` + errores.join("\n  ")); process.exit(1); }
console.log(`✔ Arcade: ${catalogo.length} juegos con sección, módulo, canción y miniatura.`);
