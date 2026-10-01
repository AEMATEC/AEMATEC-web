# Instrucciones para el agente de mantenimiento del sitio AEMATEC

Este archivo sirve para cualquier agente de IA (Claude Code, GitHub Copilot, Codex, Cursor, Gemini…) y para
personas. Claude Code lo lee a través de `CLAUDE.md`.

Mantienes el sitio de la Asociación de Estudiantes de Enseñanza de la Matemática con Entornos
Tecnológicos (TEC). Quien te habla suele ser una persona de la Junta Directiva **sin experiencia en
programación**: responde en español, con palabras simples, y explica qué tiene que hacer ella (si algo)
paso a paso.

## Antes de cambiar algo
- Lee `README.md` (módulos, roles, colecciones, publicación) y `docs/PLAN.md` (fases pendientes y
  requisitos del Reglamento Interno).
- El **Reglamento Interno (RI)** manda. Si un cambio toca préstamos, Medios Oficiales, Fiscalía, padrón,
  plazos o datos personales, revisa los requisitos en `docs/PLAN.md` y cita el artículo en un comentario.
  Si una petición contradice el RI, dilo antes de hacerla.

## Cómo trabajar
- Nunca subas cambios directo a `main`. Trabaja en una rama y abre un PR. La persona te da visto bueno y haces el merge.
- Al hacer merge a `main`:
  - GitHub Pages publica las páginas HTML en <https://aematec.github.io/AEMATEC-web/>.
  - El flujo `.github/workflows/firebase.yml` prueba y publica las reglas y las Cloud Functions.
  - **No publiques a mano** ni pidas a la persona copiar reglas en la consola de Firebase.
- Para publicar o revisar una publicación, o para el cambio de Junta Directiva, sigue las guías de abajo.

## Guías paso a paso
Están en `.claude/skills/` porque Claude Code las carga solas, pero son texto normal: cualquier agente o
persona puede leerlas y seguirlas.
- **Publicar cambios** y revisar o arreglar una publicación que falló:
  [`.claude/skills/publicar-cambios/SKILL.md`](.claude/skills/publicar-cambios/SKILL.md).
- **Traspaso a una nueva Junta Directiva** (cuentas, correos, padrón, Fiscalía, secretos):
  [`.claude/skills/traspaso-de-junta/SKILL.md`](.claude/skills/traspaso-de-junta/SKILL.md).
- **Temas de temporada** (Navidad, Halloween, mes patrio, Semana de la Carrera…: agregar, cambiar o quitar):
  [`.claude/skills/temas-de-temporada/SKILL.md`](.claude/skills/temas-de-temporada/SKILL.md).

Si la guía menciona herramientas de GitHub de Claude (`mcp__github__…`), usa las equivalentes de tu agente o
revisa la pestaña **Actions** del repositorio en GitHub.

## Reglas que no se rompen
- **Público por defecto (decisión de la Junta, 2026-09):** no agregues inicios de sesión para ver, descargar,
  proponer material o pedir préstamos. El Repositorio docente es para cualquier docente. Pide identificación
  solo en la acción que la necesita (p. ej. un trámite de persona Asociada), en ese momento.
- **Datos personales (RI Art. 143, Ley 8968):** nada de correos, carnés ni teléfonos personales en
  colecciones o documentos de lectura pública. Si una página pública necesita datos de personas, usa un
  documento derivado con solo lo publicable (como `config/junta_publica`).
- **Fiscalía es independiente de la Junta (RI Art. 42):** lo dirigido a Fiscalía no debe poder leerlo la Junta.
  Excepción acordada: la Junta sí puede editar la lista `fiscalia` (para registrar a la nueva persona Fiscal).
- **Nombres:** "Repositorio" es el repositorio digital de materiales; "Biblioteca" es solo la colección física de
  libros del Inventario (RI Art. 128). No los mezcles en textos nuevos.
- **Secretos:** nunca en el repositorio ni en el chat (claves de cuentas de servicio, contraseñas de Gmail).
  Van en GitHub → Settings → Secrets and variables → Actions.
