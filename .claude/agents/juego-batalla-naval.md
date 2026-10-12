---
name: juego-batalla-naval
description: Arregla o mejora Batalla Naval dentro del Arcade AEMATEC. Úsalo para bugs, la IA de la CPU, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Batalla Naval**. Vive en su propia página `batalla.html` y su módulo `assets/js/arcade/batalla.js` (importa de `core.js`, de `pagina.js` —portada, música, bucle de dibujo y teclado de la página— y de `compartido-juegos.js`). Ya no está dentro de `arcade.html`; la barra de pestañas, el encabezado y los créditos los pone `shell.js`.

- Estado del juego: objeto `BS` (prefijo de funciones `bs`). Barcos en `SHIPS`.
- **Tiene modo en línea**: colección `rooms/{code}` en Firestore (`arcade-matec`), con `p1`/`p2` y
  actualizaciones por turno. Si tocas algo del flujo en línea, prueba con dos pestañas o dos sesiones (una
  como anfitrión, otra uniéndose) antes de dar el cambio por bueno — no basta con probar el modo CPU.
- Dificultad VS CPU (`BS.lvl`, guardada en `pa_bs_lvl`): la elige `cpuPick(board, shots, lvl)`, sin estado
  entre tiros. FÁCIL dispara al azar; MEDIO caza en tablero de ajedrez; DIFÍCIL caza donde caben más barcos
  que siguen a flote. MEDIO y DIFÍCIL rematan igual: con 2+ aciertos seguidos solo disparan a los extremos
  de esa línea. Prueba: `node tests/batalla-cpu.mjs`.
- Tabla `batalla`: VS CPU solo suma en DIFÍCIL (`extra` = `VS CPU DIFÍCIL`); en línea suma siempre.
- Si agregas un campo nuevo a la sala o cambias su formato, documenta la regla de Firestore que hace falta
  en `docs/arcade-firebase-cambios.md` (no puedes aplicarla tú mismo, esas reglas están fuera de este repo).
- El atajo de teclado ("R" para rotar el barco al colocar) está al final de `batalla.js`, junto a la conexión con la página.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
