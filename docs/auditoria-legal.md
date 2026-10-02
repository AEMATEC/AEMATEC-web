# Revisión legal, de privacidad y de accesibilidad del sitio (octubre 2026)

Revisión de todo el sitio (páginas, Firebase, Cloud Functions y Arcade) con base en la **Ley 8968** de Protección de
la Persona frente al Tratamiento de sus Datos Personales, el **Código Civil Art. 47** (derecho a la propia imagen),
el **Código de la Niñez y la Adolescencia Art. 27**, la **Ley 6683** de Derechos de Autor, las pautas de accesibilidad
**WCAG 2.1 nivel AA** y el **Reglamento Interno (RI)**.

> No es asesoría legal. Antes de anunciar el sitio, conviene que alguien de la Asesoría Legal del TEC o de la FEITEC
> lea `legal.html`.

## Conclusión corta

- **¿Hace falta un banner de cookies?** Ya no. El único rastreo era Google Analytics en el Arcade y se quitó. Lo que
  queda en el navegador es lo necesario para que el sitio funcione (sesión, preferencias). La Ley 8968 no exige
  consentimiento para eso, pero sí informar, y eso está en `legal.html#cookies`. **Si algún día se agrega analítica,
  primero hay que poner un aviso que pida permiso antes de cargarla.**
- **¿Hace falta consentimiento en los formularios?** Sí (Ley 8968 Art. 5: informar finalidad, quién ve los datos,
  si son obligatorios y los derechos de la persona). Ya está en todos los formularios.
- **El riesgo más grande que queda:** no hay plazos de conservación ni borrado de los datos personales, y cualquiera
  puede llenar los formularios abiertos con spam (ver P1 y P2).

## Qué se corrigió en este cambio

| Tema | Cambio |
|---|---|
| Política de privacidad, términos y cookies | Nueva página `legal.html`, enlazada en el pie de todas las páginas, en el buscador y en el Arcade. |
| Datos de la asociación | Dirección física, correo y enlaces legales en el pie de página (todas las páginas). |
| Google Analytics | Quitado del Arcade (ponía cookies de rastreo sin permiso, y el público incluye colegiales). También se quitó el identificador de Analytics que sobraba en `assets/firebase-config.js`. |
| Consentimiento informado | Aviso con enlace a la política en Trámites (verificación y envío), Préstamos, Subir material y Reportar un problema. En Subir material hay una casilla obligatoria de derechos de autor y datos personales. |
| Fiscalía (RI Art. 42) | El correo de aviso de un caso nuevo ya no lleva asunto, nombre ni correo de quien lo envía, y las respuestas de Fiscalía ya no van en el correo. Antes todo eso quedaba en "Enviados" del Gmail de la Junta. Se agregó una prueba. |
| Préstamos | El correo de aviso a la Junta ya no lleva el carné ni el contacto (se ven en el Inventario). |
| Minimización | El correo que Trámites guarda en el navegador se borra al abrir el enlace. |
| Denuncia anónima | Texto más exacto: "verificamos tu correo institucional" (antes decía "que eres persona Asociada", y no siempre se comprueba) y aviso de no escribir datos que identifiquen. |
| AGEC | Aviso de que el motivo y la agenda se publican. |
| Arcade | Pide "apodo" en vez de "nombre" y avisa que es público. Se escaparon datos de Firestore en la lista de propuestas de Golf (riesgo de código malicioso). |
| Foto con menores | Se quitó del carrusel `dinamica-grupal-colegios.jpg` (caras de colegiales sin permiso conocido). Se puede volver a poner con permiso escrito. |
| Contraste (WCAG 1.4.3 y 1.4.11) | Turquesa de textos y botones más oscuro (`#00798A` / `#087F8C`), grises de apoyo a `#566B78` y bordes de campos a `#8497A3`. Antes, por ejemplo, el blanco sobre el botón turquesa daba 2.7:1 (mínimo 4.5:1). |
| Teclado | Enlace "Saltar al contenido", contorno de foco visible en todo el sitio, y los modales del Inventario reciben el foco, se cierran con Escape y devuelven el foco. En Subir material, Escape ya no borra el formulario. |
| Carrusel | Botón de pausa, se detiene con el foco del teclado y si la persona pidió menos movimiento. Solo la foto visible se lee en lectores de pantalla. |
| Etiquetas | Buscadores y campos de Medios Oficiales con etiqueta. Los logos decorativos ya no se leen dos veces. |
| Textos claros | "Publicar material" ahora dice "Enviar a revisión" (no se publica sin moderación). Ya no se busca "biblioteca" en el Repositorio (RI Art. 128). |

