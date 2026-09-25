# Plan de reorganización del sitio AEMATEC

El sitio empezó como la Biblioteca y creció hasta ser el portal de la asociación (Inventario, Junta,
Trámites). La estructura no acompañó ese crecimiento. Este documento registra el diagnóstico, las fases
de mejora y los requisitos del **Reglamento Interno (RI)**, modificado el 7 de setiembre de 2026, que
afectan al sitio.

## Estado de las fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Documentar: README, este plan, agente de `.github` | ✅ Hecha |
| 1 | Correcciones urgentes (seguridad, datos personales, cumplimiento del RI) | ✅ Hecha (quedan pasos manuales, ver abajo) |
| 2 | Base compartida: layout, navegación y módulos JS comunes | Pendiente |
| 3 | Consolidar páginas y paneles | Pendiente |
| 4 | Herramientas: Tailwind compilado, hosting, pruebas de reglas en CI | Pendiente |
| 5 | Trámites | Pendiente (requiere Fase 2) |

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
- `aematec_inventario.html` tiene más de 1.500 líneas.

## Fase 1: qué se corrigió

| Problema | Corrección | Referencia |
|---|---|---|
| El remitente de Resend era el de prueba, que solo entrega al dueño de la cuenta | Ahora se configura con `RESEND_FROM`; falta verificar un dominio | — |
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
1. **Verificar un dominio en Resend** y definir `RESEND_FROM` (ver el README).
2. **Desplegar**: `firebase deploy --only firestore:rules,functions`.
3. **Entrar una vez al Panel de Junta** después del despliegue para generar `config/junta_publica`. Hasta
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
  Asociadas. En Trámites, la Junta **no debe poder leer** las consultas a Fiscalía. Además, hoy la Junta
  administra la lista `fiscalia`: conviene que la asigne un Dueño o la propia Fiscalía, no la Junta.
- **Solicitudes a la Junta (Art. 8 f-h, 83, 111).** Deben responderse en 10 días hábiles. Los rechazos se
  notifican en 3 días hábiles con su motivación y los recursos disponibles (5 días hábiles). Trámites
  debería registrar las fechas, mostrar el plazo y generar la notificación.
- **Postulaciones (Art. 51 c, 92-93).** Las comisiones y representaciones se convocan por los Medios
  Oficiales, indicando órgano, requisitos, plazo y beneficios.
- **Actas y transparencia (Art. 86).** La Secretaría General publica las actas firmes en 5 días hábiles.
  Un futuro módulo "Documentos" podría alojarlas.
- **Traspaso (Art. 107).** Al cambiar de administración se entregan las credenciales de los medios y
  repositorios. Esto refuerza sacar los correos de dueño del código (Fase 2).
- **Datos personales (Art. 143, Ley 8968).** No publicar correos, carnés ni teléfonos personales. Pedir
  consentimiento antes de publicar fotos de personas.
- **Neutralidad electoral (Art. 138).** Los medios de la asociación no pueden favorecer candidaturas.

## Fase 2: base compartida
- `assets/js/firebase.js`: un solo `initializeApp` que exporte `db`, `auth` y `storage`.
- `assets/js/roles.js`: comprobaciones de rol y login, registro y recuperación reutilizables. Correos de
  dueño en un solo lugar, o en una colección `owners`.
- `assets/js/layout.js` + `assets/css/site.css`: un encabezado global (Inicio · Biblioteca · Inventario ·
  Junta · Trámites) con la sub-navegación de la Biblioteca como segundo nivel, más el footer y el menú móvil.
- Pasar a un layout fluido y retirar el `w-[1440px]` y los `!important`.

## Fase 3: consolidar
- Una sola página de recursos (`?seccion=docentes|academico`).
- Un solo panel de administración con pestañas según el rol.
- Dividir la lógica del inventario en módulos.
- Carpetas por módulo, con redirecciones desde las URLs viejas.

## Fase 4: herramientas
- Compilar Tailwind en lugar de usar el CDN.
- Definir el hosting en `firebase.json` o documentar GitHub Pages con su dominio.
- Pruebas de reglas con el emulador y chequeo de enlaces en CI.

## Fase 5: Trámites
Solicitudes a la Junta, postulaciones y consultas confidenciales a Fiscalía, siguiendo los requisitos del
RI de arriba.
