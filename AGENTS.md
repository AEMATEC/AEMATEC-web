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
- Para Firebase, roles y utilidades usa los módulos de `assets/js/` (`firebase.js`, `roles.js`, `util.js`,
  `acceso.js` para iniciar sesión, `recursos.js` y `cursos.js` para el Repositorio) en lugar de volver a escribir
  `initializeApp`, listas de correos, `escapeHtml`, la lista de cursos o la consulta de materiales en la página.
- El encabezado, el menú (y el sub-menú del Repositorio) y el pie son comunes: se editan solo en
  `assets/js/layout.js` y `assets/css/site.css`. Una página nueva los incluye con
  `<script src="assets/js/layout.js" data-part="header" data-active="…"></script>` y
  `<script src="assets/js/layout.js" data-part="footer"></script>`, y en el `<head>` carga
  `<link rel="stylesheet" href="assets/css/site.css">` seguido de `<link rel="stylesheet" href="assets/css/tailwind.css">`
  (no uses el CDN de Tailwind).
- Si cambias el encabezado (su forma, posición o la clase `.site-header`), los colores base o las tipografías del sitio,
  revisa también `assets/css/temas.css` (colores del encabezado, guirnalda bajo él y aviso de los temas de temporada) y compruébalo con
  `?tema=semana-carrera` y `?tema=navidad`, en computadora y celular.

## Archivos de páginas
- Las páginas usan nombres cortos (`repositorio*.html`, `inventario.html`, `junta-directiva.html`, `efemerides.html`, `tramites.html`).
- **Temas de temporada:** ya no llevan franja de color bajo el encabezado; cada tema trae `--tema-fondo` y `--tema-cabecera` (colores de la página) en `assets/css/temas.css`. Un tema nuevo debe definirlos.
- **Pizarra:** los anuncios públicos se crean siempre con `aprobado:false`; no muestres nada sin aprobar ni agregues datos personales.
- **Efemérides:** para agregar o corregir una fecha del calendario edita `assets/js/efemerides-datos.js` (`FIJAS` para fechas que no cambian, `movibles` para las que se mueven) y corre `node --test tests/efemerides.test.js`. Los calendarios MEP y TEC no tienen fuente automática: sus fechas las edita la Junta desde `admin.html` (colección `efemerides`); no inventes fechas de años que aún no publican. Solo fechas ciertas y con descripción corta; no afirmes que algo es feriado: la página remite al calendario oficial del MTSS.
- **Propuesta de portada y Documentación** (`index-propuesta.html`, `documentacion.html`): usan solo
  `assets/css/portada-propuesta.css`; sus reglas de diseño están en README → «Diseño de la propuesta de portada». Las
  carpetas de Documentación son enlaces de SharePoint que solo abren con cuenta `@estudiantec.cr`: no copies sus
  archivos al repositorio. Por decisión de la Junta, Documentación todavía no va en el menú ni en `site-pages.js`.
- Si agregas o renombras una página, agrégala también en `assets/js/site-pages.js` (buscador de la portada y
  asistente).
- Mientras el sitio no sea público, una página se puede renombrar sin dejar redirección: actualiza todos los enlaces
  (`node tests/revisar-enlaces.mjs` avisa si queda alguno roto). Cuando el sitio se anuncie, deja una redirección
  en el nombre anterior para no romper enlaces guardados.

## Arcade
`arcade.html` es aparte: tiene su propio estilo y su propio proyecto de Firebase (`arcade-matec`), no usa
`layout.js` ni cuentas del sitio. Sus reglas no están en este repositorio: si un cambio del Arcade escribe datos
nuevos, documéntalo para quien administra `arcade-matec` (ver `docs/arcade-firebase-cambios.md`).

El Arcade es **una sola página con pestañas** (`arcade.html`), pero el código de cada juego vive en su propio archivo
(cambiar de juego sigue siendo instantáneo, sin recargar). Cómo está armado:
- `assets/js/arcade/<juego>.js`: un módulo por juego — `minas.js`, `batalla.js`, `tiro.js`, `carreras.js`, `funciones.js`,
  `casino21.js`, `billar.js`, `duelo.js`, `runner.js`, `golf.js` y `cruce.js`. Cada uno trabaja sobre su sección HTML
  (`#g-<id>`) de `arcade.html`, que importa el módulo y este se conecta solo (su bucle de dibujo y su teclado van al final del archivo).
- `core.js`: todo lo compartido (Firebase, `$`/`esc`/`store`, `SFX`, `LB`, sprites base, ajuste de tamaño `fitAll`/`fitOver`/`fitSoon`).
  Si un juego necesita algo propio en el ajuste de tamaño, se registra en `FIT_EXTRAS` desde su archivo.
- `estado.js`: lo que une a todos los juegos: `arcade.tab` (pestaña abierta), `arcade.goTab('menu')`, `registrarBucle(fn)` (cada juego
  registra su parte del bucle; `arcade.html` solo lo corre) y `splashOn(id)`.
- `compartido-juegos.js`: ayudantes y sprites que usan varios juegos o las miniaturas/el perfil (`pickRow`, `pedirAbandonar`, `vspr`,
  `soldier`, `blBallImg`, `crDrawFrog`, `RN_FOX_SPR`, `tgt`, `MODES`, `TRACKS`, `rcLbKey`…). Un símbolo que usa otro juego o
  `arcade.html` va aquí, no dentro del archivo del juego (el menú no debe cargar el código de todos los juegos).
- `portadas.js`: `drawSplash` (miniaturas del menú y portada de cada juego).
- Lo que sigue en `arcade.html` a propósito: las secciones HTML de todos los juegos, `goTab` y la navegación, el menú, la intro, la
  música del menú y el perfil, porque conectan a TODOS los juegos.