## Plan de acción (pendiente)

**Quién:** "Junta" = decisión de la Junta Directiva; "Técnico" = cambio en el código (lo puede hacer Claude Code
cuando la Junta lo apruebe).

### Decisiones de la Junta (2026-10) y lo que ya se hizo
| # | Tema | Estado |
|---|---|---|
| P1 | Plazos de conservación | **Hecho.** Plazos aprobados: préstamos, 1 año desde la devolución o el rechazo; reportes del asistente, 90 días; trámites y adhesiones, 2 años; `limites`, 2 días. La función `borrarDatosVencidos` (`functions/retencion.js`) borra lo vencido cada día a las 3:30 a. m. **Fiscalía:** la persona Fiscal borra cada caso al archivarlo, después de hacer su informe (botón "Archivar y borrar del sitio" en el panel). Los plazos están en `legal.html`. |
| P2 | Spam / App Check | El código ya está listo. Falta que la Junta cree la clave y la active: [`app-check.md`](app-check.md). |
| P3 | Arcade (reglas, moderación de Golf, filtro de apodos, borrado) | Instrucciones y prompt para quien administra el Arcade: [`arcade-pendientes.md`](arcade-pendientes.md). |
| P4 | Música del Arcade | **Resuelto.** La generaron agentes de Claude para AEMATEC; el origen aparece en el pie del Arcade. |
| P5 | Fotos del carrusel | **Resuelto.** Son fotos de archivo de la asociación (actas y otros documentos). `dinamica-grupal-colegios.jpg` sigue fuera del carrusel porque muestra caras de menores: para publicarla hace falta permiso escrito. |
| P6 | Correos personales en el código | **Hecho.** Los dueños ahora son las cuentas de la asociación `aematec@estudiantec.cr` y `aeemac.tec@gmail.com`, y las reglas exigen que el correo esté verificado (antes no lo exigían). Antes del merge hay que crear y verificar las dos cuentas en `admin.html` (ver abajo). |
| M5 | Moderadores que agregan moderadores | **Se queda así** (decisión de la Junta: son personas de su confianza). |
| M7 | Cédula jurídica | La asociación no tiene. Investigación y pasos en [`cedula-juridica.md`](cedula-juridica.md). |

### P6: cómo funcionan las cuentas de dueño
Los "dueños" del sitio están escritos en 4 archivos (`assets/js/roles.js`, `firestore.rules`, `storage.rules` y
`functions/correo.js`). Hoy son correos personales. La solución es poner ahí **una cuenta que sea de la asociación
y pase de Junta en Junta**, por ejemplo `aematec@estudiantec.cr`. Así, en cada traspaso solo se cambia la contraseña
de esa cuenta y no hay que tocar el código. Las personas de la Junta siguen entrando con su propio correo, que se
agrega en el panel (lista `junta`).

Pasos: (1) confirmar que alguien de la Junta puede abrir el buzón de esa cuenta; (2) crear con ella la contraseña en
`admin.html` → "Primera vez, crear contraseña" y verificar el correo; (3) pedir a Claude Code que cambie los
correos de dueño, y dejar uno personal unas semanas como respaldo; (4) cuando funcione, quitar el respaldo. Los
correos viejos siguen en el historial de GitHub, pero dejan de dar acceso.

### Prioridad media

