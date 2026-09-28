# Propuesta: agrupar las categorías de la Biblioteca

> **Esto es solo una propuesta.** No se ha cambiado nada en el sitio, en Firestore ni en el Excel.
> La Junta Directiva decide qué se aplica (ver la sección "Lo que la Junta debe decidir", al final).

- **Fuente:** hoja "Biblioteca" de `data/Plantilla_Inventario_AEMATEC.xlsx` (la misma que importa
  `scripts/import-inventario.js`). 137 libros (160 ejemplares). Las filas BIB-136 y BIB-137 están vacías y no cuentan.
- **Punto de partida:** ya se separaron las categorías que venían juntas con "/" y se unificaron las
  variantes de escritura (ver `mapa-unificaciones.json` y `plan-separacion.txt` en esta misma carpeta).
  Con eso quedan **42 categorías**, y **muchas tienen un solo libro**.
- **Fecha:** 2026-09-28.
- **Nota sobre los títulos:** para que se lean mejor, aquí se corrigieron algunos errores de escritura
  ("Cálulo", "diferecial", "igeniería", "Lucturas", "Mikeparr", "George . Runger"). En el Excel siguen
  como estaban; corregirlos es otra decisión, aparte de esta.

---

## 1. La idea en pocas palabras

Hoy la lista de categorías es larga y plana: quien busca "algo de geometría" tiene que revisar
"Geometría", "Geometría analítica", "Geometría euclídea" y "Trigonometría" por separado.

La propuesta es crear **categorías padre** (un nivel más general) que agrupen a las **categorías hijas**
(las específicas). Ejemplo: al elegir **Geometría** en el filtro se verían todos los libros de geometría
analítica, euclídea y trigonometría; y quien quiera algo más preciso puede elegir solo "Geometría analítica".

Hay dos maneras de hacerlo con cada grupo:

| Opción | Qué significa | Cuándo conviene |
|---|---|---|
| **(a) Reemplazar** | La hija desaparece y sus libros pasan a tener la categoría padre (o la hermana). | Cuando la hija tiene 1–2 libros o es casi lo mismo que otra. |
| **(b) Mantener la hija y añadir el padre como segundo nivel** | El libro sigue con su categoría específica; el sitio sabe a qué padre pertenece. | Cuando la hija tiene varios libros o dice algo útil. |

### Importante: cómo hacer la opción (b) sin romper el límite de 3 categorías

Si el padre se **escribiera dentro de cada libro** como una categoría más, **7 libros pasarían de 3
categorías** (por ejemplo, "Cálculo con Geometría Analítica" quedaría con Cálculo, Geometría analítica,
Cálculo y análisis y Geometría = 4; "Matemáticas finitas" llegaría a 7).

Por eso se recomienda que el padre **no se guarde en el libro**, sino en **una sola tabla aparte**
("esta hija pertenece a este padre"). El libro conserva sus 1–3 categorías específicas y el sitio arma los
dos niveles solo. Así:

- ningún libro gana categorías, y el límite de 3 se respeta siempre;
- si mañana la Junta cambia un padre, se edita una línea de la tabla, no 30 libros.

En el resto del documento, **"(b)" significa siempre esto**: la hija se queda en el libro y el padre vive en la tabla.

---

## 2. Resumen de las agrupaciones propuestas

| # | Padre propuesto | Hijas | Libros | Recomendación |
|---|---|---|---|---|
| 1 | **Secundaria (MEP)** | Tercer ciclo, Ciclo diversificado | 12 | (b) |
| 2 | **Educación** | Didáctica general, Didáctica en educación superior, Evaluación, Pedagogía, Andragogía, Curso: Introducción a la Pedagogía, (Olimpiadas) | 29 | (b) + algunas (a) |
| 3 | **Geometría** | Geometría, Geometría euclídea, Geometría analítica, Trigonometría, (Topología) | 15 | (b); "Geometría" suelta pasa a ser el padre |
| 4 | **Matemática general** | Matemática general, Matemática, Matemática básica, Matemática universitaria, (Precálculo) | 19 | (a) para las pequeñas |
| 5 | **Álgebra** | Álgebra, Álgebra lineal, Álgebra abstracta, Teoría de matrices | 20 | (b); Teoría de matrices → (a) |
| 6 | **Probabilidad y estadística** | Probabilidad, Estadística, Estocástica, Análisis de datos | 9 | (b); Estocástica → (a) |
| 7 | **Cálculo y análisis** | Cálculo, Análisis, Ecuaciones diferenciales, Complejos | 29 | (b) |
| 8 | **Computación y lógica** | Programación, Computación, Lógica, Discreta | 9 | (b); Computación → (a) |
| 9 | **Matemática aplicada** | Economía, Física, Biomatemática, Ciencia, Tecnología, Métodos matemáticos, Programación lineal | 8 | (b); Ciencia y Tecnología → (a) |