- **Los permisos se aplican en `firestore.rules` y `storage.rules`.** Ocultar un botón no protege nada.
- Todo dato de Firestore que se muestre en una página se escapa (`escapeHtml`) o se asigna con
  `textContent`. Los enlaces que vienen de datos se validan como `https:`.

## Trámites
- Los trámites **solo los crean las Cloud Functions** (`functions/tramites.js`); las reglas impiden crearlos desde el
  navegador. Si agregas un tipo de trámite, hazlo en `TIPOS` de ese archivo y agrega su prueba.
- Una denuncia anónima a Fiscalía **nunca** guarda correo, nombre ni uid. La prueba "una denuncia anónima no guarda
  nada que identifique a la persona" (`tests/funciones.test.js`) debe seguir pasando.

## Validar antes de abrir el PR
- Si cambiaste reglas o Functions: agrega o ajusta casos en `tests/reglas.test.js` o `tests/funciones.test.js`
  (necesita `npm install` también en `functions/`) y ejecuta
  `cd tests && npm install && npm test` (necesita Java). Todas las pruebas deben pasar.
- Si cambiaste Functions: `cd functions && npm install && node -e "require('./index.js')"`.
- Si cambiaste páginas: `node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs` (también corren solos en
  cada PR). Si agregaste o cambiaste clases de Tailwind (en HTML o en `assets/js`), ejecuta `npm install && npm run css`
  y sube `assets/css/tailwind.css`; nunca lo edites a mano. Prueba la
  página con `python3 -m http.server 5500`. Explica en el PR qué conviene revisar visualmente.
- Para Firebase, roles y utilidades usa los módulos de `assets/js/` (`firebase.js`, `roles.js`, `util.js`)
  en lugar de volver a escribir `initializeApp`, listas de correos o `escapeHtml` en la página.
- El encabezado, el menú (y el sub-menú del Repositorio) y el pie son comunes: se editan solo en
  `assets/js/layout.js` y `assets/css/site.css`. Una página nueva los incluye con
  `<script src="assets/js/layout.js" data-part="header" data-active="…"></script>` y
  `<script src="assets/js/layout.js" data-part="footer"></script>`, y en el `<head>` carga
  `<link rel="stylesheet" href="assets/css/site.css">` seguido de `<link rel="stylesheet" href="assets/css/tailwind.css">`
  (no uses el CDN de Tailwind).
- Si cambias el encabezado (su forma, posición o la clase `.site-header`), los colores base o las tipografías del sitio,
  revisa también `assets/css/temas.css` (franja bajo el encabezado y aviso de los temas de temporada) y compruébalo con
  `?tema=semana-carrera` y `?tema=navidad`, en computadora y celular.

## Archivos de páginas
- Las páginas usan nombres cortos (`repositorio*.html`, `inventario.html`, `junta-directiva.html`, `tramites.html`).
- Si agregas o renombras una página, agrégala también en `assets/js/site-pages.js` (buscador de la portada y
  asistente).
- Mientras el sitio no sea público, una página se puede renombrar sin dejar redirección: actualiza todos los enlaces
  (`node tests/revisar-enlaces.mjs` avisa si queda alguno roto). Cuando el sitio se anuncie, deja una redirección
  en el nombre anterior para no romper enlaces guardados.

## Arcade
`arcade.html` es aparte: tiene su propio estilo y su propio proyecto de Firebase (`arcade-matec`), no usa
`layout.js` ni cuentas del sitio. Sus reglas no están en este repositorio: si un cambio del Arcade escribe datos
nuevos, documéntalo para quien administra `arcade-matec` (ver `docs/arcade-firebase-cambios.md`).