| # | Qué | Quién |
|---|---|---|
| M1 | **Denuncias anónimas:** el límite diario guarda la cuenta (`limites/{uid}`) y la hora, y el caso guarda `enPadron`. Con acceso técnico a Firebase se podría cruzar. Usar un contador sin cuenta para las anónimas y guardar solo la fecha. | Técnico (requiere ajustar la prueba de anonimato) |
| M2 | **Préstamos:** quitar "carné" del formulario en línea y pedirlo al firmar el préstamo en físico (RI Art. 120). Dejar un solo dato de contacto. | Junta → Técnico |
| M3 | **Trámites:** el nombre es obligatorio aunque el correo ya identifica a la persona. Hacerlo opcional. | Junta → Técnico |
| M4 | **Sesión en computadoras compartidas:** en Trámites la sesión queda abierta. Usar sesión por pestaña (como en el Panel) y un botón visible de "Cerrar sesión". | Técnico |
| M6 | **Archivos subidos** (PDF, Word, PowerPoint) guardan el nombre del autor y otros datos ocultos. Avisar en Subir material o limpiarlos al aprobar. | Técnico |
| M8 | **Fuentes e íconos en el propio sitio** (Google Fonts y Font Awesome se cargan de servidores externos que ven la IP). Opcional: ya está informado en la política. | Técnico |
| M9 | **Accesibilidad pendiente:** etiquetas en unos 40 campos del panel del Inventario (`assets/js/inventario/admin.js`); botones "Ver" y "Descargar" que digan de qué material son; "Tipo de recurso" y "Etiquetas" como grupo (`fieldset`) en Subir material; tipos de trámite manejables con flechas; mensajes de estado que el lector de pantalla anuncie siempre; página actual marcada en la paginación; menú del celular y asistente que cierren con Escape y devuelvan el foco; aviso de los temas de temporada que no se cierre solo mientras tiene el foco; avisar cuando un enlace abre otra pestaña. | Técnico |
| M10 | **Accesibilidad del Arcade:** incluida en [`arcade-pendientes.md`](arcade-pendientes.md). | Autor del Arcade |
| M11 | **Textos que se pueden malinterpretar:** "Le avisamos a los moderadores" en el asistente (¿moderadores del Repositorio?); "debe responderte en 10 días hábiles" (indicar desde cuándo); errores que muestran códigos técnicos (`auth/...`); el correo de Trámites sale de `aeemac.tec@gmail.com` y el sitio muestra `aematec@estudiantec.cr` (explicarlo en la página para que no parezca un engaño). | Técnico |

### Prioridad baja

- Las reglas aceptan `createdAt` escrito por el navegador: exigir la hora del servidor (`request.time`).
- Storage permite archivos sin un material pendiente que los respalde: borrar los huérfanos cada semana.
- Los enlaces de materiales pueden apuntar a cualquier sitio: quienes moderan deben abrirlos con cuidado.
- Ley 8968 Art. 21: la inscripción ante la PRODHAB es para bases de datos que se venden o distribuyen. Probablemente
  no aplica; confirmarlo con la asesoría legal.

## Imágenes y derechos de autor

Ninguna foto tiene metadatos de autor (se borraron al comprimirlas, lo que protege la privacidad pero no deja
registro del origen). La Junta confirmó que son fotos de archivo de la asociación.

| Imagen | Observación | Riesgo |
|---|---|---|
| `dinamica-grupal-colegios.jpg` | Caras de colegiales (menores). **Quitada** del carrusel. Volver a ponerla solo con permiso escrito del colegio o de sus encargados. | Alto |
| Demás fotos de actividades (incluidas `taller-colegios.jpg` y `charla-cientec-pi.jpg`) | Fotos de archivo de la asociación (actas y otros documentos), según confirmó la Junta. | Bajo |
| `assets/logo-aematec.svg`, `logo-aematec-compas.svg` | Logo propio de la asociación. | Ninguno |
| Fuentes (Montserrat, Source Serif 4, Press Start 2P) | Licencia libre OFL. | Ninguno |
| Íconos Font Awesome Free | Licencia libre (CC BY 4.0 para íconos). Pide reconocimiento, que ya va incluido dentro del archivo CSS que se carga. | Ninguno |
| `assets/audio/arcade-menu.mp3` | Generada para AEMATEC con agentes de Claude; el origen aparece en el pie del Arcade. | Ninguno |
| Sprites del Arcade | Dibujados con código propio. No se encontraron personajes ni logos de marcas. Confirmar que la imagen del "easter egg" (gorila) sea propia. | Bajo |

## Cómo mantener esto al día

- Si un formulario pide un dato nuevo, actualiza su fila en `legal.html` y su aviso junto al botón de enviar.
- No agregues analítica, píxeles de redes sociales ni videos incrustados sin poner antes un aviso que pida permiso.
- Fotos nuevas: ver las reglas en `README.md` → "Carrusel de fotos de actividades".
