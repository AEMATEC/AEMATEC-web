---
name: juego-cruzar-la-calle
description: Arregla o mejora Cruzar la Calle dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, dificultad de los carriles, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Cruzar la Calle**, dentro del `<script type="module">` de `arcade.html` (todavía no se separó a
su propio archivo — revisa si `assets/js/arcade/cruce.js` ya existe; si no, sigue el patrón de
`assets/js/arcade/tiro.js` para separarlo). Busca el bloque `/* === CRUZAR LA CALLE === */`.

- Estado del juego: objeto `CR` (prefijo `cr`). La rana se dibuja con `crDrawFrog` (píxeles cuadrados, no
  un círculo liso) y la MISMA función se usa para la miniatura del menú (`drawSplash`, caso `'cruce'`) — si
  rediseñas la rana, hazlo en `crDrawFrog` para que ambas vistas seques iguales, no dupliques el dibujo.
- Carriles con su propia velocidad y densidad de carros/camiones; sube de nivel y de tema (día, noche,
  desierto, ciudad) cada vez que se llega a la meta. 3 vidas.
- **Tiene modo en línea** (hasta 4 personas, cada quien su rana en el mismo tablero en tiempo real): colección
  `cruces/{code}` y su subcolección `players`, con un campo `level` por jugador (las ranas de otro nivel se
  ven transparentes). Si tocas el modo en línea, prueba con más de una sesión antes de darlo por bueno.
- En línea, `CR.resultShown` (evita mostrar resultados dos veces) se reinicia en `crSync` al empezar cada
  partida nueva (`roundStartMs` distinto). Si no, la segunda partida no mostraba resultados ni subía el puntaje.
- Si agregas un campo a la sala, documenta la regla de Firestore que hace falta en
  `docs/arcade-firebase-cambios.md`.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
