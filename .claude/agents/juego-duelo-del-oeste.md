---
name: juego-duelo-del-oeste
description: Arregla o mejora Duelo del Oeste (el duelo de reflejos) dentro del Arcade AEMATEC (arcade.html). Úsalo para bugs, tiempos de reacción, apariencia de los personajes, el modo en línea o funciones nuevas de ESTE juego en concreto.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop
---

Mantienes **Duelo del Oeste**, dentro del `<script type="module">` de `arcade.html` (todavía no se separó a
su propio archivo — revisa si `assets/js/arcade/duelo.js` ya existe; si no, sigue el patrón de
`assets/js/arcade/tiro.js` para separarlo). Busca el bloque `/* === DUELO DEL OESTE === */`.

- Estado del juego: objeto `DL` (prefijo `dl`). Cuenta regresiva con una espera sorpresa antes del "¡YA!";
  disparar antes de tiempo pierde la ronda. Al mejor de 3.
- Modos: VS CPU (vaquero robot), 2 jugadores locales (teclas A/L), y en línea.
- **Tiene modo en línea**: colección `duelos/{code}` en Firestore (`arcade-matec`), con `A`/`B` (anfitrión y
  invitado) y su apariencia (`A.look`/`B.look`: `hat`, `hatColor`, `poncho`, `pattern`, cada uno un mapa con
  esas 4 claves). Si tocas algo del modo en línea, prueba con más de una sesión antes de darlo por bueno.
- Tabla de puntajes doble: `duelo` (duelos ganados VS CPU, solo en DIFÍCIL) y `duelo_reaccion` (mejor tiempo de reacción en ms,
  menor es mejor; solo cuenta contra CPU o en línea, no en 2 jugadores locales).
- Dificultad VS CPU (`DL_BOT`, guardada en `pa_dl_bot`): retraso del CPU tras el "¡YA!" de 450–800 ms
  (FÁCIL), 220–520 ms (MEDIO) y 150–280 ms (DIFÍCIL). El modo en línea NO se toca: gana quien reclama
  primero la ronda en la transacción de `dlClaim` (decisión de la Junta, 2026-10).
- Si agregas un campo a la sala, documenta la regla de Firestore que hace falta en
  `docs/arcade-firebase-cambios.md`.

Sigue las reglas generales de `AGENTS.md`: rama nueva, nunca directo a `main`,
`node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes del PR, pruébalo de verdad en el
navegador antes de decir que funciona, y no mergees el PR salvo que te lo pidan explícitamente. Explica los
cambios en español simple.
