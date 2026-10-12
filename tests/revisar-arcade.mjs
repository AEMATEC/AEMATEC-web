// Revisa que cada juego del Arcade tenga todo lo que necesita su página: HTML, módulo, canción, miniatura y enlace en el menú.
// Uso: node tests/revisar-arcade.mjs   (no necesita emulador ni navegador)
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const leer = f => readFileSync(resolve(raiz, f), "utf8");
const { JUEGOS } = await import(pathToFileURL(resolve(raiz, "assets/js/arcade/juegos.js")).href);
const portadas = leer("assets/js/arcade/portadas.js");
const arcade = leer("arcade.html");
const errores = [];
const falla = texto => errores.push(texto);

for (const j of JUEGOS) {
  const pagina = j.href;
  if (!existsSync(resolve(raiz, pagina))) { falla(`${j.g}: no existe la página ${pagina}`); continue; }
  const html = leer(pagina);
  if (!html.includes(`<body data-juego="${j.g}">`)) falla(`${pagina}: falta <body data-juego="${j.g}">`);
  if (!html.includes(`<section class="game on" id="g-${j.g}">`)) falla(`${pagina}: falta <section class="game on" id="g-${j.g}">`);
  if (!html.includes('data-sitio="arcade"')) falla(`${pagina}: falta data-sitio="arcade" (temas de temporada)`);
  if (!html.includes('class="splash"') || !html.includes(`data-g="${j.g}"`)) falla(`${pagina}: falta la portada (.splash data-g="${j.g}")`);
  const modulo = html.match(/<script type="module" src="assets\/js\/arcade\/([^"]+)"/)?.[1];
  if (!modulo) { falla(`${pagina}: no carga su módulo`); continue; }
  if (!existsSync(resolve(raiz, "assets/js/arcade", modulo))) { falla(`${pagina}: no existe assets/js/arcade/${modulo}`); continue; }
  const js = leer(`assets/js/arcade/${modulo}`);
  const primerImport = js.split(/\r?\n/).find(l => l.startsWith("import "));
  if (primerImport !== "import './shell.js';") falla(`${modulo}: lo primero que importa debe ser './shell.js' (antes que core.js); ahora es: ${primerImport}`);
  if (!js.includes("./pagina.js")) falla(`${modulo}: no importa './pagina.js' (portada y música)`);
  if (!existsSync(resolve(raiz, `assets/js/arcade/musica/${j.g}.js`))) falla(`${j.g}: falta la canción assets/js/arcade/musica/${j.g}.js`);
  if (!new RegExp(`g === '${j.g}'`).test(portadas)) falla(`${j.g}: drawSplash (portadas.js) no tiene su miniatura`);
  if (!html.includes("arcade-juegos.css")) falla(`${pagina}: falta arcade-juegos.css`);
}
if (!arcade.includes('<body data-juego="menu">')) falla('arcade.html: falta <body data-juego="menu">');
if (/<section class="game[^"]*" id="g-(?!menu|perfil)/.test(arcade)) falla("arcade.html: todavía trae la sección de un juego (cada juego va en su página)");
const shell = arcade.indexOf("shell.js"), core = arcade.indexOf("arcade/core.js");
if (!(shell > 0 && core > shell)) falla("arcade.html: shell.js debe cargarse antes que core.js");

if (errores.length) { console.error(`✖ ${errores.length} problema(s) en el Arcade:\n  ` + errores.join("\n  ")); process.exit(1); }
console.log(`✔ Arcade: ${JUEGOS.length} juegos con página, módulo, canción y miniatura; arcade.html solo trae menú y perfil.`);
