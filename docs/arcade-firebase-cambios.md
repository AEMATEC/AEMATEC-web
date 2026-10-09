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
- `duelo`: solo suma victorias VS CPU en DIFÍCIL (desde 2026-10). Mismo formato.
- `batalla`: VS CPU solo suma en DIFÍCIL (`extra` = `VS CPU DIFÍCIL`); en línea suma siempre (`ONLINE`). Mismo formato.
- `funciones`: nuevo texto de `extra` en local con equipos elegidos: `FFA 3 EQUIPOS`, `FFA 4 EQUIPOS` (≤24).
- `tiro_uno`, `cruce`, `runner` y los demás: sin cambios.

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

Los arreglos de octubre 2026 (carta oculta y turnos en 21, tiempo por turno en Billar y Golf, agua en Golf,
segunda partida en Cruzar la Calle) **no agregan campos**: el tiempo por turno lo calcula cada navegador y
al acabarse escribe lo mismo que un turno normal.

---

## 3. Golf: colección nueva para el "Creador de hoyos" (`golfHoyosPropuestos`)

Golf tiene ahora una pantalla para que cualquiera diseñe un hoyo (tema, par, paredes, arena, agua, hielo,
rampas) y lo envíe. Cualquiera puede probarlo ("▶ PROBARLO") desde "PROPUESTAS DE LA COMUNIDAD". Queda
**pendiente** hasta que un moderador del Arcade lo aprueba o rechaza ahí mismo (ver sección 3.3 más abajo);
ahí es cuando se suma a "JUGAR SOLO" (después de los 6 hoyos de siempre). Todo esto es nuevo en Firestore:
**sin esta colección y sus reglas, la pantalla de creación sigue funcionando (se puede diseñar y probar el
hoyo), pero "ENVIAR PROPUESTA" falla con un error de permisos.**

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
}
```

No guarda uid ni ningún dato personal de quien lo envía, solo el apodo que la persona escribe (igual que el
nombre de jugador en los puntajes).

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
  allow update: if esModerador()
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['estado', 'votosAprobar', 'votosRechazar'])
    && request.resource.data.estado in ['pendiente', 'aprobado', 'rechazado']
    && request.resource.data.votosAprobar is list && request.resource.data.votosRechazar is list;
  allow delete: if esModerador();
}
```

**Sobre "quién puede aprobar":** solo `esModerador()` puede cambiar `estado` o borrar — es decir, solo una
sesión que inició con correo/contraseña **de este mismo proyecto** (`arcade-matec`), nunca una sesión
anónima (con la que juega todo el mundo). No hace falta Cloud Function ni tocar otro proyecto de Firebase.
Ver la sección 3.3 para cómo se crean esas cuentas de moderador.

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

## 3.3 Moderación de Golf: cuenta de moderador propia del Arcade (sin Google Cloud)

> **Corrección de seguridad (2026-10-02), hay que publicarla a mano.** La primera versión de `esModerador()`
> solo revisaba que la sesión fuera de contraseña. Pero **cualquiera puede crearse una cuenta de
> correo/contraseña** en `arcade-matec` llamando a la API pública de Firebase Auth con la apiKey que está en
> `core.js`, aunque el Arcade no tenga pantalla de registro. Con eso podía borrar puntajes y aprobar o
> borrar hoyos. Ahora la regla también exige que el correo esté en `arcadeModeradores`. Para que tome efecto:
> 1. Publica `arcade-firebase/firestore.rules` en la consola de `arcade-matec` (Firestore → Reglas → pegar →
>    Publicar), como se explica en la sección 0.
> 2. Recomendado además: Authentication → Configuración → **Acciones del usuario** → desmarca **"Habilitar
>    la creación (registro)"**, así solo se pueden crear cuentas desde la consola. Las sesiones anónimas
>    para jugar siguen funcionando.
> 3. Revisa Authentication → Usuarios: si hay cuentas de correo que no creaste tú, bórralas.

