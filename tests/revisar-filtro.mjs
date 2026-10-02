// Revisa el filtro de contenido de apodos/propuestas del Arcade (groserías, teléfonos, correos).
// Uso: node tests/revisar-filtro.mjs   (desde la raíz del repositorio)
import assert from "node:assert/strict";
import { filtrarTexto } from "../assets/js/arcade/filtro.js";

let casos = 0;
function caso(nombre, fn) {
  casos++;
  try {
    fn();
  } catch (error) {
    console.error(`✖ ${nombre}\n  ${error.message}`);
    process.exitCode = 1;
  }
}

caso("nombre normal se acepta", () => {
  assert.equal(filtrarTexto("LUNA").ok, true);
});

caso("texto vacío se acepta (lo rechaza otra validación, no esta)", () => {
  assert.equal(filtrarTexto("").ok, true);
});

caso("rechaza un correo/usuario con @", () => {
  assert.equal(filtrarTexto("persona@gmail.com").ok, false);
});

caso("rechaza un teléfono de 8 dígitos", () => {
  assert.equal(filtrarTexto("88887777").ok, false);
});

caso("rechaza un carné con 7+ dígitos seguidos", () => {
  assert.equal(filtrarTexto("2021123456").ok, false);
});

caso("acepta números cortos (menos de 7 seguidos)", () => {
  assert.equal(filtrarTexto("JUGADOR123").ok, true);
});

caso("rechaza una grosería común en mayúsculas", () => {
  assert.equal(filtrarTexto("PENDEJO").ok, false);
});

caso("rechaza una grosería con tildes/minúsculas", () => {
  assert.equal(filtrarTexto("pendejo").ok, false);
});

caso("rechaza una grosería disfrazada con números por letras (leetspeak)", () => {
  assert.equal(filtrarTexto("p3nd3j0").ok, false);
});

caso("no rechaza una palabra normal que solo se parece a una grosería", () => {
  assert.equal(filtrarTexto("CARRO").ok, true);
});

caso("no rechaza palabras normales que contienen una grosería corta", () => {
  for (const texto of ["COMPUTADORA", "DISPUTA", "COMPUTO", "PIJAMA", "CONCHAL"]) assert.equal(filtrarTexto(texto).ok, true, texto);
});

caso("sí rechaza la grosería corta sola, en plural o dentro de una frase", () => {
  for (const texto of ["PUTA", "PUTOS", "HOYO PUTO", "P1JA"]) assert.equal(filtrarTexto(texto).ok, false, texto);
});

if (process.exitCode === 1) {
  console.error(`\nAlgún caso falló.`);
} else {
  console.log(`✔ ${casos} casos del filtro de contenido revisados, todo bien.`);
}
