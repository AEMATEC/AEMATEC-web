// Pruebas de las fechas de los temas de temporada (assets/js/temas.js). No necesitan emulador.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { TEMAS, temaDeFecha, temaConConfig } = require("../assets/js/temas.js");
const id = fecha => temaDeFecha(fecha)?.id ?? null;

describe("Temas de temporada: qué tema corresponde a cada fecha", () => {
  test("la Semana de la Carrera va de lunes a domingo de la semana del Día de π", () => {
    // 2026: el 14 de marzo es sábado → semana del lunes 9 al domingo 15.
    assert.equal(id("2026-03-08"), "8m");
    assert.equal(id("2026-03-09"), "semana-carrera");
    assert.equal(id("2026-03-15"), "semana-carrera");
    assert.equal(id("2026-03-16"), null);
    assert.match(temaDeFecha("2026-03-14").mensaje("2026-03-14"), /Día de π/);
    // 2027: el 14 de marzo es domingo → semana del 8 al 14; el 8M gana ese día por ser más corto.
    assert.equal(id("2027-03-08"), "8m");
    assert.equal(id("2027-03-09"), "semana-carrera");
  });
  test("en setiembre: mes patrio, y el 14 gana la noche de faroles", () => {
    assert.equal(id("2026-09-01"), "mes-patrio");
    assert.equal(id("2026-09-14"), "faroles");
    assert.equal(id("2026-09-15"), "mes-patrio");
    assert.match(temaDeFecha("2026-09-15").mensaje("2026-09-15"), /Independencia/);
  });
  test("Día del Padre (tercer domingo de junio) gana al mes del Orgullo", () => {
    assert.equal(id("2026-06-21"), "dia-padre");
    assert.equal(id("2026-06-20"), "orgullo");
    assert.equal(id("2027-06-20"), "dia-padre");
  });
  test("otras fechas fijas y días sin tema", () => {
    assert.equal(id("2027-01-01"), "anio-nuevo");
    assert.equal(id("2027-01-08"), null);
    assert.equal(id("2026-08-15"), "dia-madre");
    assert.equal(id("2026-10-31"), "halloween");
    assert.equal(id("2026-11-22"), "dia-docente");
    assert.equal(id("2026-07-10"), null);
    assert.equal(temaDeFecha("2026-12-24").mensaje("2026-12-24"), "¡Feliz Navidad!");
    assert.equal(temaDeFecha("2026-12-10").mensaje("2026-12-10"), "¡Felices fiestas!");
  });
});

describe("Temas de temporada: decisión de la Junta (config/tema)", () => {
  test("apagar, fijar un tema hasta una fecha y volver a lo automático", () => {
    assert.equal(temaConConfig("2026-12-10", { modo: "apagado" }), null);
    assert.equal(temaConConfig("2026-12-10", { modo: "auto" })?.id, "navidad");
    assert.equal(temaConConfig("2026-09-25", { modo: "halloween", hasta: "2026-09-30" })?.id, "halloween");
    assert.equal(temaConConfig("2026-10-01", { modo: "apagado", hasta: "2026-09-30" }), null, "vencido: automático (sin tema)");
    assert.equal(temaConConfig("2026-12-10", { modo: "apagado", hasta: "2026-12-05" })?.id, "navidad");
    assert.equal(temaConConfig("2026-12-10", { modo: "no-existe" })?.id, "navidad");
    assert.equal(temaConConfig("2026-12-10", null)?.id, "navidad");
  });
});

describe("Temas de temporada: catálogo completo", () => {
  const css = readFileSync(new URL("../assets/css/temas.css", import.meta.url), "utf8");
  for (const tema of TEMAS) {
    test(`"${tema.id}" tiene colores en temas.css, mensaje y fechas válidas`, () => {
      assert.ok(css.includes(`html[data-tema="${tema.id}"]`), `falta html[data-tema="${tema.id}"] en temas.css`);
      const [desde, hasta] = tema.fechas(2026);
      assert.match(desde, /^2026-\d\d-\d\d$/);
      assert.ok(desde <= hasta);
      assert.ok(tema.mensaje(desde).length > 0);
      assert.ok(tema.icono || tema.texto, "necesita icono o texto para el aviso");
    });
  }
});
