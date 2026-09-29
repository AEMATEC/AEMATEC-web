# Combate de Funciones: cómo se dispara una función

Explicación para quien juega o mantiene el juego (`arcade.html`, sección `COMBATE DE FUNCIONES`, función `fcSim`).

## El mapa
- El plano va de x = −25 a 25 y de y = −15 a 15. Cada cuadrito de la cuadrícula mide 5 unidades.
- **x es la posición real en el mapa**, no la distancia a tu personaje.

## Cómo funcionaba (y sigue funcionando)
Cuando escribes `y = f(x)` y tu personaje está en el punto (x₀, y₀):

1. El juego **sube o baja toda la gráfica** hasta que pase por tu personaje. La curva que se dispara es

   `y = f(x) − f(x₀) + y₀`

   (a la gráfica original se le resta su altura en x₀ y se le suma la altura de tu personaje).
2. La curva **se recorre en x** desde x₀ hacia la dirección elegida (DER ▶ o ◀ IZQ) hasta que choca con un
   obstáculo, sale del mapa o la función deja de estar definida.

Es exactamente la regla de **Graph War**: allí también la curva solo se traslada verticalmente y se recorre en x
hacia el lado del disparo. No se mueve horizontalmente.

### Por qué las cuadráticas "funcionan raro"
Porque x es la coordenada real. `y = x^2` tiene su vértice en **x = 0 (el centro del mapa)**, no en tu personaje.

- Si estás en x₀ = −20 y disparas `x^2` hacia la derecha, estás en la rama izquierda de la parábola, donde baja
  muy rápido (pendiente −40): la bala se va casi en picada hacia abajo y sale del mapa.
- `x^2/20` desde (−20, 0): baja 20 unidades hasta x = 0, así que sale por abajo en x ≈ −10.

No es un error: es la gráfica real. Para que la parábola **empiece en tu personaje**, trasládala horizontalmente
con `(x − x₀)^2`:

| Tu posición | Quieres... | Escribe |
|---|---|---|
| x₀ = −20 | parábola que sube desde ti | `(x+20)^2/20` |
| x₀ = −20 | arco que sube y baja (para saltar una roca) | `-(x+10)^2/15` (vértice en x = −10) |
| x₀ = 15 | disparar a la izquierda con una parábola | `(x-15)^2/20` + botón ◀ IZQ |

Esto es justo lo que el juego quiere enseñar: **traslaciones de funciones** (f(x − a) mueve la gráfica a la derecha).
La vista previa del disparo (opción del menú) ayuda a verlo mientras escribes.

### ¿Por qué no se cambió a "x relativa al personaje"?
Se consideró hacer que x cuente desde el personaje (así `x^2` siempre empezaría en su vértice). Se descartó porque:
- rompería la relación con los ejes y los números que se ven en pantalla (y con el botón **Cambiar a π**:
  `sin(x)` corta el eje justo en los rótulos π, 2π…);
- la sugerencia de reflejo `f(−x)` dejaría de tener sentido;
- el juego dejaría de ser como Graph War, que es la referencia.

## Qué cambió en el trazado (septiembre 2026)
Antes la curva se avanzaba siempre en pasos de 0.01 en x. Si en un paso la curva subía o bajaba **más de 25
unidades**, el disparo se cortaba ahí mismo (se creía que era una asíntota). Eso pasaba con curvas **muy empinadas
pero continuas**, por ejemplo `e^x` disparada desde x = 8 (pendiente ≈ 3000): la bala no salía, y nunca podía pegarle
a alguien que estuviera justo arriba.

Ahora el paso en x **se achica solo** donde la curva es empinada (cada paso sube como máximo 0.25):
- **Curva empinada pero continua** (`e^x`, `x^3`, cerca de una asíntota de `tan x`): se sigue dibujando casi vertical
  y choca con lo que encuentre, hasta salir del mapa.
- **Salto que no desaparece aunque el paso sea diminuto:**
  - si el salto es de 3 unidades o menos (`floor(x)`, `sign(x)`), se une con una línea vertical y sigue;
  - si es mayor (`1/x` al cruzar x = 0, `tan x` al cruzar su asíntota), el disparo termina ahí.
- **Fuera del dominio** (`sqrt(x)` hacia x < 0, `ln(x)` hacia x ≤ 0): el disparo termina justo en el borde.

La regla del disparo (`f(x) − f(x₀) + y₀`) **no cambió**, así que las partidas online entre versiones distintas
siguen siendo compatibles: quien dispara calcula a quién eliminó y dónde chocó, y lo guarda en la sala.

### Ejemplos (pista PRADERA)
| Función | Desde | Antes | Ahora |
|---|---|---|---|
| `x` | (−20, −5) → | recta a 45° | igual |
| `3sin(x)` | (−20, 2) → | onda | igual |
| `e^x` | (8, −12) → | no salía (se cortaba) | sube casi vertical y choca con la roca de (11, −7) |
| `tan(x)` | (−20, 2) → | sube hasta salir por arriba | igual, con más precisión cerca de la asíntota |
| `1/x` | (−20, 2) → | baja hacia x = 0 | igual; termina al chocar con la roca central |
| `ln(x)` | (−20, 2) → | error | error, con la sugerencia **¿PRUEBA f(−x)? → y = ln(−x)** |

## Sugerencia de reflejo
Si la función **no está definida en tu x** (por ejemplo `ln(x)` o `sqrt(x)` cuando estás en x < 0), el juego lo avisa
mientras escribes y al disparar: `FUNCIÓN NO DEFINIDA EN x=−20.0 ¿PRUEBA f(−x)? → y = ln(−x)`.
`f(−x)` es la misma gráfica reflejada sobre el eje Y; como x es la coordenada real, eso mueve el dominio al lado
donde estás. Solo se sugiere si `f(−x)` sí está definida ahí; si no (por ejemplo `1/x` en x = 0), dice
"MUÉVETE O CAMBIA LA FUNCIÓN".

## Botón "Cambiar a π"
Solo cambia los **rótulos** del eje X (−π, −π/2, π/2, π, 2π…; π ≈ 3.14). La escala y el significado de x no cambian:
el punto rotulado "π" es x = 3.14. Es útil para funciones trigonométricas: `sin(x)` corta el eje en cada rótulo.