Un libro con varias categorías aparece en varios grupos (por eso la suma es mayor que 137).
Con esto, el filtro tendría **9 opciones grandes** en lugar de 42 sueltas, y dentro de cada una, las específicas.

---

## 3. Detalle de cada agrupación

### Grupo 1 — Secundaria (MEP)

- **Hijas:** Tercer ciclo (8 libros), Ciclo diversificado (4 libros).
- **Motivo:** son libros por nivel del sistema educativo costarricense (7.º a 11.º). Para una persona
  docente es natural buscar "libros de colegio".
- **Recomendación: (b).** Las dos hijas dicen algo útil (el nivel) y tienen varios libros.
- **Libros afectados:**
  - *Tercer ciclo*
    - Matemática Activa Sétimo año — Guiselle Bolaños M. y Mayela Ríos B.
    - Matemáticas 9no — Vinicio Porras Navarro
    - Matemática Noveno — Javier Solís Tenorio y Francisco González Arce
    - Jaque Mate 7 — Santillana
    - Matemáticas 9° año ejercicios — Manuel Calderón (2 ejemplares)
    - Matemática Enseñanza-aprendizaje 8 año — Roxanna Meneses Rodríguez
    - Matemática Enseñanza-aprendizaje 9 año — Roxanna Meneses Rodríguez
    - Matemática Enseñanza-aprendizaje 10 año — Roxanna Meneses Rodríguez ⚠️ *10.º año es Ciclo diversificado, no Tercer ciclo.*
  - *Ciclo diversificado*
    - Matemática para la enseñanza media ciclo diversificado: Teoría y ejercicios — Lizeth Sancho Mora y Randall Blanco B. (2 ejemplares)
    - Matemática enseñanza-aprendizaje: Programas actualizados del MEP — Roxanna Meneses Rodríguez (2 ejemplares)
    - Matemática para Bachillerato: Prácticas — Luis Gómez R.
    - Bachillerato Matemáticas 1997 — Manuel Calderón
- **Candidatos que hoy están en otra categoría y parecen de secundaria** (la Junta decide si se mueven):
  - Matemática elemental por objetivos 7mo año — Manuel Barahina (hoy: Matemática general) → Tercer ciclo
  - N ejercicios de matemática para 9no año — Alonso Aguilar Camacho (hoy: Matemática general) → Tercer ciclo
  - Matemáticas 9 — Teodora Tsijli Angelaki (hoy: Matemática) → Tercer ciclo
  - Matemática para Bachillerato — Ministerio de Educación Pública (CR) (hoy: Matemática general) → Ciclo diversificado
  - Geometría 7mo — Alexander Borbón Alpizar y Marco Gutierrez Montenegro (hoy: Geometría analítica / Geometría euclídea) → podría **añadir** Tercer ciclo (quedaría con 3)

### Grupo 2 — Educación

- **Hijas:** Didáctica general (20), Didáctica en educación superior (1), Evaluación (1), Pedagogía (2),
  Andragogía (1), Curso: Introducción a la Pedagogía (3), y opcionalmente Olimpiadas (1).
- **Motivo:** es la parte educativa de la carrera (enseñanza, evaluación, pedagogía). Hoy son 6–7
  categorías y cuatro tienen 1–2 libros.
- **Recomendación:**
  - **(b)** para *Didáctica general*, *Pedagogía* y *Evaluación* (temas claros que pueden crecer).
  - **(a)** *Curso: Introducción a la Pedagogía* → **Pedagogía**. Un nombre de curso no es un tema, y el
    curso puede cambiar de nombre en el plan de estudios. (Si la Junta quiere conservar la referencia al
    curso, puede ir en "Observaciones" del libro.)
  - **(a)** *Didáctica en educación superior* → **Didáctica general** (1 libro), o mantenerla si se espera recibir más.
  - *Andragogía* (1 libro): el libro es un manual de **acción tutorial**; se sugiere (a) → **Pedagogía**.
  - *Olimpiadas* (1 libro): es un número de la revista "Las matemáticas y su enseñanza"; se sugiere (a) →
    **Didáctica general**, igual que los demás números de esa revista. Si se quiere destacar el tema,
    mantenerla como hija (b).
