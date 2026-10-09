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
    assert.deepEqual(titulosDe("2026-05-19"), []);
  });
  test("las próximas incluyen las del año siguiente y las que están en curso", () => {
    const desdeDiciembre = D.proximas("2026-12-26", 4);
    assert.equal(desdeDiciembre.length, 4);
    assert.ok(desdeDiciembre.every(e => e.hasta >= "2026-12-26"));
    assert.ok(desdeDiciembre.some(e => e.cuando.startsWith("2027-")));
    assert.ok(D.proximas("2026-03-12", 3).some(e => e.titulo === "Semana de la Carrera"), "una semana en curso sigue apareciendo");
  });
  test("se pueden pedir solo algunos tipos", () => {
    assert.ok(D.proximas("2026-01-02", 10, ["mate"]).every(e => e.tipo === "mate"));
  });
});

describe("Efemérides: calendarios MEP y TEC", () => {
  const pestana = tipo => D.GRUPOS[tipo];
  test("cada pestaña muestra solo su tipo, y MEP y TEC traen la semilla de 2026", () => {
    assert.deepEqual(pestana("mep"), ["mep"]);
    assert.deepEqual(pestana("tec"), ["tec"]);
    assert.ok(!pestana("general").includes("mep") && !pestana("general").includes("tec"));
    const todo = D.delAnio(2026);
    assert.ok(todo.some(e => e.tipo === "mep" && e.titulo === "Inicio de lecciones" && e.desde === "2026-02-23"));
    assert.ok(todo.some(e => e.tipo === "tec" && e.titulo === "II Semestre · Periodo lectivo"));
    assert.equal(D.fabrica(2030).filter(e => e.tipo === "mep" || e.tipo === "tec").length, 0, "los años siguientes se cargan desde el panel, no aquí");
  });
  test("un calendario que cruza de año aparece en los dos años", () => {
    assert.ok(D.delAnio(2026).some(e => e.titulo.startsWith("Verano 2026-2027")));
    assert.ok(D.delAnio(2027).some(e => e.titulo.startsWith("Verano 2026-2027")));
  });
  test("los periodos largos se marcan solo al inicio y al fin; los cortos, todos sus días", () => {
    assert.deepEqual(D.delDia("2026-02-23").filter(e => e.tipo === "mep").map(e => [e.titulo, e.fase]), [["Inicio de lecciones", undefined], ["Primer periodo lectivo", "inicio"]]);
    assert.deepEqual(D.delDia("2026-04-20").filter(e => e.tipo === "mep"), [], "a mitad de un periodo largo no hay marca");
    assert.equal(D.delDia("2026-07-03").find(e => e.titulo === "Primer periodo lectivo").fase, "fin");
    assert.ok(D.delDia("2026-07-10").some(e => e.titulo === "Vacaciones de medio periodo"), "un receso de 12 días marca cada día");
  });
  test("las próximas de un periodo largo en curso muestran su fin", () => {
    const [primera] = D.proximas("2026-09-01", 1, ["tec"]);
    assert.equal(primera.fase, "fin");
    assert.equal(primera.titulo, "II Semestre · Retiro de materias");
    assert.equal(primera.cuando, "2026-09-11");
  });
});

describe("Efemérides: lo que edita la Junta (documentos de Firestore)", () => {
  const doc = cambios => ({ id: "x1", tipo: "mep", titulo: "Día sin clases", desc: "", desde: "2027-03-01", hasta: "2027-03-01", anual: false, ...cambios });
  test("una fecha nueva aparece en su año, y una anual aparece todos los años", () => {
    assert.ok(D.delAnio(2027, [doc()]).some(e => e.titulo === "Día sin clases"));
    assert.ok(!D.delAnio(2026, [doc()]).some(e => e.titulo === "Día sin clases"));
    const anual = doc({ tipo: "aematec", titulo: "Aniversario de AEMATEC", desde: "2026-05-04", hasta: "2026-05-04", anual: true });
    for (const anio of [2026, 2027, 2030]) assert.ok(D.delAnio(anio, [anual]).some(e => e.titulo === "Aniversario de AEMATEC" && e.desde === `${anio}-05-04`));
    assert.ok(!D.delAnio(2027, [doc({ desde: "2024-02-29", hasta: "2024-02-29", anual: true })]).some(e => e.titulo === "Día sin clases"), "un 29 de febrero no existe en 2027");
  });
  test("un documento con el id de una de fábrica la reemplaza, y con oculta la oculta", () => {
    const fabrica = D.fabrica(2026).find(e => e.titulo === "Día de Juan Santamaría");
    const editada = D.delAnio(2026, [{ ...doc(), id: fabrica.id, tipo: "cr", titulo: "Día de Juan Santamaría Mora", desde: "2026-04-11", hasta: "2026-04-11", anual: true }]);
    assert.ok(editada.some(e => e.titulo === "Día de Juan Santamaría Mora"));
    assert.ok(!editada.some(e => e.titulo === "Día de Juan Santamaría"));
    const oculta = D.delAnio(2026, [{ id: fabrica.id, oculta: true }]);
    assert.ok(!oculta.some(e => e.id === fabrica.id));
    assert.equal(oculta.length, D.delAnio(2026).length - 1);
  });
  test("la Junta carga el calendario MEP de un año nuevo y se ve en la pestaña", () => {
    const docs = [doc({ id: "a", titulo: "Inicio de lecciones", desde: "2027-02-15", hasta: "2027-02-15" }), doc({ id: "b", titulo: "Primer periodo lectivo", desde: "2027-02-15", hasta: "2027-07-02" })];
    const mep = D.delAnio(2027, docs).filter(e => D.GRUPOS.mep.includes(e.tipo));
    assert.deepEqual(mep.map(e => e.titulo), ["Inicio de lecciones", "Primer periodo lectivo"]);
  });
});

describe("Efemérides: pegar varias fechas", () => {
  test("lee los formatos del TEC y del MEP", () => {
    const { items, errores } = D.leerLineas([
      "16-02-26 a 13-06-26 | I Semestre · Periodo lectivo",
      "6 al 17 de julio | Vacaciones de medio periodo | Receso",
      "23 de febrero | Inicio de lecciones",
      "2026-12-15 a 2027-01-30 | Verano",
      "15 de diciembre al 30 de enero | Verano 2",
      "09-02-26 y 10-02-26 | fecha mal escrita",
      "05-10-26 | ab",
      ""
    ].join("\n"), 2026);
    assert.deepEqual(items.map(e => [e.desde, e.hasta]), [["2026-02-16", "2026-06-13"], ["2026-07-06", "2026-07-17"], ["2026-02-23", "2026-02-23"], ["2026-12-15", "2027-01-30"], ["2026-12-15", "2027-01-30"]]);
    assert.equal(items[1].desc, "Receso");
    assert.deepEqual(errores.map(e => e.linea), [6, 7]);
  });
  test("rechaza fechas que no existen y rangos al revés", () => {
    assert.equal(D.leerFechas("31-02-26", 2026), null);
    assert.equal(D.leerFechas("20-03-26 a 10-03-26", 2026), null);
  });
  test("el id de lo importado es estable (pegar dos veces no duplica)", () => {
    const e = { desde: "2026-02-23", hasta: "2026-02-23", titulo: "Inicio de lecciones" };
    assert.equal(D.idImportado("mep", e), D.idImportado("mep", { ...e }));
    assert.notEqual(D.idImportado("mep", e), D.idImportado("tec", e));
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
