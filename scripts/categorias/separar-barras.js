/**
 * Migración de categorías de libros: "separar por /".
 *
 * Antes cada libro (colección `inventario`, `tipo == "biblioteca"`) tenía un solo campo de texto
 * `categoria`, p. ej. "Álgebra / Trigonometría / Geometría Analítica". El nuevo modelo usa
 * `categorias` (lista de textos, máximo 3) y se borra `categoria`.
 *
 * Este script NO es una Cloud Function a propósito: las Functions se publican solas al hacer merge
 * y una migración no debe quedar expuesta. Se corre a mano, una vez, desde una computadora.
 *
 * Los libros que quedarían con más de 3 categorías NO se migran solos: se listan para que la
 * Junta Directiva elija cuáles 3 conservar.
 *
 * Requiere (solo para leer o escribir Firestore) una clave de cuenta de servicio, igual que
 * scripts/import-inventario.js: scripts/serviceAccountKey.json (ya está en .gitignore) o la variable
 * GOOGLE_APPLICATION_CREDENTIALS. NUNCA subas la clave al repositorio.
 *
 * Uso:
 *   cd scripts
 *   npm install
 *   node categorias/separar-barras.js --desde-excel   (plan con los datos del Excel, sin Firestore)
 *   node categorias/separar-barras.js                 (simulación: lee Firestore y muestra el plan)
 *   node categorias/separar-barras.js --aplicar       (escribe los cambios en Firestore)
 */
const path = require("path");

const MAX_CATEGORIAS = 3;
const BATCH_LIMIT = 400;
const excelPath = path.join(__dirname, "..", "..", "data", "Plantilla_Inventario_AEMATEC.xlsx");
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

// Clave para comparar sin distinguir mayúsculas, tildes ni espacios repetidos.
function claveComparacion(texto) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Divide un texto de categoría por "/". Recorta espacios, quita vacíos y duplicados
 * (sin distinguir mayúsculas ni tildes) y conserva el orden y la forma de la primera aparición.
 */
function separarCategoria(texto) {
    if (texto === undefined || texto === null) return [];
    const resultado = [];
    const vistas = new Set();
    for (const parte of String(texto).split("/")) {
        const limpia = parte.replace(/\s+/g, " ").trim();
        if (!limpia) continue;
        const clave = claveComparacion(limpia);
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        resultado.push(limpia);
    }
    return resultado;
}

/**
 * Arma el plan de migración. Recibe libros { id, titulo, categoria, categorias? }.
 * - Los que ya tienen `categorias` (lista) se saltan: ya están migrados.
 * - Los que tienen `categoria` y quedarían con 3 o menos van a `cambios`.
 * - Los que quedarían con más de 3 van a `excedidos` y no se tocan.
 */
function planSeparacion(libros) {
    const cambios = [];
    const excedidos = [];
    for (const libro of libros || []) {
        if (Array.isArray(libro.categorias)) continue;
        if (!("categoria" in libro)) continue;
        const despues = separarCategoria(libro.categoria);
        if (despues.length > MAX_CATEGORIAS) {
            excedidos.push({ id: libro.id, titulo: libro.titulo, categorias: despues });
        } else {
            cambios.push({ id: libro.id, titulo: libro.titulo, antes: libro.categoria, despues });
        }
    }
    return { cambios, excedidos };
}

// Arma los libros desde la hoja "Biblioteca" del Excel, agrupando ejemplares como import-inventario.js.
function librosDesdeExcel() {
    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(excelPath, { cellDates: true });
    const sheet = workbook.Sheets["Biblioteca"];
    if (!sheet) throw new Error('No se encontró la hoja "Biblioteca" en el Excel.');
    const texto = value => String(value ?? "").trim();
    const grupos = new Map();
    for (const row of XLSX.utils.sheet_to_json(sheet, { defval: "" })) {
        const titulo = texto(row["Título"]);
        if (!titulo) continue;
        const autor = texto(row["Autor"]);
        const edicion = texto(row["Edición"]) || "N/A";
        const key = `${titulo.toLowerCase()}|${autor.toLowerCase()}|${edicion.toLowerCase()}`;
        if (!grupos.has(key)) {
            // Sin Firestore no hay id real: se usa el código del primer ejemplar.
            grupos.set(key, { id: `excel:${texto(row["Código"])}`, titulo, categoria: texto(row["Categoría"]) });
        }
    }
    return [...grupos.values()];
}

