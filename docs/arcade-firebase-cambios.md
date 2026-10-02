# Arcade v2: cambios que necesitan las reglas de Firebase (`arcade-matec`)

Para: quien administra el proyecto de Firebase **`arcade-matec`** (el del Arcade, no el del sitio AEMATEC).

## 0. Dónde vive el historial de las reglas

Las reglas de `arcade-matec` **no viven de verdad en este repositorio** y **no se publican solas** al hacer
merge (ni con un comando, ni con un flujo de GitHub Actions) — eso es a propósito, para que nadie publique
reglas de ese proyecto por accidente. Lo único que hay en el repositorio es
[`arcade-firebase/firestore.rules`](../arcade-firebase/firestore.rules): una **copia de referencia** de lo
último que la persona que administra `arcade-matec` confirmó que está pegado en
**Firebase Console → Firestore Database → Reglas**.

- Si tú cambias algo directamente en la consola, avísale a quien mantiene este repositorio para actualizar
  `arcade-firebase/firestore.rules` y que quede igual.
- Si un cambio de código (un PR) necesita una regla nueva o distinta, el PR va a traer el archivo
  `arcade-firebase/firestore.rules` ya actualizado con el cambio propuesto — pero **tienes que copiarlo tú
  mismo a mano** en la consola de Firebase para que entre en efecto. Nada de esto se publica solo.

Esta versión del Arcade escribe algunos datos nuevos en Firestore. Si tus reglas limitan las claves, los
campos o los rangos, hay que actualizarlas en **Firebase Console → Firestore Database → Reglas**.

Si tus reglas ya aceptan cualquier documento de `leaderboards` y cualquier campo en las salas, no tienes que
cambiar nada. Aun así, revisa la lista de abajo.

**Qué pasa si no se actualizan:** el juego no se rompe. Donde una regla rechace un dato:
- En los puntajes, ese récord no se guarda en línea y aparece un aviso en la consola.
- En las salas, lo marcado abajo como "tolerante" simplemente no se comparte.

Las salas de **Carreras** y **Combate de Funciones** sí escriben campos nuevos al **crearse**. Si tus reglas
rechazan campos desconocidos al crear, **no se podrán crear salas en línea** de esos dos juegos hasta que
actualices las reglas. Conviene actualizarlas antes o justo después del merge.

---

## 1. Tablas de puntajes (`leaderboards/{clave}/scores/{uid}`)

El formato del documento es el mismo de siempre:
`{ name: string (≤10), score: number, extra: string (≤24), ts: serverTimestamp }`, con id = uid anónimo.

| Clave nueva | Juego | `score` | Orden (mejor) | `extra` (ejemplo) |
|---|---|---|---|---|
| `tiro_diana` | Animal al Tiro, modo DIANA CONTINUA | entero 1–14100 (aciertos × precisión %) | mayor | `LLAMA 121×92%` |
| `duelo_reaccion` | Duelo del Oeste, tiempo de reacción | entero 80–5000 (ms) | **menor** | `2026-09-29 CPU` / `2026-09-29 ONLINE` |
| `carrera_3` | Carreras, pista nueva LAGO HELADO (vuelta más rápida) | 5–1800 (segundos, 2 decimales) | **menor** | `LUNA · BICICLETA` |
| `carrera_0_total` … `carrera_3_total` | Carreras, tiempo del circuito completo (una por pista) | 15–1800 (segundos, 2 decimales) | **menor** | `LUNA · BICICLETA` |

Claves que ya existían y cambian algo:
- `carrera_0` … `carrera_2`: siguen siendo la vuelta más rápida, pero ahora con un tope de 1800 s.
- `tiro`: ya no se usa (era el modo viejo "Disparo continuo"). Puedes dejarla o quitarla.
- `funciones`: mismo formato. Las victorias contra bots solo suman si todos los rivales son bots en DIFÍCIL.
  Nuevos textos de `extra`: `1 VS 2`, `FFA 4`, `BOT DIFÍCIL · 1 VS 1`.
- `duelo`, `tiro_uno`, `cruce`, `runner` y los demás: sin cambios.

La lectura sigue igual: `orderBy('score', 'asc'|'desc')` con `limit(10)`. Si tienes índices o reglas por
clave, agrega las nuevas.

Ejemplo, **solo si tus reglas usan una lista de claves permitidas** (adáptalo a como las tengas):