Se descartó el diseño anterior (Cloud Function + cuenta de servicio de Google Cloud): complicaba de más
algo que se puede resolver directo en las reglas de `arcade-matec`. **Ya no hace falta ningún secreto, ni
Cloud Function, ni tocar Google Cloud Console en absoluto.**

**Cómo funciona:** el moderador inicia sesión con correo y contraseña **propios de `arcade-matec`**
(`assets/js/arcade/moderacion.js`, una segunda app de Firebase aparte de la anónima con la que todo el
mundo juega, para no perder esa sesión al moderar). La regla `esModerador()` en
`arcade-firebase/firestore.rules` revisa que la sesión actual haya iniciado con contraseña **y** que ese
correo tenga su documento en `arcadeModeradores` (ver abajo) — nada de otro proyecto de Firebase ni Cloud
Function. El segundo requisito (`arcadeModeradores`) hace falta porque solo la contraseña no basta:
cualquiera puede crearse una cuenta de correo/contraseña con la API pública de Firebase Auth, y desde los
perfiles opcionales (sección 3.4) cualquier persona SÍ tiene de verdad una cuenta así. Hace falta que el
**75% de los moderadores actuales (redondeado hacia arriba)** vote lo mismo para que una propuesta quede
aprobada o rechazada; `gfpVotar()` en `arcade.html` guarda el correo de quien vota en `votosAprobar` o
`votosRechazar` dentro del propio documento de la propuesta, cuenta cuántos moderadores hay (ver abajo) y
decide si ya se alcanzó el 75%.

**Quién puede ser moderador:** cualquier cuenta de correo/contraseña que exista en la Authentication de
`arcade-matec` **y que además tenga su documento en la colección `arcadeModeradores`** (un documento por
correo, el contenido no importa, solo que exista). Hacen falta las dos cosas porque las reglas de Firestore
no pueden leer la lista de usuarios de Authentication para contarlos — por eso se lleva una copia simple en
Firestore, nada más para saber "cuántos moderadores hay" al calcular el 75%.

**Pasos (los haces tú, una sola vez por cada moderador nuevo):**

1. Firebase Console → proyecto **`arcade-matec`** → **Authentication** → pestaña "Sign-in method" /
   "Método de acceso" → activa **"Correo electrónico/contraseña"** (si no estaba activo; "Anónimo" se
   queda activo igual, es el que usa todo el mundo para jugar).
2. Pestaña **"Users"** / "Usuarios" → **"Add user"** / "Agregar usuario" → escribe el correo de la persona
   y ponle una contraseña (la que quieras, se la pasas tú directamente, no hace falta que la persona la
   elija ni confirme un correo).
3. **Firestore Database → Datos** → colección `arcadeModeradores` (créala si todavía no existe) → "Agregar
   documento" → como ID del documento escribe el **mismo correo** que usaste en el paso 2 → guarda sin
   agregarle ningún campo (puede quedar vacío).
4. Listo — esa persona ya puede entrar a Golf → "PROPUESTAS DE LA COMUNIDAD" con ese correo y contraseña y
   va a ver los botones de aprobar/rechazar/borrar, y su voto ya cuenta para el 75%. Repite los pasos 2 y 3
   por cada moderador que quieras agregar; para quitarle el acceso a alguien, borra su usuario en
   Authentication **y** su documento en `arcadeModeradores` (si solo borras uno de los dos, puede quedar sin
   poder votar pero sí contando para el total, o al revés).

**Nota:** esta cuenta es independiente de la del sitio principal (la de `admin.html`) — es otra contraseña,
de otro proyecto. Si prefieres que sea la misma cuenta que ya usan en `admin.html`, es posible pero necesita
el diseño anterior (Cloud Function + Google Cloud), que se descartó justamente para evitar ese paso.

---

## 3.2 Salas: borrar y "caducar" solas

Se pidieron dos cosas para las salas en línea (`rooms`, `races`, `fights`, `blackjack`, `pool`, `duelos`,
`golf`, `cruces`): que solo el anfitrión pueda borrar la sala, y que una sala abandonada se borre sola.