- **Libros afectados:**
  - *Didáctica general*
    - Las matemáticas y su enseñanza — Revista: V1 N1; V1 N2; V2 N3; V2 N4; V2 N5; V3 N6; V3 N7; V3 N8; V4 N11 (2 ejemplares); V5 N12-13; V5 N14 (11 números)
    - Educación Matemática — Revista: V8 N3; V9 N1; V9 N2; V9 N3; V10 N1; V10 N2; V10 N3; V11 N1 (8 números)
    - Elementos para enseñar matemática — Luis Gerardo Meza Cascante
  - *Didáctica en educación superior*
    - Planeamiento, Conducción y Evaluación en la enseñanza superior — Pedro D. Lafourcade
  - *Evaluación*
    - Evaluación de los aprendizajes — Pedro D. Lafourcade
  - *Pedagogía*
    - Aprendizaje y Cognición — Zayra Méndez
    - Introducción a la pedagogía — Jacinto Ordóñez Peñalonzo
  - *Andragogía*
    - Manual Integrado de acción tutorial — Joaquín Garín Sallán
  - *Curso: Introducción a la Pedagogía*
    - Materiales de trabajo del curso Introducción a la Pedagogía — Luis Gerardo Meza Cascante
    - Lecturas para el curso Introducción a la Pedagogía — Luis Gerardo Meza Cascante (en el Excel dice "Lucturas")
    - Educación — Luis Gerardo Meza Cascante
  - *Olimpiadas*
    - Las matemáticas y su enseñanza — Revista: V7 N18
- **Nota:** 19 de los 20 libros de "Didáctica general" son **revistas**. La Junta podría preferir una
  hija nueva **"Revistas de educación matemática"** dentro de Educación, para que no tapen a los libros.

### Grupo 3 — Geometría

- **Hijas:** Geometría (1), Geometría euclídea (5), Geometría analítica (8), Trigonometría (6), y
  opcionalmente Topología (1).
- **Motivo:** son ramas de la geometría. La trigonometría se enseña junto con la geometría en secundaria
  y 3 de sus 6 libros ya están también en una categoría de geometría.
- **Recomendación: (b)** para Euclídea, Analítica y Trigonometría. La hija suelta **"Geometría"** (1 libro)
  deja de hacer falta: ese libro queda bien servido con el padre (**(a)**, se le pone "Geometría" como padre directo).
  *Topología* (1 libro de topología algebraica): es un tema avanzado; se sugiere dejarla **sin padre** o
  en Geometría si la Junta prefiere que no quede sola.
- **Libros afectados:**
  - *Geometría*
    - Cerca de la Matemática (2) — Adolfo Negro y Valeriano Zorio (también: Análisis, Álgebra lineal)
  - *Geometría euclídea*
    - Geometría Euclídea II — Teodora Tsijli
    - La geometría — René Descartes
    - Geometría Plana y del Espacio y Trigonometría — Dr. J. A. Baldor (también: Trigonometría)
    - Matemática general Vol II — Carlos Alberto González A. (2 ejemplares; también: Geometría analítica, Teoría de matrices)
    - Geometría 7mo — Alexander Borbón Alpizar y Marco Gutierrez Montenegro (también: Geometría analítica)
  - *Geometría analítica*
    - Álgebra y trigonometría con geometría analítica — Earl W. Swokowski y Jeffery A. Cole (9.ª ed.; también: Álgebra, Trigonometría)
    - Álgebra y trigonometría con geometría analítica — Earl W. Swokowski (2.ª ed.; también: Álgebra, Trigonometría)
    - Cálculo con Geometría Analítica — Thomas y Finney (también: Cálculo)
    - Cálculo con Geometría Analítica — Edwin J. Purcell y Dale Varberg (2 ejemplares; también: Cálculo)
    - El cálculo con Geometría Analítica — Louis Leithold (también: Cálculo)
    - Geometría Analítica y Trigonometría — Elena de Oteyza de Oteyza, Emma Lam Osnaya, Carlos Hernández Garciadiego, Ángel Manuel Carrillo Hoyo y Arturo Ramírez Flores (también: Trigonometría)
    - Matemática general Vol II — Carlos Alberto González A. (2 ejemplares)
    - Geometría 7mo — Alexander Borbón Alpizar y Marco Gutierrez Montenegro
  - *Trigonometría*
    - Álgebra y Trigonometría — Dennis G. Zill y Jacqueline M. Dewar (también: Álgebra)
    - Álgebra y trigonometría con geometría analítica — Earl W. Swokowski y Jeffery A. Cole
    - Álgebra y trigonometría con geometría analítica — Earl W. Swokowski
    - Álgebra y Trigonometría — Juan Félix Avila H. (2 ejemplares; también: Álgebra)
    - Geometría Analítica y Trigonometría — Elena de Oteyza de Oteyza y otros
    - Geometría Plana y del Espacio y Trigonometría — Dr. J. A. Baldor
  - *Topología*
    - Topología Algebraica Elemental — M. Zisman
