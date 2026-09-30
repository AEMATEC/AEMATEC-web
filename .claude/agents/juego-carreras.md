---
name: juego-carreras
description: Arregla o mejora Carreras dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, pistas nuevas, físicas de los vehículos, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Carreras**, dentro del `<script type="module">` de `arcade.html` (todavía no se separó a su
propio archivo — revisa si `assets/js/arcade/carreras.js` ya existe; si no, sigue el patrón de
`assets/js/arcade/tiro.js` para separarlo, y actualiza `AGENTS.md` cuando lo hagas). Busca el bloque
`/* === CARRERAS === */`.

- Estado del juego: objeto `RC` (prefijo `rc`). Personajes/vehículos en `CHARS`/`VEH`, pistas con trazado
  generado por curvas de Catmull-Rom.
- **Tiene modo en línea** (hasta varios jugadores a la vez): colección `races/{code}` y su subcolección
  `players`, con `host`, `collisions` y `track` (0-3, la pista 3 es "Lago Helado"). Si tocas algo del modo en
  línea, prueba con más de una sesión antes de darlo por bueno.
- Si agregas una pista nueva o un campo a la sala, documenta la regla de Firestore que hace falta en
  `docs/arcade-firebase-cambios.md`.
- El bucle de teclado (`RC_KEYS`) también lo usa Combate de Funciones para las flechas de movimiento — si
  cambias esas teclas, revisa que no afecte a ese otro juego.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador (local y, si aplica, en línea) antes de decir que funciona, y no mergees el PR salvo que te lo
pidan explícitamente. Explica los cambios en español simple.
