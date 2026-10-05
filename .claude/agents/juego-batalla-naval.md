---
name: juego-batalla-naval
description: Arregla o mejora Batalla Naval dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, la IA de la CPU, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Batalla Naval**, dentro del `<script type="module">` de `arcade.html` (todavía no se separó a su
propio archivo — revisa si `assets/js/arcade/batalla.js` ya existe cuando trabajes en esto; si no, sigue el
patrón de `assets/js/arcade/tiro.js` como ejemplo de cómo separarlo, y actualiza la sección "Arcade" de
`AGENTS.md` cuando lo hagas). Busca el bloque `/* ===... BATALLA NAVAL ... === */`.

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
- El bucle principal (al final de `arcade.html`) y el atajo de teclado ("R" para rotar barco al colocar)
  llaman a funciones de `BS` por nombre — si algún día separas este juego a su propio archivo, esas líneas
  del bucle se quedan iguales, solo que llamando a algo importado en vez de algo definido ahí mismo (igual
  que ya se hizo con Buscaminas, Animal al Tiro y La Huida del Zorro).

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
