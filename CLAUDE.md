# Instrucciones para el agente de mantenimiento del sitio AEMATEC

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
- Nunca subas cambios directo a `main`. Trabaja en una rama y abre un PR. La persona lo revisa y hace merge.
- Al hacer merge a `main`:
  - GitHub Pages publica las páginas HTML en <https://aematec.github.io/AEMATEC-web/>.
  - El flujo `.github/workflows/firebase.yml` prueba y publica las reglas y las Cloud Functions.
  - **No publiques a mano** ni pidas a la persona copiar reglas en la consola de Firebase.
- Para publicar o revisar una publicación, sigue la skill `publicar-cambios`. Para el cambio de Junta
  Directiva, la skill `traspaso-de-junta`.

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

## Archivos de páginas
- Las páginas usan nombres cortos (`repositorio*.html`, `inventario.html`, `junta-directiva.html`, `tramites.html`).
- Los archivos `aematec_*.html` que solo contienen una redirección existen para no romper enlaces viejos: no
  les agregues contenido. Si renombras una página, deja una redirección igual en el nombre anterior.

## Estilo del código
Sitio estático: HTML + Tailwind compilado (`assets/css/tailwind.css`, ver `tailwind.config.js`) + JavaScript modular en línea, con el SDK de Firebase 10.12.2
desde `gstatic`. Imita el código que rodea al cambio. El único paso de compilación es `npm run css`
(Tailwind). No introduzcas frameworks ni otros pasos de compilación.
