// Pruebas de las categorías de la Biblioteca (assets/js/inventario-categorias.js) y de su migración
// (scripts/categorias/migrar.js). No necesitan emulador ni Firestore.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { GRUPOS, FUSIONES, MAX_CATEGORIAS, normalizarCategoria, normalizarLista, categoriasDeLibro, grupoDe } = require("../assets/js/inventario-categorias.js");
const { POR_LIBRO, planMigracion, reporteMarkdown } = require("../scripts/categorias/migrar.js");

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

describe("Migración de categorías", () => {
  const libro = (id, categoria, codigo, extra = {}) => ({ id, titulo: `Libro ${id}`, categoria, ejemplares: [{ codigo }], ...extra });

  test("pasa el texto viejo a lista unificada y marca el libro para borrar el campo viejo", () => {
    const { cambios } = planMigracion([libro("a", "Geometría Euclídea / Trigonometría", "BIB-900")]);
    assert.deepEqual(cambios, [{ id: "a", titulo: "Libro a", codigo: "BIB-900", antes: "Geometría Euclídea / Trigonometría", despues: ["Geometría euclídea", "Trigonometría"] }]);
  });

  test("no toca un libro ya migrado y sin cambios (se puede correr dos veces)", () => {
    const { cambios } = planMigracion([{ id: "b", categorias: ["Cálculo"], ejemplares: [{ codigo: "BIB-901" }] }]);
    assert.equal(cambios.length, 0);
  });

  test("corrige un libro ya migrado que quedó con una variante", () => {
    const { cambios } = planMigracion([{ id: "c", categorias: ["Tercer ciclio"], ejemplares: [{ codigo: "BIB-902" }] }]);
    assert.deepEqual(cambios[0].despues, ["Tercer ciclo"]);
  });

  test("usa la decisión por libro, también para ejemplares con sufijo", () => {
    const { cambios } = planMigracion([
      libro("d", "Álgebra lineal / Álgebra abstracta / Programación Lineal / Estocástica", "BIB-115"),
      libro("e", "", "BIB-190-01")
    ]);
    assert.deepEqual(cambios[0].despues, POR_LIBRO["BIB-115"]);
    assert.deepEqual(cambios[1].despues, ["Álgebra lineal", "Variable compleja"]);
  });

  test("respeta a un libro que la Junta ya editó con el formato nuevo", () => {
    const { cambios } = planMigracion([{ id: "f", categorias: ["Álgebra"], ejemplares: [{ codigo: "BIB-115" }] }]);
    assert.equal(cambios.length, 0);
  });

  test(`no escribe libros con más de ${MAX_CATEGORIAS} categorías y avisa de los que no tienen`, () => {
    const plan = planMigracion([libro("g", "Álgebra / Cálculo / Física / Lógica", "BIB-903"), libro("h", "", "BIB-904")]);
    assert.equal(plan.excedidos.length, 1);
    assert.equal(plan.cambios.some(cambio => cambio.id === "g"), false);
    assert.equal(plan.sinCategoria[0].id, "h");
    assert.match(reporteMarkdown(plan, []), /Para revisar a mano/);
  });
});