```
function claveValida(k) {
  return k in ['minas_facil', 'minas_medio', 'minas_dificil', 'batalla', 'tiro_uno', 'tiro_diana',
               'carrera_0', 'carrera_1', 'carrera_2', 'carrera_3',
               'carrera_0_total', 'carrera_1_total', 'carrera_2_total', 'carrera_3_total',
               'funciones', 'veintiuno', 'billar_eight', 'billar_nine',
               'duelo', 'duelo_reaccion', 'runner', 'golf', 'cruce'];
}
```


---

## 2. Salas en línea: campos nuevos

### Carreras: `races/{sala}`
- **`collisions`: boolean** (`true` = los vehículos rebotan, `false` = se atraviesan).
  - Se escribe en el `setDoc` al **crear** la sala.
  - El anfitrión también lo cambia con `updateDoc(races/{sala}, { collisions })` desde el lobby, igual que `track`.
  - Si falta, el juego lo toma como `true`.
- **`track`** ahora puede ser **0, 1, 2 o 3** (3 = Lago helado). Si tu regla dice `track < 3`, cámbiala a `track < 4`.
- `races/{sala}/players/{uid}`: sin cambios.

### Combate de Funciones: `fights/{sala}`
- **`turnS`: entero de 10 a 60** (segundos por turno; la interfaz va de 5 en 5).
- **`preview`: boolean** (mostrar la vista previa de la trayectoria).
- Los dos se escriben al **crear** la sala. El anfitrión los cambia con `updateDoc` en el lobby, igual que
  `fmt` y `track`. Sugerencia: que solo el `host` pueda cambiarlos.
- Si faltan o están fuera de rango, el juego usa 20 s y `false`.
- `turn`, `shot`, `dead`, `holes`, `ptr`, `winner` y la subcolección `players`: sin cambios. Los bots solo existen en partidas locales.

### Duelo del Oeste: `duelos/{sala}` (tolerante)
- **`A.look` y `B.look`**: un mapa con exactamente estas 4 claves enteras:
  - `hat`: 0–3
  - `hatColor`: 0–5
  - `poncho`: 0–5
  - `pattern`: 0–3
- Cada jugador escribe solo **su** letra con `updateDoc(ref, { 'A.look': {...} })` (el anfitrión es A y el invitado B), al
  entrar y cuando cambia su apariencia en la sala de espera.
- Va en un `updateDoc` aparte: si la regla lo rechaza, el duelo funciona igual y solo no se ve la apariencia del rival.
- Regla sugerida: el dueño de `A.uid` puede cambiar `A.look` (y lo mismo para `B`), validando que sea un mapa con esas 4 claves en rango.

### Cruzar la calle: `cruces/{sala}/players/{uid}` (tolerante)
- **`level`: entero ≥ 1** (el nivel en que va cada jugador).
- Se envía en un `updateDoc` aparte, solo cuando cambia de nivel. Si se rechaza, solo pasa que las ranas de otros niveles no
  se ven transparentes.
- El documento de la sala no cambió.

### Sin cambios en Firebase
Huida del Zorro, Buscaminas, Batalla Naval, 21 y Billar.

---

## 3. Golf: colección nueva para el "Creador de hoyos" (`golfHoyosPropuestos`)

Golf tiene ahora una pantalla para que cualquiera diseñe un hoyo (tema, par, paredes, arena, agua, hielo,
rampas) y lo envíe. Queda **pendiente** hasta que la mayoría de los moderadores del sitio principal lo
apruebe (votación, ver sección 3.2 más abajo) desde la pantalla "PROPUESTAS DE LA COMUNIDAD"; ahí es cuando
se suma a "JUGAR SOLO" (después de los 6 hoyos de siempre). Todo esto es nuevo en Firestore: **sin esta
colección y sus reglas, la pantalla de creación sigue funcionando (se puede diseñar y probar el hoyo), pero
"ENVIAR PROPUESTA" falla con un error de permisos.**

Un documento de `golfHoyosPropuestos/{id}` (id lo genera Firestore):