- Para agregar un juego: sección HTML en `arcade.html`, módulo nuevo (copia `minas.js`, o `cruce.js` si tiene partidas en línea),
  `import` en `arcade.html`, entrada en `GAMES`, miniatura en `portadas.js`, canción en `musica/<id>.js` y, si tiene récords, su clave en
  `pfCatalogoRecords`. `node tests/revisar-arcade.mjs` avisa si falta algo.
- Los juegos con partidas en línea se prueban de verdad con dos sesiones a la vez (emulador de Firestore con
  `arcade-firebase/firestore.rules`), no solo el modo local/CPU.

**Tetris** es una página aparte (`tetris.html`, con `assets/js/arcade/tetris.js` y las reglas del juego en `tetris-motor.js`, probadas con `tests/tetris.test.js`). Usa `core.js` y `musica.js` (su canción es `musica/tetris.js`) y el mismo estilo del Arcade (`assets/css/arcade-juegos.css` + `tetris.css` con lo suyo). Las pestañas de tetris.html abren `arcade.html?juego=<id>`; la pestaña TETRIS de arcade.html y la tarjeta del menú (`href` en `GAMES`) llevan a tetris.html. Sus reglas de Firebase (`tetris`, `tetris_vs`) viven en `arcade-firebase/firestore.rules` y se copian a mano.

Hay un agente por juego (`.claude/agents/juego-*.md`) con los detalles de cada uno (prefijo de su estado,
si tiene modo en línea, en qué archivo vive). También hay `mejorar-menu-arcade` (menú, miniaturas,
navegación), `crear-musica-arcade` (efectos de sonido y música; cada juego tiene su canción en
`assets/js/arcade/musica/<id>.js`) y `pixelart-arcade` (sprites y estilo
visual). Sigue separando uno a la vez y probando bien cada uno antes de seguir con el siguiente — no todos
de golpe.

Golf tiene un **creador de hoyos**: cualquiera diseña uno y lo envía a `golfHoyosPropuestos` (arcade-matec).
Para aprobarlo, rechazarlo o borrarlo desde "PROPUESTAS DE LA COMUNIDAD" hace falta iniciar sesión con una
cuenta de correo/contraseña **propia de `arcade-matec`** (no la del sitio principal — ver
`assets/js/arcade/moderacion.js`, una segunda app de Firebase aparte de la anónima con la que todo el mundo
juega). Las reglas de `arcade-matec` (`esModerador()`) revisan que la sesión actual haya iniciado con
contraseña **y** que ese correo tenga su documento en `arcadeModeradores` — sin Cloud Function, sin cuenta
de servicio, sin tocar Google Cloud Console (el segundo requisito hace falta porque solo la contraseña no
basta: cualquiera puede crearse una cuenta de correo/contraseña con la API pública de Firebase Auth, y desde
los perfiles opcionales de abajo cualquier persona SÍ tiene de verdad una cuenta así). Hace falta que el 75%
de los moderadores (redondeado hacia arriba) vote lo mismo para que una propuesta quede aprobada o
rechazada; el conteo lo hace el propio navegador leyendo la
colección `arcadeModeradores` (un documento por correo, se administra a mano en la consola de Firestore —
no hay forma de contar cuentas de Authentication desde el navegador). Quién puede moderar lo decides tú
creando la cuenta en Authentication → Users **y** su documento en `arcadeModeradores` (ver
`docs/arcade-firebase-cambios.md`, sección 3.3). Si se agrega este mismo patrón a otro juego con mapas/pistas,
sigue la misma idea: propuesta pendiente → votación de moderadores del Arcade → se integra solo en modo local
(no se sincronizó para partidas en línea, por simplicidad).

El Arcade tiene **perfiles opcionales** (pestaña "PERFIL"): cuenta con solo usuario y contraseña (sin
correo real — se arma uno falso interno que nunca se muestra, así que si alguien la olvida no se puede
recuperar), amigos (solicitud y aceptación) y récords ligados a la cuenta. Registrarse usa
`linkWithCredential` sobre la sesión anónima de juego, conservando el mismo uid — así los puntajes que esa
persona ya tenía jugando sin cuenta (siempre con el opt-in de "¿SUBES TU PUNTAJE?", nunca automático) pasan
a ser los de su cuenta nueva solos, sin mover nada a mano. Toda la lógica de cuenta/amigos vive en
`assets/js/arcade/perfiles.js`; la pantalla, en `arcade.html` (que también arma el catálogo de claves de
tabla de clasificación para el panel "Records", porque es el único archivo que conoce TODOS los juegos a la
vez). Ver `docs/arcade-firebase-cambios.md`, sección 3.4.

La pantalla del perfil sigue un boceto de la Junta: tarjeta arriba (imagen predeterminada, usuario y descripción) y
debajo dos paneles, AMIGOS y RECORDS; requiere iniciar sesión. Tocar a una persona de la lista de amigos abre SU
perfil con el mismo formato (solo lectura, con sus récords comparados con los tuyos y sus amigos). Si cambias su
forma, conserva ese orden. Ver amigos de un amigo depende de una regla de lectura que se copia a mano (sección 3.4).

## Estilo del código
Sitio estático: HTML + Tailwind compilado (`assets/css/tailwind.css`, ver `tailwind.config.js`) + JavaScript modular en línea, con el SDK de Firebase 10.12.2
desde `gstatic`. Imita el código que rodea al cambio. El único paso de compilación es `npm run css`
(Tailwind). No introduzcas frameworks ni otros pasos de compilación.
