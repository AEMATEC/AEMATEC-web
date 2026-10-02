# Arcade: pendientes de privacidad, seguridad y accesibilidad

Para: quien administra el Arcade y el proyecto de Firebase `arcade-matec`. Salen de la revisión legal del sitio
(octubre 2026, ver [`auditoria-legal.md`](auditoria-legal.md)).

**Lo que ya se hizo en el sitio** (no hay que repetirlo):
- Se quitó Google Analytics del código del Arcade (`assets/js/arcade/core.js`).
- El campo de nombre ahora pide un "apodo" y avisa que es público.
- La lista de propuestas de Golf escapa los datos que vienen de Firestore.
- El pie del Arcade enlaza a `legal.html#privacidad` y dice el origen de la música (generada para AEMATEC con Claude).

**Lo que tienes que hacer tú en la consola de Firebase** (no se puede desde el código): en `arcade-matec`, ve a
**Configuración del proyecto → Integraciones → Google Analytics** y desvincula Analytics. Si hay datos ya
recogidos, bórralos desde Google Analytics (Administrar → Eliminación de datos).

## Prompt para Claude Code

Copia todo el bloque de abajo en Claude Code, dentro de este repositorio:

````text
Trabaja en el Arcade de AEMATEC (arcade.html, assets/js/arcade/, proyecto de Firebase arcade-matec). Lee primero
AGENTS.md (sección "Arcade"), docs/arcade-firebase-cambios.md y docs/arcade-pendientes.md. Usa los agentes
juego-* y pixelart-arcade si te sirven. Haz los cambios en una rama, uno a la vez, y abre un PR.

Contexto legal: Costa Rica, Ley 8968 de protección de datos. El Arcade es público, sin inicio de sesión, y lo
usan estudiantes, incluidos colegiales menores de edad. La política del sitio (legal.html) promete que los
apodos y puntajes se pueden borrar a pedido y que no hay rastreo.

1. Reglas versionadas. Las reglas de arcade-matec no están en el repositorio. Pídeme que pegue las reglas
   actuales (Firebase Console → Firestore → Reglas) y guárdalas en arcade-firebase/firestore.rules, con un
   firebase.json mínimo para publicarlas con `firebase deploy --only firestore:rules --project arcade-matec`.
   Documenta en docs/arcade-firebase-cambios.md cómo publicarlas. No las conectes al flujo
   .github/workflows/firebase.yml, que es del proyecto del sitio, salvo que yo lo pida.

2. Moderación de Golf con cuenta real. Hoy GFP_MOD_CODE ('AEMATEC-GOLF-2026') está a la vista en arcade.html y
   las reglas sugeridas dejan que cualquier sesión anónima cambie `estado` a 'aprobado'. Reemplázalo con
   inicio de sesión de Google (Firebase Auth de arcade-matec) solo para moderar, y una colección
   `moderadores/{correo}` que solo se edita desde la consola. Reglas: update de golfHoyosPropuestos solo si
   `request.auth.token.email_verified` y existe `moderadores/$(request.auth.token.email)`; delete también solo
   moderadores. Quita GFP_MOD_CODE del código. El resto del Arcade sigue sin inicio de sesión.

3. Filtro de textos públicos. Los apodos (`name` ≤10 en leaderboards y salas) y las propuestas de Golf
   (`autor` ≤12, `nombre` ≤30) son públicos y no tienen filtro. En el cliente, en playerName() de core.js y
   al enviar una propuesta (arcade.html, cerca de "ESCRIBE TU APODO Y EL NOMBRE DEL HOYO"):
   - Rechaza textos con @, con 7 o más dígitos seguidos (teléfonos, carnés) o con una lista corta de groserías
     comunes en Costa Rica (normaliza tildes y números parecidos a letras, p. ej. 4→A, 0→O).
   - Muestra un mensaje claro en vez de guardar.
   - En las reglas, valida tamaño y caracteres: `name.matches('^[A-Z0-9 ÁÉÍÓÚÑÜ._-]{1,10}$')`.
   Agrega un caso de prueba simple (un assert en un .mjs dentro de tests/, como tests/revisar-musica.mjs).

4. Borrar a pedido (Ley 8968 Art. 7). Las reglas deben permitir que un moderador borre cualquier puntaje o
   propuesta, y que cada visitante borre el suyo (`scores/{uid}` con uid == request.auth.uid). Agrega en el menú
   del Arcade un botón "BORRAR MIS PUNTAJES" que borre los documentos del uid actual en todas las tablas y
   limpie las claves `lb_*` de localStorage.

5. Reglas más estrictas para lo que escribe el cliente:
   - En scores: id == request.auth.uid, score is number dentro de los rangos de docs/arcade-firebase-cambios.md,
     `ts == request.time`, `keys().hasOnly(...)`.
   - En salas: solo el host borra la sala; los jugadores solo escriben su propio slot.
   - Salas abandonadas: una política TTL de Firestore sobre un campo `expiraEn` (lastSeen + 1 día), sin
     funciones nuevas.

6. App Check en arcade-matec, igual que en el sitio (ver docs/app-check.md): clave de reCAPTCHA Enterprise (Fraud Defense) propia, creada en el proyecto de Google Cloud arcade-matec, con
   los dominios aematec.github.io y localhost. Inicialízala en core.js solo si la clave no está vacía. No actives
   "Aplicar" hasta que las métricas muestren casi todo verificado.

7. Accesibilidad (WCAG 2.1 AA):
   - Ningún texto menor de 10 px (hoy hay de 7 a 9 px; .stats es el peor).
   - aria-label en los botones que solo tienen un símbolo o emoji (p. ej. ":)" y "👁").
   - role="img" y aria-label en los canvas de cada juego.
   - aria-live="polite" en los mensajes `.msg`.
   - Respeta prefers-reduced-motion en la intro y en las miniaturas del menú.
   - Música apagada por defecto hasta que la persona la encienda.
   - El color --gray (#566c86) sobre el fondo oscuro no llega a 4.5:1; usa uno más claro para texto.
   - Revisa que todo lo que se hace con mouse tenga alternativa con teclado.

Antes de abrir el PR: node tests/revisar-paginas.mjs y node tests/revisar-enlaces.mjs. Prueba el modo en línea
de verdad (dos sesiones a la vez) en cada juego que toques. Explícame en el PR, con palabras simples, qué tengo
que hacer yo en la consola de Firebase.
````
