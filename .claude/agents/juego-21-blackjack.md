---
name: juego-21-blackjack
description: Arregla o mejora Casino 21 (blackjack) dentro del Arcade AEMATEC. Úsalo para bugs, las reglas de la mesa, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Casino 21** (blackjack). Vive en su propia página `casino21.html` y su módulo `assets/js/arcade/casino21.js` (importa de `core.js`, de `pagina.js` —portada, música, bucle de dibujo y teclado de la página— y de `compartido-juegos.js`). Ya no está dentro de `arcade.html`; la barra de pestañas, el encabezado y los créditos los pone `shell.js`.

- Estado del juego: objeto `BJ` (prefijo `bj`). Mesa de hasta 5 jugadores + crupier CPU.
- **Tiene modo en línea**: colección `blackjack/{code}` y su subcolección `players`, con `host`. Si tocas
  algo del modo en línea, prueba con más de una sesión antes de darlo por bueno.
- Reglas clásicas: el crupier pide carta hasta 17, pasarse de 21 pierde automático. Si cambias alguna regla
  de la mesa, dilo claro en el PR (es fácil que alguien no note un cambio de regla si no se explica).
- En línea, la primera carta de cada rival (y su VALOR, y el "¡21!" de 2 cartas, que se muestra como
  "PLANTADO") se dibuja boca abajo mientras `state === 'play'`; se revela al pasar a `'over'`
  (`bjHandEl(…, hideFirst)`). Es solo visual: las manos siguen completas en el documento de la sala.
- Turnos: `bjTurnUid()` (primer asiento en 'playing'); las cartas de quien tiene el turno brillan
  (`.bj-seat.turn .bj-card`). El turno solo se hace cumplir en el navegador, no en la transacción.
- Si agregas un campo a la sala, documenta la regla de Firestore que hace falta en
  `docs/arcade-firebase-cambios.md`.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
