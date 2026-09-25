# AEMATEC Web

Sitio de la **Asociación de Estudiantes de la carrera Enseñanza de la Matemática con Entornos
Tecnológicos (AEMATEC)** del Instituto Tecnológico de Costa Rica.

El proyecto empezó como la Biblioteca de recursos y hoy es el portal de la asociación. Es un sitio
estático (HTML + Tailwind por CDN + JavaScript modular) que usa **Firebase** como backend:
Authentication, Firestore, Storage y Cloud Functions (proyecto `biblioteca-aematec`).

La norma que rige la asociación es su **Reglamento Interno (RI)**. Las decisiones del sitio que
dependen de él citan el artículo correspondiente en el código y en [`docs/PLAN.md`](docs/PLAN.md).

## Módulos

| Módulo | Páginas | Qué hace |
|---|---|---|
| Portada | `index.html` | Acceso a los servicios y Medios Oficiales (RI Art. 102). |
| Biblioteca | `aematec_biblioteca-home.html`, `aematec_biblioteca-recursos-docentes.html`, `aematec_biblioteca-recursos-academicos.html`, `aematec_biblioteca-subir-material.html` | Repositorio digital de materiales didácticos y académicos (RI Art. 4 f). Consulta pública; cualquiera puede proponer material, que queda pendiente de moderación. |
| Moderación | `aematec_biblioteca-moderacion.html` | Aprobación, edición y rechazo de materiales. Gestión del equipo de moderación. |
| Inventario | `aematec_inventario.html` | Consulta pública de bienes (RI Art. 118) y solicitudes de préstamo (RI Art. 120-123). Administración para la Junta. |
| Junta Directiva | `aematec_junta-directiva.html` | Integrantes (solo nombre y puesto) y medios de contacto. |
| Panel de Junta | `aematec_junta-panel.html` | Padrón, Junta, Fiscalía y Medios Oficiales. |
| Trámites | `aematec_tramites.html` | Pendiente ("Próximamente"). Ver el plan. |

> **Nota de nombres:** en el RI, "Biblioteca AEMATEC" (Art. 128-129) es la colección física de libros para
> préstamo, que en el sitio está en **Inventario → Libros**. La "Biblioteca" del sitio es el repositorio
> digital de materiales.

## Roles y permisos

Los permisos reales se aplican en [`firestore.rules`](firestore.rules) y [`storage.rules`](storage.rules).
La interfaz solo oculta o muestra opciones.

| Rol | Cómo se obtiene | Puede |
|---|---|---|
| Público | Nadie inicia sesión | Ver recursos publicados, el inventario y la Junta. Proponer material. Solicitar préstamos. |
| Moderador | Correo en `moderators/{email}` + cuenta con correo verificado | Moderar recursos y gestionar moderadores. |
| Junta | Correo en `junta/{email}` + cuenta con correo verificado | Padrón, Junta, Fiscalía, Medios, inventario y préstamos. |
| Fiscalía | Correo en `fiscalia/{email}` + correo verificado | Por ahora solo leer la lista de Fiscalía (se usará en Trámites). |
| Asociado | Correo en `padron/{email}` + correo verificado | Aún no se usa en ninguna página. |
| Dueño | Correo escrito en el código (ver abajo) | Todo lo anterior. |

Las cuentas se crean desde el login de Moderación o del Panel de Junta ("Crear cuenta"). Solo se permite
si el correo ya fue agregado a la lista correspondiente, y hay que verificar el correo antes de entrar.

**Correos de dueño escritos en el código.** Hoy están en `firestore.rules`, `storage.rules`,
`functions/index.js` y en varias páginas (`ownerEmails`). En el traspaso de administración (RI Art. 107)
hay que actualizarlos en todos esos lugares. El plan propone centralizarlos.

## Datos (Firestore)

| Colección / documento | Contenido | Lectura |
|---|---|---|
| `resources` | Materiales de la Biblioteca (metadatos, estado de moderación, ruta del archivo) | Pública si `published == true` |
| `inventario` | Bienes: `institucional`, `aematec`, `biblioteca` (libros), `consumible` | Pública |
| `prestamoSolicitudes` | Solicitudes de préstamo (nombre, carné, contacto) | Solo Junta |
| `padron` | Correos de personas Asociadas | Solo Junta |
| `junta` | Correo, nombre y puesto de cada integrante | Consulta puntual pública; listado solo Junta |
| `fiscalia` | Correos de Fiscalía | Junta y Fiscalía |
| `moderators` | Correos de moderación | Moderadores |
| `config/medios_oficiales` | Correo, teléfono y enlaces de WhatsApp, Telegram e Instagram | Pública |
| `config/junta_publica` | Solo nombre y puesto de la Junta, generado por el Panel | Pública |

`config/junta_publica` se regenera cada vez que la Junta entra al panel o agrega, edita o quita a un
integrante. Así la página pública no expone los correos (RI Art. 143).

**Storage:** `recursos/{docentes|academico}/…` (materiales, máximo 25 MB) e `inventario/biblioteca/…` (fotos, máximo 5 MB).

## Cloud Functions (`functions/`)

- `notifyPendingResource`: avisa a los moderadores cuando llega material nuevo.
- `sendPendingSummary`: resumen diario (8:00, hora de Costa Rica) de materiales pendientes.
- `notifyLoanRequest`: avisa a la Junta de cada solicitud de préstamo.

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

No hay paso de compilación. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 5500   # y abre http://localhost:5500
```

**Encabezado, menú y pie de página** son comunes a todo el sitio: se editan solo en
[`assets/js/layout.js`](assets/js/layout.js) (enlaces) y [`assets/css/site.css`](assets/css/site.css) (estilos).

Las páginas usan el proyecto real de Firebase (`assets/firebase-config.js`, configuración pública, no
secreta). Para probar reglas sin tocar producción, usa el emulador (`firebase emulators:start`).

## Publicación

- **Páginas HTML:** GitHub Pages las publica desde `main` en <https://aematec.github.io/AEMATEC-web/>.
  Cada merge a `main` se ve en 1–2 minutos.
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

### Pruebas de reglas

`tests/reglas.test.js` prueba los permisos de Firestore y Storage en el emulador. Se ejecutan solas en cada
PR; para correrlas a mano: `cd tests && npm install && npm test` (requiere Java).

## Agente de mantenimiento

[`CLAUDE.md`](CLAUDE.md) y las skills en [`.claude/skills/`](.claude/skills) explican a Claude Code cómo
está hecho el sitio, qué exige el Reglamento y cómo se publica. Cualquier integrante de la Junta puede abrir
una sesión de Claude Code sobre este repositorio y pedir cambios en español. Para el cambio de Junta existe
la skill `traspaso-de-junta`.

## Importar el inventario

Ver la cabecera de [`scripts/import-inventario.js`](scripts/import-inventario.js). Necesita una clave de
cuenta de servicio que **nunca** se sube al repositorio (ya está en `.gitignore`).

`data/Plantilla_Inventario_AEMATEC.xlsx` es público en el repositorio. **No llenes ahí las hojas
`Personas` ni `Prestamos`**: contendrían datos personales (Ley 8968, RI Art. 143).

## Plan de trabajo

El diagnóstico del estado actual y las fases de mejora están en [`docs/PLAN.md`](docs/PLAN.md).
