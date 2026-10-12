// Autores de los libros de la Biblioteca: cómo se separan, cómo se fusionan las distintas formas de escribir
// un mismo nombre y cuántos libros tiene cada autor (para el filtro de inventario.html).
//
// Lo usan inventario.html (window.InventarioAutores) y las pruebas tests/inventario-autores.test.js.
// No cambia lo guardado en Firestore: la fusión se hace al mostrar, igual que con las categorías
// (assets/js/inventario-categorias.js).
//
// Para fusionar dos formas de escribir un autor: agrégalas en FUSIONES ("como debe quedar": ["como la escriben"]).
// Las diferencias de mayúsculas, tildes, puntos y espacios ya se unen solas. Si un texto NO se debe partir por
// comas o "y" (o se escribió mal y hay que arreglarlo a mano), agrégalo en ESPECIALES.
(function () {
  // Texto → forma comparable: sin tildes, sin puntos ni signos, en minúsculas y con un solo espacio.
  const clave = texto => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

  // Como debe quedar → otras formas que significan lo mismo.
  const FUSIONES = {
    "Earl W. Swokowski": ["Earl Swokowski", "Earl Swokowsky"],
    "Luis Alejandro Acuña Prado": ["Luis Acuña Prado", "Luis Alejandro Acuña", "Luis Alejandro Acuña P."],
    "Alonso Aguilar Camacho": ["Águilar Camacho Alonso"],
    "Pablo Alvarado Moya": ["Alvarado Moya Pablo"],
    "Irving Allen Dodes": ["Dodes Irving Allen"],
    "Ángel Ruiz Zúñiga": ["Ruiz Zuñiga Ángel", "Ángel Ruiz"],
    "Edgar Roy Ramírez Briceño": ["Ramírez Briceño Edgar Roy"],
    "Fernand Nathan": ["Fernano Nathan"],
    "Iberoamericano": ["Iberoameericano"],
    "Teodora Tsijli Angelaki": ["Teodora Tsijli"],
    "Manuel Murillo Tsijli": ["Manuel Murillo"],
    "José Luis Espinoza Barboza": ["José Luis Espinoza"],
    "Silvia Calderón L.": ["Silvia Calderón"],
    "Lizeth Sancho Mora": ["Lizeth Sancho"],
    "Javier Trejos Zelaya": ["Javier Trejos"],
    "Greivin Ramírez Arce": ["Greivin Ramírez"],
    "Manuel Barahona": ["Manuel Barahina", "M. Barahona"],
    "James Stewart": ["Steward"],
    "Mike Parr": ["Mikeparr"],
    "Juan José Fallas Monge": ["Juan José Fallas"],
    "Vilma Ramírez": ["Vilma Ramirez"],
    "Karl J. Smith": ["Karl. J. Smith"],
    "J. Oviedo": ["J Oviedo"],
    "UCR": ["Universidad de Costa Rica"],
    "UNED": ["Universidad Estatal A Distancia"]
  };

  // Textos que no se pueden partir por comas o "y" tal cual, o que traen un error: como se escribieron → autores.
  const ESPECIALES = {
    "Angel, Allen R.": ["Allen R. Angel"],
    "Ernest F. Haeussler, Jr. y Richard S. Paul": ["Ernest F. Haeussler, Jr.", "Richard S. Paul"],
    "Manuel A. y Calvo H.": ["Manuel A. Calvo H."],
    "H.S. Hall, M.A. y S.R. Knight, B. A.": ["H. S. Hall", "S. R. Knight"],
    "Javier Etayo, José Colera Andrés Ruiz": ["Javier Etayo", "José Colera", "Andrés Ruiz"],
    "José R, Jiménez F.": ["José R. Jiménez F."],
    "Douglas C. Montgomery y George . Runger": ["Douglas C. Montgomery", "George C. Runger"],
    "Universidad Autónoma del Estado de Morelos Cuernavaca, Morelos": ["Universidad Autónoma del Estado de Morelos Cuernavaca, Morelos"]
  };

  // Textos que quieren decir "sin dato".
  const SIN_DATO = new Set(["", "n a", "na", "sin autor", "ninguno", "anonimo"]);

  const INDICE_FUSIONES = new Map();
  for (const [canonico, variantes] of Object.entries(FUSIONES)) for (const v of variantes) INDICE_FUSIONES.set(clave(v), canonico);
  const INDICE_ESPECIALES = new Map(Object.entries(ESPECIALES).map(([texto, lista]) => [clave(texto), lista]));

  const limpiar = texto => String(texto ?? "").replace(/\s+/g, " ").trim();

  // Un autor suelto, escrito de cualquier forma → como debe quedar (o como venga, si no hay regla).
  function normalizarAutor(texto) {
    let t = limpiar(texto).replace(/^(dr|dra|lic|prof|ing)\.?\s+/i, "").replace(/\s+\./g, ".");
    t = t.replace(/^(.*?)[\s,]+$/, "$1").replace(/\.\.+$/, ".");
    if (/\p{L}{3,}\.$/u.test(t) && !/\bJr\.$/i.test(t)) t = t.slice(0, -1); // "Pilar Baptista Lucio." → sin el punto final (las iniciales conservan el suyo)
    if (SIN_DATO.has(clave(t))) return "";
    return INDICE_FUSIONES.get(clave(t)) || t;
  }

  // El campo "autor" de un libro (puede traer varios: "A, B y C") → lista de autores sin repetir.
  function separarAutores(texto) {
    const crudo = limpiar(texto);
    if (SIN_DATO.has(clave(crudo))) return [];
    const especial = INDICE_ESPECIALES.get(clave(crudo));
    const partes = especial || crudo.replace(/\([^)]*\)/g, " ")
      .split(/\s*;\s*|\s*\/\s*|\s*,\s*|\s+y\s+|\s+e\s+(?=[A-ZÁÉÍÓÚÑ])/);
    const vistos = new Map();
    for (const parte of partes) {
      const autor = normalizarAutor(parte);
      if (autor && !vistos.has(clave(autor))) vistos.set(clave(autor), autor);
    }
    return [...vistos.values()];
  }

  // Con todos los libros: une las escrituras que solo cambian en mayúsculas, tildes o puntos (se queda con la más
  // usada y, si empatan, la que lleva tildes y más mayúsculas) y cuenta cuántos libros tiene cada autor.
  function crearIndice(libros) {
    const grupos = new Map(); // clave → { formas: Map(forma → veces), libros: n }
    const porLibro = new Map(); // libro → claves de sus autores
    for (const libro of libros || []) {
      const claves = [];
      for (const autor of separarAutores(libro?.autor)) {
        const k = clave(autor);
        if (!grupos.has(k)) grupos.set(k, { formas: new Map(), libros: 0 });
        const g = grupos.get(k);
        g.formas.set(autor, (g.formas.get(autor) || 0) + 1);
        g.libros++;
        claves.push(k);
      }
      porLibro.set(libro, claves);
    }
    const tildes = s => (s.match(/[^\u0000-\u007f]/g) || []).length;
    const mayusculas = s => (s.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
    const nombre = new Map();
    for (const [k, g] of grupos) {
      nombre.set(k, [...g.formas.entries()].sort((a, b) => b[1] - a[1] || tildes(b[0]) - tildes(a[0]) || mayusculas(b[0]) - mayusculas(a[0]) || b[0].length - a[0].length)[0][0]);
    }
    const lista = [...grupos].map(([k, g]) => ({ nombre: nombre.get(k), libros: g.libros }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return {
      // Los autores de un libro, ya fusionados. Si no hay datos (N/A), lista vacía.
      autoresDe: libro => porLibro.has(libro) ? porLibro.get(libro).map(k => nombre.get(k)) : separarAutores(libro?.autor),
      autores: lista, // alfabética: [{ nombre, libros }]
      masLibros: [...lista].sort((a, b) => b.libros - a.libros || a.nombre.localeCompare(b.nombre, "es"))
    };
  }

  const api = { FUSIONES, ESPECIALES, clave, normalizarAutor, separarAutores, crearIndice };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; } // pruebas y scripts en Node
  window.InventarioAutores = api;
})();
