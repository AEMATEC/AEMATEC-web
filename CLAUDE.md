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
- **Datos personales (RI Art. 143, Ley 8968):** nada de correos, carnés ni teléfonos personales en
  colecciones o documentos de lectura pública. Si una página pública necesita datos de personas, usa un
  documento derivado con solo lo publicable (como `config/junta_publica`).
- **Fiscalía es independiente de la Junta (RI Art. 42):** lo dirigido a Fiscalía no debe poder leerlo la Junta.
- **Secretos:** nunca en el repositorio ni en el chat (claves de cuentas de servicio, contraseñas de Gmail).
  Van en GitHub → Settings → Secrets and variables → Actions.
- **Los permisos se aplican en `firestore.rules` y `storage.rules`.** Ocultar un botón no protege nada.
- Todo dato de Firestore que se muestre en una página se escapa (`escapeHtml`) o se asigna con
  `textContent`. Los enlaces que vienen de datos se validan como `https:`.

## Validar antes de abrir el PR
- Si cambiaste reglas: agrega o ajusta casos en `tests/reglas.test.js` y ejecuta
  `cd tests && npm install && npm test` (necesita Java). Todas las pruebas deben pasar.
- Si cambiaste Functions: `cd functions && npm install && node -e "require('./index.js')"`.
- Si cambiaste páginas: revisa la sintaxis del JavaScript y prueba la página con
  `python3 -m http.server 5500`. Explica en el PR qué conviene revisar visualmente.

## Estilo del código
Sitio estático: HTML + Tailwind por CDN + JavaScript modular en línea, con el SDK de Firebase 10.12.2
desde `gstatic`. Imita el código que rodea al cambio. No introduzcas frameworks ni pasos de compilación
sin que lo pida el plan (Fase 4).
