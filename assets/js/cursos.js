// Lista única de cursos de la carrera (EM) y de servicio (MA): código -> nombre.
// La usan el Repositorio (repositorio.html, repositorio-academicos.html) y "Subir material".
// Si cambia el plan de estudios, se edita solo aquí.
export const CURSOS = {
  EM1401: "Introducción a la pedagogía", EM1404: "Teorías Psicopedagógicas del aprendizaje", EM1605: "Fundamentos de la matemática I",
  MA1403: "Matemática Discreta", EM1600: "Tecnologías Digitales aplicadas a la matemática educativa I", EM1606: "Fundamentos de la matemática II",
  EM2408: "Aprendizaje y didáctica de la matemática", EM2604: "Geometría I", EM1608: "Didáctica del Álgebra y Funciones",
  EM2606: "Geometría II", EM3407: "Psicología del Desarrollo", EM3607: "Álgebra Lineal", EM1607: "Didáctica de la Geometría",
  EM2603: "Cálculo y Análisis I", EM2608: "Elementos de análisis de datos y probabilidad", EM3048: "Atención a la diversidad en la enseñanza y el aprendizaje de la Matemática",
  EM1609: "Didáctica de la probabilidad y estadística", EM1610: "Tecnologías digitales aplicadas a la matemática educativa II",
  EM2607: "Cálculo y Análisis II", EM3001: "Electivo I", EM3408: "Evaluación del aprendizaje", EM3409: "Práctica docente",
  EM3608: "Cálculo y Análisis III", EM3610: "Electivo II", EM1611: "Geometría Analítica",
  EM4609: "Álgebra", EM4610: "Ecuaciones diferenciales", EM1613: "Tecnologías digitales aplicadas a la matemática educativa III",
  EM1614: "Estadística Inferencial", EM4001: "Electivo III", EM4612: "Métodos numéricos",
  EM5001: "Historia de las matemáticas", EM5002: "Didáctica de las matemáticas I", EM5003: "Taller I: Algoritmos y programación",
  EM5004: "Introducción al análisis funcional", EM5005: "Teoría de números", EM5006: "Didáctica de la matemática II",
  EM5007: "Taller II: Multimedios en la matemática", EM5008: "Investigación educativa", EM5009: "Trabajo final de graduación",
  MA0101: "Matemática General", MA1102: "Cálculo Diferencial e Integral", MA1103: "Cálculo y Álgebra Lineal",
  MA2104: "Cálculo Superior", MA2105: "Ecuaciones diferenciales"
};

// Pares [nombre, código], en el orden de CURSOS (para las sugerencias al escribir en "Subir material").
export const catalogoCursos = () => Object.entries(CURSOS).map(([codigo, nombre]) => [nombre, codigo]);
