# AEMATEC Web

Sitio de la **Asociación de Estudiantes de la carrera Enseñanza de la Matemática con Entornos
Tecnológicos (AEMATEC)** del Instituto Tecnológico de Costa Rica.

El proyecto empezó como la Biblioteca de recursos y hoy es el portal de la asociación. Es un sitio
estático (HTML + Tailwind compilado + JavaScript modular) que usa **Firebase** como backend:
Authentication, Firestore, Storage y Cloud Functions (proyecto `biblioteca-aematec`).

La norma que rige la asociación es su **Reglamento Interno (RI)**. Las decisiones del sitio que
dependen de él citan el artículo correspondiente en el código y en [`docs/PLAN.md`](docs/PLAN.md).

## Módulos

| Módulo | Páginas | Qué hace |
|---|---|---|
| Portada | `index.html` | Acceso a los servicios, Medios Oficiales (RI Art. 102) y un carrusel de fotos de actividades (ver [abajo](#carrusel-de-fotos-de-actividades-portada)). |
| Repositorio | `repositorio.html`, `repositorio-docentes.html`, `repositorio-academicos.html`, `repositorio-subir.html` | Repositorio digital de materiales didácticos y académicos (RI Art. 4 f). Consulta pública; cualquiera puede proponer material, que queda pendiente de moderación. |
| Inventario | `inventario.html` | Consulta pública de bienes (RI Art. 118) y solicitudes de préstamo (RI Art. 120-123). Administración para la Junta. |
| Junta Directiva | `junta-directiva.html` | Integrantes (solo nombre y puesto) y medios de contacto. |
| Panel de administración | `admin.html` | Un solo acceso. Cada cuenta ve lo de sus roles: **Trámites** (la Junta los suyos; la Fiscalía sus casos), **Asociación** (la Junta: Padrón, Junta, Fiscalía y Medios; la Fiscalía: solo la lista de Fiscalía), **Tema del sitio** (Junta) y **Moderación del Repositorio** (pendientes, edición, equipo de moderación). |
| Temas de temporada | todas (`assets/js/temas.js`, `assets/css/temas.css`) | Decoración automática por fecha: sutil en celebraciones de un día (8M, Día de la Madre…) y festiva en épocas (Navidad, Halloween, mes patrio, Semana de la Carrera). La Junta puede apagarla o fijar un tema en `admin.html` → Tema del sitio (`config/tema`). Vista previa: `?tema=<id>`. |
| Asistente | todas las que usan el encabezado común (`assets/js/chatbot.js`) | Botón flotante para buscar páginas (lista en `assets/js/site-pages.js`) y reportar un problema. Los reportes van a `chatbotReportes` y llegan por correo a moderación. No pide cuenta; el contacto es opcional. |
| Trámites | `tramites.html` | Solicitudes a la Junta, postulaciones, AGEC extraordinaria (con adhesiones) y consultas o denuncias a Fiscalía (anónimas o no). Se verifica el correo `@estudiantec.cr` con un enlace, sin contraseña. Incluye "Mis trámites" y seguimiento de casos anónimos por código. |
| Arcade | `arcade.html` (botón flotante en todas las páginas, `assets/js/arcade-launcher.js`) | Minijuegos pixelados (buscaminas, batalla naval, carreras, etc.) hechos por un estudiante. Es una página aparte, con su propio estilo y su propio proyecto de Firebase (`arcade-matec`, distinto del sitio); no usa cuentas ni datos del padrón. Público, sin inicio de sesión. Sus reglas de Firebase no están en este repositorio: si un cambio escribe datos nuevos, documéntalo para quien administra `arcade-matec` (ver `docs/arcade-firebase-cambios.md`). |

> **Nota de nombres:** el repositorio digital de materiales se llama **Repositorio** (antes "Biblioteca").
> Los archivos `aematec_*.html` que quedan son solo redirecciones a las páginas nuevas. **Biblioteca** es solo la colección física de
> libros para préstamo del RI (Art. 128-129), que está en **Inventario → Biblioteca**.

## Carrusel de fotos de actividades (portada)

`index.html` muestra en la portada un carrusel con fotos de actividades de la asociación. Son archivos
fijos del sitio (no Firestore ni Storage), así que solo alguien con acceso al código puede agregarlas o
quitarlas; si eres de la Junta y quieres fotos nuevas, pásaselas a quien mantenga el sitio (o a Claude Code).

- Las fotos están en `assets/img/actividades/`, en formato `.jpg`, con nombre corto en minúsculas y
  guiones que describa la actividad (por ejemplo `semana-carrera-carreta.jpg`).
- Antes de subir una foto, redúcela a un ancho máximo de unos 1100 px y guárdala con calidad JPEG
  alrededor de 65-70; cada foto debería pesar menos de 150-200 KB para que la portada cargue rápido.
- Para agregarla, copia el archivo a esa carpeta y agrega un bloque dentro de `#carrusel-track` en
  `index.html`, igual a los que ya hay:
  ```html
  <div class="w-full shrink-0 aspect-[16/9] md:aspect-[21/9]"><img src="assets/img/actividades/NOMBRE.jpg" alt="Descripción de la foto" class="w-full h-full object-cover" loading="lazy"></div>
  ```
  El texto de `alt` describe la foto para quien no puede verla (lectores de pantalla), no hace falta nada más:
  `assets/js/carrusel-actividades.js` cuenta las fotos solas y arma las flechas y los puntos.
- Para quitar una foto, borra su bloque del HTML (y el archivo, si ya no se va a usar).
- Antes de abrir el PR corre `node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs`.

## Roles y permisos

Los permisos reales se aplican en [`firestore.rules`](firestore.rules) y [`storage.rules`](storage.rules).
La interfaz solo oculta o muestra opciones.

| Rol | Cómo se obtiene | Puede |
|---|---|---|
| Público | Nadie inicia sesión | Ver recursos publicados, el inventario y la Junta. Proponer material. Enviar una solicitud de préstamo (ver nota abajo). Reportar un problema con el asistente. |
| Moderador | Correo en `moderators/{email}` + cuenta con correo verificado | Moderar recursos y gestionar moderadores. Recibe por correo los reportes del asistente. |
| Junta | Correo en `junta/{email}` + cuenta con correo verificado | Padrón, Junta, Fiscalía, Medios, inventario y préstamos. |
| Fiscalía | Correo en `fiscalia/{email}` + cuenta con correo verificado | Registrar a la persona Fiscal entrante (la Junta también puede). Leer y responder las consultas y denuncias a Fiscalía (ni la Junta ni los dueños pueden leerlas, RI Art. 42). |
| Asociado | Correo `@estudiantec.cr` en `padron/{email}` | Enviar trámites (solicitudes a la Junta, postulaciones, AGEC y adhesiones, consultas o denuncias a Fiscalía). No crea cuenta ni contraseña: verifica su correo con un enlace en `tramites.html` y las Functions revisan el padrón al enviar. Si no está en el padrón, el trámite se acepta marcado para que la Junta decida. |
| Dueño | Correo escrito en el código (ver abajo) | Todo lo anterior. |

Las cuentas se crean en `admin.html` ("Primera vez, crear contraseña") y hay que verificar el correo antes de
entrar. Crear la cuenta no da acceso a nada: al iniciar sesión, el panel muestra solo las secciones de las listas
en las que está el correo (Junta, Fiscalía, moderación). Las personas Asociadas no usan `admin.html`: se identifican
solo en Trámites, con el enlace al correo.

**Préstamos.** El formulario de préstamo del Inventario es abierto (no pide correo ni sesión): el préstamo se
formaliza en físico con la firma del registro, y ahí la Junta verifica que la persona sea Asociada (RI Art. 120).
Pendiente (ver [`docs/PLAN.md`](docs/PLAN.md)): marcar en la gestión de préstamos si la persona está en el padrón.

**Principio de acceso (decisión de la Junta, 2026-09):** el sitio es **público por defecto**. Nadie necesita
iniciar sesión para ver o descargar recursos, ver el inventario o la Junta, proponer material o pedir un préstamo;
el Repositorio docente es para cualquier docente, sea o no de MATEC. Solo se pide identificación en la acción
que la necesita y en ese momento (por ejemplo, al enviar un trámite, con el enlace al correo `@estudiantec.cr`).

**Correos de dueño.** Están en 4 lugares, que hay que actualizar juntos en el traspaso de administración
(RI Art. 107): `assets/js/roles.js` (páginas), `firestore.rules`, `storage.rules` y `functions/correo.js`
(correo de respaldo para notificaciones). Las reglas no pueden leer archivos del sitio, por eso no es uno solo.

**Código compartido de las páginas** (`assets/js/`):
- `firebase.js`: conexión única con Firebase (`app`, `db`).
- `roles.js`: correos de dueño y `tieneRol(user, "junta" | "moderators" | "fiscalia")`.
- `util.js`: `escapeHtml`, `safeHttpsUrl`, `safeEmail`.
- `layout.js`: encabezado, menú y pie de página; además carga en cada página los temas de temporada (`temas.js`),
  el botón del Arcade (`arcade-launcher.js`) y el asistente (`chatbot.js`).
- `site-pages.js`: lista de páginas públicas que usan el buscador de la portada y el asistente. Si agregas o
  renombras una página, actualízala aquí.
- `tramites.js` (página de Trámites) y `admin/` (secciones del panel: `panel.js`, `asociacion.js`, `tramites.js`,
  `moderacion.js`, `tema.js`).
- `inventario-categorias.js` e `inventario-codigos.js`: categorías de los libros y códigos del Inventario.
- `inventario/` (módulos de `inventario.html`): `main.js` (arranque y acceso de la Junta), `estado.js` (estado y utilidades
  compartidas), `publico.js` (consulta), `prestamos.js` (solicitudes de préstamo) y `admin.js` (administración).
- `acceso.js`: inicio de sesión y comprobación de rol compartidos por el panel (`admin/panel.js`) y el Inventario.

## Datos (Firestore)

| Colección / documento | Contenido | Lectura |
|---|---|---|
| `resources` | Materiales del Repositorio (metadatos, estado de moderación, ruta del archivo) | Pública si `published == true` |
| `inventario` | Bienes: `institucional`, `aematec`, `biblioteca` (libros), `consumible` | Pública |
| `prestamoSolicitudes` | Solicitudes de préstamo (nombre, carné, contacto). Cualquiera puede crear una | Solo Junta |
| `padron` | Correos de personas Asociadas | Solo Junta |
| `junta` | Correo, nombre y puesto de cada integrante | Consulta puntual pública; listado solo Junta |
| `fiscalia` | Correos de Fiscalía (la editan Fiscalía y Junta) | Junta y Fiscalía |
| `moderators` | Correos de moderación | Moderadores |
| `config/medios_oficiales` | Correo, teléfono y enlaces de WhatsApp, Telegram e Instagram | Pública |
| `config/junta_publica` | Solo nombre y puesto de la Junta, generado por el Panel | Pública |
| `config/tema` | Tema de temporada: automático, apagado o fijo (lo edita la Junta) | Pública |
| `chatbotReportes` | Reportes de problemas enviados desde el asistente (mensaje, página y contacto opcional). Cualquiera puede crear uno | Moderadores |
| `tramites` (+ `adhesiones`) | Solicitudes a la Junta, postulaciones y solicitudes de AGEC. **Solo los crean las Functions** | Junta y quien lo envió |
| `agecPublicas` | Avance de cada solicitud de AGEC (sin nombres ni correos) | Pública |
| `fiscaliaCasos` | Consultas y denuncias a Fiscalía; las anónimas no guardan nada que identifique a la persona | **Solo Fiscalía** (ni Junta ni dueños) y quien envió un caso identificado |
| `limites` | Límite diario de trámites por cuenta | Nadie (solo Functions) |

`config/junta_publica` se regenera cada vez que la Junta entra al panel o agrega, edita o quita a un
integrante. Así la página pública no expone los correos (RI Art. 143).

**Storage:** `recursos/{docentes|academico}/…` (materiales, máximo 25 MB) e `inventario/biblioteca/…` (fotos, máximo 5 MB).

## Cloud Functions (`functions/`)

- `notifyPendingResource`: avisa a los moderadores cuando llega material nuevo.
- `sendPendingSummary`: resumen diario (8:00, hora de Costa Rica) de materiales pendientes.
- `notifyLoanRequest`: avisa a la Junta de cada solicitud de préstamo.
- `notifyProblemReport`: avisa a los moderadores de cada reporte enviado desde el asistente.
- `enviarEnlaceCorreo` (`functions/tramites.js`): envía el enlace para verificar el correo `@estudiantec.cr`.
- `enviarTramite`, `adherirAgec`, `consultarSeguimiento` (`functions/tramites.js`): reciben los trámites.
  Verifican el correo `@estudiantec.cr`, consultan el padrón (si la persona no está, el trámite se acepta marcado
  para que la Junta decida) y avisan por correo. Las denuncias anónimas se consultan con un código privado.
- `alActualizarTramite`, `alActualizarCasoFiscalia`: cuando la Junta o la Fiscalía responden, resuelven o rechazan,
  avisan por correo a la persona (los casos anónimos no reciben correo).

### Correos de notificación

Los correos salen de la cuenta Gmail de la Junta (`aeemac.tec@gmail.com`) usando una **contraseña de
aplicación** de Google. Es una clave de 16 letras que solo sirve para enviar correos, no la contraseña
normal. Los destinatarios van en copia oculta. Para crearla (una vez, o cuando cambie la Junta):

1. Inicia sesión en esa cuenta y entra a <https://myaccount.google.com/security>.
2. Activa la **Verificación en 2 pasos**, si no está activa (Google la exige para lo siguiente).
3. Entra a <https://myaccount.google.com/apppasswords>, escribe el nombre "Sitio AEMATEC" y pulsa **Crear**.
4. Copia la clave de 16 letras y guárdala en GitHub como secreto `GMAIL_APP_PASSWORD` (ver
   "Publicación automática"). No la escribas en ningún archivo ni chat.

Gmail permite unos 500 correos al día, de sobra para estas notificaciones.

## Desarrollo local

Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 5500   # y abre http://localhost:5500
```

**Estilos (Tailwind).** Las páginas cargan [`assets/css/tailwind.css`](assets/css/tailwind.css), que se genera a
partir de las clases que aparecen en `*.html` y `assets/js/**/*.js` (configuración en
[`tailwind.config.js`](tailwind.config.js)). Si agregas o cambias clases de Tailwind, regenera el archivo y súbelo
junto con el cambio:

```bash
npm install     # solo la primera vez
npm run css     # actualiza assets/css/tailwind.css
```

Si se olvida, el flujo **Páginas** lo detecta en el PR. No edites `tailwind.css` a mano.

**Encabezado, menú y pie de página** son comunes a todo el sitio: se editan solo en
[`assets/js/layout.js`](assets/js/layout.js) (enlaces) y [`assets/css/site.css`](assets/css/site.css) (estilos).

Las páginas usan el proyecto real de Firebase (`assets/firebase-config.js`, configuración pública, no
secreta). Para probar reglas sin tocar producción, usa el emulador (`firebase emulators:start`).

### Acceso por enlace al correo (Trámites) — configuración única en Firebase

`tramites.html` verifica el correo con un enlace. El enlace lo envía la función `enviarEnlaceCorreo`
(`functions/tramites.js`) desde el Gmail de la Junta, y lleva directo a `tramites.html`. No se usa el correo que
envía Firebase (`noreply@biblioteca-aematec.firebaseapp.com`) porque el correo del TEC lo pone en cuarentena: no
llega ni a la bandeja ni a spam. El correo del TEC puede tardar hasta unos 20 minutos en entregarlo (lo revisa antes de entregarlo; no depende
del sitio), y la página lo avisa. Límites: un enlace cada 5 minutos y 5 al día por correo, y 300 al día en total.

En la consola de Firebase (proyecto `biblioteca-aematec`), una sola vez:
1. **Authentication → Método de acceso → Correo electrónico/contraseña → activar "Vínculo del correo electrónico
   (acceso sin contraseña)"** y guardar.
2. **Authentication → Configuración → Dominios autorizados:** confirmar que está `aematec.github.io`.

Si aun así el enlace no llega a un correo `@estudiantec.cr`, pide a soporte del TEC que revise la cuarentena de
Microsoft 365 y que acepte los correos de `aeemac.tec@gmail.com`.

### Probar las funciones localmente

Para correr las Functions en el emulador hacen falta dos archivos que **no** se suben al repositorio:
`functions/.env.local` con `AEMATEC_SIN_CORREO=1` (no envía correos) y `functions/.secret.local` con
`GMAIL_APP_PASSWORD=cualquier-valor`. Luego: `cd tests && npx firebase emulators:start --only auth,firestore,functions`.

## Publicación

- **Páginas HTML:** GitHub Pages las publica desde `main` en <https://aematec.github.io/AEMATEC-web/>.
  Cada merge a `main` se ve en 1–2 minutos. El hosting es solo GitHub Pages (Firebase Hosting no se usa) y, por
  decisión de la Junta (2026-09), sin dominio propio: no hay costo. Si algún día se compra un dominio, se
  configura en **Settings → Pages → Custom domain** y se agrega en Firebase → Authentication → Dominios autorizados
  y en `cors.json`.
- **Revisión de páginas:** el flujo [`.github/workflows/paginas.yml`](.github/workflows/paginas.yml) revisa en cada
  PR la sintaxis del JavaScript (`tests/revisar-paginas.mjs`), los enlaces internos (`tests/revisar-enlaces.mjs`) y
  que `assets/css/tailwind.css` esté al día.
- **Reglas y Cloud Functions:** las publica automáticamente el flujo
  [`.github/workflows/firebase.yml`](.github/workflows/firebase.yml). En cada PR prueba las reglas y, al hacer
  merge a `main`, las publica en Firebase junto con las Functions. **Ya no hay que copiar reglas en la consola.**
  Para volver a publicar sin cambios: pestaña **Actions → Firebase → Run workflow**.
- **CORS del bucket** (solo si cambian los dominios): `gsutil cors set cors.json gs://biblioteca-aematec.firebasestorage.app`.

### Publicación automática: configuración (una sola vez)

El flujo necesita dos secretos en GitHub: **Settings → Secrets and variables → Actions → New repository
secret**. Mientras falten, el flujo no publica nada y avisa con una advertencia.

**1. `FIREBASE_SERVICE_ACCOUNT`: una "cuenta de servicio" que le da permiso a GitHub para publicar.**
1. Entra a <https://console.cloud.google.com/iam-admin/serviceaccounts?project=biblioteca-aematec>.
2. **Crear cuenta de servicio** → nombre `github-publicar` → **Crear y continuar**.
3. Agrega estos roles, uno por uno:
   - **Editor**
   - **Administrador de Cloud Functions** (Cloud Functions Admin)
   - **Usuario de cuenta de servicio** (Service Account User)
   - **Administrador de Secret Manager** (Secret Manager Admin)

   Luego pulsa **Listo**.
4. Abre la cuenta creada → pestaña **Claves** → **Agregar clave → Crear clave nueva → JSON**. Se descarga un archivo.
5. En GitHub crea el secreto `FIREBASE_SERVICE_ACCOUNT` y pega **todo** el contenido de ese archivo.
   Después borra el archivo de tu computadora.

**2. `GMAIL_APP_PASSWORD`:** la contraseña de aplicación de "Correos de notificación".

Con los dos secretos creados, ve a **Actions → Firebase → Run workflow** sobre `main`. Si el primer intento
falla por un permiso, el registro dice qué rol falta; agrégalo en <https://console.cloud.google.com/iam-admin/iam?project=biblioteca-aematec>.

### Pruebas

- `tests/reglas.test.js` prueba los permisos de Firestore y Storage en el emulador, y `tests/funciones.test.js`
  las funciones de Trámites. Corren solas en cada PR que toca reglas, Functions o pruebas; para correrlas a mano:
  `cd functions && npm install`, luego `cd tests && npm install && npm test` (requiere Java).
- `tests/temas.test.js`, `tests/inventario-codigos.test.js` y `tests/inventario-categorias.test.js` no necesitan
  emulador (`node --test tests/<archivo>`); el flujo **Páginas** las corre en cada PR.

## Agente de mantenimiento

[`AGENTS.md`](AGENTS.md) explica a cualquier agente de IA (Claude Code, GitHub Copilot, Codex, Cursor…) cómo
está hecho el sitio, qué exige el Reglamento y cómo se publica. [`CLAUDE.md`](CLAUDE.md) lo incluye para
Claude Code, y las guías paso a paso están en [`.claude/skills/`](.claude/skills) (publicar cambios, traspaso
de Junta y temas de temporada). Cualquier integrante de la Junta puede abrir una sesión de su agente sobre este repositorio y pedir
cambios en español; el agente trabaja en una rama y abre un PR.

Con cualquier agente, las revisiones automáticas de cada PR (pruebas de permisos y de Trámites, enlaces,
estilos y sintaxis) avisan si algo se rompe antes del merge. Las reglas y los pasos se editan en `AGENTS.md`,
no en `CLAUDE.md`.

## Importar el inventario

Ver la cabecera de [`scripts/import-inventario.js`](scripts/import-inventario.js). Necesita una clave de
cuenta de servicio que **nunca** se sube al repositorio (ya está en `.gitignore`).

**Categorías de los libros.** Cada libro guarda sus categorías en `categorias` (lista, máximo 3). Cómo se
escribe cada una y en qué grupo va (el filtro de la Biblioteca permite elegir un grupo entero) está en
[`assets/js/inventario-categorias.js`](assets/js/inventario-categorias.js): para una categoría nueva, agrégala a un
grupo ahí. La página, el importador y la migración usan ese mismo archivo. Los libros que aún tengan el texto viejo
`categoria` se pasan al formato nuevo con **Actions → "Categorías de la Biblioteca" → Run workflow** (primero en
modo `simular`, luego `aplicar`); el plan con los datos de 2026-09 está en
[`docs/categorias/migracion.md`](docs/categorias/migracion.md).

`data/Plantilla_Inventario_AEMATEC.xlsx` es público en el repositorio. **No llenes ahí las hojas
`Personas` ni `Prestamos`**: contendrían datos personales (Ley 8968, RI Art. 143).

## Plan de trabajo

El diagnóstico del estado actual y las fases de mejora están en [`docs/PLAN.md`](docs/PLAN.md).