- **Candidato:** Curso de Trigonometría — Edgar Alencar Filho está hoy en "Matemática general";
  por su título debería estar en **Trigonometría**.

### Grupo 4 — Matemática general

- **Hijas:** Matemática general (14), Matemática (2), Matemática básica (1), Matemática universitaria (1),
  y opcionalmente Precálculo (1).
- **Motivo:** son cuatro nombres para "libros de matemática que no son de un solo tema". La diferencia
  entre ellos no es clara para quien busca.
- **Recomendación: (a) reemplazar** *Matemática*, *Matemática básica* y *Matemática universitaria* por
  **Matemática general**. Aquí no hace falta un padre nuevo: basta con fusionar. *Precálculo* se mantiene
  como su propia categoría (es un tema reconocido y puede crecer); puede quedar sin padre o como hija de
  "Cálculo y análisis" (grupo 7).
- **Libros afectados:**
  - *Matemática general*
    - Matemática Elemental: Tomo I — M. Barahona, J Oviedo y V. Buján (2 ejemplares)
    - Matemática Elemental: Tomo II — M. Barahona, J Oviedo y V. Buján (3 ejemplares)
    - Matemática elemental con aplicaciones — Luis Valverde Fallas y Rampin Parúas Buitrago (4.ª ed.)
    - Matemática elemental con aplicaciones — Luis Valverde Fallas y Rampin Parúas Buitrago (3.ª ed.)
    - Matemática elemental por objetivos 7mo año — Manuel Barahina
    - Fundamentos matemáticos: un enfoque para técnicos — Arthur D. Kramer
    - Introducción a la Matemática — Hugo Barrantes
    - Introducción a la Matemática Moderna — Elbridge P. Vance (2 ejemplares)
    - Mathematique — Fernano Nathan
    - N ejercicios de matemática para 9no año — Alonso Aguilar Camacho
    - Matemática para Bachillerato — Ministerio de Educación Pública (CR)
    - Curso moderno de Matemáticas para la enseñanza media — Bernardo Alfaro Sagot (también: Discreta)
    - Matemática básica con aplicaciones — Manuel Murillo, Alberto Soto y José Alfredo Araya
    - Curso de Trigonometría — Edgar Alencar Filho
  - *Matemática*
    - Matemáticas Universitarias — Jack R. Britton, R. Ben Kriegh y Leon W. Rutland
    - Matemáticas 9 — Teodora Tsijli Angelaki
  - *Matemática básica*
    - Ejercicios de Matemáticas para Administración — Luis Alejandro Acuña
  - *Matemática universitaria*
    - Matemáticas — Javier Etayo, José Colera y Andrés Ruiz (2 ejemplares)
  - *Precálculo*
    - Ejercicios de matemática para administración: Precálculo — Luis Alejandro Acuña Prado y María José Artavia Azofeifa (2 ejemplares)
- **Ojo:** 4 libros de este grupo parecen de colegio o de trigonometría (ver candidatos en los grupos 1 y 3).
  Si se mueven, "Matemática general" queda más limpia.

### Grupo 5 — Álgebra

- **Hijas:** Álgebra (15), Álgebra lineal (4), Álgebra abstracta (1), Teoría de matrices (1).
- **Motivo:** son ramas del álgebra.
- **Recomendación: (b)** para Álgebra lineal y Álgebra abstracta. **(a)** *Teoría de matrices* →
  **Álgebra lineal** (las matrices son parte del álgebra lineal; 1 libro). La hija "Álgebra" se mantiene
  para los libros de álgebra general/escolar; al elegir el padre "Álgebra" se ven todos.
