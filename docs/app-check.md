# Activar Firebase App Check (protección contra envíos automáticos)

**Para qué sirve:** los formularios del sitio (préstamos, reportes, subir material y trámites) están abiertos a
cualquiera. Un programa podría llenarlos miles de veces, mandar cientos de correos y gastar el límite diario de
Gmail (unos 500), y entonces los avisos reales dejarían de llegar. App Check hace que Firebase solo acepte
solicitudes que vienen de verdad del sitio.

Usa **reCAPTCHA Enterprise**, que Google ahora agrupa bajo el nombre **Google Cloud Fraud Defense**. Trabaja por
detrás y **no le pide nada a la persona** (no hay casillas ni fotos de semáforos). El reCAPTCHA "clásico" (v3) ya
está obsoleto: si la página de reCAPTCHA muestra ese aviso, usa los pasos de abajo.

**Costo:** gratis hasta 10.000 evaluaciones al mes, que es mucho más de lo que usa el sitio. Requiere que el proyecto
tenga facturación activa, y `biblioteca-aematec` ya la tiene porque usa Cloud Functions.

**Quién lo hace:** una persona con acceso de dueña al proyecto de Firebase `biblioteca-aematec`. Toma unos
20 minutos, y después hay que esperar 1 o 2 semanas antes del último paso.

El código del sitio ya está preparado: App Check se enciende solo en cuanto se pone la clave del paso 3.

## Paso 1: crear la clave (en Google Cloud)
1. Entra a <https://console.cloud.google.com> con la cuenta dueña del proyecto de Firebase y, arriba a la
   izquierda, elige el proyecto **`biblioteca-aematec`**. Tiene que ser el mismo proyecto de Firebase.
2. En el buscador de arriba escribe **reCAPTCHA** (o **Fraud Defense**) y abre esa sección. Si te pide **habilitar la
   API**, acepta.
3. Pulsa **Crear clave** y llena el formulario:
   - **Nombre visible:** `Sitio AEMATEC`.
   - **Tipo de aplicación:** **Web** (sitio web).
   - **Dominios:** agrega `aematec.github.io` y `localhost` (el segundo sirve para probar el sitio en una computadora).
   - Si aparece la opción **"Usar desafío de casilla de verificación"** (checkbox), **déjala desactivada**. App Check
     necesita una clave por puntuación, que no muestra ningún desafío.
4. Pulsa **Crear clave**. Aparece el **ID de la clave**, una cadena larga de letras y números: esa es la clave del sitio.
   Es pública y no hay clave secreta que copiar.

## Paso 2: registrar el sitio en App Check (en Firebase)
1. Entra a <https://console.firebase.google.com>, abre `biblioteca-aematec` y ve a **Compilación (Build) → App Check**.
2. En la pestaña **Apps**, abre la app web y elige **reCAPTCHA Enterprise**.
3. Pega el **ID de la clave** del paso 1. Deja el umbral de puntuación en **0.5** (el valor que recomienda Google) y
   pulsa **Guardar**.
4. **Todavía no actives "Aplicar" (Enforce).** Si lo activas antes del paso 3, el sitio deja de funcionar.

## Paso 3: poner la clave en el código
Pídele a Claude Code: *"Pon este ID de clave de reCAPTCHA Enterprise en App Check: `…`"*. Se puede pegar en el chat
porque es pública. Claude Code la pone en `assets/firebase-config.js` y agrega a `legal.html` el aviso que Google
exige ("este sitio usa reCAPTCHA de Google").

Haz el merge del PR como siempre y el sitio se publica solo.

## Paso 4: esperar y revisar las métricas (1 o 2 semanas)
En **App Check → APIs** verás, para Cloud Firestore, Cloud Storage y Cloud Functions, qué porcentaje de las
solicitudes llegan **verificadas**. Espera a que casi todas lo estén. Las que no llegan verificadas son de personas
con la página vieja guardada o de programas automáticos.

## Paso 5: activar la protección
1. En **App Check → APIs**, pulsa **Aplicar** (Enforce) en **Cloud Firestore** y en **Cloud Storage**.
2. Pídele a Claude Code: *"Activa App Check en las Cloud Functions de Trámites"*. Claude Code agrega
   `enforceAppCheck: true` a `enviarEnlaceCorreo`, `enviarTramite`, `adherirAgec` y `consultarSeguimiento` en
   `functions/tramites.js`, y eso se publica con el merge.
3. Prueba el sitio: entra a cada formulario y envía algo de prueba.

**Si algo deja de funcionar:** en App Check → APIs pulsa **Dejar de aplicar** (Unenforce). El cambio es inmediato
y no se pierde nada.

## Notas
- El Arcade usa otro proyecto de Firebase (`arcade-matec`) y necesita su propia clave, creada en ese proyecto. Eso
  está en [`arcade-pendientes.md`](arcade-pendientes.md).
- Para probar el sitio en una computadora con `python3 -m http.server 5500`, `localhost` tiene que estar entre los
  dominios de la clave (paso 1).
- Las pruebas automáticas (`cd tests && npm test`) usan emuladores y no necesitan App Check.
