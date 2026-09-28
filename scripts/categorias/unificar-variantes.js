/**
 * Unifica las variantes de escritura de las categorías de los libros de la Biblioteca
 * (colección `inventario`, `tipo == "biblioteca"`).
 *
 * Ejemplos: "Cálculo " → "Cálculo", "Matemática General" → "Matemática general",
 * "Tercer ciclio" → "Tercer ciclo", "Geometría Analítica" → "Geometría analítica".
 *
 * Criterio: solo la primera letra en mayúscula, tildes correctas y sin espacios de más.
 * Nunca se juntan categorías con significado distinto ("Matemática" ≠ "Matemática universitaria").
 *
 * El resultado queda en el campo nuevo `categorias` (lista, máximo 3). Si un libro todavía
 * tiene el campo viejo `categoria` (texto, a veces "A / B / C"), primero se separa por "/"
 * y el campo viejo se borra al aplicar.
 *
 * El mapa de variantes es MAPA_BASE (abajo) más, si existe, docs/categorias/mapa-unificaciones.json
 * con la forma { "variantes": { "<canónica>": ["<variante>", ...] } }. Lo del archivo manda.
 *
 * Requiere la misma clave de cuenta de servicio que scripts/import-inventario.js
 * (scripts/serviceAccountKey.json o GOOGLE_APPLICATION_CREDENTIALS). NUNCA la subas al repositorio.
 *
 * Uso:
 *   cd scripts
 *   npm install
 *   node categorias/unificar-variantes.js --desde-excel      (plan con el Excel, sin conectarse a nada)
 *   node categorias/unificar-variantes.js                    (simulación: lee Firestore y muestra el plan)
 *   node categorias/unificar-variantes.js --aplicar          (escribe los cambios en Firestore)
 *   node categorias/unificar-variantes.js --mapa=otra/ruta.json
 */
const fs = require("fs");
const path = require("path");

const MAXIMO_CATEGORIAS = 3;
const RUTA_MAPA_POR_DEFECTO = path.join(__dirname, "..", "..", "docs", "categorias", "mapa-unificaciones.json");
const RUTA_EXCEL = path.join(__dirname, "..", "..", "data", "Plantilla_Inventario_AEMATEC.xlsx");
const RUTA_CLAVE_SERVICIO = path.join(__dirname, "..", "serviceAccountKey.json");

// Forma canónica → variantes vistas en el Excel (hoja "Biblioteca").
// Las diferencias de mayúsculas, tildes y espacios ya se resuelven solas al comparar por clave;
// las variantes se anotan para que quede claro qué se unifica.
const MAPA_BASE = {
    "Álgebra": ["Álgebra ", "Algebra"],
    "Álgebra abstracta": ["Álgebra Abstracta"],
    "Álgebra lineal": ["Álgebra Lineal", "Álgebra lineal ", "Algebra lineal"],
    "Análisis": ["Análisis ", "Analisis"],
    "Análisis de datos": ["Análisis de Datos"],
    "Cálculo": ["Cálculo ", "Calculo"],
    "Ciclo diversificado": ["Ciclio diversificado", "Ciclo Diversificado"],
    "Complejos": [],
    "Computación": ["Computacion"],
    "Discreta": ["Discreta "],
    "Estadística": ["Estadistica"],
    "Estocástica": ["Estocastica"],
    "Geometría": ["Geometria"],
    "Geometría analítica": ["Geometría Analítica", "Geometría analítica ", "Geometría Analítica "],
    "Geometría euclídea": ["Geometría Euclídea", "Geometría Euclídea ", "Geometria euclidea"],
    "Lógica": ["Lógica ", "Logica"],
    "Matemática": ["Matematica"],
    "Matemática básica": ["Matemática Básica"],
    "Matemática general": ["Matemática General", "Matematica general"],
    "Matemática universitaria": ["Matemática Universitaria"],
    "Métodos matemáticos": ["Métodos Matemáticos"],
    "Precálculo": ["Precalculo", "Pre-cálculo"],
    "Probabilidad": ["Probabilidad "],
    "Programación": ["Programacion"],
    "Programación lineal": ["Programación Lineal", "Programación Lineal "],
    "Tecnología": ["Tecnologia"],
    "Teoría de matrices": ["Teoría de Matrices"],
    "Tercer ciclo": ["Tercer ciclio", "Tercer Ciclo"],
    "Trigonometría": ["Trigonometría ", "Trigonometria"]
};

// Errores de escritura que se corrigen palabra por palabra aunque la frase no esté en el mapa.
const CORRECCIONES_PALABRAS = {
    ciclio: "ciclo"
};

