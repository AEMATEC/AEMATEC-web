# Unificación de categorías de la Biblioteca

**Qué es:** varias categorías de libros están escritas de formas distintas aunque signifiquen lo mismo
(por ejemplo "Geometría Analítica" y "Geometría analítica"). Eso hace que el filtro de la Biblioteca muestre
categorías repetidas. Este cambio las deja escritas de una sola forma.

**Todavía no se aplicó.** Esta lista es una simulación hecha con el Excel del inventario
(`data/Plantilla_Inventario_AEMATEC.xlsx`, hoja "Biblioteca", 137 libros). Si alguien cambió categorías
desde la página del Inventario después de importar el Excel, los números pueden variar un poco.

## Reglas que se siguieron

- Solo la primera letra va en mayúscula: "Matemática general", no "Matemática General".
- Tildes correctas y sin espacios de más al inicio o al final.
- Se corrigen errores de escritura: "ciclio" pasa a "ciclo".
- **No se juntan categorías con significado distinto.** Por ejemplo, "Matemática", "Matemática general" y
  "Matemática universitaria" siguen siendo tres categorías.
- Si un libro tenía varias categorías separadas por "/" (por ejemplo "Cálculo / Complejos"), quedan como
  categorías separadas en la lista del libro.

## Cambios

| Variante (como está hoy) | Queda así | Libros afectados |
|---|---|---|
| Tercer ciclio | Tercer ciclo | 8 |
| Geometría Analítica | Geometría analítica | 6 |
| Ciclio diversificado | Ciclo diversificado | 4 |
| Geometría Euclídea | Geometría euclídea | 4 |
| Álgebra Lineal | Álgebra lineal | 2 |
| Matemática General | Matemática general | 2 |
| Análisis de Datos | Análisis de datos | 1 |
| Matemática Básica | Matemática básica | 1 |
| Matemática Universitaria | Matemática universitaria | 1 |
| Programación Lineal | Programación lineal | 1 |
| Teoría de Matrices | Teoría de matrices | 1 |

Además, en todas las categorías se quitan los espacios sobrantes (por ejemplo "Cálculo " con un espacio al
final pasa a "Cálculo"). Eso no cambia nada que se vea, pero evita que aparezcan repetidas en el filtro.

Después del cambio quedan **42 categorías distintas**.

## Para revisar a mano

- **"Matemáticas finitas: Aplicaciones prácticas"** tiene 4 categorías (Álgebra lineal, Álgebra abstracta,
  Programación lineal y Estocástica). El nuevo formato permite como máximo 3: conviene que la Junta elija
  cuáles tres dejar antes de aplicar el cambio.
- **"Curso: Introducción a la Pedagogía"** se deja igual porque es el nombre de un curso. Si se prefiere
  pasarlo a "Pedagogía", hay que decidirlo aparte (no es una variante de escritura, es un cambio de categoría).
- Otras dudas (por ejemplo, si juntar "Discreta" con "Matemática discreta" o agrupar categorías por área)
  están en `docs/categorias/mapa-unificaciones.json`, en la parte "dudas". Ninguna de ellas se aplica con
  este cambio.

## Cómo se aplica (para quien mantiene el sitio)

El script es `scripts/categorias/unificar-variantes.js`. Desde la carpeta `scripts`:

1. `node categorias/unificar-variantes.js --desde-excel` muestra esta misma lista sin conectarse a nada.
2. `node categorias/unificar-variantes.js` lee los libros reales de Firestore y muestra qué cambiaría, sin
   guardar nada.
3. `node categorias/unificar-variantes.js --aplicar` guarda los cambios: cada libro queda con la lista
   `categorias` y se borra el campo viejo `categoria`.

Los pasos 2 y 3 necesitan la clave de cuenta de servicio de Firebase (la misma de la importación del
inventario). Esa clave nunca se sube al repositorio ni se pega en el chat.
