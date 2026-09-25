---
name: publicar-cambios
description: Cómo se publican los cambios del sitio AEMATEC (páginas, reglas de Firebase y Cloud Functions) y cómo revisar o arreglar una publicación que falló. Úsala al terminar un cambio, cuando pregunten "¿ya está publicado?", cuando falle el flujo de GitHub Actions "Firebase" o cuando haya que configurar los secretos de publicación.
---

# Publicar cambios del sitio AEMATEC

## Cómo llega un cambio a producción
1. Trabajas en una rama y abres un PR contra `main`.
2. Si el PR toca reglas, Functions, `firebase.json` o `tests/`, el flujo **Firebase** ejecuta el job
   "Probar reglas". Si falla, arréglalo antes de pedir el merge.
   Si el PR toca páginas o `assets/`, el flujo **Páginas** revisa la sintaxis del JavaScript, los enlaces
   internos y que `assets/css/tailwind.css` esté al día. Si falla "Revisar estilos compilados", ejecuta
   `npm install && npm run css` y sube `assets/css/tailwind.css` en la misma rama.
3. La persona hace merge del PR.
4. GitHub Pages publica las páginas en <https://aematec.github.io/AEMATEC-web/> (tarda 1–2 minutos).
5. Si el merge tocó la parte de Firebase, el job "Publicar en Firebase" publica:
   - las reglas de Firestore y Storage;
   - la contraseña de Gmail en Secret Manager, solo si todavía no existe;
   - las Cloud Functions.

Nunca pidas copiar reglas a la consola de Firebase. Si hay que volver a publicar todo sin cambios de
código, la persona puede ir a **Actions → Firebase → Run workflow** sobre `main`.

## Revisar el resultado
Usa las herramientas de GitHub (`mcp__github__actions_list`, `mcp__github__actions_get`,
`mcp__github__get_job_logs`) sobre `AEMATEC/AEMATEC-web`, flujo `firebase.yml`, y lee el último run
de `main`. Explica el resultado en palabras simples.

## Errores frecuentes
| Mensaje en el log | Causa | Qué hacer |
|---|---|---|
| `Falta el secreto FIREBASE_SERVICE_ACCOUNT` | No se configuró la cuenta de servicio | Guiar con README → "Publicación automática" |
| `Falta el secreto GMAIL_APP_PASSWORD` | No está la contraseña de aplicación de Gmail | Guiar con README → "Correos de notificación" |
| `PERMISSION_DENIED`, `does not have permission`, `iam.serviceAccounts.actAs` | A la cuenta de servicio le falta un rol | Decir el rol que nombra el error y cómo agregarlo en Google Cloud → IAM |
| `Invalid login` / `Username and Password not accepted` (en los logs de Functions) | Se cambió o revocó la contraseña de aplicación | Crear una nueva, actualizar el secreto en GitHub y ejecutar el flujo a mano con "Volver a cargar GMAIL_APP_PASSWORD" |
| `run.services.setIamPolicy`, `Permission denied` al publicar `enviarTramite`/`adherirAgec`/`consultarSeguimiento` | Las funciones que llama el navegador (onCall) necesitan permiso para hacerse públicas | Agregar el rol **Administrador de Cloud Run** (Cloud Run Admin) a la cuenta `github-publicar` en Google Cloud → IAM y volver a ejecutar el flujo |
| Falla "Probar reglas" | Un cambio de reglas rompió un permiso esperado | Leer qué prueba falló y corregir la regla (o la prueba, si el cambio de permiso era intencional y está justificado) |

Si el error no está en la tabla, lee el log completo, identifica el paso que falló y propone un arreglo
concreto en un PR.
