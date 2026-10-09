// Pruebas del calendario de efemérides (assets/js/efemerides-datos.js). No necesitan emulador.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const D = require("../assets/js/efemerides-datos.js");
const { TEMAS } = require("../assets/js/temas.js");
const titulosDe = fecha => D.delDia(fecha).map(e => e.titulo);

describe("Efemérides: fechas que cambian cada año", () => {
  test("Domingo de Pascua", () => {
    assert.deepEqual(D.pascua(2025), { mes: 4, dia: 20 });
    assert.deepEqual(D.pascua(2026), { mes: 4, dia: 5 });
    assert.deepEqual(D.pascua(2027), { mes: 3, dia: 28 });
    assert.deepEqual(D.pascua(2028), { mes: 4, dia: 16 });
  });
  test("Jueves y Viernes Santo caen dos y tres días antes de Pascua", () => {
    assert.ok(titulosDe("2026-04-02").includes("Jueves Santo"));
    assert.ok(titulosDe("2026-04-03").includes("Viernes Santo"));
    assert.ok(titulosDe("2026-04-05").includes("Domingo de Pascua"));
    assert.ok(titulosDe("2027-03-25").includes("Jueves Santo"), "en 2027 Semana Santa cae en marzo");
  });
  test("Día del Padre: tercer domingo de junio (igual que el tema de temporada)", () => {
    assert.ok(titulosDe("2026-06-21").includes("Día del Padre"));
    assert.ok(titulosDe("2027-06-20").includes("Día del Padre"));
    assert.ok(titulosDe("2025-06-15").includes("Día del Padre"));
  });
  test("Día de Ada Lovelace: segundo martes de octubre", () => {
    assert.ok(titulosDe("2026-10-13").includes("Día de Ada Lovelace"));
    assert.ok(titulosDe("2027-10-12").includes("Día de Ada Lovelace"));
  });
  test("la Semana de la Carrera coincide con la del tema de temporada", () => {
    const tema = TEMAS.find(t => t.id === "semana-carrera");
    for (const anio of [2026, 2027, 2028]) {
      const semana = D.delAnio(anio).find(e => e.titulo === "Semana de la Carrera");
      assert.deepEqual([semana.desde, semana.hasta], tema.fechas(anio));
    }
    assert.ok(titulosDe("2026-03-12").includes("Semana de la Carrera"), "un día a mitad de la semana");
    assert.ok(!titulosDe("2026-03-16").includes("Semana de la Carrera"));
  });
});

describe("Efemérides: consultas", () => {
  test("fechas conocidas", () => {
    assert.ok(titulosDe("2026-04-11").includes("Día de Juan Santamaría"));
    assert.ok(titulosDe("2026-09-15").includes("Día de la Independencia"));
    assert.ok(titulosDe("2026-03-14").some(t => t.includes("π")));
    assert.ok(titulosDe("2026-03-08").includes("Día Internacional de la Mujer"));
    assert.deepEqual(titulosDe("2026-07-10"), []);
  });
  test("las próximas incluyen las del año siguiente y las que están en curso", () => {
    const desdeDiciembre = D.proximas("2026-12-26", 4);
    assert.equal(desdeDiciembre.length, 4);
    assert.ok(desdeDiciembre.every(e => e.hasta >= "2026-12-26"));
    assert.ok(desdeDiciembre.some(e => e.desde.startsWith("2027-")));
    assert.ok(D.proximas("2026-03-12", 3).some(e => e.titulo === "Semana de la Carrera"), "una semana en curso sigue apareciendo");
  });
  test("se pueden pedir solo algunos tipos", () => {
    assert.ok(D.proximas("2026-01-02", 10, ["mate"]).every(e => e.tipo === "mate"));
  });
});

describe("Efemérides: calidad de los datos", () => {
  test("cada fecha fija existe (incluso en año bisiesto), con tipo, título y descripción", () => {
    const vistos = new Set();
    for (const [mes, dia, tipo, titulo, desc, tema] of D.FIJAS) {
      const f = new Date(Date.UTC(2028, mes - 1, dia));
      assert.equal(f.getUTCMonth(), mes - 1, `${titulo}: el día ${dia} no existe en el mes ${mes}`);
      assert.ok(D.TIPOS[tipo], `${titulo}: tipo desconocido "${tipo}"`);
      assert.ok(titulo.length > 3 && desc.length > 10, `${titulo}: falta texto`);
      const clave = `${mes}-${dia}-${titulo}`;
      assert.ok(!vistos.has(clave), `repetida: ${clave}`);
      vistos.add(clave);
      if (tema) assert.ok(TEMAS.some(t => t.id === tema), `${titulo}: el tema "${tema}" no existe en temas.js`);
    }
  });
  test("todos los tipos tienen al menos una efeméride y los años salen ordenados", () => {
    const lista = D.delAnio(2026);
    for (const tipo of Object.keys(D.TIPOS)) assert.ok(lista.some(e => e.tipo === tipo), `sin efemérides de tipo ${tipo}`);
    for (let i = 1; i < lista.length; i++) assert.ok(lista[i - 1].desde <= lista[i].desde);
  });
});
