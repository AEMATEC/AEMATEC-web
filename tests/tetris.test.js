// Pruebas de las reglas del Tetris (assets/js/arcade/tetris-motor.js). No necesitan emulador.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Partida, bolsa, celdas, choca, nuevoTablero, gravedad, serializar, deserializar, COLS, ROWS, TIPOS } from "../assets/js/arcade/tetris-motor.js";

describe("Tetris: piezas", () => {
  test("cada pieza tiene 4 celdas, gira 4 veces y vuelve a su forma", () => {
    for (const t of TIPOS) {
      assert.equal(celdas(t, 0).length, 4);
      assert.deepEqual(celdas(t, 4), celdas(t, 0));
      for (let r = 0; r < 4; r++) assert.equal(celdas(t, r).length, 4);
    }
  });
  test("la I gira de horizontal a vertical", () => {
    assert.equal(new Set(celdas("I", 0).map(c => c[1])).size, 1);
    assert.equal(new Set(celdas("I", 1).map(c => c[0])).size, 1);
  });
  test("la bolsa saca las 7 piezas distintas cada 7 y la misma semilla da la misma serie", () => {
    const a = bolsa(123), b = bolsa(123), c = bolsa(124);
    const A = Array.from({ length: 21 }, a), B = Array.from({ length: 21 }, b), C = Array.from({ length: 21 }, c);
    assert.deepEqual(A, B);
    assert.notDeepEqual(A, C);
    for (let i = 0; i < 21; i += 7) assert.equal(new Set(A.slice(i, i + 7)).size, 7);
  });
});

describe("Tetris: tablero", () => {
  test("choca con paredes, piso y bloques, pero no por arriba", () => {
    const tab = nuevoTablero();
    assert.ok(choca(tab, "O", 0, -1, 0));
    assert.ok(choca(tab, "O", 0, COLS - 1, 0));
    assert.ok(choca(tab, "O", 0, 4, ROWS - 1));
    assert.ok(!choca(tab, "O", 0, 4, -1));
    tab[10][4] = 1;
    assert.ok(choca(tab, "O", 0, 4, 9));
  });
  test("serializar y deserializar conservan el tablero", () => {
    const tab = nuevoTablero(); tab[19][0] = 8; tab[18][3] = 2;
    const texto = serializar(tab);
    assert.equal(texto.length, COLS * ROWS);
    assert.deepEqual(deserializar(texto), tab);
  });
  test("la gravedad sube de ritmo con el nivel", () => {
    for (let n = 1; n < 8; n++) assert.ok(gravedad(n + 1) < gravedad(n));
    for (let n = 1; n < 30; n++) assert.ok(gravedad(n + 1) <= gravedad(n));
    assert.ok(gravedad(30) >= 0.02);
  });
});

// Deja la pieza de arriba lista para llenar la fila de abajo y verifica los puntos y la limpieza.
const llenarFila = (p, y, huecos = []) => { for (let x = 0; x < COLS; x++) if (!huecos.includes(x)) p.tab[y][x] = 8; };