**Lo que SÍ se hizo:**
- `allow delete` pasa de `if false` (nadie podía borrar, ni el anfitrión) a permitir solo a quien creó la
  sala (`host`, o `p1`/`A` en las salas 1 contra 1 sin subcolección). Hoy ningún botón del Arcade llama a
  borrar una sala todavía — este cambio deja el permiso listo por si más adelante se agrega un botón
  "cerrar sala", y cierra un hueco (que NADIE pudiera borrar nada).
- Cada sala escribe un campo `expiraEn` (24 horas desde el último latido de presencia) junto a `lastSeen`,
  en `assets/js/arcade/core.js` (función `expiraEn()`) y en los 8 lugares de `arcade.html` que usan
  `presenceLoop`.
- **Limpieza sin Google Cloud ni Cloud Function:** se descartó configurar una política de TTL en consola
  (en el rediseño actual de Firebase Console, esa opción vive en Google Cloud Console, no en Firebase
  Console, y se prefirió evitar ese panel por completo). En su lugar, `liveRooms()` en `core.js` —la función
  que ya usan los 8 juegos para mostrar "SALAS/MESAS/PARTIDAS EN VIVO"— ahora borra sola cualquier sala
  cuyo `expiraEn` ya pasó, apenas alguien abre esa lista. La regla nueva `salaCaducada()` en
  `arcade-firebase/firestore.rules` permite que CUALQUIERA borre una sala vencida, no solo quien la creó,
  para que esta limpieza funcione sin depender de un dueño específico.
  **Ojo, cobertura parcial:** esto solo limpia `rooms` (Batalla Naval), `pool` (Billar) y `duelos` (Duelo
  del Oeste), porque esos tres guardan `expiraEn` en el documento de la sala misma. Los otros 5 juegos
  (`races`, `fights`, `blackjack`, `golf`, `cruces`) guardan la presencia en la subcolección `players`, no en
  la sala — limpiarlos también necesitaría más trabajo (revisar si TODOS los jugadores de la sala están
  vencidos, no un solo documento). Se dejó así a propósito para no alargar este cambio; esas 5 colecciones
  simplemente no se limpian solas por ahora, lo cual no rompe nada, solo quedan ocupando espacio.

**Lo que NO se hizo, y por qué:** se había pensado en limitar a cada jugador a escribir solo su propio
"casillero" (`p1`/`p2`, `A`/`B`) en `rooms`, `pool` y `duelos`. Revisando el código real de Batalla Naval,
Billar y Duelo del Oeste, esto **rompería el juego en línea**: campos como `winner`, `turn`, `shots_p1`,
`balls`, `state`, `winsA` no son "de un jugador", son del PARTIDO completo, y los escribe quien le toca el
turno — no siempre el mismo. Limitarlo mal habría bloqueado jugadas válidas sin que se note hasta que
alguien lo prueba en línea de verdad. Como no hay forma de probar esto con dos sesiones contra las reglas
reales sin publicarlas primero, se dejó tal cual (ya validan que seas uno de los dos jugadores de la sala,
que es la protección real) en vez de arriesgar romper el juego. Si más adelante se quiere apretar esto más,
hay que diseñarlo juego por juego y probarlo en línea antes de publicar.

---

## 3.4 Perfiles opcionales: cuenta, amigos y récords (colecciones nuevas)

Pantalla nueva "PERFIL" en el Arcade (pestaña del menú). Es **opcional**: se puede seguir jugando sin
cuenta exactamente igual que antes. Toda la lógica vive en `assets/js/arcade/perfiles.js`; la pantalla, en
el bloque "PERFIL" de `arcade.html`.

**Cómo funciona sin correo real:** Firebase Auth no tiene un login "solo usuario", así que se arma un
correo falso interno (`usuario + "@arcade.aematec.local"`) y se usa con las funciones normales de
correo/contraseña — ese correo falso nunca se muestra en ninguna pantalla. **Importante:** esto significa
que si alguien olvida su usuario o contraseña, nadie puede recuperarla (no hay correo real al que enviar
nada) — la pantalla de registro ya avisa esto.

