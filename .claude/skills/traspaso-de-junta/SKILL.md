---
name: traspaso-de-junta
description: Lista de pasos para el cambio de Junta Directiva de AEMATEC (RI Art. 29 y 107) en lo que toca al sitio web: cuentas, correos de dueño, padrón, Fiscalía, secretos y accesos. Úsala cuando digan que entra una nueva Junta, que cambió alguien de puesto o que hay que traspasar el sitio.
---

# Traspaso del sitio a una nueva Junta Directiva

El RI (Art. 107) exige entregar a la administración entrante las credenciales de los Medios Oficiales y
de los repositorios. Guía a la persona por estos pasos, uno a la vez, y marca cuáles hiciste tú en un PR.

## En el Panel de Junta (lo hace la Junta, no requiere código)
1. **Junta:** agregar los correos de la nueva Junta con nombre y puesto (Art. 24) y quitar los salientes.
   Cada integrante nuevo crea su cuenta desde "Crear cuenta" y verifica su correo.
2. **Fiscalía:** lo ideal es que la persona Fiscal saliente registre a la entrante y se quite a sí misma. Si no lo
   hizo, la Junta puede hacerlo desde el panel.
3. **Padrón:** recargar el CSV del padrón del periodo (Art. 6: la condición de Asociado sigue la matrícula).
4. **Medios Oficiales:** confirmar que los enlaces sigan vigentes.

## En Moderación
5. Revisar el equipo de moderación del Repositorio: agregar a quien corresponda y quitar accesos que ya no
   deban existir.

## Lo que requiere un PR (lo haces tú)
6. **Correos de dueño.** Están en `assets/js/roles.js` (`OWNER_EMAILS`), en `isOwner()`/`isModerator()`/
   `isJunta()` de `firestore.rules` y `storage.rules`, y como respaldo en `functions/index.js`. Confírmalo con
   `grep -rn "angeloyeshuac\|angcalderon"` (o los correos vigentes), actualiza todos en el mismo PR y ajusta
   `tests/reglas.test.js` si hace falta.
7. Si cambia la cuenta de Gmail de la Junta, actualiza `gmailAddress` en `functions/index.js`.

## Cuentas y secretos (los hace la persona dueña de cada cuenta)
8. **GitHub:** dar acceso al repositorio `AEMATEC/AEMATEC-web` a la nueva Junta y quitarlo a quien sale.
9. **Firebase / Google Cloud** (proyecto `biblioteca-aematec`): agregar a la nueva Junta como miembro del
   proyecto y quitar a quien sale.
10. **Gmail de la Junta:** cambiar la contraseña de la cuenta. Crear una **nueva contraseña de aplicación**,
    revocar la anterior, guardarla en GitHub como `GMAIL_APP_PASSWORD` y ejecutar **Actions → Firebase → Run
    workflow** con "Volver a cargar GMAIL_APP_PASSWORD" marcado.
11. **Cuenta de servicio de publicación:** si la clave pudo quedar en manos de alguien que sale, crear una
    clave nueva, reemplazar el secreto `FIREBASE_SERVICE_ACCOUNT` y borrar la clave vieja en Google Cloud.

Al terminar, deja un resumen de lo hecho y lo pendiente para el acta de entrega.
