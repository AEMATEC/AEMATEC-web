// Pruebas de los códigos del Inventario (assets/js/inventario-codigos.js). No necesitan emulador.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { siguienteCodigo, codigosAlDuplicar, codigoRepetido } = require("../assets/js/inventario-codigos.js");

const bien = (codigo, estado = "Bueno", extra = {}) => ({ id: codigo, tipo: "aematec", codigo, estado, nombre: `Bien ${codigo}`, ...extra });

describe("Código sugerido al agregar un bien", () => {
  test("sin bienes dados de baja, sigue el número mayor (ACA-065 → ACA-066)", () => {
    const items = [bien("ACA-001"), bien("ACA-065"), bien("ACA-031-01"), bien("ACA-031-02")];
    assert.deepEqual(siguienteCodigo("aematec", items), { codigo: "ACA-066", reutilizaDe: null });
  });

  test("reutiliza el primer código de un bien regalado, extraviado o vendido", () => {
    const items = [bien("ACA-001"), bien("ACA-010", "Vendido"), bien("ACA-004", "Regalado"), bien("ACA-020")];
    const resultado = siguienteCodigo("aematec", items);
    assert.equal(resultado.codigo, "ACA-004");
    assert.equal(resultado.reutilizaDe.nombre, "Bien ACA-004");
  });

  test("no vuelve a proponer un código de baja que ya tomó otro bien activo", () => {
    const items = [bien("ACA-004", "Extraviado"), bien("ACA-004", "Bueno", { id: "nuevo" }), bien("ACA-009")];
    assert.equal(siguienteCodigo("aematec", items).codigo, "ACA-010");
  });

  test("no repite un código existente aunque esté en otro apartado", () => {
    const items = [bien("ACA-001")];
    const otros = [...items, bien("ACA-002", "Bueno", { tipo: "consumible" })];
    assert.equal(siguienteCodigo("aematec", items, otros).codigo, "ACA-003");
  });

  test("en la Biblioteca mira los códigos de los ejemplares", () => {
    const libros = [
      { id: "a", tipo: "biblioteca", ejemplares: [{ codigo: "BIB-001-01", estado: "Bueno" }, { codigo: "BIB-001-02", estado: "Bueno" }] },
      { id: "b", tipo: "biblioteca", ejemplares: [{ codigo: "BIB-135", estado: "Bueno" }] }
    ];
    assert.equal(siguienteCodigo("biblioteca", libros).codigo, "BIB-136");
  });

  test("un apartado vacío empieza con su prefijo", () => {
    assert.equal(siguienteCodigo("consumible", []).codigo, "ACC-01");
    assert.equal(siguienteCodigo("aematec", []).codigo, "ACA-001");
  });
});

describe("Códigos al duplicar un bien", () => {
  test("ACA-065 sin familia → original ACA-065-01 y copia ACA-065-02", () => {
    assert.deepEqual(codigosAlDuplicar("ACA-065", ["ACA-064", "ACA-065", "ACA-066"]), { original: "ACA-065-01", copia: "ACA-065-02" });
  });

  test("si ya existe ACA-065-01, el original pasa a -02 y la copia es -03", () => {
    assert.deepEqual(codigosAlDuplicar("ACA-065", ["ACA-065", "ACA-065-01"]), { original: "ACA-065-02", copia: "ACA-065-03" });
  });

  test("un bien que ya tiene sufijo no se renombra; la copia sigue al mayor", () => {
    assert.deepEqual(codigosAlDuplicar("ACA-031-01", ["ACA-031-01", "ACA-031-02"]), { original: "ACA-031-01", copia: "ACA-031-03" });
  });

  test("no confunde familias con números parecidos (ACA-06 no es familia de ACA-065)", () => {
    assert.deepEqual(codigosAlDuplicar("ACA-06", ["ACA-06", "ACA-065", "ACA-066"]), { original: "ACA-06-01", copia: "ACA-06-02" });
  });
});

describe("Códigos repetidos al guardar", () => {
  const items = [bien("ACA-001"), bien("ACA-002", "Regalado")];

  test("rechaza el código de otro bien activo", () => {
    assert.equal(codigoRepetido(["ACA-001"], items, "otro"), "ACA-001");
    assert.equal(codigoRepetido(["aca-001"], items, "otro"), "aca-001");
  });

  test("acepta el código de un bien dado de baja y el del propio bien", () => {
    assert.equal(codigoRepetido(["ACA-002"], items, "nuevo"), null);
    assert.equal(codigoRepetido(["ACA-001"], items, "ACA-001"), null);
  });

  test("rechaza dos ejemplares con el mismo código en el mismo libro", () => {
    assert.equal(codigoRepetido(["BIB-001-01", "BIB-001-01"], [], ""), "BIB-001-01");
  });
});
