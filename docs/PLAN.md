# Plan de reorganización del sitio AEMATEC

El sitio empezó como la Biblioteca y creció hasta ser el portal de la asociación (Inventario, Junta,
Trámites). La estructura no acompañó ese crecimiento. Este documento registra el diagnóstico, las fases
de mejora y los requisitos del **Reglamento Interno (RI)**, modificado el 7 de setiembre de 2026, que
afectan al sitio.

## Estado de las fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Documentar: README, este plan, agente de `.github` | ✅ Hecha |
| 0.5 | Publicación automática (GitHub Actions), pruebas de reglas, correos por Gmail, agente de mantenimiento (`CLAUDE.md` + skills) | ✅ Hecha (falta configurar los secretos) |
| 1 | Correcciones urgentes (seguridad, datos personales, cumplimiento del RI) | ✅ Hecha (quedan pasos manuales, ver abajo) |
| 2 | Base compartida: layout, navegación y módulos JS comunes | ✅ Hecha (2a, 2b y 2c) |
| 3 | Consolidar páginas y paneles (versión corta) | ✅ Hecha (3a y 3b) |
| 4 | Herramientas: Tailwind compilado, hosting, pruebas de reglas en CI | Pendiente |
| 5 | Trámites | En curso: T1 y T2 hechas; falta T3 (panel) |

## Diagnóstico (septiembre 2026)

**Identidad difusa**
- Las páginas de la Biblioteca tienen su propio encabezado ("Biblioteca AEMATEC") y desde ahí no se llega
  a Inventario, Junta ni Trámites. Hay dos "Inicio" distintos.
- Hay dos paneles de administración con login propio: Moderación y Panel de Junta.
- No había README y el agente de `.github` solo describía la Biblioteca.

**Duplicación**
- Cada página repite el `<head>`, el header, el footer, el menú móvil, `initializeApp`, `escapeHtml` y los
  modales.
- Cada página tiene su propio bloque de CSS (unas 1.400 líneas en total), en gran parte para corregir un diseño de ancho fijo
  (`w-[1440px]`) con `!important`.
- Recursos docentes y Recursos académicos son casi la misma página.
- Los correos de los dueños están escritos a mano en unos 8 archivos.
- `inventario.html` tiene más de 1.500 líneas.

## Fase 1: qué se corrigió

| Problema | Corrección | Referencia |
|---|---|---|
| El remitente de Resend era el de prueba, que solo entrega al dueño de la cuenta | Se reemplazó Resend por la cuenta Gmail de la Junta (sin costo) | — |
| La portada insertaba los medios con `innerHTML` sin escapar | Se asignan como atributos o texto, solo enlaces `https:` | — |
| El panel aceptaba cualquier valor en los medios | Exige un correo `@estudiantec.cr` y enlaces `https://` | RI Art. 102 a |
| La portada llamaba "Medio Oficial" a Instagram y al sitio | Medios Oficiales: correo, Telegram, WhatsApp y TECDigital. Instagram y el sitio son medios informativos | RI Art. 102 y 104 |
| Cualquiera podía listar los correos de la Junta | La página pública lee `config/junta_publica` (solo nombre y puesto); el listado de `junta` es solo para la Junta | RI Art. 143, Ley 8968 |
| Los puestos de la Junta eran texto libre y sin orden | Se sugieren los puestos del RI y se muestran en ese orden | RI Art. 24 |
| La fecha de devolución de un préstamo era opcional | Es obligatoria (interfaz y reglas) y no admite fechas pasadas | RI Art. 122 |
| No se informaban las condiciones del préstamo | Aviso de responsabilidad, reposición y atrasos, con casilla de aceptación. Se aclara que el préstamo es para personas Asociadas y se formaliza con firma | RI Art. 120, 121, 123 y 133 |
| `isAsociado` e `isFiscalia` no exigían correo verificado | Ahora lo exigen, igual que Junta y Moderadores | — |
| CORS del bucket abierto a `*` con PUT/POST | Solo GET/HEAD desde los dominios del sitio | — |

Estas correcciones se validaron con 10 pruebas de reglas en el emulador de Firestore: acceso a `junta`,
`config/junta_publica`, préstamos con y sin fecha, y Fiscalía verificada y sin verificar.

### Pasos manuales pendientes de la Fase 1
1. ~~Verificar un dominio en Resend~~: se usa Gmail. Crear la contraseña de aplicación (README → Correos de notificación).
2. **Configurar la publicación automática** (README → Publicación automática). Las reglas ya se publicaron a mano; las Functions se publicarán con el flujo.
3. **Entrar una vez al Panel de administración** (`admin.html`) después del despliegue para generar `config/junta_publica`. Hasta
   entonces la página pública mostrará "Aún no se han registrado integrantes".
