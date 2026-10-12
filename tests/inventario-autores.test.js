// Pruebas de los autores de la Biblioteca (assets/js/inventario-autores.js). No necesitan emulador.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { separarAutores, normalizarAutor, crearIndice, FUSIONES, ESPECIALES, clave } = require("../assets/js/inventario-autores.js");
const libro = autor => ({ autor });

describe("Autores: separar el campo del libro", () => {
  test("parte por coma, «y», «e» y punto y coma", () => {
    assert.deepEqual(separarAutores("Dennis G. Zill y Jacqueline M. Dewar"), ["Dennis G. Zill", "Jacqueline M. Dewar"]);
    assert.deepEqual(separarAutores("Alcides Astorga, Ileana Castillo y Walter Mora"), ["Alcides Astorga", "Ileana Castillo", "Walter Mora"]);
    assert.deepEqual(separarAutores("Luis Joyanes Aguilar e Ignacio Zahonero Martínez"), ["Luis Joyanes Aguilar", "Ignacio Zahonero Martínez"]);
    assert.deepEqual(separarAutores("Ana Pérez; Luis Mora"), ["Ana Pérez", "Luis Mora"]);
  });
  test("«N/A», vacío y sin dato no son autores", () => {
    for (const t of ["N/A", "", "  ", "sin autor", null, undefined]) assert.deepEqual(separarAutores(t), []);
  });
  test("quita notas entre paréntesis, títulos y puntos finales", () => {
    assert.deepEqual(separarAutores("Javier Trejos Zelaya (Editor en jefe)."), ["Javier Trejos Zelaya"]);
    assert.deepEqual(separarAutores("Dr. J. A. Baldor"), ["J. A. Baldor"]);
    assert.deepEqual(separarAutores("Pilar Baptista Lucio."), ["Pilar Baptista Lucio"]);
    assert.deepEqual(separarAutores("Randall Blanco B."), ["Randall Blanco B."], "las iniciales conservan su punto");
  });
  test("los textos especiales no se parten mal", () => {
    assert.deepEqual(separarAutores("Angel, Allen R."), ["Allen R. Angel"]);
    assert.deepEqual(separarAutores("Ernest F. Haeussler, Jr. y Richard  S. Paul"), ["Ernest F. Haeussler, Jr.", "Richard S. Paul"]);
    assert.deepEqual(separarAutores("Universidad Autónoma del Estado de Morelos Cuernavaca, Morelos"), ["Universidad Autónoma del Estado de Morelos Cuernavaca, Morelos"]);
  });
  test("un autor repetido en el mismo libro cuenta una vez", () => {
    assert.deepEqual(separarAutores("Earl Swokowski y Earl W. Swokowski"), ["Earl W. Swokowski"]);
  });
});

describe("Autores: fusionar formas de escribir", () => {
  test("las variantes de la tabla quedan como el nombre canónico", () => {
    assert.equal(normalizarAutor("Earl Swokowsky"), "Earl W. Swokowski");
    assert.equal(normalizarAutor("Luis Alejandro Acuña P."), "Luis Alejandro Acuña Prado");
    assert.equal(normalizarAutor("Águilar Camacho Alonso"), "Alonso Aguilar Camacho");
    assert.equal(normalizarAutor("Universidad de Costa Rica"), "UCR");
  });
  test("mayúsculas, tildes, puntos y espacios no crean autores distintos", () => {
    assert.equal(clave("Escuela de matemáticas"), clave("Escuela de Matemáticas"));
    assert.equal(clave("Frank Ayres Jr "), clave("Frank Ayres Jr."));
    assert.equal(clave("Vilma Ramirez"), clave("Vilma Ramírez"));
  });
  test("cada variante de la tabla se escribe una sola vez y ninguna nombre canónico es variante de otro", () => {
    const vistas = new Map();
    for (const [canonico, variantes] of Object.entries(FUSIONES)) {
      for (const v of variantes) {
        assert.ok(!vistas.has(clave(v)), `«${v}» está repetida en FUSIONES`);
        vistas.set(clave(v), canonico);
      }
    }
    for (const canonico of Object.keys(FUSIONES)) assert.ok(!vistas.has(clave(canonico)) || vistas.get(clave(canonico)) === canonico, `«${canonico}» es canónico y también variante de otro`);
  });
  test("los textos especiales dan autores ya normalizados", () => {
    for (const [texto, lista] of Object.entries(ESPECIALES)) assert.deepEqual(separarAutores(texto), lista, texto);
  });
});

describe("Autores: conteo de libros", () => {
  const libros = [libro("Earl W. Swokowski"), libro("Earl Swokowski y Jeffery A. Cole"), libro("Earl Swokowsky"), libro("Escuela de matemáticas"), libro("Escuela de Matemáticas"), libro("N/A"), libro("James Stewart")];
  const indice = crearIndice(libros);
  test("cuenta cada libro una vez por autor, uniendo las escrituras", () => {
    const n = nombre => indice.autores.find(a => a.nombre === nombre)?.libros;
    assert.equal(n("Earl W. Swokowski"), 3);
    assert.equal(n("Jeffery A. Cole"), 1);
    assert.equal(n("Escuela de Matemáticas"), 2, "se queda con la escritura con mayúsculas y tildes más usada");
    assert.equal(n("James Stewart"), 1);
    assert.equal(indice.autores.length, 4, "«N/A» no cuenta");
  });
  test("la lista sale en orden alfabético y «más libros» de mayor a menor", () => {
    assert.deepEqual(indice.autores.map(a => a.nombre), [...indice.autores.map(a => a.nombre)].sort((a, b) => a.localeCompare(b, "es")));
    assert.equal(indice.masLibros[0].nombre, "Earl W. Swokowski");
  });
  test("los autores de un libro salen fusionados", () => {
    assert.deepEqual(indice.autoresDe(libros[1]), ["Earl W. Swokowski", "Jeffery A. Cole"]);
    assert.deepEqual(indice.autoresDe(libros[5]), []);
  });
  test("sin libros no falla", () => {
    const vacio = crearIndice([]);
    assert.deepEqual(vacio.autores, []);
    assert.deepEqual(vacio.autoresDe(libro("Ana Mora")), ["Ana Mora"]);
  });
});
