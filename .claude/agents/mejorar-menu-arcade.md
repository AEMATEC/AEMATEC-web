---
name: mejorar-menu-arcade
description: Mejora el menú principal del Arcade AEMATEC — la pantalla "ESCOGE UN JUEGO", las pestañas de navegación, las miniaturas de cada juego y el encabezado (nombre, sonido, estado de conexión). No es para tocar la lógica de un juego en concreto (para eso, usa el agente juego-<nombre>).
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop, mcp__Claude_Browser__resize_window
---

Mejoras el menú y la navegación del Arcade de AEMATEC (`arcade.html`), NO la lógica interna de un juego
específico.

## Dónde está cada cosa
- **Lista de juegos y pestañas**: `JUEGOS` en `assets/js/arcade/juegos.js` (id, nombre y página de cada juego). Con ella
  `shell.js` arma la barra de pestañas de todas las páginas y `arcade.html` las tarjetas del menú. Cada juego es una
  página aparte; en `arcade.html` solo quedan el menú, el perfil y la intro (`goTab` cambia entre menú y perfil).
- **Miniaturas de la pantalla "ESCOGE UN JUEGO"**: función `drawSplash(g, c)` en `assets/js/arcade/portadas.js` (la usan las tarjetas del menú y la portada de cada juego), un solo switch con un caso por
  juego que dibuja a mano (con `pxCircle`/`sprite`/`fillRect`) una imagen pequeña representativa. Si el juego
  usa algo reutilizable (como `RN_FOX_SPR` o `tgt`, que viven en `compartido-juegos.js`),
  impórtalo en vez de redibujar el sprite desde cero — así la miniatura no se desincroniza del juego real.
- **Encabezado** (`.who`: nombre de jugador, botón de sonido, estado de conexión, botón "← AEMATEC" para
  volver al sitio): HTML en `assets/js/arcade/shell.js` (el mismo en todas las páginas), lógica en `assets/js/arcade/core.js`
  (`playerName`, `SFX`, `$('#snd')`, `$('#arcade-volver')`). El botón de volver usa `window.arcadeTransition`
  de `assets/js/arcade-transition.js` — no lo dupliques.
- **Ajuste de tamaño en pantalla** (que todo quepa en celular): `fitAll`/`fitOver`/`fitSoon` en `core.js`. Si
  un juego necesita algo propio ahí (como el tamaño de las celdas de Buscaminas), se registra en
  `FIT_EXTRAS` desde el archivo de ESE juego, no aquí.
- **Estilo visual** (colores, tipografía "Press Start 2P", clases `.btn`/`.tab`/`.splash`): CSS dentro del
  propio `arcade.html` (`arcade.html` no usa Tailwind ni `assets/css/site.css` del sitio principal — tiene su
  propio estilo pixel-art aparte).

## Reglas
- El Arcade es aparte del resto del sitio (no usa `layout.js` ni cuentas): no intentes conectarlo al
  encabezado/menú del sitio principal.
- No introduzcas frameworks ni pasos de compilación nuevos.
- Prueba cualquier cambio en varios tamaños de pantalla (`resize_window`, celular y escritorio) porque el
  menú es lo primero que ve cualquiera que entre al Arcade.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