- **Libros afectados:**
  - *Álgebra*
    - Álgebra y Trigonometría — Dennis G. Zill y Jacqueline M. Dewar (también: Trigonometría)
    - Álgebra Intermedia — Angel, Allen R.
    - Álgebra y trigonometría con geometría analítica — Earl W. Swokowski y Jeffery A. Cole
    - Álgebra Superior — Louis Leithold
    - Álgebra y trigonometría con geometría analítica — Earl W. Swokowski
    - Álgebra — Max A. Sobel y Norbert Lerner
    - Álgebra Universitaria — Earl Swokowsky (en el Excel hay dos registros, "1ra" y "1da" edición)
    - Álgebra Abstracta — John B. Fraleigh
    - Álgebra y Trigonometría — Juan Félix Avila H. (2 ejemplares)
    - Álgebra I — Fabio González
    - Problemas de Álgebra Moderna — A. Bigard, M. Crestey y J. Grappy
    - A survey of Modern Algebra — Birkhoff y Maclane
    - Álgebra Curso teórico-práctico — Maximo Villon B.
    - Ejercicios de Álgebra Superior — H.S. Hall, M.A. y S.R. Knight, B. A.
  - *Álgebra lineal*
    - Introducción al Álgebra Lineal — Howard Anton (2 ejemplares)
    - Álgebra Lineal con aplicaciones — Stanley I. Grossman
    - Cerca de la Matemática (2) — Adolfo Negro y Valeriano Zorio
    - Matemáticas finitas: Aplicaciones prácticas — David B. Johnson y Thomas A. Mowry
  - *Álgebra abstracta*
    - Matemáticas finitas: Aplicaciones prácticas — David B. Johnson y Thomas A. Mowry
  - *Teoría de matrices*
    - Matemática general Vol II — Carlos Alberto González A. (2 ejemplares)
- **Candidatos:** *Álgebra Abstracta* (Fraleigh), *A survey of Modern Algebra* (Birkhoff y Maclane) y
  *Problemas de Álgebra Moderna* (Bigard y otros) están en "Álgebra", pero por el título son de
  **Álgebra abstracta**. En cambio "Matemáticas finitas" no parece un libro de álgebra abstracta.

### Grupo 6 — Probabilidad y estadística

- **Hijas:** Probabilidad (6), Estadística (4), Estocástica (1), Análisis de datos (1).
- **Motivo:** es un mismo campo; 3 de los libros ya están en Probabilidad **y** Estadística a la vez.
- **Recomendación: (b)** para Probabilidad y Estadística. **(a)** *Estocástica* → **Probabilidad**
  (1 libro; "estocástico" es un término técnico que pocos buscarán). *Análisis de datos* (1 libro, una
  tesis): (a) → **Estadística**, salvo que se esperen más libros del tema.
- **Libros afectados:**
  - *Probabilidad*
    - Análisis combinatorio — Silvia Calderón y Mario Morales (4 ejemplares)
    - Probabilidad y Estadística — Ronald E. Walpole y Raymond H. Myers (también: Estadística)
    - Probabilidad y Estadística: aplicaciones para ingeniería — Douglas C. Montgomery y George C. Runger (también: Estadística)
    - Probabilidad y Estadística II — Ernesto Alonso Sánchez Sánchez, Santiago Inzunsa Cazares y Greivin Ramírez Arce (2 ejemplares; también: Estadística)
    - Problemario de probabilidad — Piotr Marian Wisniwski y Gabriel Velasco Sotomayor
    - Procesos Aleatorios — Yuri A. Rozanov
  - *Estadística*
    - (los 3 de "Probabilidad y Estadística" de arriba)
    - Estadística aplicada con Fathom — Luis Acuña Prado
  - *Estocástica*
    - Matemáticas finitas: Aplicaciones prácticas — David B. Johnson y Thomas A. Mowry
  - *Análisis de datos*
    - Tesis de grado: Tópicos de análisis de datos — Rolando Guevara Chavez

### Grupo 7 — Cálculo y análisis

- **Hijas:** Cálculo (22), Análisis (4), Ecuaciones diferenciales (2), Complejos (2); opcionalmente Precálculo (1).
- **Motivo:** van en secuencia (precálculo → cálculo → análisis, ecuaciones diferenciales, variable compleja).
- **Recomendación: (b).** Cálculo es la categoría más grande del catálogo y debe seguir visible. Se sugiere
  **renombrar** *Complejos* → **"Variable compleja"** (se entiende mejor). *Análisis* mezcla análisis
  **numérico** (Scheid, Burden) con análisis matemático: la Junta puede separarlo en "Análisis numérico".
