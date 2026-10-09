// Sprites de 8 bits para los temas de temporada (assets/js/temas.js): los mismos dibujos se usan en el sitio y en el
// Arcade. Todo se dibuja por código en un <canvas> pequeño y se muestra ampliado sin suavizar (image-rendering:
// pixelated), así que no hay archivos de imagen. Los cuadros de animación van uno al lado del otro en una "hoja" y
// temas.css los recorre con steps() (movimiento a saltos, como una consola).
//
// Uso: aematecPixel.elemento("bandera", { escala: 3 })  →  <div> animado listo para poner en la página.
(function () {
  const cache = {};
  const lienzo = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // Dibuja un sprite hecho con texto: cada letra es un color de la paleta y "." es transparente.
  const ascii = (c, filas, pal, ancho = 0) => filas.forEach((f, y) => [...(ancho ? f.padEnd(ancho, ".").slice(0, ancho) : f)].forEach((ch, x) => { if (pal[ch]) R(c, pal[ch], x, y, 1, 1); }));

  // Una "hoja" son n cuadros de w×h pixeles en una sola imagen.
  function hoja(clave, w, h, n, dibuja) {
    if (cache[clave]) return cache[clave];
    const cv = lienzo(w * n, h), c = cv.getContext("2d");
    for (let f = 0; f < n; f++) { c.save(); c.translate(f * w, 0); dibuja(c, f); c.restore(); }
    return (cache[clave] = { url: cv.toDataURL(), w, h, n });
  }

  const COLORES = {
    copo: ["#8FC3DF", "#B7D8EA", "#E8F4FB"], estrella: ["#E0B83A", "#F4D06F", "#E0B83A"],
    fantasma: ["#F2F2F7", "#E4DAF5", "#DDF3E6"], arana: ["#2F2F3A", "#4A4A55", "#222222"],
    sombrero: ["#6B3FA0", "#4A2F78", "#8656BD"], pi: ["#B8901F", "#0D2B45", "#B5523B"]
  };
  const FAROL = [["#F5A623", "#FFF3C4"], ["#D93A3A", "#FFD9D9"], ["#2F5FD0", "#D9E6ff"]];

  const FABRICA = {
    // Bandera de Costa Rica ondeando: azul, blanco, rojo (doble), blanco, azul; 4 cuadros con la onda corrida.
    bandera: () => hoja("bandera", 22, 20, 4, (c, f) => {
      R(c, "#5B4630", 0, 0, 2, 20);
      const franjas = [["#002B7F", 2], ["#FFFFFF", 2], ["#CE1126", 4], ["#FFFFFF", 2], ["#002B7F", 2]];
      for (let x = 0; x < 20; x++) {
        let y = 2 + Math.round(Math.sin(x * 0.5 + f * 1.571) * 1.5);
        for (const [col, alto] of franjas) { R(c, col, 2 + x, y, 1, alto); y += alto; }
      }
    }),
    // Mujer caminando con el puño en alto (2 cuadros). v = { pelo, piel, ropa, estilo }.
    mujer: v => hoja(`mujer${v.pelo}${v.piel}${v.ropa}${v.estilo}`, 16, 30, 2, (c, f) => {
      const { pelo, piel, ropa, estilo } = v;
      if (estilo === 0) R(c, pelo, 3, 1, 9, 17);                       // pelo largo
      if (estilo === 1) R(c, pelo, 6, 0, 4, 2);                        // moño
      if (estilo === 2) { R(c, pelo, 3, 0, 10, 11); R(c, pelo, 2, 2, 12, 7); } // rizado
      if (estilo === 3) R(c, pelo, 4, 1, 8, 9);                        // corto
      R(c, piel, 5, 2, 6, 8); R(c, "#2B1B12", 9, 5, 1, 2);             // cara y ojo
      R(c, pelo, 4, 1, 8, 2); R(c, pelo, 4, 3, 2, 3);                  // flequillo
      R(c, piel, 7, 10, 2, 1);                                          // cuello
      R(c, ropa, 5, 11, 6, 3); R(c, ropa, 4, 14, 8, 3); R(c, ropa, 3, 17, 10, 4); // vestido
      R(c, ropa, 3, 12, 2, 6); R(c, piel, 3, 18, 2, 2);                 // brazo de atrás
      R(c, ropa, 11, 7, 2, 5); R(c, piel, 11, 4, 3, 3);                 // brazo en alto y puño
      const a = f === 0 ? 8 : 6, b = f === 0 ? 6 : 8;                   // piernas alternadas
      R(c, "#2F2540", 5, 21, 3, a); R(c, "#2F2540", 9, 21, 3, b);
      R(c, "#1F1A24", 4, 21 + a, 4, 1); R(c, "#1F1A24", 9, 21 + b, 4, 1);
    }),
    // Juan Santamaría corriendo con la antorcha en alto (2 cuadros) y luego lanzándola (1 cuadro, sin antorcha).
    juan: () => hoja("juan", 26, 44, 2, (c, f) => {
      R(c, "#6B4A2B", 19, 4, 2, 14);                                    // palo de la antorcha
      cuerpoJuan(c, f);
      R(c, "#D9A066", 18, 17, 3, 3); R(c, "#D9A066", 18, 20, 2, 7);     // puño y brazo en alto
    }),
    juanLanza: () => hoja("juanLanza", 26, 44, 1, c => {
      cuerpoJuan(c, 0);
      R(c, "#D9A066", 18, 26, 7, 2); R(c, "#D9A066", 24, 25, 2, 3);     // brazo extendido hacia adelante
    }),
    // Mesón de madera con techo de tejas; el fuego se superpone aparte.
    meson: () => hoja("meson", 72, 54, 1, c => {
      for (let r = 0; r < 16; r++) { const w = 8 + r * 4; R(c, r % 4 === 3 ? "#8C3523" : "#A8452F", 36 - w / 2, r, w, 1); }
      R(c, "#7A4B32", 52, 2, 6, 10);
      R(c, "#8B5E3C", 6, 16, 60, 34); for (let y = 20; y < 50; y += 4) R(c, "#6E4A2E", 6, y, 60, 1);
      R(c, "#2A1A10", 12, 24, 12, 10); R(c, "#6E4A2E", 17, 24, 2, 10); R(c, "#6E4A2E", 12, 28, 12, 2);
      R(c, "#2A1A10", 48, 24, 12, 10); R(c, "#6E4A2E", 53, 24, 2, 10); R(c, "#6E4A2E", 48, 28, 12, 2);
      R(c, "#3B2314", 30, 30, 12, 20); R(c, "#E9D8A6", 38, 40, 2, 2);
      R(c, "#E9D8A6", 26, 19, 20, 6); R(c, "#5B4630", 28, 21, 4, 2); R(c, "#5B4630", 34, 21, 4, 2); R(c, "#5B4630", 40, 21, 4, 2);
      R(c, "#5B4630", 4, 50, 64, 4);
    }),
    // Llama de 3 cuadros (rojo, naranja y amarillo).
    llama: () => hoja("llama", 12, 16, 3, (c, f) => ascii(c, LLAMA[f], { R: "#D8330F", O: "#F58A1F", Y: "#FFE27A" }, 12)),
    humo: () => hoja("humo", 12, 8, 1, c => ascii(c, ["....GGGG....", "..GGGGGGG...", ".GGGGGGGGGG.", "GGGGGGGGGGGG", "GGGGGGGGGGGG", ".GGGGGGGGGG.", "..GGGGGGGG..", "....GGGG...."], { G: "#8B8B94" })),
    copo: v => hoja(`copo${v}`, 9, 9, 1, c => ascii(c, ["....#....", ".#..#..#.", "..#.#.#..", "...###...", "#########", "...###...", "..#.#.#..", ".#..#..#.", "....#...."], { "#": COLORES.copo[v % 3] })),
    estrella: v => hoja(`estrella${v}`, 9, 9, 1, c => ascii(c, ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##.", ".#.....#."], { "#": COLORES.estrella[v % 3] })),
    fantasma: v => hoja(`fantasma${v}`, 10, 11, 1, c => ascii(c, ["...WWWW...", "..WWWWWW..", ".WWWWWWWW.", ".WWKWWKWW.", ".WWKWWKWW.", ".WWWWWWWW.", ".WWWKKWWW.", ".WWWWWWWW.", ".WWWWWWWW.", ".WW.WW.WW.", "..W..W..W."], { W: COLORES.fantasma[v % 3], K: "#2B2B3A" })),
    arana: v => hoja(`arana${v}`, 9, 8, 1, c => ascii(c, ["K.......K", ".K.KKK.K.", "..KKKKK..", "K.KKKKK.K", ".KKKKKKK.", "K.KKKKK.K", ".K.....K.", "K.......K"], { K: COLORES.arana[v % 3] })),
    sombrero: v => hoja(`sombrero${v}`, 10, 10, 1, c => ascii(c, [".....P....", "....PP....", "....PP....", "...PPPP...", "...PPPP...", "...YYYY...", "..PPPPPP..", ".PPPPPPPP.", "PPPPPPPPPP", ".........."], { P: COLORES.sombrero[v % 3], Y: "#E0B83A" })),
    farol: v => hoja(`farol${v}`, 8, 12, 1, c => ascii(c, ["...BB...", "..BBBB..", ".BRRRRB.", ".RRYYRR.", "RRYYYYRR", "RRYYYYRR", "RRYYYYRR", ".RRYYRR.", ".BRRRRB.", "..BBBB..", "...BB...", "...B...."], { R: FAROL[v % 3][0], Y: FAROL[v % 3][1], B: "#5B4630" })),
    pi: v => hoja(`pi${v}`, 9, 9, 1, c => ascii(c, ["#########", "#########", "..#...#..", "..#...#..", "..#...#..", "..#...#..", "..#...##.", "..#....#.", "..#....#."], { "#": COLORES.pi[v % 3] })),
    venus: () => hoja("venus", 9, 13, 1, c => ascii(c, ["..#####..", ".##...##.", "##.....##", "##.....##", "##.....##", ".##...##.", "..#####..", "....#....", "....#....", "..#####..", "....#....", "....#....", "....#...."], { "#": "#7B2D8E" })),
    corazon: v => hoja(`corazon${v}`, 9, 8, 1, c => ascii(c, [".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."], { "#": v ? "#B0336B" : "#0B6E99" })),
    arcoiris: () => hoja("arcoiris", 14, 8, 1, c => {
      const bandas = ["#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787"];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x - 6.5, y - 7.5), b = Math.floor((d - 2.2) / 0.9); if (b >= 0 && b < 6) R(c, bandas[b], x, y, 1, 1); }
    }),
    manzana: () => hoja("manzana", 8, 9, 1, c => ascii(c, ["....GG..", "...G....", ".RRRRRR.", "RRRRRRRR", "RRRRRRRR", "RRRRRRRR", "RRRRRRRR", ".RRRRRR.", "..RR.RR."], { R: "#C0392B", G: "#2E9E6B" })),
    arbol: () => hoja("arbol", 9, 11, 1, c => ascii(c, ["....Y....", "...GGG...", "...GRG...", "..GGGGG..", "..GGGRG..", ".GGGGGGG.", ".GRGGGGG.", "GGGGGGRGG", "....B....", "....B....", "........."], { G: "#1E7B4B", R: "#B3202A", Y: "#E0B83A", B: "#6B4A2B" }))
  };

  function cuerpoJuan(c, f) {
    R(c, "#2E4A9A", 8, 14, 10, 3); R(c, "#2E4A9A", 16, 16, 4, 1);       // gorra
    R(c, "#2B1B12", 8, 17, 2, 4); R(c, "#D9A066", 9, 17, 8, 8);         // pelo y cara
    R(c, "#2B1B12", 14, 20, 1, 2); R(c, "#D9A066", 12, 25, 2, 1);       // ojo y cuello
    R(c, "#F3EBD9", 8, 26, 10, 10); R(c, "#C0392B", 8, 32, 10, 2);      // camisa y faja
    R(c, "#D9A066", 6, 27, 2, 8);                                        // brazo de atrás
    const a = f === 0 ? 8 : 6, b = f === 0 ? 6 : 8;
    R(c, "#3A2D5C", 8, 36, 4, a); R(c, "#3A2D5C", 13, 36, 4, b);
    R(c, "#2B1B12", 7, 36 + a, 6, 1); R(c, "#2B1B12", 13, 36 + b, 6, 1);
  }
  const LLAMA = [
    [".....R......", "....RR......", "....RRR.....", "...RRRR..R..", "...RROR.RR..", "..RRROORRR..", "..RROOYORR..", ".RRROYYOORR.", ".RROOYYYORR.", ".RROYYYYOOR.", ".RROYYYYYOR.", ".RRROYYYOOR.", "..RROOYYOR..", "..RRROOORR..", "...RRRRRR...", "....RRRR...."],
    ["......R.....", "......RR....", ".....RRR....", "..R..RRRR...", "..RR.ROORR..", "..RRRROORR..", "..RROYYOORR.", ".RROOYYYORR.", ".RROYYYYOOR.", ".RROYYYYYOR.", ".RRROYYYOOR.", ".RRROYYYOOR.", "..RROOYYOR..", "..RRROOORR..", "...RRRRRR...", "....RRRR...."],
    ["....R.......", "....RR......", "...RRR......", "...RRRR.R...", "..RROORRR...", "..RROOORRR..", ".RROYYOOORR.", ".RROYYYYORR.", ".RROYYYYOOR.", ".RROYYYYYOR.", ".RROYYYYYOR.", ".RRROYYYOOR.", "..RROOYYOR..", "..RRROOORR..", "...RRRRRR...", "....RRRR...."]
  ];

  // Sprite del tema: nombre + variante (color) → hoja { url, w, h, n }.
  const sprite = (nombre, variante = 0) => FABRICA[nombre](variante);

  // <div> con el sprite ampliado `escala` veces y, si tiene varios cuadros, animado (t = segundos por cuadro).
  function elemento(nombre, { escala = 3, variante = 0, t = 0.28, extra } = {}) {
    const h = sprite(nombre, extra || variante);
    const e = document.createElement("div");
    e.className = "pix";
    Object.assign(e.style, {
      width: h.w * escala + "px", height: h.h * escala + "px", backgroundImage: `url(${h.url})`,
      backgroundSize: `${h.w * h.n * escala}px ${h.h * escala}px`, backgroundRepeat: "no-repeat", imageRendering: "pixelated"
    });
    if (h.n > 1) {
      e.style.setProperty("--fin", `${-h.w * h.n * escala}px`);
      e.style.animation = `pix-hoja ${t * h.n}s steps(${h.n}) infinite`;
    }
    return e;
  }

  // Un sprite por tema para el icono del aviso.
  const ICONO_DE_TEMA = {
    "anio-nuevo": ["estrella"], "8m": ["venus"], "juan-santamaria": ["llama"], "semana-carrera": ["pi"], orgullo: ["arcoiris"],
    "dia-padre": ["corazon", 0], "dia-madre": ["corazon", 1], "mes-patrio": ["bandera"], faroles: ["farol"], halloween: ["fantasma"],
    "dia-docente": ["manzana"], navidad: ["arbol"]
  };
  const iconoDeTema = (id, escala = 3) => { const [n, v] = ICONO_DE_TEMA[id] || ["estrella"]; return elemento(n, { escala, variante: v || 0 }); };

  window.aematecPixel = { sprite, elemento, iconoDeTema, COLORES };
})();