**Por qué los récords pasan solos a la cuenta nueva:** registrarse usa `linkWithCredential` sobre la sesión
anónima con la que esa persona ya estaba jugando, **conservando el mismo uid**. Como los puntajes se
guardan por uid (`leaderboards/{juego}/scores/{uid}`), todo lo que esa persona ya había guardado jugando
sin cuenta (con el opt-in de siempre, ver sección 1) pasa a ser automáticamente lo de su cuenta nueva, sin
mover nada a mano. Iniciar sesión en OTRO dispositivo sí cambia de uid al de la cuenta real — los récords
de ESE dispositivo, jugados sin cuenta, quedan atrás (igual que ya pasa hoy sin conexión).

Documentos nuevos:

```
usuariosTomados/{usuarioMinusculas}   { uid }
perfiles/{uid}                        { usuario, usuarioMin, descripcion, avatar, creado }
perfiles/{uid}/solicitudesRecibidas/{deUid}   { de, creado }
perfiles/{uid}/amigos/{otroUid}               { desde }
```

`avatar` es uno de `'zorro' | 'llama' | 'erizo' | 'nave' | 'mina'` (sprites ya existentes del Arcade,
`SPR.llama`/`SPR.erizo`/`SPR.nave`/`SPR.mine` en `core.js` y `RN_FOX_SPR.duck` en `runner.js`). Nada de
correo real, teléfono ni nombre legal — solo lo que la persona escribe a propósito para su tarjeta pública.

**"Usuario único" sin Cloud Function:** `usuariosTomados/{usuarioMinusculas}` solo se puede **crear**, nunca
actualizar (ver las reglas en `arcade-firebase/firestore.rules`) — así un segundo registro con el mismo
usuario choca solo porque el documento ya existe, sin que ninguna regla tenga que contar ni comparar nada.

**Amigos (solicitud y aceptación):** quien envía la solicitud escribe un documento en
`perfiles/{destino}/solicitudesRecibidas/{miUid}` (el id es quien la envía, para que nadie pueda fingir ser
otra persona). Al aceptar, se crea la amistad espejada en los dos perfiles
(`perfiles/A/amigos/B` y `perfiles/B/amigos/A`) en una sola transacción y se borra la solicitud. Cualquiera
de los dos lados puede crear o borrar esa amistad espejada — es la misma confianza básica que ya se usa en
el conteo de votos de Golf (sección 3.3): las reglas no pueden verificar que las DOS copias se escriban
siempre juntas, así que confían en que quien tiene una cuenta real actúa de buena fe.

**Cómo se ve el perfil (octubre 2026):** la pantalla sigue el boceto de la Junta. Arriba, una tarjeta con la imagen
predeterminada (una de las 5 de `avatar`), el usuario y la descripción; debajo, dos paneles: **AMIGOS** (buscar y
agregar, solicitudes recibidas, lista) y **RECORDS** (todas las marcas de la cuenta). Ver el perfil requiere
iniciar sesión o registrarse con usuario y contraseña. Tocar a una persona de la lista de amigos abre **su perfil**
en el mismo formato, solo lectura: su imagen, descripción, desde cuándo está en el Arcade y desde cuándo son amigos,
sus **récords** (con "TÚ: …" al lado cuando tú también tienes marca en ese juego) y **sus amigos**. Desde ahí se
puede agregar o quitar amistad. No hay colecciones ni campos nuevos.

**Regla que hay que copiar a mano para ver los amigos de un amigo:** `perfiles/{uid}/amigos/{otroUid}` ahora se
puede **leer** por su dueño y también por quien ya es su amigo/a (`exists(.../perfiles/{miUid}/amigos/{uid})`); nadie
más. Está ya en `arcade-firebase/firestore.rules` y hay que pegarla en **Firebase Console → Firestore Database →
Reglas** (no se publica sola). Sin ese cambio todo lo demás funciona (imagen, descripción, récords del amigo, ya que
`perfiles` y `leaderboards` son públicos de lectura) y solo el panel "AMIGOS DE …" dice "LA LISTA DE AMIGOS SOLO LA VEN
SUS AMIGOS".