- **Libros afectados:**
  - *Cálculo*
    - Calculus — James Stewart (5.ª ed.)
    - Cálculo V.1 — Robert T. Smith y Roland B. Minton
    - Elementos de cálculo diferencial. Volumen I: Límites y la derivada — Ángel Ruiz y Hugo Barrantes
    - Cálculo en una variable — Manuel A. y Calvo H.
    - Cálculo diferencial — Hubert Méndez
    - Elementos de cálculo con aplicaciones — Luis Valverde Fallas y Raúl Teijeiro González
    - Ejercicios de Cálculo Diferencial e Integral — Vicente Gómez Meneses
    - Cálculo — Steward (2 ejemplares)
    - Cálculo aplicado a Administración, Economía, Contaduría y Ciencias Sociales — Laurence D. Hoffmann y Gerald L. Bradley
    - Cálculo de una variable. Trascendentes tempranas — James Stewart
    - Cálculo con Geometría Analítica — Thomas y Finney (también: Geometría analítica)
    - Cálculo con Geometría Analítica — Edwin J. Purcell y Dale Varberg (2 ejemplares; también: Geometría analítica)
    - El cálculo con Geometría Analítica — Louis Leithold (también: Geometría analítica)
    - Introducción al Cálculo en una variable — Evalyn Agüero Calvo y Juan José Fallas Monge (3 ejemplares)
    - Cálculo diferencial e integral — Granville, Smith y Longley
    - Cálculo diferencial e integral — P.R. Masani, R.C. Patel y D.J. Patil
    - Mathematical Analysis for business and economics — Jagdish Arya y Robin Lardner
    - Ejercicios de matemática para administración: Cálculo — Luis Alejandro Acuña Prado y Cindy Calderón Arce (2 ejemplares)
    - Cálculo diferencial e integral — N. Piskunov
    - Cálculo Infinitesimal — Guillermo Vargas Salazar
    - Matemáticas avanzadas para ingeniería. Vol 2 — Peter V. O'Neil (también: Complejos)
    - Cálculo Diferencial e Integral — Escuela de matemáticas
  - *Análisis*
    - Numerical Analysis — Francis Scheid
    - Análisis numérico — Richard L. Burden y J. Douglas Faires
    - Cerca de la Matemática (2) — Adolfo Negro y Valeriano Zorio
    - Problemas y ejercicios de análisis matemático — G. Baranenkov, B. Deminovich, V. Efimenko, S. Kogan, G. Lunts, E. Porshneva, E. Sichova, S. Frolov, R. Shostak y A. Yampolski
  - *Ecuaciones diferenciales*
    - Differential Equations: Basic Concepts and Theories, Exercises, Examinations, Answers — Kaj L. Nielsen
    - Matemáticas avanzadas para ingeniería, Ecuaciones Diferenciales — Dennis G. Zill y Michael R. Cullen
  - *Complejos*
    - Variable compleja con aplicaciones — William R. Derrick
    - Matemáticas avanzadas para ingeniería. Vol 2 — Peter V. O'Neil

### Grupo 8 — Computación y lógica

- **Hijas:** Programación (4), Computación (1), Lógica (3), Discreta (4).
- **Motivo:** discreta, lógica y programación aparecen juntas en varios libros y son la base matemática de la computación.
- **Recomendación: (b)** para Programación, Lógica y Discreta (se sugiere renombrar *Discreta* →
  **"Matemática discreta"**). **(a)** *Computación* (1 libro) → **Programación**, o simplemente quitarla
  de ese libro, que ya tiene Discreta y Lógica.
- **Alternativa:** si la Junta prefiere no mezclar matemática con informática, hacer dos padres:
  "Matemática discreta y lógica" (Discreta, Lógica) y "Computación" (Programación, Computación).
