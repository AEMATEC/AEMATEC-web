// Pruebas de las categorías de la Biblioteca (assets/js/inventario-categorias.js). No necesitan emulador ni Firestore.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { GRUPOS, FUSIONES, MAX_CATEGORIAS, normalizarCategoria, normalizarLista, categoriasDeLibro, grupoDe } = require("../assets/js/inventario-categorias.js");

describe("Categorías: cómo se escriben", () => {
  test("unifica mayúsculas, tildes, espacios y errores de escritura", () => {
    assert.equal(normalizarCategoria("Geometría Analítica"), "Geometría analítica");
    assert.equal(normalizarCategoria("  Cálculo "), "Cálculo");
    assert.equal(normalizarCategoria("algebra lineal"), "Álgebra lineal");
    assert.equal(normalizarCategoria("Tercer ciclio"), "Tercer ciclo");
    assert.equal(normalizarCategoria("Ciclio diversificado"), "Ciclo diversificado");
  });

  test("aplica las fusiones aprobadas", () => {
    assert.equal(normalizarCategoria("Curso: Introducción a la Pedagogía"), "Pedagogía");
    assert.equal(normalizarCategoria("Matemática Universitaria"), "Matemática general");
    assert.equal(normalizarCategoria("Matemáticas"), "Matemática general");
    assert.equal(normalizarCategoria("Complejos"), "Variable compleja");
    assert.equal(normalizarCategoria("Teoría de Matrices"), "Álgebra lineal");
  });

  test("deja igual una categoría desconocida, solo sin espacios de más", () => {
    assert.equal(normalizarCategoria("  Criptografía  "), "Criptografía");
    assert.equal(normalizarCategoria(""), "");
  });

  test("separa por / o coma y quita repetidas", () => {
    assert.deepEqual(normalizarLista("Álgebra / Trigonometría / Geometría Analítica"), ["Álgebra", "Trigonometría", "Geometría analítica"]);
    assert.deepEqual(normalizarLista("Programación/Lógica"), ["Programación", "Lógica"]);
    assert.deepEqual(normalizarLista("Discreta / Matemática General / Matemática"), ["Matemática discreta", "Matemática general"]);
    assert.deepEqual(normalizarLista(undefined), []);
  });

  test("lee la lista nueva o, si no existe, el texto viejo", () => {
    assert.deepEqual(categoriasDeLibro({ categorias: ["Cálculo", "Física"], categoria: "Otra" }), ["Cálculo", "Física"]);
    assert.deepEqual(categoriasDeLibro({ categoria: "Cálculo / Complejos" }), ["Cálculo", "Variable compleja"]);
  });

  test("cada categoría pertenece a un solo grupo y las fusiones apuntan a categorías de algún grupo", () => {
    const hijas = Object.values(GRUPOS).flat();
    assert.equal(new Set(hijas).size, hijas.length);
    for (const canonica of Object.keys(FUSIONES)) assert.ok(grupoDe(canonica), `${canonica} no está en ningún grupo`);
    assert.equal(grupoDe("tercer ciclio"), "Secundaria (MEP)");
    assert.equal(grupoDe("Criptografía"), null);
  });
});
