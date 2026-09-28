// Pruebas de la unificación de variantes de categorías (scripts/categorias/unificar-variantes.js).
// No necesitan emulador ni Firestore: solo prueban las funciones puras.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MAPA_BASE,
  claveComparacion,
  normalizarCategoria,
  unificarLista,
  planUnificacion
} = require("../scripts/categorias/unificar-variantes.js");

describe("Categorías: clave de comparación", () => {
  test("quita tildes, mayúsculas y espacios repetidos", () => {
    assert.equal(claveComparacion("  Geometría   Analítica "), "geometria analitica");
    assert.equal(claveComparacion("ÁLGEBRA"), "algebra");
    assert.equal(claveComparacion(null), "");
  });
});

describe("Categorías: forma canónica", () => {
  test("recorta espacios y usa solo la primera letra en mayúscula", () => {
    assert.equal(normalizarCategoria("Cálculo "), "Cálculo");
    assert.equal(normalizarCategoria(" Matemática General"), "Matemática general");
    assert.equal(normalizarCategoria("Geometría Analítica"), "Geometría analítica");
    assert.equal(normalizarCategoria("Álgebra Lineal"), "Álgebra lineal");
    assert.equal(normalizarCategoria("Geometría Euclídea "), "Geometría euclídea");
    assert.equal(normalizarCategoria("Teoría de Matrices"), "Teoría de matrices");
  });
  test("pone las tildes correctas", () => {
    assert.equal(normalizarCategoria("algebra"), "Álgebra");
    assert.equal(normalizarCategoria("CALCULO"), "Cálculo");
    assert.equal(normalizarCategoria("Estadistica"), "Estadística");
  });
  test("corrige \"ciclio\" → \"ciclo\", también en frases que no están en el mapa", () => {
    assert.equal(normalizarCategoria("Tercer ciclio"), "Tercer ciclo");
    assert.equal(normalizarCategoria("Ciclio diversificado"), "Ciclo diversificado");
    assert.equal(normalizarCategoria("primer ciclio"), "Primer ciclo");
  });
  test("no fusiona categorías de significado distinto", () => {
    assert.equal(normalizarCategoria("Matemática"), "Matemática");
    assert.equal(normalizarCategoria("Matemática Universitaria"), "Matemática universitaria");
    assert.equal(normalizarCategoria("Programación"), "Programación");
    assert.equal(normalizarCategoria("Programación Lineal"), "Programación lineal");
    assert.equal(normalizarCategoria("Geometría"), "Geometría");
  });
  test("una categoría desconocida solo se limpia (espacios y mayúscula inicial)", () => {
    assert.equal(normalizarCategoria("  historia   de la matemática "), "Historia de la matemática");
    assert.equal(normalizarCategoria("Curso: Introducción a la Pedagogía"), "Curso: Introducción a la Pedagogía");
    assert.equal(normalizarCategoria("   "), "");
  });
  test("el mapa del archivo (forma { variantes }) se suma al base y manda", () => {
    const mapa = { variantes: { "Matemática discreta": ["Discreta"] } };
    assert.equal(normalizarCategoria("Discreta ", mapa), "Matemática discreta");
    assert.equal(normalizarCategoria("Cálculo ", mapa), "Cálculo");
    assert.equal(normalizarCategoria("Discreta"), "Discreta");
  });
  test("cada canónica de MAPA_BASE ya está en su forma canónica", () => {
    for (const canonica of Object.keys(MAPA_BASE)) {
      assert.equal(normalizarCategoria(canonica), canonica);
      assert.equal(canonica, canonica.trim());
      assert.equal(canonica.slice(1), canonica.slice(1).toLowerCase(), `${canonica} tiene mayúsculas de más`);
    }
  });
});

describe("Categorías: lista unificada", () => {
  test("quita vacías y repetidas y conserva el orden", () => {
    assert.deepEqual(
      unificarLista(["Geometría Analítica", " geometría analítica ", "", "Cálculo ", "Cálculo"]),
      ["Geometría analítica", "Cálculo"]
    );
    assert.deepEqual(unificarLista([]), []);
    assert.deepEqual(unificarLista(undefined), []);
  });
});

describe("Categorías: plan de unificación", () => {
  const libros = [
    { id: "a", titulo: "Viejo con barras", categoria: "Álgebra / Trigonometría / Geometría Analítica" },
    { id: "b", titulo: "Ya migrado y bien", categorias: ["Cálculo", "Complejos"] },
    { id: "c", titulo: "Migrado con variante", categorias: ["Matemática General", "Cálculo "] },
    { id: "d", titulo: "Error de escritura", categoria: "Tercer ciclio" },
    { id: "e", titulo: "Sin categoría", categoria: "" },
    { id: "f", titulo: "Repetida", categorias: ["Álgebra Lineal", "Álgebra lineal"] }
  ];
  const plan = planUnificacion(libros);
  const porId = Object.fromEntries(plan.cambios.map(cambio => [cambio.id, cambio]));

  test("separa el texto viejo por \"/\" y unifica cada parte", () => {
    assert.deepEqual(porId.a.despues, ["Álgebra", "Trigonometría", "Geometría analítica"]);
    assert.equal(porId.a.antes, "Álgebra / Trigonometría / Geometría Analítica");
    assert.equal(porId.a.titulo, "Viejo con barras");
  });
  test("no toca libros que ya están bien", () => {
    assert.equal(porId.b, undefined);
  });
  test("unifica libros que ya tienen la lista nueva", () => {
    assert.deepEqual(porId.c.antes, ["Matemática General", "Cálculo "]);
    assert.deepEqual(porId.c.despues, ["Matemática general", "Cálculo"]);
    assert.deepEqual(porId.f.despues, ["Álgebra lineal"]);
  });
  test("un libro con el campo viejo siempre se migra, aunque quede vacío", () => {
    assert.deepEqual(porId.d.despues, ["Tercer ciclo"]);
    assert.deepEqual(porId.e.despues, []);
  });
  test("el resumen cuenta libros por variante → canónica (sin contar espacios de más)", () => {
    assert.deepEqual(plan.resumen, {
      "Geometría Analítica → Geometría analítica": 1,
      "Matemática General → Matemática general": 1,
      "Tercer ciclio → Tercer ciclo": 1,
      "Álgebra Lineal → Álgebra lineal": 1
    });
  });
  test("avisa si un libro queda con más de 3 categorías", () => {
    const conCuatro = planUnificacion([{ id: "x", titulo: "Cuatro", categoria: "A / B / C / D" }]);
    assert.equal(conCuatro.avisos.length, 1);
    assert.match(conCuatro.avisos[0], /Cuatro/);
    assert.equal(plan.avisos.length, 0);
  });
});