- **Libros afectados:**
  - *Programación*
    - MatLab: An introduction with applications — Amos Gilat
    - Programación en Java: Algoritmos, programación orientada a objetos e interfaz gráfica de usuario — Luis Joyanes Aguilar e Ignacio Zahonero Martínez
    - Fuzzy Systems Handbook — Lotfi A. Zadeh (también: Lógica)
    - Java para Estudiantes — Douglas Bell y Mike Parr
  - *Computación*
    - Matemáticas para la computación — José Alfredo Jiménez Murillo (también: Discreta, Lógica)
  - *Lógica*
    - Introducción a la lógica — Karl J. Smith
    - Matemáticas para la computación — José Alfredo Jiménez Murillo
    - Fuzzy Systems Handbook — Lotfi A. Zadeh
  - *Discreta*
    - Introducción a la Matemática Discreta — Manuel Murillo Tsijli
    - Matemáticas discretas con teoría de gráficas y combinatoria — T. Veerarajan
    - Curso moderno de Matemáticas para la enseñanza media — Bernardo Alfaro Sagot (también: Matemática general)
    - Matemáticas para la computación — José Alfredo Jiménez Murillo

### Grupo 9 — Matemática aplicada

- **Hijas:** Economía (3), Física (1), Biomatemática (1), Ciencia (1), Tecnología (1), Métodos matemáticos (1), Programación lineal (1).
- **Motivo:** matemática usada en otras disciplinas. Son 7 categorías para solo 8 libros.
- **Recomendación: (b)** con fusiones:
  - **(a)** *Ciencia* y *Tecnología* → **Métodos matemáticos**. Los dos libros son la **misma serie**
    ("Métodos matemáticos aplicados a las ciencias", simposios V–VI y VII–VIII) y hoy tienen categorías distintas.
  - Mantener *Economía* (se sugiere renombrarla **"Administración y economía"**: así se llaman sus libros),
    *Física*, *Biomatemática* y *Programación lineal* como hijas (b). *Programación lineal* es optimización,
    no programación de computadoras: por eso va aquí y no en el grupo 8.
- **Libros afectados:**
  - *Economía*
    - Matemáticas para administración y economía — S.T. Tan
    - Matemáticas para administración y economía — Ernest F. Haeussler, Jr. y Richard S. Paul (2 ejemplares)
    - Matemática básica para administración — Hugo Barrantes
  - *Física*
    - Física: Un enfoque práctico — Kathia Hernández Camacho
  - *Biomatemática*
    - VI Congreso Internacional de Biomatemáticas — Universidad Estatal a Distancia
  - *Ciencia* y *Tecnología*
    - Métodos matemáticos aplicados a las ciencias: V y VI Simposios — Revista de la Universidad de Costa Rica
  - *Métodos matemáticos*
    - Métodos matemáticos aplicados a las ciencias: VII y VIII Simposios — William Castillo y Javier Trejos
  - *Programación lineal*
    - Matemáticas finitas: Aplicaciones prácticas — David B. Johnson y Thomas A. Mowry

### Un caso especial: "Matemáticas finitas" tiene 4 categorías

*Matemáticas finitas: Aplicaciones prácticas* (David B. Johnson y Thomas A. Mowry) tiene hoy
Álgebra lineal / Álgebra abstracta / Programación lineal / Estocástica: **ya pasa el límite de 3** y el
plan de separación lo dejó sin migrar. Con esta propuesta quedaría en **3**: Álgebra lineal, Programación
lineal y Probabilidad (Estocástica → Probabilidad; se quita Álgebra abstracta, que no corresponde al libro).

---

## 4. Ejemplos "antes → después"

Lo que vería una persona en la ficha del libro y en el filtro de la Biblioteca.

| # | Libro | Antes | Después (en el libro) | Padre(s) en el filtro |
|---|---|---|---|---|
| 1 | Matemática Activa Sétimo año — Bolaños y Ríos | Tercer ciclio | Tercer ciclo | Secundaria (MEP) |
| 2 | Materiales de trabajo del curso Introducción a la Pedagogía — Meza Cascante | Curso: Introducción a la Pedagogía | Pedagogía | Educación |
| 3 | Manual Integrado de acción tutorial — Garín Sallán | Andragogía | Pedagogía | Educación |
| 4 | Cálculo con Geometría Analítica — Purcell y Varberg | Cálculo / Geometría Analítica | Cálculo, Geometría analítica *(sin cambios)* | Cálculo y análisis; Geometría |
| 5 | Matemática general Vol II — González | Geometría Euclídea / Geometría analítica / Teoría de Matrices | Geometría euclídea, Geometría analítica, Álgebra lineal | Geometría; Álgebra |
| 6 | Matemáticas Universitarias — Britton, Kriegh y Rutland | Matemática | Matemática general | — (fusión, sin padre nuevo) |
| 7 | Matemáticas finitas — Johnson y Mowry | Álgebra lineal / Álgebra abstracta / Programación Lineal / Estocástica (4) | Álgebra lineal, Programación lineal, Probabilidad (3) | Álgebra; Matemática aplicada; Probabilidad y estadística |
| 8 | Métodos matemáticos aplicados a las ciencias: V y VI Simposios | Ciencia/Tecnología | Métodos matemáticos | Matemática aplicada |
| 9 | Matemáticas para la computación — Jiménez Murillo | Discreta / Lógica / Computación | Matemática discreta, Lógica | Computación y lógica |
| 10 | Variable compleja con aplicaciones — Derrick | Complejos | Variable compleja | Cálculo y análisis |

