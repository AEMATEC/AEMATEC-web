// Revisa que el JavaScript de todas las páginas HTML y de assets/js no tenga errores de sintaxis.
// Un solo error de sintaxis deja sin funcionar toda la página (pasó con Moderación en 2026-09).
// Uso: node tests/revisar-paginas.mjs   (desde la raíz del repositorio)
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tmp = mkdtempSync(join(tmpdir(), "aematec-"));
const archivos = [
  ...readdirSync(".").filter(f => f.endsWith(".html")),
  ...readdirSync("assets/js", { recursive: true }).filter(f => f.endsWith(".js")).map(f => `assets/js/${f}`)
];
let errores = 0;

for (const archivo of archivos) {
  const contenido = readFileSync(archivo, "utf8");
  const scripts = archivo.endsWith(".js")
    ? [{ codigo: contenido, linea: 1 }]
    : [...contenido.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g)].map(m => ({
      codigo: m[1],
      linea: contenido.slice(0, m.index).split("\n").length
    }));
  scripts.forEach(({ codigo, linea }, i) => {
    const ruta = join(tmp, `script-${i}.mjs`);
    writeFileSync(ruta, codigo);
    try {
      execFileSync(process.execPath, ["--check", ruta], { stdio: "pipe" });
    } catch (error) {
      errores++;
      const detalle = error.stderr.toString().split("\n").filter(Boolean).slice(0, 4).join("\n  ");
      console.error(`✖ ${archivo} (script que empieza en la línea ${linea}):\n  ${detalle}`);
    }
  });
}

if (errores) {
  console.error(`\n${errores} script(s) con errores de sintaxis.`);
  process.exit(1);
}
console.log(`✔ ${archivos.length} archivos revisados, sin errores de sintaxis.`);
