---
name: juego-la-huida-del-zorro
description: Arregla o mejora La Huida del Zorro (el corredor sin fin) dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, dificultad/velocidad, nuevos escenarios/obstáculos o el sprite del zorro en ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **La Huida del Zorro**, ya separado en `assets/js/arcade/runner.js` (módulo ES, importa de
`assets/js/arcade/core.js`: `$`, `SFX`, `LB`, `pxCircle`, `sprite`).

- Estado del juego: objeto `RN`. Escenarios en `RN_THEMES` (desierto, ciudad de noche, bosque, cueva helada);
  cada uno se pre-dibuja una sola vez en capas de parallax (`rnBuildLayers`/`RN_LAYERS`) para no redibujar
  pixel por pixel cada cuadro.
- El zorro (`RN_FOX_SPR`) usa sprites de 2 patas por cuadro (`RN_FOX_LEGS`) más una segunda pata oscurecida
  tomada de OTRO cuadro del mismo ciclo (`RN_FOX_FAR_LEG`/`rnFoxOscurecer`) para que se vean las 4 sin
  inventar arte nuevo — si tocas la animación, mantén esa técnica en vez de dibujar patas nuevas a mano.
- `RN`, `rnStep`, `rnDraw`, `rnJumpPress` y `RN_FOX_SPR` se exportan porque `arcade.html` los usa directo: el
  bucle principal llama a `rnStep`/`rnDraw`, el atajo de teclado llama a `rnJumpPress` y lee `RN.duckHeld`, y
  la miniatura del menú (`drawSplash`, caso `'runner'`) dibuja `RN_FOX_SPR.b`. El botón "MENÚ" del juego
  (`#rn-exit`) se conecta desde `arcade.html`, no desde `runner.js`, porque necesita `goTab` (que por ahora
  solo vive ahí). Si renombras algo exportado, actualiza esas referencias también.
- Los huecos/plataformas usan `jumpDist = RN.speed * (2 * RN_JUMP_V / RN_GRAVITY)` para que el ancho de la
  plataforma entre huecos siempre alcance para el salto a la velocidad actual — no vuelvas a un ancho fijo,
  eso fue justo el bug que se arregló (saltos "pixel-perfect" obligatorios).
- Sin partidas en línea. Tabla de puntajes: `runner` (metros recorridos) en Firestore (`arcade-matec`).

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador (`preview_start` con `aematec-web`, salta/agáchate y deja que cambie de escenario) antes de decir
que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los cambios en español simple.
