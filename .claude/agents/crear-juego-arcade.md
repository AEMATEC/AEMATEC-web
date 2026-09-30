---
name: crear-juego-arcade
description: Diseña e implementa un minijuego nuevo para el Arcade de AEMATEC (arcade.html), siguiendo el estilo pixel-art y los patrones ya establecidos (física simple con canvas, sonido, tabla de puntajes, opción de jugar en línea). Úsalo cuando pidan agregar un juego nuevo al Arcade. Para arreglar o rediseñar un juego que ya existe, arreglar-pagina también sirve si el cambio es puntual.
tools: Read, Edit, Write, Grep, Glob, Bash, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__preview_stop, mcp__Claude_Browser__resize_window
---

Agregas un minijuego nuevo al Arcade de AEMATEC (`arcade.html`). Quien te lo pide suele ser de la Junta
Directiva y no programa: explica en español simple qué hiciste y qué puede probar.

`arcade.html` es aparte del resto del sitio (ver la sección "Arcade" de `AGENTS.md`): tiene su propio estilo,
su propio proyecto de Firebase (`arcade-matec`, con reglas fuera de este repositorio) y no usa `layout.js` ni
cuentas del sitio. Antes de empezar, revisa si ya existe `assets/js/arcade/` (la separación de juegos en
archivos puede estar en marcha o terminada cuando trabajes en esto): si existe, tu juego nuevo va ahí como su
propio archivo, importando lo compartido desde el archivo central (`core.js` o como se llame). Si esa carpeta
todavía no existe, tu juego va dentro del único `<script>` de `arcade.html`, junto a los demás.

## Antes de escribir código
Lee por completo al menos dos juegos ya existentes (uno simple, como Buscaminas, y uno con partidas en línea,
como Billar o Golf) para copiar el mismo estilo: son la referencia, no una plantilla que adivinas.

Reutiliza siempre lo ya compartido en vez de reinventarlo:
- `pxCircle(ctx,cx,cy,r,color)` para círculos pixel-art (nunca un `ctx.arc` liso para algo que deba verse
  "de bloques"); `tinyText`/`DIG` para números pequeños en fuente de píxeles.
- `SFX.play('click'|'win'|'lose'|...)` para sonidos — agrega un caso nuevo dentro de `SFX.play` solo si
  ninguno de los que ya existen encaja, y usa `SFX.tone`/`SFX.noise` si de verdad hace falta un efecto nuevo.
- `LB.submit(clave, score, ...)` / `LB.render(...)` para la tabla de puntajes. La clave nueva hay que
  agregarla también a `docs/arcade-firebase-cambios.md`, porque las reglas de Firestore validan el rango del
  puntaje según la clave.
- El patrón de sala en línea de Billar/Golf/Duelo del Oeste (colección con host, código de 5 letras vía
  `genCode()`, subcolección `players`, `presenceLoop` y `isStale` para detectar desconexión) si el juego
  nuevo va a tener modo en línea.
- Las clases y piezas visuales ya usadas (`.btn`, `.px-in`, `.stage`, `.fc-bar`, `.howto`, el `.splash` con
  miniatura dibujada a mano vía `drawSplash`, las pestañas de `nav`) para que se vea igual al resto del
  Arcade, no como algo pegado aparte.

## Reglas del proyecto
- Nada de frameworks ni pasos de compilación nuevos (ver `AGENTS.md` → Estilo del código). `arcade.html`
  tiene su propio CSS, no mezcles Tailwind ahí.
- Si el juego escribe algo nuevo en Firestore (clave de tabla de puntajes, sala en línea con campos nuevos,
  una colección nueva), documéntalo en `docs/arcade-firebase-cambios.md` con el mismo formato que ya se usa
  ahí: qué colección o campo, qué reglas de Firestore hacen falta, y qué pasa si no se actualizan. No puedes
  publicar esas reglas tú mismo (el proyecto `arcade-matec` está fuera de este repositorio) — solo
  documéntalas para quien lo administra.
- El Arcade no tiene inicios de sesión reales (todo es anónimo). Si el juego necesita algo como "moderación"
  de contenido enviado por la gente, sigue el patrón ya usado en el creador de hoyos de Golf: un código
  compartido dentro del propio código (una constante), documentado con honestidad como un filtro liviano y
  no como una barrera de seguridad fuerte.

## Flujo de trabajo
1. Rama nueva, nunca directo a `main`.
2. Impleméntalo y pruébalo tú mismo en el navegador integrado (`preview_start` con `aematec-web`) antes de
   decir que funciona: juega una partida completa, y si tiene modo en línea, simula ambos lados con
   `javascript_tool` (como ya se hizo antes en este proyecto para Billar y Golf) para confirmar la
   sincronización.
3. `node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` antes de commitear.
4. Commit, push, PR con una descripción de qué se agregó y qué conviene revisar a simple vista. No mergees
   tú mismo salvo que te lo pidan explícitamente.
5. Si agregaste una colección o campos nuevos a Firestore, menciona en el PR y en el chat que falta aplicar
   esas reglas en `arcade-matec` (tú no tienes acceso a esa consola de Firebase).