**Ojo con la moderación de Golf:** desde que existen los perfiles, `esModerador()` (sección 3.3) tuvo que
cambiar para seguir revisando también `arcadeModeradores` — si solo mirara "inició con contraseña", CUALQUIER
persona con un perfil quedaría tratada como moderadora. Revisa que tu copia de las reglas en consola tenga
ese cambio junto con las colecciones de esta sección.

---

## 3.5 Tetris (página aparte `tetris.html`): colección nueva y dos tablas

**Hay que copiar `arcade-firebase/firestore.rules` a la consola de Firebase de `arcade-matec`** (como siempre, no se publica solo).
Sin eso, el Tetris SOLO funciona, pero no se pueden crear salas en línea ni publicar puntajes.

- **Colección `tetris/{sala}`** (igual que `cruces`): `{ host, hostName, state: 'lobby'|'playing', round, seed, created, lastSeen, expiraEn }`
  y subcolección `players/{uid}` con `{ name, round, alive, board (texto de 200 caracteres), score, lines, sent, lastSeen }`.
  Cada jugador escribe solo su documento. Las dos personas reciben las mismas piezas porque la semilla (`seed`) va en la sala.
- **Tablas:** `tetris` (puntos, entero 1 a 9 999 999, mayor es mejor, `extra` ≈ `12 LÍN · NIV 2`) y `tetris_vs` (victorias en línea,
  suma de 1 en 1 como `duelo`). Ya están en `validScore` e `isIncGame`.
- Las reglas se probaron con el emulador y dos navegadores (crear sala, unirse, jugar, ganar, revancha).

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
8. **Moderación de Golf (necesita el paso de la sección 3.3 ya hecho, con al menos una cuenta de
   moderador y su documento en `arcadeModeradores`):** entra a "PROPUESTAS DE LA COMUNIDAD" e inicia sesión
   con esa cuenta. Debe aparecer tu correo y, junto a cada propuesta pendiente, los botones
   APROBAR/RECHAZAR/BORRAR con el conteo de votos. Con un solo moderador registrado, el 75% redondeado hacia
   arriba es 1 — dale APROBAR a una propuesta y debe cambiar a "APROBADO" de una vez. Si agregas una segunda
   cuenta de moderador, el umbral sube a 2: vota con las dos cuentas y confirma que recién con la segunda
   cambia de estado. Vuelve al menú de Golf y dale "JUGAR SOLO": el hoyo aprobado debe aparecer después del 6.
9. Si algo no se guarda, abre la consola del navegador (F12). Un error `permission-denied` al votar indica
   que falta activar "Correo electrónico/contraseña" en Authentication, crear la cuenta de moderador o su
   documento en `arcadeModeradores` (sección 3.3).
10. **Perfiles (sección 3.4):** entra a la pestaña "PERFIL", crea una cuenta con usuario y contraseña.
    Debe pasar a la tarjeta de perfil (sin error de permisos). Cambia el avatar y la descripción y dale
    "GUARDAR". Cierra sesión y vuelve a iniciar sesión con el mismo usuario y contraseña: debe volver a
    aparecer tu perfil. Antes de crear la cuenta, juega algo y sube un puntaje (sección 1); después de
    crear la cuenta, revisa que ese puntaje aparezca en el panel "RECORDS".
11. **Amigos:** con dos cuentas de perfil distintas (dos navegadores o uno en incógnito), busca el usuario
    de la otra cuenta y dale "AGREGAR". Desde la otra cuenta debe aparecer en "SOLICITUDES RECIBIDAS" con
    botones ACEPTAR/RECHAZAR. Acepta y confirma que aparece en "TUS AMIGOS" en AMBAS cuentas.
12. **Que la moderación de Golf siga funcionando:** con una cuenta de PERFIL (no de moderador), entra a
    Golf → "PROPUESTAS DE LA COMUNIDAD" — NO debe mostrar los botones de aprobar/rechazar/borrar (si los
    muestra, `esModerador()` no se actualizó bien en la consola).