/** Texto para comparar: minúsculas, sin tildes y con un solo espacio entre palabras. */
function claveComparacion(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function limpiarEspacios(texto) {
    return String(texto ?? "").replace(/\s+/g, " ").trim();
}

function corregirPalabras(texto) {
    return texto.replace(/[\p{L}]+/gu, palabra => {
        const correcta = CORRECCIONES_PALABRAS[claveComparacion(palabra)];
        if (!correcta) return palabra;
        const esMayuscula = palabra[0] === palabra[0].toUpperCase();
        return esMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta;
    });
}

function mayusculaInicial(texto) {
    return texto ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

/**
 * Convierte un mapa { canónica: [variantes] } (o { variantes: {...} }, como el JSON de docs)
 * en un índice clave → canónica. Se usa por dentro; acepta también un índice ya hecho.
 */
function indiceDeMapa(mapa) {
    if (mapa instanceof Map) return mapa;
    const indice = new Map();
    const agregar = grupo => {
        for (const [canonica, variantes] of Object.entries(grupo || {})) {
            const limpia = limpiarEspacios(canonica);
            if (!limpia) continue;
            indice.set(claveComparacion(corregirPalabras(limpia)), limpia);
            indice.set(claveComparacion(limpia), limpia);
            for (const variante of Array.isArray(variantes) ? variantes : []) {
                indice.set(claveComparacion(variante), limpia);
            }
        }
    };
    agregar(MAPA_BASE);
    if (mapa && typeof mapa === "object") agregar(mapa.variantes && typeof mapa.variantes === "object" ? mapa.variantes : mapa);
    return indice;
}

/** Devuelve la forma canónica de una categoría ("" si viene vacía). */
function normalizarCategoria(texto, mapa) {
    const limpia = limpiarEspacios(texto);
    if (!limpia) return "";
    const indice = indiceDeMapa(mapa);
    const directa = indice.get(claveComparacion(limpia));
    if (directa) return directa;
    const corregida = corregirPalabras(limpia);
    return indice.get(claveComparacion(corregida)) || mayusculaInicial(corregida);
}

/** Separa el texto viejo "A / B / C" en partes (sin recortar, para poder mostrar la variante tal cual). */
function separarPorBarras(texto) {
    return String(texto ?? "").split("/");
}

/** Normaliza cada categoría y quita vacías y repetidas, conservando el orden. */
function unificarLista(categorias, mapa) {
    const indice = indiceDeMapa(mapa);
    const resultado = [];
    const vistas = new Set();
    for (const categoria of categorias || []) {
        const canonica = normalizarCategoria(categoria, indice);
        const clave = claveComparacion(canonica);
        if (!canonica || vistas.has(clave)) continue;
        vistas.add(clave);
        resultado.push(canonica);
    }
    return resultado;
}

/** Categorías originales de un libro: la lista nueva si existe; si no, el texto viejo separado por "/". */
function categoriasOriginales(libro) {
    if (Array.isArray(libro.categorias)) return libro.categorias.map(valor => String(valor ?? ""));
    if (typeof libro.categoria === "string") return separarPorBarras(libro.categoria);
    return [];
}

/**
 * Calcula qué libros cambian, sin escribir nada.
 * libros: [{ id, titulo, categorias?: string[], categoria?: string }]
 * Devuelve { cambios: [{id, titulo, antes, despues}], resumen: {"variante → canónica": nLibros}, avisos: [...] }.
 * En el resumen la variante va sin espacios de más (esos se quitan siempre y no se cuentan).
 * `antes` es el valor tal como está guardado (lista o texto viejo); `despues` es la lista nueva.
 */
function planUnificacion(libros, mapa) {
    const indice = indiceDeMapa(mapa);
    const cambios = [];
    const resumen = {};
    const avisos = [];
    for (const libro of libros || []) {
        const originales = categoriasOriginales(libro);
        const despues = unificarLista(originales, indice);
        const tieneCampoViejo = Object.prototype.hasOwnProperty.call(libro, "categoria");
        const antesLista = Array.isArray(libro.categorias) ? libro.categorias : null;
        const igual = antesLista && antesLista.length === despues.length && antesLista.every((valor, i) => valor === despues[i]);
        if (igual && !tieneCampoViejo) continue;

        const antes = Array.isArray(libro.categorias) ? [...libro.categorias] : (libro.categoria ?? "");
        cambios.push({ id: libro.id, titulo: libro.titulo || "", antes, despues });

        const paresDelLibro = new Set();
        for (const original of originales) {
            // Los espacios de más se quitan siempre; el resumen solo cuenta cambios de escritura.
            const limpia = limpiarEspacios(original);
            const canonica = normalizarCategoria(limpia, indice);
            if (canonica && limpia !== canonica) paresDelLibro.add(`${limpia} → ${canonica}`);
        }
        for (const par of paresDelLibro) resumen[par] = (resumen[par] || 0) + 1;

        if (despues.length > MAXIMO_CATEGORIAS) {
            avisos.push(`"${libro.titulo || libro.id}" queda con ${despues.length} categorías (máximo ${MAXIMO_CATEGORIAS}); revísalo a mano.`);
        }
    }
    return { cambios, resumen, avisos };
}

/** Lee el mapa de docs (o el de --mapa). Si no existe el de por defecto, usa solo MAPA_BASE. */
function cargarMapa(ruta, obligatorio) {
    if (!fs.existsSync(ruta)) {
        if (obligatorio) throw new Error(`No existe el mapa indicado: ${ruta}`);
        return null;
    }
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
}

/** Libros de la hoja "Biblioteca", agrupados igual que scripts/import-inventario.js. */
function librosDesdeExcel(rutaExcel) {
    const XLSX = require("xlsx");
    const libro = XLSX.readFile(rutaExcel, { cellDates: true });
    const hoja = libro.Sheets.Biblioteca;
    if (!hoja) throw new Error('No se encontró la hoja "Biblioteca" en el Excel.');
    const grupos = new Map();
    for (const fila of XLSX.utils.sheet_to_json(hoja, { defval: "" })) {
        const titulo = String(fila["Título"] ?? "").trim();
        if (!titulo) continue;
        const autor = String(fila["Autor"] ?? "").trim();
        const edicion = String(fila["Edición"] ?? "").trim() || "N/A";
        const clave = `${titulo.toLowerCase()}|${autor.toLowerCase()}|${edicion.toLowerCase()}`;
        if (!grupos.has(clave)) {
            // Como en la importación, se guarda el texto recortado de la primera fila del grupo.
            grupos.set(clave, { id: `excel-${grupos.size + 1}`, titulo, categoria: String(fila["Categoría"] ?? "").trim() });
        }
    }
    return [...grupos.values()];
}

function mostrarPlan(plan, totalLibros) {
    console.log(`Libros revisados: ${totalLibros}`);
    console.log(`Libros que cambian: ${plan.cambios.length}\n`);
    const pares = Object.entries(plan.resumen).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    console.log("Variante → canónica (libros afectados):");
    if (!pares.length) console.log("  (ninguna)");
    for (const [par, cantidad] of pares) console.log(`  ${JSON.stringify(par.split(" → ")[0])} → ${JSON.stringify(par.split(" → ")[1])}: ${cantidad}`);
    if (plan.avisos.length) {
        console.log("\nAvisos:");
        for (const aviso of plan.avisos) console.log(`  - ${aviso}`);
    }
}

async function aplicarCambios(db, admin, cambios) {
    const LIMITE_LOTE = 400;
    for (let inicio = 0; inicio < cambios.length; inicio += LIMITE_LOTE) {
        const lote = db.batch();
        for (const cambio of cambios.slice(inicio, inicio + LIMITE_LOTE)) {
            lote.update(db.collection("inventario").doc(cambio.id), {
                categorias: cambio.despues,
                categoria: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        await lote.commit();
        console.log(`  Lote guardado: ${Math.min(inicio + LIMITE_LOTE, cambios.length)} de ${cambios.length}.`);
    }
}

async function main() {
    const argumentos = process.argv.slice(2);
    const aplicar = argumentos.includes("--aplicar");
    const desdeExcel = argumentos.includes("--desde-excel");
    const argMapa = argumentos.find(arg => arg.startsWith("--mapa="));
    const rutaMapa = argMapa ? path.resolve(argMapa.replace("--mapa=", "")) : RUTA_MAPA_POR_DEFECTO;
    const mapa = cargarMapa(rutaMapa, Boolean(argMapa));
    console.log(mapa ? `Mapa: MAPA_BASE + ${path.relative(process.cwd(), rutaMapa)}` : "Mapa: solo MAPA_BASE (no se encontró el archivo de docs).");

    if (desdeExcel) {
        if (aplicar) throw new Error("--desde-excel solo muestra el plan; no se puede combinar con --aplicar.");
        const libros = librosDesdeExcel(RUTA_EXCEL);
        mostrarPlan(planUnificacion(libros, mapa), libros.length);
        console.log("\nModo --desde-excel: no se conectó a Firestore.");
        return;
    }

    const admin = require("firebase-admin");
    let credential;
    try {
        credential = admin.credential.cert(require(RUTA_CLAVE_SERVICIO));
    } catch {
        credential = admin.credential.applicationDefault();
    }
    admin.initializeApp({ credential, projectId: "biblioteca-aematec" });
    const db = admin.firestore();

    const snapshot = await db.collection("inventario").where("tipo", "==", "biblioteca").get();
    const libros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const plan = planUnificacion(libros, mapa);
    mostrarPlan(plan, libros.length);

    if (!aplicar) {
        console.log("\nSimulación: no se escribió nada. Usa --aplicar para guardar los cambios.");
        return;
    }
    // Los libros con más de 3 categorías no se escriben: la Junta elige primero cuáles dejar.
    const aplicables = plan.cambios.filter(cambio => cambio.despues.length <= MAXIMO_CATEGORIAS);
    const omitidos = plan.cambios.length - aplicables.length;
    if (omitidos) console.log(`\nSe omiten ${omitidos} libro(s) con más de ${MAXIMO_CATEGORIAS} categorías (ver avisos).`);
    await aplicarCambios(db, admin, aplicables);
    console.log("\nUnificación completada.");
}

module.exports = {
    MAPA_BASE,
    MAXIMO_CATEGORIAS,
    claveComparacion,
    normalizarCategoria,
    unificarLista,
    planUnificacion,
    librosDesdeExcel
};

if (require.main === module) {
    main().catch(error => {
        console.error("Error al unificar las categorías:", error.message || error);
        process.exit(1);
    });
}
