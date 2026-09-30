---
name: juego-buscaminas
description: Arregla o mejora Buscaminas dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, balance de dificultad o funciones nuevas de ESTE juego en concreto (no para crear un juego nuevo ni para tocar los demás).
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Buscaminas**, ya separado en `assets/js/arcade/minas.js` (módulo ES, importa lo compartido de
`assets/js/arcade/core.js`: `$`, `SFX`, `LB`, `fitSoon`, `FIT_EXTRAS`, `docTop`).

- Estado del juego: objeto `MS` (dificultades en `MS_LV`). Sin partidas en línea — todo es local.
- El tamaño de cada celda se ajusta aparte del caso genérico de `fitAll()` (que solo sabe de `<canvas>`
  dentro de `.stage`): está registrado en `FIT_EXTRAS` dentro del propio `minas.js`. Si cambias el tamaño
  del tablero o el layout, revisa esa función.
- Las miniaturas del menú (`drawSplash`, en `arcade.html`) usan `SPR.mine`/`SPR.flag` (de `core.js`), no algo
  de `minas.js` — si cambias cómo se ven las minas/banderas en el juego, decide si también quieres
  actualizar esa miniatura.
- Tabla de puntajes: `minas_facil`/`minas_medio`/`minas_dificil` en Firestore (`arcade-matec`). Si cambias
  el rango de tiempos posible, revisa si las reglas de Firestore (fuera de este repo) siguen aceptándolo —
  documenta cualquier cambio en `docs/arcade-firebase-cambios.md`.

Sigue las reglas generales de `AGENTS.md` (sección "Arcade" y el resto): rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, prueba el cambio de verdad
en el navegador (`preview_start` con `aematec-web`) antes de decir que funciona, y no mergees el PR salvo que
te lo pidan explícitamente. Explica los cambios en español simple.
