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

Los correos se envían con [Resend](https://resend.com). Configuración:

```bash
firebase functions:secrets:set RESEND_API_KEY
# Remitente en un dominio verificado en Resend. Con el remitente de prueba
# (onboarding@resend.dev) Resend SOLO entrega al dueño de la cuenta de Resend.
echo 'RESEND_FROM="AEMATEC <notificaciones@tu-dominio-verificado>"' > functions/.env
firebase deploy --only functions
```

## Desarrollo local

No hay paso de compilación. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 5500   # y abre http://localhost:5500
```

Las páginas usan el proyecto real de Firebase (`assets/firebase-config.js`, configuración pública, no
secreta). Para probar reglas sin tocar producción, usa el emulador (`firebase emulators:start`).

## Despliegue

- **Sitio (HTML):** el historial indica GitHub Pages; el `CNAME` se agregó y se quitó varias veces. Pendiente
  de documentar el dominio definitivo.
- **Reglas y funciones:** `firebase deploy --only firestore:rules,storage,functions`.
- **CORS del bucket** (solo si cambian los dominios): `gsutil cors set cors.json gs://biblioteca-aematec.firebasestorage.app`.

## Importar el inventario

Ver la cabecera de [`scripts/import-inventario.js`](scripts/import-inventario.js). Necesita una clave de
cuenta de servicio que **nunca** se sube al repositorio (ya está en `.gitignore`).

`data/Plantilla_Inventario_AEMATEC.xlsx` es público en el repositorio. **No llenes ahí las hojas
`Personas` ni `Prestamos`**: contendrían datos personales (Ley 8968, RI Art. 143).

## Plan de trabajo

El diagnóstico del estado actual y las fases de mejora están en [`docs/PLAN.md`](docs/PLAN.md).
