---
name: temas-de-temporada
description: Cómo agregar, cambiar o quitar temas de temporada del sitio AEMATEC (Navidad, Halloween, mes patrio, Semana de la Carrera, 8M, Día de la Madre, etc.) y cómo apagarlos o fijarlos. Úsala cuando pidan decorar el sitio para una fecha, cambiar colores o animaciones de una celebración, o cuando pregunten por qué el sitio se ve distinto.
---

# Temas de temporada

## Cómo funciona
- `assets/js/temas.js` tiene el catálogo `TEMAS`: fechas, estilo, icono y mensaje de cada tema. Lo carga
  `assets/js/layout.js` en todas las páginas.
- `assets/css/temas.css` tiene los colores de cada tema (`html[data-tema="<id>"]`) y las animaciones.
- El tema se elige solo por la fecha de Costa Rica. Si coinciden dos, gana el de rango más corto.
- La Junta decide desde `admin.html` → **Tema del sitio** (documento `config/tema`): automático, apagado o un
  tema fijo, con fecha de fin opcional. No hace falta un PR para eso.
- Vista previa en cualquier página: `?tema=<id>` (por ejemplo `index.html?tema=navidad`) o `?tema=ninguno`.

## Estilos (decisión de la Junta, 2026-09)
- **sutil**: franja de color bajo el encabezado y un aviso breve. Para celebraciones de un día (8M, Día de la
  Madre, Día del Padre, Día del Docente) y para Año nuevo y el mes del Orgullo.
- **festivo**: además, una animación corta (unos 20 segundos) que se detiene sola. Para las épocas: Navidad,
  Halloween, mes patrio, noche de faroles y Semana de la Carrera.
- La Semana de la Carrera es la semana (lunes a domingo) del Día de π, con el tema «La constante de Arquímedes»
  y estilo griego antiguo (greca dorada sobre azul).

## Agregar o cambiar un tema
1. En `TEMAS` (`assets/js/temas.js`) copia una entrada parecida y cambia `id`, `nombre`, `estilo`, `fechas`
   (`cadaAnio("MM-DD", "MM-DD")` o una función para fechas móviles, como `diaDelPadre`), `icono` (Font Awesome
   gratuito, `fa-…`) y `mensaje`. Si es festivo, define `particulas` (`icono`, `texto`, `confeti` o `farol`).
2. En `assets/css/temas.css` agrega el bloque `html[data-tema="<id>"]` con `--tema-acento` y `--tema-cinta`, y
   los colores de las partículas si es festivo.
3. En `tests/temas.test.js` agrega una prueba con sus fechas (la prueba del catálogo ya exige el bloque de CSS).
4. Revisa con `?tema=<id>` en computadora y celular, y ejecuta `node --test tests/temas.test.js`,
   `node tests/revisar-paginas.mjs` y `node tests/revisar-enlaces.mjs`.

## Reglas
- Nada de animaciones para quien pidió "reducir movimiento" en su equipo, y siempre el botón "Detener animación".
- Las animaciones no reciben clics ni tapan formularios; nada de sonidos ni ventanas que bloqueen.
- Mensajes cortos, en español y con el nombre oficial de la fecha. Los textos van con `textContent`.