El Arcade se está separando en archivos por juego, sin perder la experiencia de una sola página (cambiar de
juego sigue siendo instantáneo, sin recargar). El patrón ya está en marcha:
- `assets/js/arcade/core.js`: todo lo compartido (Firebase, `$`/`esc`/`store`, `SFX`, `LB`, sprites base
  `sprite`/`scaled`/`pxCircle`/`SPR`, `EGG`, y el ajuste de tamaño `fitAll`/`fitOver`/`fitSoon`). Es un módulo
  (`export`); cualquier juego, esté o no ya separado, importa de aquí lo que necesite.
- Ya separados, como ejemplo del patrón a seguir: `assets/js/arcade/minas.js` (Buscaminas),
  `assets/js/arcade/tiro.js` (Animal al Tiro), `assets/js/arcade/runner.js` (La Huida del Zorro) — los tres
  sin partidas en línea, por eso se hicieron primero (menos riesgo).
- Los juegos con partidas en línea (Batalla Naval, Carreras, Combate de Funciones, 21, Billar, Duelo del
  Oeste, Golf, Cruzar la Calle) siguen dentro del `<script type="module">` de `arcade.html`, que importa de
  `core.js` lo mismo que los ya separados. Sepáralos con más cuidado que los anteriores: prueba el modo en
  línea de verdad (dos sesiones a la vez) después de separar cada uno, no solo el modo local/CPU.
- Lo que NO se movió a `core.js` a propósito (`tab`, `goTab`, `GAMES`, el bucle `loop()` que llama al
  tick/draw de cada juego activo, `drawSplash` con las miniaturas del menú, la navegación entre pestañas)
  sigue en `arcade.html` porque conecta a TODOS los juegos a la vez. Un juego ya separado que necesite algo
  de ahí (como `goTab`, que La Huida del Zorro usa para su botón "MENÚ") deja esa línea conectada desde
  `arcade.html` en vez de importarla — no hay nada que importar todavía, `goTab` no vive en un archivo aparte.
- Si un juego necesita algo propio en el ajuste de tamaño (como Buscaminas con el tamaño de sus celdas,
  que `core.js` no puede conocer), que se registre en `FIT_EXTRAS` (exportado por `core.js`) desde su propio
  archivo, en vez de que `core.js` tenga que conocer ese juego.
- Antes de separar un juego, revisa con cuidado qué usan de él OTROS juegos o `drawSplash` (por ejemplo,
  `RN_FOX_SPR` lo usa la miniatura del menú, y `pxCircle`/`sprite`/`scaled` los usa casi todo el Arcade) —
  un símbolo usado fuera del bloque del juego tiene que exportarse, no puede quedar solo dentro del archivo
  nuevo.

Hay un agente por juego (`.claude/agents/juego-*.md`) con los detalles de cada uno (prefijo de su estado,
si tiene modo en línea, en qué archivo vive). También hay `mejorar-menu-arcade` (menú, miniaturas,
navegación), `crear-musica-arcade` (efectos de sonido y música; cada juego tiene su canción en
`assets/js/arcade/musica/<id>.js`) y `pixelart-arcade` (sprites y estilo
visual). Sigue separando uno a la vez y probando bien cada uno antes de seguir con el siguiente — no todos
de golpe.

Golf tiene un **creador de hoyos**: cualquiera diseña uno y lo envía a `golfHoyosPropuestos` (arcade-matec); un
moderador lo aprueba desde "PROPUESTAS DE LA COMUNIDAD" con un código compartido (constante `GFP_MOD_CODE` en
`arcade.html`, no es una contraseña fuerte, ver `docs/arcade-firebase-cambios.md`) y ahí se suma a "JUGAR SOLO".
Si se agrega este mismo patrón a otro juego con mapas/pistas, sigue la misma idea: propuesta pendiente → código
de moderador → se integra solo en modo local (no se sincronizó para partidas en línea, por simplicidad).

## Estilo del código
Sitio estático: HTML + Tailwind compilado (`assets/css/tailwind.css`, ver `tailwind.config.js`) + JavaScript modular en línea, con el SDK de Firebase 10.12.2
desde `gstatic`. Imita el código que rodea al cambio. El único paso de compilación es `npm run css`
(Tailwind). No introduzcas frameworks ni otros pasos de compilación.
