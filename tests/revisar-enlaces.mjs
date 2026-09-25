// Revisa que los enlaces internos del sitio apunten a archivos que existen (y a secciones con ese id).
// Mira los href/src de las páginas, las páginas .html nombradas en el JavaScript (menú, redirecciones)
// y los import de módulos. No revisa enlaces externos (https://…): esos dependen de otros sitios.
// Uso: node tests/revisar-enlaces.mjs   (desde la raíz del repositorio)
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const paginas = readdirSync(".").filter(f => f.endsWith(".html"));
const scripts = readdirSync("assets/js", { recursive: true }).filter(f => f.endsWith(".js")).map(f => `assets/js/${f}`);
const idsDe = new Map(paginas.map(p => [p, new Set([...readFileSync(p, "utf8").matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))]));
const externo = /^(?:[a-z]+:|\/\/|#?$|\$\{)/i; // https:, mailto:, tel:, data:, "#", "" o plantillas de JS
const rotos = [];

function revisar(origen, base, enlace, linea) {
  if (externo.test(enlace)) return;
  const [ruta, ancla] = enlace.split(/[?#]/)[0] === "" ? [origen, enlace.split("#")[1]] : [normalize(join(base, enlace.split(/[?#]/)[0])), enlace.split("#")[1]];
  if (!existsSync(ruta)) return rotos.push(`${origen}:${linea} → ${enlace} (no existe ${ruta})`);
  if (ancla && idsDe.has(ruta) && !idsDe.get(ruta).has(ancla)) rotos.push(`${origen}:${linea} → ${enlace} (no hay id="${ancla}" en ${ruta})`);
}
const lineaDe = (texto, indice) => texto.slice(0, indice).split("\n").length;

for (const archivo of [...paginas, ...scripts]) {
  const texto = readFileSync(archivo, "utf8").replace(/^\s*\/\/.*$/gm, ""); // sin comentarios de una línea
  const base = archivo.endsWith(".html") ? "." : dirname(archivo);
  if (archivo.endsWith(".html")) {
    for (const m of texto.matchAll(/\s(?:href|src)="([^"]*)"/g)) revisar(archivo, ".", m[1], lineaDe(texto, m.index));
  }
  // Páginas nombradas en el JavaScript: "repositorio.html", "admin.html#moderacion", location.replace("…")
  for (const m of texto.matchAll(/["'`]([\w-]+\.html(?:#[\w-]+)?)/g)) revisar(archivo, ".", m[1], lineaDe(texto, m.index));
  // Módulos importados: import { … } from "./assets/js/util.js"
  for (const m of texto.matchAll(/\bfrom\s+["']([^"']+)["']/g)) revisar(archivo, base, m[1], lineaDe(texto, m.index));
}

if (rotos.length) {
  console.error(`✖ ${rotos.length} enlace(s) roto(s):\n  ${rotos.join("\n  ")}`);
  process.exit(1);
}
console.log(`✔ Enlaces internos correctos en ${paginas.length} páginas y ${scripts.length} archivos de JavaScript.`);