```
{
  nombre: string (≤30),        // nombre del hoyo, lo pone quien lo diseña
  autor: string (≤12),         // apodo que la persona escribe, no es su correo ni su cuenta
  theme: string,                // 'parque' | 'bosque' | 'desierto' | 'playa' | 'nieve' | 'ciudad'
  par: number (2 a 6),
  start: { x, y }, hole: { x, y },
  walls: [{x,y,w,h}, …]   (máx. 6),
  sand:  [{x,y,w,h}, …]   (máx. 3),
  water: [{x,y,w,h}, …]   (máx. 3),
  ice:   [{x,y,w,h}, …]   (máx. 3),
  ramps: [{x,y,w,h,dir,dist}, …]   (máx. 2, dir: 'right'|'left'|'up'|'down'),
  estado: 'pendiente' | 'aprobado' | 'rechazado',
  creado: serverTimestamp,
  votosAprobar: [correo, …],   // lo escribe SOLO la Cloud Function, nunca el navegador
  votosRechazar: [correo, …],  // ídem
}
```

No guarda uid ni ningún dato personal de quien lo envía, solo el apodo que la persona escribe (igual que el
nombre de jugador en los puntajes). `votosAprobar`/`votosRechazar` sí guardan el correo del moderador que
votó — eso es aparte, lo escribe la Cloud Function con su propia cuenta de servicio, nunca llega a este
documento por el navegador.

Reglas (ver `arcade-firebase/firestore.rules`, que ya las tiene):

```
match /golfHoyosPropuestos/{id} {
  allow read: if signedIn();
  allow create: if signedIn()
    && request.resource.data.keys().hasOnly(['nombre','autor','theme','par','start','hole','walls','sand','water','ice','ramps','estado','creado'])
    && request.resource.data.estado == 'pendiente'
    && request.resource.data.nombre is string && request.resource.data.nombre.matches('^[A-Z0-9 ÁÉÍÓÚÑÜ._!¡?¿-]{1,30}$')
    && request.resource.data.autor is string && request.resource.data.autor.matches('^[A-Z0-9 ÁÉÍÓÚÑÜ._-]{1,12}$')
    && request.resource.data.par is number && request.resource.data.par >= 2 && request.resource.data.par <= 6
    && request.resource.data.walls.size() <= 6 && request.resource.data.sand.size() <= 3
    && request.resource.data.water.size() <= 3 && request.resource.data.ice.size() <= 3
    && request.resource.data.ramps.size() <= 2
    && request.resource.data.creado == request.time;
  allow update: if false;
  allow delete: if false;
}
```

**Sobre "quién puede aprobar":** `update`/`delete` quedan en `if false` a propósito — **nadie** puede cambiar
ni borrar una propuesta desde el navegador, ni siquiera un moderador real con su sesión iniciada. Lo único
que puede es la Cloud Function `arcadeVotarPropuesta`/`arcadeBorrarRegistro`
(`functions/arcadeModeracion.js`), que corre en el proyecto del **sitio principal** (`biblioteca-aematec`,
se despliega con el resto de Functions) y usa su propia cuenta de servicio de `arcade-matec` (Admin SDK, no
pasa por estas reglas). Ver la sección 3.2 para el paso de consola que falta para que esa función funcione.

---

## 3.1 Filtro de apodos y propuestas (apodo, autor, nombre del hoyo)

El apodo de jugador (`name` en `leaderboards`) y el autor/nombre de una propuesta de Golf (`autor`,
`nombre` en `golfHoyosPropuestos`) ahora tienen una regla de caracteres más estricta, además del filtro de
contenido (groserías, teléfonos, correos) que ya hace `arcade.html` del lado del navegador antes de guardar
nada:

```
request.resource.data.name.matches('^[A-Z0-9 ÁÉÍÓÚÑÜ._-]{1,10}$')      // leaderboards: name
request.resource.data.autor.matches('^[A-Z0-9 ÁÉÍÓÚÑÜ._-]{1,12}$')     // golfHoyosPropuestos: autor
request.resource.data.nombre.matches('^[A-Z0-9 ÁÉÍÓÚÑÜ._!¡?¿-]{1,30}$') // golfHoyosPropuestos: nombre
```

`name` baja de 12 a 10 caracteres para que coincida exactamente con lo que ya hace `playerName()` en
`core.js` (corta a 10 y pone todo en mayúsculas). Las reglas solo pueden revisar tamaño y qué caracteres se
usan — no pueden detectar una grosería o un teléfono disfrazado con números por letras; eso lo hace
`filtrarTexto()` en `assets/js/arcade/filtro.js` antes de que el dato llegue a Firestore.

---

## 3.2 Moderación de Golf: la cuenta de servicio nueva (paso de consola, una sola vez)

