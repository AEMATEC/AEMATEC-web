/**
 * Importa el inventario real desde data/Plantilla_Inventario_AEMATEC.xlsx a Firestore.
 *
 * Requiere una clave de cuenta de servicio de Firebase (Consola → Configuración del
 * proyecto → Cuentas de servicio → Generar nueva clave privada). NUNCA la subas al
 * repositorio: guárdala como scripts/serviceAccountKey.json (ya está en .gitignore)
 * o exporta GOOGLE_APPLICATION_CREDENTIALS con la ruta al archivo.
 *
 * Uso:
 *   cd scripts
 *   npm install
 *   node import-inventario.js --dry-run                       (solo muestra un resumen, no escribe nada)
 *   node import-inventario.js                                  (escribe todo el Excel en Firestore)
 *   node import-inventario.js --only=biblioteca --replace       (reemplaza solo los libros existentes)
 *   node import-inventario.js --only=institucional,consumible  (importa solo esas hojas)
 */
const path = require("path");
const admin = require("firebase-admin");
const XLSX = require("xlsx");

const isDryRun = process.argv.includes("--dry-run");
const shouldReplace = process.argv.includes("--replace");
const onlyArg = process.argv.find(arg => arg.startsWith("--only="));
const onlyTipos = onlyArg ? onlyArg.replace("--only=", "").split(",").map(value => value.trim()) : null;
const excelPath = path.join(__dirname, "..", "data", "Plantilla_Inventario_AEMATEC.xlsx");
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

function initAdmin() {
    if (isDryRun) return null;
    let credential;
    try {
        credential = admin.credential.cert(require(serviceAccountPath));
    } catch {
        credential = admin.credential.applicationDefault();
    }
    admin.initializeApp({ credential, projectId: "biblioteca-aematec" });
    return admin.firestore();
}

function normalize(value) {
    return String(value ?? "").trim();
}

function sheetRows(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`No se encontró la hoja "${sheetName}" en el Excel.`);
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function buildInstitucionales(workbook) {
    return sheetRows(workbook, "Activos_Institucionales").map(row => ({
        tipo: "institucional",
        placa: normalize(row["Placa Institucional"]),
        codigo: normalize(row["Código Interno"]),
        nombre: normalize(row["Activo"]),
        descripcion: normalize(row["Descripción"]),
        marca: normalize(row["Marca"]),
        estado: normalize(row["Estado"]),
        ubicacion: normalize(row["Ubicación"]),
        responsable: normalize(row["Custodio"]),
        fecha: normalize(row["Fecha Última Revisión"]),
        observaciones: normalize(row["Observaciones"])
    })).filter(item => item.codigo);
}

function buildAematec(workbook) {
    return sheetRows(workbook, "Activos_AEMATEC").map(row => ({
        tipo: "aematec",
        codigo: normalize(row["Código"]),
        categoria: normalize(row["Categoría"]),
        nombre: normalize(row["Activo"]),
        descripcion: normalize(row["Descripción"]),
        marca: normalize(row["Marca"]),
        fecha: normalize(row["Fecha Compra/Donación"]),
        valor: Number(row["Valor"]) || 0,
        estado: normalize(row["Estado"]),
        ubicacion: normalize(row["Ubicación"]),
        responsable: normalize(row["Responsable"]),
        observaciones: normalize(row["Observaciones"])
    })).filter(item => item.codigo);
}

function buildConsumibles(workbook) {
    return sheetRows(workbook, "Consumibles").map(row => ({
        tipo: "consumible",
        codigo: normalize(row["Código"]),
        categoria: normalize(row["Categoría"]),
        articulo: normalize(row["Artículo"]),
        unidad: normalize(row["Unidad"]),
        existenciaActual: Number(row["Existencia Actual"]) || 0,
        existenciaMinima: Number(row["Existencia Mínima"]) || 0,
        ubicacion: normalize(row["Ubicación"]),
        observaciones: normalize(row["Observaciones"])
    })).filter(item => item.codigo);
}

function buildBiblioteca(workbook) {
    const rows = sheetRows(workbook, "Biblioteca");
    const groups = new Map();
    for (const row of rows) {
        const titulo = normalize(row["Título"]);
        if (!titulo) continue;
        const autor = normalize(row["Autor"]);
        const edicion = normalize(row["Edición"]) || "N/A";
        const key = `${titulo.toLowerCase()}|${autor.toLowerCase()}|${edicion.toLowerCase()}`;
        if (!groups.has(key)) {
            groups.set(key, {
                tipo: "biblioteca",
                titulo,
                autor,
                edicion,
                anio: normalize(row["Año"]) || "N/A",
                categoria: normalize(row["Categoría"]),
                observaciones: normalize(row["Observaciones"]),
                portadaUrl: "",
                portadaPath: "",
                ejemplares: []
            });
        }
        groups.get(key).ejemplares.push({
            codigo: normalize(row["Código"]),
            estado: normalize(row["Estado"]),
            ubicacion: normalize(row["Ubicación"]),
            disponible: normalize(row["Disponibilidad"]).toLowerCase().startsWith("s")
        });
    }
    return [...groups.values()];
}

async function writeBatch(db, collectionName, items) {
    const BATCH_LIMIT = 400;
    for (let start = 0; start < items.length; start += BATCH_LIMIT) {
        const batch = db.batch();
        for (const item of items.slice(start, start + BATCH_LIMIT)) {
            const docRef = db.collection(collectionName).doc();
            batch.set(docRef, { ...item, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        await batch.commit();
    }
}

async function deleteExistingByTipo(db, tipo) {
    const snapshot = await db.collection("inventario").where("tipo", "==", tipo).get();
    const BATCH_LIMIT = 400;
    const docs = snapshot.docs;
    for (let start = 0; start < docs.length; start += BATCH_LIMIT) {
        const batch = db.batch();
        for (const document of docs.slice(start, start + BATCH_LIMIT)) batch.delete(document.ref);
        await batch.commit();
    }
    return docs.length;
}

async function main() {
    const workbook = XLSX.readFile(excelPath);
    const groups = {
        institucional: buildInstitucionales(workbook),
        aematec: buildAematec(workbook),
        consumible: buildConsumibles(workbook),
        biblioteca: buildBiblioteca(workbook)
    };
    const tiposToImport = onlyTipos || Object.keys(groups);

    console.log("Resumen de importación:");
    for (const tipo of tiposToImport) {
        const items = groups[tipo] || [];
        const detail = tipo === "biblioteca" ? ` (${items.reduce((sum, book) => sum + book.ejemplares.length, 0)} ejemplares)` : "";
        console.log(`  ${tipo}: ${items.length}${detail}`);
    }

    if (isDryRun) {
        console.log("\nModo --dry-run: no se escribió nada en Firestore.");
        return;
    }

    const db = initAdmin();
    for (const tipo of tiposToImport) {
        if (shouldReplace) {
            const deleted = await deleteExistingByTipo(db, tipo);
            console.log(`  ${tipo}: se eliminaron ${deleted} documento(s) existente(s).`);
        }
        await writeBatch(db, "inventario", groups[tipo] || []);
    }
    console.log("\nImportación completada.");
}

main().catch(error => {
    console.error("Error al importar el inventario:", error);
    process.exit(1);
});
