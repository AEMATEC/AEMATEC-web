---
name: juego-tetris
description: Arregla o mejora Tetris dentro del Arcade AEMATEC. Úsalo para bugs, reglas de las piezas (giro, puntaje, niveles, basura), los controles táctiles, el modo 1 contra 1 en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Tetris**. Su pantalla (HTML) está dentro de `arcade.html`, en la sección `#g-tetris`, porque todos los juegos son pestañas de la misma página. El código está en dos archivos:

- `assets/js/arcade/tetris-motor.js`: las reglas puras (piezas, giro, caída, líneas, puntaje, niveles, basura en línea), sin
  pantalla ni Firebase. Se prueban con `node --test tests/tetris.test.js`: si cambias una regla, agrega o ajusta su prueba.
- `assets/js/arcade/tetris.js`: dibujo, teclado y botones táctiles, sonidos y salas en línea (prefijo `tt-` en los ids). Su parte
  del bucle va con `registrarBucle` y solo avanza con `arcade.tab === 'tetris'`; si la persona cambia de pestaña en modo solo, la
  partida se pausa. La portada, el botón INICIAR y la música los maneja `arcade.html` (miniatura en `portadas.js`, canción en
  `musica/tetris.js`). Estilos propios en `assets/css/tetris.css`.
- `tetris.html` solo redirige a `arcade.html?juego=tetris`; no le agregues nada.
- **Tiene modo en línea** (1 contra 1): colección `tetris/{sala}` y subcolección `players`; cada quien escribe solo su documento y la
  basura viaja como el total `sent`. Las dos personas reciben las mismas piezas por la semilla (`seed`) de la sala. Si tocas el modo
  en línea, pruébalo con dos sesiones a la vez. Si agregas un campo, documenta la regla en `docs/arcade-firebase-cambios.md` (3.5).

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs`, `node tests/revisar-enlaces.mjs` y `node tests/revisar-arcade.mjs` antes del PR, pruébalo de verdad
en el navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
