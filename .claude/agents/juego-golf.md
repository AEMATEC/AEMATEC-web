---
name: juego-golf
description: Arregla o mejora Golf dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, hoyos/temas, física (hielo, viento, rampas), el creador de hoyos de la comunidad, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Golf**, dentro del `<script type="module">` de `arcade.html` (todavía no se separó a su propio
archivo — revisa si `assets/js/arcade/golf.js` ya existe; si no, sigue el patrón de
`assets/js/arcade/tiro.js` para separarlo, con cuidado extra porque este juego es grande y tiene modo en
línea + el creador de hoyos). Busca el bloque `/* === GOLF === */`.

- Estado del juego: objeto `GF` (prefijo `gf`), más `GFB` (el constructor de hoyos, prefijo `gfb`) y las
  propuestas de la comunidad (prefijo `gfp`).
- 6 hoyos base en `GF_HOLES`, cada uno con un `theme` (parque/bosque/desierto/playa/nieve/ciudad). Mecánicas:
  arena (`sand`, mucha fricción), hielo (`ice`, casi nada de fricción), agua (`water`, penalidad y regreso al
  último lugar seguro), viento (`wind`, empuja la bola mientras rueda) y rampas (`ramps`, saltas por encima
  de lo que haya adelante si llegas rápido — mientras `ball.airT > 0` no hay colisión con paredes/arena/agua).
- Control de tiro: tocar hacia donde quieres tirar, barra de fuerza (`#gf-power`) y botón "¡GOLPEAR!"
  (`#gf-shoot`) — igual que Billar, no vuelvas al arrastrar-y-soltar viejo.
- **Creador de hoyos**: cualquiera diseña uno en "CREAR UN HOYO" y lo envía a `golfHoyosPropuestos`
  (Firestore, `arcade-matec`) como pendiente. Cualquiera puede darle "▶ PROBARLO" a una propuesta y jugarla.
  Desde "PROPUESTAS DE LA COMUNIDAD" se aprueba, rechaza o borra iniciando sesión con una cuenta de
  correo/contraseña PROPIA de `arcade-matec` (no la del sitio, ver `assets/js/arcade/moderacion.js`, una
  segunda app de Firebase aparte de la anónima con la que se juega). Las reglas (`esModerador()`) solo
  revisan si la sesión inició con contraseña — sin Cloud Function ni tocar Google Cloud. Hace falta el 75%
  de los moderadores (redondeado hacia arriba, cuenta `arcadeModeradores`) votando lo mismo para decidir —
  el conteo de votos (`votosAprobar`/`votosRechazar`) lo hace `gfpVotar()` en `arcade.html`, las reglas solo
  confirman que quien escribe es un moderador real. Los hoyos aprobados se agregan después de los 6 base
  SOLO en "JUGAR SOLO" (el modo en línea sigue usando nada más los 6 de siempre, a propósito, para no
  complicar la sincronización entre jugadores).
- **Tiene modo en línea** (hasta 4 jugadores en el mismo recorrido): colección `golf/{code}` y su subcolección
  `players`. Si tocas el modo en línea, prueba con más de una sesión antes de darlo por bueno.
- En línea, `gfSimulateAll` también salta agua y hoyo mientras `airT > 0` (antes una pelota que volaba
  sobre el agua desde una rampa se daba por ahogada). Al caer al agua se ve "¡AL AGUA! +1 GOLPE" en ambos modos.
- Paredes de cactus (desierto) y tronco de palmera (playa) se dibujan del tamaño completo de su rectángulo
  de choque: si cambias un dibujo de pared, que siga ocupando todo el rectángulo.
- Tiempo por turno en línea: `GF_TURN_S` (30 s), con cuenta regresiva. Cada cliente calcula `GF.tEnd` al ver
  un turno nuevo (como `FC.tEnd` en Combate) y al acabarse el jugador activo tira con fuerza 0
  (`gfOnlineShoot(0, 0)`: cuenta un golpe y pasa el turno). Sin campos nuevos en Firestore.
- Si agregas un campo a la sala o cambias el formato de `golfHoyosPropuestos`, documenta la regla de
  Firestore que hace falta en `docs/arcade-firebase-cambios.md`.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
