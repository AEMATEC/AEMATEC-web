# Activar Firebase App Check (protección contra envíos automáticos)

**Para qué sirve:** los formularios del sitio (préstamos, reportes, subir material y trámites) están abiertos a
cualquiera. Un programa podría llenarlos miles de veces, mandar cientos de correos y gastar el límite diario de
Gmail (unos 500), y entonces los avisos reales dejarían de llegar. App Check hace que Firebase solo acepte
solicitudes que vienen de verdad del sitio. Usa **reCAPTCHA v3** de Google, que trabaja por detrás y **no le pide
nada a la persona** (no hay casillas ni fotos de semáforos).

**Quién lo hace:** una persona con acceso de dueña al proyecto de Firebase `biblioteca-aematec` (la cuenta de la
Junta). Toma unos 20 minutos, y después hay que esperar 1 o 2 semanas antes del último paso.

El código del sitio ya está preparado: App Check se enciende solo en cuanto se pone la clave del paso 3.

## Paso 1: crear la clave de reCAPTCHA
1. Entra con la cuenta dueña del proyecto de Firebase a <https://www.google.com/recaptcha/admin/create>.
2. Llena el formulario:
   - **Etiqueta:** `Sitio AEMATEC`.
   - **Tipo de reCAPTCHA:** "Basado en puntuación (v3)".
   - **Dominios:** agrega `aematec.github.io` y `localhost` (el segundo sirve para probar el sitio en una computadora).
   - Si pregunta por un proyecto de Google Cloud, elige `biblioteca-aematec`.
3. Pulsa **Enviar**. Aparecen dos claves:
   - **Clave del sitio:** es pública y va en el código del sitio (paso 3).
   - **Clave secreta:** es privada y va **solo** en Firebase (paso 2). No la pegues en el chat ni en GitHub.

## Paso 2: registrar el sitio en App Check
1. Entra a <https://console.firebase.google.com>, abre el proyecto `biblioteca-aematec` y ve a
   **Compilación (Build) → App Check**.
2. En la pestaña **Apps**, abre la app web, elige **reCAPTCHA** (v3), pega la **clave secreta** y pulsa **Guardar**.
3. **Todavía no actives "Aplicar" (Enforce).** Si lo activas antes del paso 3, el sitio deja de funcionar.

## Paso 3: poner la clave del sitio en el código
Pídele a Claude Code: *"Pon esta clave del sitio de reCAPTCHA en App Check: `…`"*. Esa clave sí se puede compartir
en el chat porque es pública. Claude Code la pone en `assets/firebase-config.js` y agrega a `legal.html` el aviso que
Google exige ("este sitio usa reCAPTCHA de Google").

Haz el merge del PR como siempre y el sitio se publica solo.

## Paso 4: esperar y revisar las métricas (1 o 2 semanas)
En **App Check → APIs** verás, para Cloud Firestore, Cloud Storage y Cloud Functions, qué porcentaje de las
solicitudes llegan **verificadas**. Espera a que casi todas lo estén. Si quedan muchas sin verificar, son personas
con la página vieja guardada o programas automáticos.

## Paso 5: activar la protección
1. En **App Check → APIs**, pulsa **Aplicar** (Enforce) en **Cloud Firestore** y en **Cloud Storage**.
2. Pídele a Claude Code: *"Activa App Check en las Cloud Functions de Trámites"*. Claude Code agrega
   `enforceAppCheck: true` a `enviarEnlaceCorreo`, `enviarTramite`, `adherirAgec` y `consultarSeguimiento` en
   `functions/tramites.js`, y eso se publica con el merge.
3. Prueba el sitio: entra a cada formulario y envía algo de prueba.

**Si algo deja de funcionar:** en App Check → APIs pulsa **Dejar de aplicar** (Unenforce). El cambio es inmediato
y no se pierde nada.

## Notas
- El Arcade usa otro proyecto de Firebase (`arcade-matec`) y necesita su propia clave. Eso está en
  [`arcade-pendientes.md`](arcade-pendientes.md).
- Para probar el sitio en una computadora con `python3 -m http.server 5500`, `localhost` tiene que estar entre los
  dominios de la clave (paso 1).
- Las pruebas automáticas (`cd tests && npm test`) usan emuladores y no necesitan App Check.
