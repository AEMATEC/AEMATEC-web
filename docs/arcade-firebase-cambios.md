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
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['estado'])
    && request.resource.data.estado in ['aprobado', 'rechazado'];
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

Se descartó el diseño anterior (Cloud Function + cuenta de servicio de Google Cloud): complicaba de más
algo que se puede resolver directo en las reglas de `arcade-matec`. **Ya no hace falta ningún secreto, ni
Cloud Function, ni tocar Google Cloud Console en absoluto.**

**Cómo funciona:** el moderador inicia sesión con correo y contraseña **propios de `arcade-matec`**
(`assets/js/arcade/moderacion.js`, una segunda app de Firebase aparte de la anónima con la que todo el
mundo juega, para no perder esa sesión al moderar). La regla `esModerador()` en
`arcade-firebase/firestore.rules` solo revisa si la sesión actual inició con contraseña (moderador) o es
anónima (cualquiera jugando) — nada de listas que sincronizar ni de otro proyecto de Firebase. Un clic en
APROBAR o RECHAZAR decide al momento, sin que haga falta que vote más de una persona.

**Quién puede ser moderador:** cualquier cuenta de correo/contraseña que exista en la Authentication de
`arcade-matec`. Como ahí no hay ninguna pantalla pública de "crear cuenta" (solo tú las creas desde la
consola), tener una cuenta ahí YA significa ser moderador — no hace falta una lista aparte.

**Pasos (los haces tú, una sola vez por cada moderador nuevo):**

1. Firebase Console → proyecto **`arcade-matec`** → **Authentication** → pestaña "Sign-in method" /
   "Método de acceso" → activa **"Correo electrónico/contraseña"** (si no estaba activo; "Anónimo" se
   queda activo igual, es el que usa todo el mundo para jugar).
2. Pestaña **"Users"** / "Usuarios" → **"Add user"** / "Agregar usuario" → escribe el correo de la persona
   y ponle una contraseña (la que quieras, se la pasas tú directamente, no hace falta que la persona la
   elija ni confirme un correo).
3. Listo — esa persona ya puede entrar a Golf → "PROPUESTAS DE LA COMUNIDAD" con ese correo y contraseña y
   va a ver los botones de aprobar/rechazar/borrar. Repite el paso 2 por cada moderador que quieras agregar;
   para quitarle el acceso a alguien, borra su usuario desde esa misma pantalla.

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
8. **Moderación de Golf (necesita el paso de la sección 3.3 ya hecho):** entra a "PROPUESTAS DE LA COMUNIDAD"
   e inicia sesión con la cuenta de moderador que creaste en Authentication → Users de `arcade-matec`. Debe
   aparecer tu correo y, junto a cada propuesta pendiente, los botones APROBAR/RECHAZAR/BORRAR. Dale
   APROBAR a una: debe cambiar a "APROBADO" de una vez, sin pedir más votos. Vuelve al menú de Golf y dale
   "JUGAR SOLO": el hoyo aprobado debe aparecer después del 6.
9. Si algo no se guarda, abre la consola del navegador (F12). Un error `permission-denied` al votar indica
   que falta activar "Correo electrónico/contraseña" en Authentication o crear la cuenta de moderador
   (sección 3.3).
