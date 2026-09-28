// Pruebas de la migración "separar por /" de las categorías de libros
// (scripts/categorias/separar-barras.js). No necesitan emulador ni firebase-admin.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { separarCategoria, planSeparacion, MAX_CATEGORIAS } = require("../scripts/categorias/separar-barras.js");

describe("separarCategoria: divide el texto por /", () => {
  test("barra con espacios", () => {
    assert.deepEqual(separarCategoria("Álgebra / Trigonometría / Geometría Analítica"),
      ["Álgebra", "Trigonometría", "Geometría Analítica"]);
  });
  test("barra sin espacios", () => {
    assert.deepEqual(separarCategoria("Programación/Lógica"), ["Programación", "Lógica"]);
  });
  test("texto sin barra queda como una sola categoría, recortado", () => {
    assert.deepEqual(separarCategoria("Cálculo "), ["Cálculo"]);
    assert.deepEqual(separarCategoria("  Didáctica   general "), ["Didáctica general"]);
  });
  test("quita duplicados sin distinguir mayúsculas ni tildes y conserva el orden", () => {
    assert.deepEqual(separarCategoria("Álgebra / algebra / Cálculo / ÁLGEBRA / calculo"), ["Álgebra", "Cálculo"]);
    assert.deepEqual(separarCategoria("Geometría analítica / Geometría Analitica"), ["Geometría analítica"]);
  });
  test("quita partes vacías", () => {
    assert.deepEqual(separarCategoria("/ Álgebra // Cálculo / "), ["Álgebra", "Cálculo"]);
    assert.deepEqual(separarCategoria(" / / "), []);
  });
  test("valor vacío, undefined o null da una lista vacía", () => {
    assert.deepEqual(separarCategoria(""), []);
    assert.deepEqual(separarCategoria(undefined), []);
    assert.deepEqual(separarCategoria(null), []);
  });
});

describe("planSeparacion: qué libros se migran", () => {
  const libros = [
    { id: "a", titulo: "Libro A", categoria: "Cálculo / Geometría Analítica" },
    { id: "b", titulo: "Libro B", categoria: "Estadística" },
    { id: "c", titulo: "Libro C", categoria: "Álgebra lineal / Álgebra abstracta / Programación Lineal / Estocástica" },
    { id: "d", titulo: "Libro D", categorias: ["Física"] },
    { id: "e", titulo: "Libro E", categoria: "" },
    { id: "f", titulo: "Libro F" }
  ];
  const { cambios, excedidos } = planSeparacion(libros);

  test("el máximo es 3 categorías", () => assert.equal(MAX_CATEGORIAS, 3));
  test("migra los que quedan con 3 o menos, con antes y después", () => {
    assert.deepEqual(cambios.map(c => c.id), ["a", "b", "e"]);
    assert.deepEqual(cambios[0], { id: "a", titulo: "Libro A", antes: "Cálculo / Geometría Analítica",
      despues: ["Cálculo", "Geometría Analítica"] });
    assert.deepEqual(cambios[1].despues, ["Estadística"]);
    assert.deepEqual(cambios[2].despues, []);
  });
  test("los de más de 3 categorías no se migran: se listan para que la Junta elija", () => {
    assert.deepEqual(excedidos, [{ id: "c", titulo: "Libro C",
      categorias: ["Álgebra lineal", "Álgebra abstracta", "Programación Lineal", "Estocástica"] }]);
  });
  test("salta los ya migrados y los que no tienen el campo categoria", () => {
    assert.ok(!cambios.some(c => c.id === "d" || c.id === "f"));
    assert.ok(!excedidos.some(e => e.id === "d" || e.id === "f"));
  });
  test("una lista vacía o ausente da un plan vacío", () => {
    assert.deepEqual(planSeparacion([]), { cambios: [], excedidos: [] });
    assert.deepEqual(planSeparacion(undefined), { cambios: [], excedidos: [] });
  });
});