Y en el **filtro**: quien elija "Geometría" verá los 15 libros de geometría y trigonometría juntos;
quien elija "Educación" verá los 29 de didáctica, pedagogía y evaluación, en vez de tener que abrir 6 categorías.

---

## 5. Riesgos y cuidados

1. **El filtro actual no entiende padres.** Hoy `inventario.html` compara la categoría como un texto
   exacto. Para que "Geometría" muestre también "Geometría analítica" hay que hacer un cambio pequeño en la
   página y crear la tabla hija → padre. Sin ese cambio, la opción (b) no se nota.
2. **El Excel manda al reimportar.** `scripts/import-inventario.js --replace` vuelve a leer el Excel. Si
   solo se cambia Firestore y alguien reimporta, **se pierden los cambios**. Hay que aplicar lo mismo en la
   hoja "Biblioteca" del Excel.
3. **Guardar el padre dentro del libro rompe el límite de 3** en 7 libros (ver sección 1). Por eso se
   recomienda la tabla aparte.
4. **Nombres de padre iguales a una hija** ("Álgebra", "Matemática general", "Geometría"): puede confundir.
   En la tabla conviene mostrar la hija como "Álgebra (general)" o similar.
5. **Algunas fusiones pierden detalle** (p. ej. Andragogía → Pedagogía, Estocástica → Probabilidad). Si
   alguien buscaba exactamente esa palabra, ya no la encontrará como categoría (sí por el título).
6. **Algunos cambios requieren mirar el libro físico** (los "candidatos": libros de colegio en
   Matemática general, álgebra abstracta, 10.º año en Tercer ciclo). Conviene que alguien de la Junta o de
   la carrera los confirme antes de moverlos.
7. **Las personas que agregan libros nuevos** deben conocer la lista final; si no, volverán a aparecer
   categorías sueltas. Se recomienda que el formulario ofrezca solo las categorías de la lista oficial.

---

## 6. Lo que la Junta debe decidir

1. **¿Se usan categorías padre?** Y si sí, ¿en una tabla aparte (recomendado) o escritas en cada libro?
2. **¿Aprueba estos 9 padres y sus nombres?** En especial:
   - "Secundaria (MEP)" vs. "Colegio" o "Educación secundaria";
   - "Computación y lógica": uno o dos padres (ver alternativa del grupo 8);
   - ¿Trigonometría y Topología dentro de Geometría?
3. **Fusiones (opción a)** — aprobar o rechazar cada una:
   - Curso: Introducción a la Pedagogía → Pedagogía
   - Andragogía → Pedagogía
   - Didáctica en educación superior → Didáctica general
   - Olimpiadas → Didáctica general
   - Geometría (suelta) → padre Geometría
   - Matemática, Matemática básica, Matemática universitaria → Matemática general
   - Teoría de matrices → Álgebra lineal
   - Estocástica → Probabilidad
   - Análisis de datos → Estadística
   - Computación → Programación (o quitarla)
   - Ciencia, Tecnología → Métodos matemáticos
4. **Renombres:** Complejos → Variable compleja; Discreta → Matemática discreta; Economía → Administración y economía.
5. **¿Una hija "Revistas" dentro de Educación** para separar los 20 números de revista de los libros?
6. **¿Separar "Análisis numérico"** de "Análisis"?
7. **Libros a revisar a mano** (candidatos de los grupos 1, 3, 4 y 5), y las 3 categorías finales de
   "Matemáticas finitas".

Cuando la Junta decida, el siguiente paso es preparar un cambio (en una rama y con PR, como siempre) que
actualice el Excel, Firestore y el filtro de `inventario.html`, con una vista previa antes de aplicarlo.
