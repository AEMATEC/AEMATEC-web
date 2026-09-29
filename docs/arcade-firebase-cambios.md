# Arcade v2: cambios que necesitan las reglas de Firebase (`arcade-matec`)

Para: quien administra el proyecto de Firebase **`arcade-matec`** (el del Arcade, no el del sitio AEMATEC).

Las reglas de `arcade-matec` **no están en este repositorio** y no se publican solas al hacer merge. Esta
versión del Arcade escribe algunos datos nuevos en Firestore. Si tus reglas limitan las claves, los campos
o los rangos, hay que actualizarlas en **Firebase Console → Firestore Database → Reglas**.

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
rampas) y lo envíe. Queda **pendiente** hasta que alguien con el código de moderador lo apruebe desde la
pantalla "PROPUESTAS DE LA COMUNIDAD"; ahí es cuando se suma a "JUGAR SOLO" (después de los 6 hoyos de
siempre). Todo esto es nuevo en Firestore: **sin esta colección y sus reglas, la pantalla de creación sigue
funcionando (se puede diseñar y probar el hoyo), pero "ENVIAR PROPUESTA" falla con un error de permisos.**

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

Reglas sugeridas:

```
match /golfHoyosPropuestos/{id} {
  allow read: if signedIn();
  allow create: if signedIn()
    && request.resource.data.keys().hasOnly(['nombre','autor','theme','par','start','hole','walls','sand','water','ice','ramps','estado','creado'])
    && request.resource.data.estado == 'pendiente'
    && request.resource.data.nombre is string && request.resource.data.nombre.size() <= 30
    && request.resource.data.autor is string && request.resource.data.autor.size() <= 12
    && request.resource.data.par is number && request.resource.data.par >= 2 && request.resource.data.par <= 6
    && request.resource.data.walls.size() <= 6 && request.resource.data.sand.size() <= 3
    && request.resource.data.water.size() <= 3 && request.resource.data.ice.size() <= 3
    && request.resource.data.ramps.size() <= 2
    && request.resource.data.creado == request.time;
  allow update: if signedIn()
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['estado'])
    && request.resource.data.estado in ['aprobado', 'rechazado'];
  allow delete: if false;
}
```

**Sobre "quién puede aprobar":** el Arcade no tiene cuentas (todo el mundo entra como invitado anónimo), así
que no hay una forma segura de darle el permiso de `update` solo a "los moderadores" sin agregar cuentas o
una Cloud Function — ninguna de las dos existe hoy en `arcade-matec`. Por eso el `allow update` de arriba lo
permite a cualquier persona conectada, igual que ya pasa con las salas y los puntajes del resto del Arcade
(todo funciona con confianza básica, no hay datos sensibles de por medio). Lo que sí protege la pantalla de
moderación es un **código compartido dentro del propio código de `arcade.html`** (constante `GFP_MOD_CODE`,
buscar "Moderar propuestas"): sin ese código no aparecen los botones de aprobar/rechazar en el navegador. No
es una contraseña fuerte, es solo para que nadie apruebe hoyos sin querer — cualquiera que mire el código
fuente puede verlo. Si más adelante se quiere una protección real, hay que agregar cuentas o una Cloud
Function a `arcade-matec`, que es un cambio más grande.

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
   Entra a "PROPUESTAS DE LA COMUNIDAD", escribe el código de moderador (`GFP_MOD_CODE` en `arcade.html`) y
   aprueba ese hoyo. Vuelve al menú de Golf y dale "JUGAR SOLO": el hoyo aprobado debe aparecer después del 6.
8. Si algo no se guarda, abre la consola del navegador (F12). Un error `permission-denied` indica qué regla falta.