describe("Tetris: partida", () => {
  test("una partida nueva arranca viva con 5 piezas en cola", () => {
    const p = new Partida(7);
    assert.ok(p.vivo); assert.equal(p.cola.length, 5); assert.equal(p.nivel, 1);
  });
  test("caer de una suma 2 puntos por fila y fija la pieza", () => {
    const p = new Partida(7);
    p.caer();
    assert.ok(p.puntos >= 2 * 15);
    assert.ok(p.tab[ROWS - 1].some(c => c !== 0));
  });
  test("limpiar una línea da 100 × nivel y sube el contador", () => {
    const p = new Partida(1);
    p.pieza = { tipo: "I", rot: 0, x: 3, y: 17 };
    llenarFila(p, 19, [3, 4, 5, 6]); // la I horizontal cae hasta la fila 19
    p.pieza.y = 17;
    p.caer();
    assert.equal(p.lineas, 1);
    assert.ok(p.puntos >= 100);
    assert.equal(p.ultimo.lineas, 1);
  });
  test("cuatro líneas a la vez (Tetris) envían 4 líneas de basura", () => {
    const p = new Partida(2);
    for (let y = 16; y < 20; y++) llenarFila(p, y, [9]);
    p.pieza = { tipo: "I", rot: 1, x: 7, y: 0 }; // vertical: ocupa la columna x+2 = 9
    p.caer();
    assert.equal(p.lineas, 4);
    assert.equal(p.enviadas, 4);
    assert.equal(p.ultimo.envio, 4);
  });
  test("el nivel sube cada 10 líneas", () => {
    const p = new Partida(3);
    p.lineas = 9; p.pieza = { tipo: "I", rot: 0, x: 3, y: 17 };
    llenarFila(p, 19, [3, 4, 5, 6]);
    p.caer();
    assert.equal(p.nivel, 2);
    assert.ok(p.ultimo.nivelSubio);
  });
  test("guardar una pieza la cambia y solo se puede una vez por pieza", () => {
    const p = new Partida(4);
    const primera = p.pieza.tipo;
    assert.ok(p.guardar());
    assert.equal(p.guardada, primera);
    assert.ok(!p.guardar());
    assert.equal(p.cola.length, 5);
    p.caer();
    assert.ok(p.guardar());
  });
  test("la gravedad baja la pieza y, tras 0,5 s en el suelo, se fija sola", () => {
    const p = new Partida(5);
    for (let i = 0; i < 300 && p.pieza.y < 10; i++) p.tick(0.05);
    assert.ok(p.pieza.y >= 10 || p.tab.some(f => f.some(c => c))); 
    const antes = p.cola.join();
    for (let i = 0; i < 400; i++) p.tick(0.05);
    assert.notEqual(p.cola.join(), antes, "ya salieron más piezas");
  });
  test("apilar hasta arriba termina la partida", () => {
    const p = new Partida(6);
    for (let i = 0; i < 100 && p.vivo; i++) p.caer();
    assert.ok(!p.vivo);
  });
});

describe("Tetris: basura entre dos jugadores", () => {
  test("lo que envía el rival llega como filas grises con un hueco, y solo una vez", () => {
    const p = new Partida(8);
    p.rivalEnvio = 2;
    assert.equal(p.pendiente, 2);
    p.caer(); // no limpia nada: recibe la basura
    assert.equal(p.recibido, 2);
    assert.equal(p.pendiente, 0);
    for (const y of [ROWS - 1, ROWS - 2]) {
      const grises = p.tab[y].filter(c => c === 8).length;
      assert.equal(grises, COLS - 1);
    }
    p.caer();
    assert.equal(p.recibido, 2, "no se aplica otra vez");
  });
  test("limpiar líneas cancela basura pendiente antes de enviarla", () => {
    const p = new Partida(9);
    for (let y = 16; y < 20; y++) llenarFila(p, y, [9]);
    p.rivalEnvio = 3;
    p.pieza = { tipo: "I", rot: 1, x: 7, y: 0 };
    p.caer(); // Tetris: 4 de envío, 3 se cancelan
    assert.equal(p.recibido, 3);
    assert.equal(p.enviadas, 1);
    assert.equal(p.pendiente, 0);
  });
  test("dos jugadores con la misma semilla reciben las mismas piezas", () => {
    const a = new Partida(77), b = new Partida(77);
    for (let i = 0; i < 12; i++) { assert.equal(a.pieza.tipo, b.pieza.tipo); a.caer(); b.caer(); if (!a.vivo) break; }
  });
  test("demasiada basura termina la partida", () => {
    const p = new Partida(10);
    p.rivalEnvio = 60;
    for (let i = 0; i < 12 && p.vivo; i++) p.caer();
    assert.ok(!p.vivo);
  });
});