function initFirestore() {
    const admin = require("firebase-admin");
    let credential;
    try {
        credential = admin.credential.cert(require(serviceAccountPath));
    } catch {
        credential = admin.credential.applicationDefault();
    }
    admin.initializeApp({ credential, projectId: "biblioteca-aematec" });
    return { admin, db: admin.firestore() };
}

function imprimirPlan({ cambios, excedidos }) {
    const separados = cambios.filter(c => c.despues.length > 1);
    const una = cambios.filter(c => c.despues.length === 1);
    const vacios = cambios.filter(c => c.despues.length === 0);
    console.log("Plan de migración: separar categorías por \"/\"");
    console.log(`  Libros a migrar: ${cambios.length}`);
    console.log(`    con varias categorías (se separan): ${separados.length}`);
    console.log(`    con una sola categoría: ${una.length}`);
    console.log(`    sin categoría (quedan con lista vacía): ${vacios.length}`);
    console.log(`  Libros con más de ${MAX_CATEGORIAS} categorías (NO se migran; la Junta elige 3): ${excedidos.length}`);

    console.log("\nCambios:");
    for (const c of cambios) {
        console.log(`  [${c.id}] ${c.titulo}`);
        console.log(`      antes:   ${JSON.stringify(c.antes)}`);
        console.log(`      después: ${JSON.stringify(c.despues)}`);
    }
    console.log(`\nExcedidos (más de ${MAX_CATEGORIAS} categorías):`);
    if (!excedidos.length) console.log("  (ninguno)");
    for (const e of excedidos) {
        console.log(`  [${e.id}] ${e.titulo}`);
        console.log(`      categorías: ${JSON.stringify(e.categorias)}`);
    }
}

async function aplicar(admin, db, cambios) {
    for (let start = 0; start < cambios.length; start += BATCH_LIMIT) {
        const batch = db.batch();
        for (const cambio of cambios.slice(start, start + BATCH_LIMIT)) {
            batch.update(db.collection("inventario").doc(cambio.id), {
                categorias: cambio.despues,
                categoria: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();
    }
}

async function main() {
    const desdeExcel = process.argv.includes("--desde-excel");
    const debeAplicar = process.argv.includes("--aplicar");
    if (desdeExcel && debeAplicar) throw new Error("--aplicar no se puede usar con --desde-excel.");

    if (desdeExcel) {
        imprimirPlan(planSeparacion(librosDesdeExcel()));
        console.log("\nModo --desde-excel: datos tomados del Excel, no se leyó ni escribió Firestore.");
        return;
    }

    const { admin, db } = initFirestore();
    const snapshot = await db.collection("inventario").where("tipo", "==", "biblioteca").get();
    const libros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const plan = planSeparacion(libros);
    imprimirPlan(plan);

    if (!debeAplicar) {
        console.log("\nSimulación: no se escribió nada. Usa --aplicar para guardar los cambios.");
        return;
    }
    await aplicar(admin, db, plan.cambios);
    console.log(`\nListo: se migraron ${plan.cambios.length} libro(s).` +
        (plan.excedidos.length ? ` Faltan ${plan.excedidos.length} con más de ${MAX_CATEGORIAS} categorías.` : ""));
}

module.exports = { separarCategoria, planSeparacion, MAX_CATEGORIAS };

if (require.main === module) {
    main().catch(error => {
        console.error("Error en la migración de categorías:", error);
        process.exit(1);
    });
}
