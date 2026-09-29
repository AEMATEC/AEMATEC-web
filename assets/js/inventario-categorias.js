// Categorías de los libros de la Biblioteca: cómo se escriben y cómo se agrupan.
//
// Lo usan inventario.html (window.InventarioCategorias), la migración scripts/categorias/migrar.js,
// la importación scripts/import-inventario.js y las pruebas tests/inventario-categorias.test.js.
// Decisiones aprobadas por la Junta (2026-09): unificar la escritura, fusionar variantes y agrupar
// en categorías "padre" que solo usa el filtro (el libro conserva sus 1 a 3 categorías).
//
// Para agregar una categoría nueva: ponla en un grupo de GRUPOS. Para que una forma de escribir
// se convierta en otra, agrégala en FUSIONES ("como debe quedar": ["como la escriben"]).
(function () {
  const MAX_CATEGORIAS = 3;

  // Categoría padre → categorías que agrupa. Toda categoría válida está en algún grupo.
  const GRUPOS = {
    "Álgebra": ["Álgebra", "Álgebra lineal", "Álgebra abstracta"],
    "Cálculo y análisis": ["Cálculo", "Precálculo", "Análisis", "Ecuaciones diferenciales", "Variable compleja", "Métodos numéricos", "Topología"],
    "Geometría": ["Geometría", "Geometría euclídea", "Geometría analítica", "Trigonometría", "Fractales"],
    "Probabilidad y estadística": ["Probabilidad", "Estadística", "Análisis de datos"],
    "Computación y lógica": ["Programación", "Lógica", "Matemática discreta", "Computación"],
    "Matemática aplicada": ["Métodos matemáticos", "Programación lineal", "Administración y economía", "Física", "Ingeniería", "Biomatemática"],
    "Matemática general": ["Matemática general", "Olimpiadas"],
    "Secundaria (MEP)": ["Secundaria", "Tercer ciclo", "Ciclo diversificado"],
    "Educación": ["Didáctica general", "Didáctica matemática", "Didáctica en educación superior", "Pedagogía", "Evaluación", "Metodología"],
    "Publicaciones y otros": ["Académico", "Tecnología", "Guía", "Ensayo", "Historia"]
  };

  // Como debe quedar → otras formas que significan lo mismo. Las diferencias de mayúsculas, tildes y
  // espacios ya se corrigen solas con GRUPOS; aquí van solo los cambios de nombre.
  const FUSIONES = {
    "Pedagogía": ["Curso: Introducción a la Pedagogía", "Andragogía"],
    "Matemática general": ["Matemática", "Matemáticas", "Matemática básica", "Matemática universitaria"],
    "Álgebra lineal": ["Teoría de matrices"],
    "Probabilidad": ["Estocástica"],
    "Variable compleja": ["Complejos", "Números complejos"],
    "Matemática discreta": ["Discreta"],
    "Administración y economía": ["Economía", "Finanzas"],
    "Didáctica general": ["Didáctica"],
    "Didáctica matemática": ["Matemática educativa", "Educación matemática"],
    "Cálculo": ["Cálculo diferencial"]
  };

  // Errores de escritura que se corrigen palabra por palabra ("Tercer ciclio" → "Tercer ciclo").
  const CORRECCIONES = { ciclio: "ciclo" };

  const clave = texto => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
  const corregir = texto => texto.split(" ").map(palabra => CORRECCIONES[clave(palabra)] || palabra).join(" ");

  const CANONICAS = Object.values(GRUPOS).flat();
  const INDICE = new Map();
  for (const canonica of CANONICAS) INDICE.set(clave(canonica), canonica);
  for (const [canonica, variantes] of Object.entries(FUSIONES)) {
    for (const variante of variantes) INDICE.set(clave(variante), canonica);
  }
  const PADRE = new Map();
  for (const [padre, hijas] of Object.entries(GRUPOS)) for (const hija of hijas) PADRE.set(hija, padre);

  // Una categoría escrita de cualquier forma → como debe quedar. Si no se conoce, se deja como está
  // (sin espacios de más y con los errores de escritura corregidos).
  function normalizarCategoria(texto) {
    const limpio = corregir(String(texto ?? "").replace(/\s+/g, " ").trim());
    if (!limpio) return "";
    return INDICE.get(clave(limpio)) || limpio;
  }

  // Lista sin vacíos ni repetidas, cada una normalizada. Acepta texto con "/" o "," o una lista.
  function normalizarLista(valor) {
    const partes = Array.isArray(valor) ? valor : String(valor ?? "").split(/[\/,]/);
    const vistas = new Map();
    for (const parte of partes) {
      const categoria = normalizarCategoria(parte);
      if (categoria && !vistas.has(clave(categoria))) vistas.set(clave(categoria), categoria);
    }
    return [...vistas.values()];
  }

  // Categorías de un libro: la lista `categorias` o, si aún no se migró, el texto viejo `categoria`.
  function categoriasDeLibro(libro) {
    return normalizarLista(Array.isArray(libro?.categorias) ? libro.categorias : libro?.categoria);
  }

  const grupoDe = categoria => PADRE.get(normalizarCategoria(categoria)) || null;

  const api = { MAX_CATEGORIAS, GRUPOS, FUSIONES, CANONICAS, clave, normalizarCategoria, normalizarLista, categoriasDeLibro, grupoDe };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; } // pruebas y scripts en Node
  window.InventarioCategorias = api;
})();