4. ~~Confirmar el dominio~~: es `https://aematec.github.io/AEMATEC-web/`, que ya está incluido en `cors.json`.

## Requisitos del Reglamento Interno para las próximas fases

Estos puntos condicionan el diseño y no deberían contradecirse:

- **Préstamos (Art. 8 d, 120-123, 128-129, 133).** Los bienes y los libros se prestan a personas Asociadas;
  el préstamo se formaliza con firma en un registro. La Junta puede suspender temporalmente el derecho a
  préstamo. *Pendiente:* marcar en la gestión de préstamos si el solicitante está en el padrón y llevar una
  lista de suspensiones.
- **Inventario (Art. 36 b, 117-119).** Lo mantiene la Secretaría de Asuntos Financieros, debe ser accesible
  a las personas Asociadas y distingue bienes propios de institucionales (con placa). El sitio ya lo cumple
  con las pestañas institucional / AEMATEC / libros / consumibles.
- **Asociados (Art. 6).** Es la matrícula activa en MATEC y "se actualiza automáticamente". El padrón debe
  poder recargarse cada periodo (ya existe la carga por CSV).
- **Fiscalía (Art. 42, 45 e).** Es **independiente de la Junta** y recibe las denuncias de las personas
  Asociadas. En Trámites, la Junta **no debe poder leer** las consultas a Fiscalía.
  *Decisión (2026-09):* la lista `fiscalia` la edita la persona Fiscal saliente **y también la Junta**, para no dejar
  el cargo sin acceso si la Fiscalía olvida el traspaso. Es una excepción práctica y deliberada al Art. 42.
- **Nombres (Art. 128-129).** *Decisión (2026-09):* el repositorio digital se llama **Repositorio**; "Biblioteca"
  queda solo para los libros físicos del Inventario.
- **Solicitudes a la Junta (Art. 8 f-h, 83, 111).** Deben responderse en 10 días hábiles. Los rechazos se
  notifican en 3 días hábiles con su motivación y los recursos disponibles (5 días hábiles). Trámites
  debería registrar las fechas, mostrar el plazo y generar la notificación.
- **Postulaciones (Art. 51 c, 92-93).** Las comisiones y representaciones se convocan por los Medios
  Oficiales, indicando órgano, requisitos, plazo y beneficios.
- **Actas y transparencia (Art. 86).** La Secretaría General publica las actas firmes en 5 días hábiles.
  Un futuro módulo "Documentos" podría alojarlas.
- **Traspaso (Art. 107).** Al cambiar de administración se entregan las credenciales de los medios y
  repositorios. Los correos de dueño quedaron en 4 lugares documentados (README → Roles y permisos).
- **Datos personales (Art. 143, Ley 8968).** No publicar correos, carnés ni teléfonos personales. Pedir
  consentimiento antes de publicar fotos de personas.
- **Neutralidad electoral (Art. 138).** Los medios de la asociación no pueden favorecer candidaturas.

## Fase 2: base compartida
- `assets/js/firebase.js`: un solo `initializeApp` que exporte `db`, `auth` y `storage`.
- `assets/js/roles.js`: comprobaciones de rol y login, registro y recuperación reutilizables. Correos de
  dueño en un solo lugar, o en una colección `owners`.
- ✅ **2a.** `assets/js/layout.js` + `assets/css/site.css`: un encabezado global (Inicio · Repositorio ·
  Inventario · Junta · Trámites) con la sub-navegación del Repositorio como segundo nivel, más el footer y
  el menú móvil. Revisión automática de sintaxis de las páginas en cada PR (`tests/revisar-paginas.mjs`).
- ✅ **2b.** `assets/js/firebase.js` (conexión única), `assets/js/roles.js` (correos de dueño en un solo lugar
  para las páginas y `tieneRol`) y `assets/js/util.js` (`escapeHtml`, validación de enlaces). Las reglas y las
  Functions siguen teniendo su propia copia de los correos de dueño (no pueden leer archivos del sitio).
- ✅ **2c.** Diseño fluido: sin `w-[1440px]`; los contenedores usan `site-container` y se quitaron los
  `!important` que forzaban anchos. Sin desbordes horizontales de 320 a 1600 px. `[hidden]` siempre oculta
  (la barra de sesión de Junta en Inventario se veía sin iniciar sesión).