La Cloud Function `arcadeVotarPropuesta`/`arcadeBorrarRegistro` (`functions/arcadeModeracion.js`) necesita
una forma de escribir en Firestore de `arcade-matec` desde el proyecto del sitio principal. Eso se hace con
una **cuenta de servicio** de `arcade-matec`, guardada como secreto — nunca en el repositorio ni en el chat.

**Quién puede votar/borrar:** cualquier cuenta de `moderators` del sitio principal (la misma lista de
`admin.html`), o las cuentas dueñas del sitio. No hace falta nada nuevo en `arcade-matec` para esto — las
cuentas de moderador siguen siendo las de siempre.

**Pasos (los haces tú, una sola vez; después de esto, mergear el PR ya alcanza):**

1. En [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts), con el proyecto
   **`arcade-matec`** seleccionado (arriba a la izquierda) → "CREAR CUENTA DE SERVICIO".
2. Nombre sugerido: `arcade-moderacion`. No hace falta darle acceso a nadie más en ese paso.
3. Rol: **"Editor de Cloud Datastore"** (`roles/datastore.user`) — alcanza para leer y escribir
   `golfHoyosPropuestos` y `leaderboards`, sin darle de más.
4. Entra a la cuenta de servicio recién creada → pestaña "CLAVES" → "AGREGAR CLAVE" → "Crear clave nueva" →
   JSON. Se descarga un archivo — **no lo subas a ningún lado ni lo compartas por chat**.
5. En tu computadora, con la [CLI de Firebase](https://firebase.google.com/docs/cli) instalada y conectada a
   `biblioteca-aematec` (el proyecto del sitio, NO `arcade-matec`):
   ```
   firebase functions:secrets:set ARCADE_MATEC_SA --project biblioteca-aematec
   ```
   Cuando pida el valor, pega el **contenido completo** del archivo JSON que descargaste (ábrelo con un
   editor de texto y copia todo). Puedes borrar el archivo después de esto.
6. Listo. La próxima vez que se publiquen las Cloud Functions (al mergear un PR que toque `functions/`, el
   flujo `.github/workflows/firebase.yml` ya lo hace solo), la función queda activa. Si ya habías mergeado
   este PR antes de hacer este paso, no pasa nada grave: votar/borrar simplemente da un error hasta que
   completes el paso de arriba.

---

## 4. Cómo comprobarlo después de publicar las reglas

1. Abre <https://aematec.github.io/AEMATEC-web/arcade.html>, escribe un nombre y espera a que diga **● ONLINE**.
2. **Duelo del Oeste:** gánale una ronda a la CPU y revisa que aparezca tu tiempo en la pestaña **REACCIÓN**.
3. **Carreras:** termina una carrera en **LAGO HELADO**. Revisa las pestañas **VUELTA MÁS RÁPIDA** y **CIRCUITO**.
4. **Carreras en línea:** crea una sala, cambia **COLISIONES** a NO y la pista a LAGO HELADO. Desde otro dispositivo,
   únete y revisa que el lobby muestre "CHOQUES: NO".
5. **Combate de Funciones en línea:** crea una sala, cambia el tiempo por turno a 30 s y activa la vista previa. Revisa
   que la otra persona vea 30 s.
6. **Animal al Tiro:** juega **DIANA CONTINUA** y revisa el Top 10.
7. **Creador de hoyos de Golf:** entra a Golf → "CREAR UN HOYO", diseña uno con inicio y bandera, dale "PROBARLO"
   (debe poder jugarse) y luego "ENVIAR PROPUESTA". Debe decir que quedó pendiente, sin error de permisos.
8. **Moderación de Golf (necesita el paso de la sección 3.2 ya hecho):** entra a "PROPUESTAS DE LA COMUNIDAD"
   e inicia sesión con una cuenta de moderador del sitio. Debe aparecer tu correo y, junto a cada propuesta
   pendiente, los botones APROBAR/RECHAZAR/BORRAR con el conteo de votos. Vota con dos cuentas de moderador
   distintas (o hasta llegar al cuórum que te muestre) y confirma que la propuesta cambia a "APROBADO". Vuelve
   al menú de Golf y dale "JUGAR SOLO": el hoyo aprobado debe aparecer después del 6.
9. Si algo no se guarda, abre la consola del navegador (F12). Un error `permission-denied` indica qué regla
   falta; un error al votar que mencione "ARCADE_MATEC_SA" o parecido indica que falta el paso de la sección
   3.2.