## Fase 3: consolidar (versión corta acordada)
- ✅ **3a.** Nombres de archivo sin el prefijo `aematec_`: `repositorio.html`, `repositorio-docentes.html`,
  `repositorio-academicos.html`, `repositorio-subir.html`, `inventario.html`, `junta-directiva.html`, `tramites.html`.
  Los nombres viejos quedan como páginas de redirección (conservan `?…` y `#…`) para no romper enlaces guardados.
  Se descartaron carpetas por módulo: obligarían a cambiar todas las rutas de `assets/` sin beneficio real.
- ✅ **3b.** Un solo panel de administración (`admin.html`, código en `assets/js/admin/`): un acceso, y cada cuenta
  ve las secciones de sus roles (Asociación para Junta y Fiscalía; Moderación del Repositorio para moderación).
  Reemplaza a `aematec_biblioteca-moderacion.html` y `aematec_junta-panel.html`, que quedan como redirecciones.
  Se corrigió que un moderador nuevo no podía crear su contraseña (la revisión previa leía `moderators` sin
  sesión, algo que las reglas no permiten).
- *Decisión (2026-09):* Recursos docentes y académicos **siguen como páginas separadas** (públicos distintos y
  diseños distintos).
- *Decisión (2026-09), principio de acceso:* público por defecto; identificación solo en la acción que la
  requiere. No se agrega un inicio de sesión general ("soy docente" no verifica nada y alejaría a docentes con
  poca experiencia digital). Trámites pedirá verificar el correo `@estudiantec.cr` con un enlace (sin contraseña)
  y revisará el padrón solo al enviar un trámite.
- *Más adelante:* dividir la lógica del inventario en módulos.

## Fase 4: herramientas
- Compilar Tailwind en lugar de usar el CDN.
- Definir el hosting en `firebase.json` o documentar GitHub Pages con su dominio.
- Chequeo de enlaces rotos en CI (las pruebas de reglas ya existen).

## Fase 5: Trámites
Diseño acordado con la Junta (2026-09):

| Trámite | Lo recibe | RI |
|---|---|---|
| Solicitud a la Junta (punto de agenda, asistir a sesión, rendición de cuentas, otra) | Junta | Art. 8 f-h, 111 |
| Postulación (comisión o representación estudiantil) | Junta | Art. 51 c, 92-93 |
| Solicitud de AGEC extraordinaria, con adhesiones hasta el 10 % del padrón | Junta | Art. 13 c |
| Consulta o denuncia a Fiscalía, anónima o identificada | Solo Fiscalía | Art. 42, 45 e |

- Las mociones de sesión **no** entran: se manejan con un formulario por sesión.
- Quien envía verifica su correo `@estudiantec.cr` con un enlace (sin contraseña) solo al enviar.
- **Padrón atrasado:** si el correo no está en el padrón, el trámite se acepta marcado para que la Junta decida; en
  una AGEC esas adhesiones se cuentan aparte y no suman al 10 % hasta que se confirmen.
- **Denuncias anónimas:** se verifica que el correo sea institucional y se consulta el padrón, pero el caso se guarda
  sin correo, nombre ni uid; el seguimiento es con un código privado (solo se guarda su hash).
- Plazo de respuesta: 10 días hábiles (Art. 111), contados de lunes a viernes sin feriados (queda un día antes, nunca
  después). Rechazos con motivación y aviso de recursos (Art. 82-83).

Entregas:
- ✅ **T1.** Colecciones, reglas y Cloud Functions (`enviarTramite`, `adherirAgec`, `consultarSeguimiento`), con pruebas
  de reglas y de funciones (incluye una prueba que falla si una denuncia anónima guarda datos de la persona).
- ✅ **T2.** Página pública `tramites.html` (`assets/js/tramites.js`): formularios, verificación por enlace al correo,
  AGEC abiertas con adhesión, "Mis trámites" y seguimiento por código. Requiere activar "Vínculo del correo
  electrónico" en Firebase Authentication (README). Se corrigió en T1 el uso de `admin.firestore.FieldValue`, que no
  funcionaba en el emulador de Functions (ahora `firebase-admin/firestore`).
- **T3.** Sección Trámites en `admin.html` (Junta y Fiscalía): estados, plazo visible, prórroga informada, rechazo
  motivado con aviso por correo.

## Otras decisiones de la Junta (2026-09)
- **Ubicación de los bienes del inventario: pública.** El espacio de la asociación está en el campus (con control de
  acceso) y saber dónde está cada bien facilita que las personas Asociadas lo usen (RI Art. 124).
