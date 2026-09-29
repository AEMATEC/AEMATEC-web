/**
 * Migración de las categorías de los libros de la Biblioteca (aprobada por la Junta, 2026-09).
 *
 * Cada libro (colección `inventario`, `tipo == "biblioteca"`) tenía un texto `categoria`, a veces con
 * varias separadas por "/" y escritas de formas distintas ("Tercer ciclio", "Geometría Analítica").
 * Esta migración deja en cada libro una lista `categorias` (máximo 3), con los nombres unificados de
 * assets/js/inventario-categorias.js, y borra el campo viejo `categoria`.
 *
 * No es una Cloud Function a propósito: las Functions se publican solas y una migración no debe quedar
 * expuesta. Se corre desde GitHub: pestaña Actions → "Categorías de la Biblioteca" → Run workflow.
 *
 * Uso local (desde la carpeta scripts, después de `npm install`):
 *   node categorias/migrar.js                       Simulación: lee el inventario público, no escribe nada.
 *   node categorias/migrar.js --reporte=archivo.md  Además guarda el plan en un archivo Markdown.
 *   node categorias/migrar.js --aplicar             Escribe en Firestore. Necesita una clave de cuenta de
 *                                                   servicio (GOOGLE_APPLICATION_CREDENTIALS). NUNCA la subas.
 */
const fs = require("fs");
const path = require("path");
const { MAX_CATEGORIAS, clave, normalizarLista, categoriasDeLibro, grupoDe } = require("../../assets/js/inventario-categorias.js");

const PROYECTO = "biblioteca-aematec";

// Decisiones para libros puntuales, por el código de uno de sus ejemplares. Solo se aplican a libros
// que todavía tienen el campo viejo `categoria` (si alguien ya los editó con el nuevo formato, se respeta).
const POR_LIBRO = {
  "BIB-115": ["Álgebra lineal", "Programación lineal", "Probabilidad"], // Matemáticas finitas (tenía 4)
  "BIB-129": ["Métodos matemáticos"],       // Simposios V y VI, igual que los VII y VIII (BIB-105)
  "BIB-152": ["Tecnología"],                // Revista Tecnología en Marcha, igual que BIB-178 a BIB-184
  "BIB-157": ["Álgebra", "Geometría"],      // Tenía "Álgebra y Geometría"
  "BIB-221": ["Lógica"],                    // Cálculo proposicional: es lógica, no cálculo diferencial
  "BIB-191": ["Variable compleja"],         // Los números complejos
  // Libros que no tenían categoría:
  "BIB-194": ["Variable compleja"],         // Los números complejos
  "BIB-190": ["Álgebra lineal", "Variable compleja"], // Matrices, determinantes… con números complejos
  "BIB-182": ["Probabilidad"],              // Ejercicios resueltos de probabilidad
  "BIB-203": ["Geometría analítica"],       // El sistema de coordenadas polares
  "BIB-167": ["Matemática general"],        // The Concise Oxford Dictionary of Mathematics
  "BIB-151": ["Académico"],                 // V Encuentro Centroamericano de Investigadores en Matemáticas
  "BIB-205": ["Física"]                     // Movimiento vibratorio
};

const codigosDe = libro => (libro.ejemplares || []).map(ejemplar => String(ejemplar.codigo || "").trim().toUpperCase());

function decisionPorLibro(libro) {
  if (!Object.prototype.hasOwnProperty.call(libro, "categoria")) return null;
  const codigos = codigosDe(libro);
  const codigo = Object.keys(POR_LIBRO).find(base => codigos.some(c => c === base || c.startsWith(`${base}-`)));
  return codigo ? POR_LIBRO[codigo] : null;
}

// Calcula qué cambia en cada libro, sin escribir nada.
// Devuelve { cambios: [{ id, titulo, codigo, antes, despues }], excedidos, sinCategoria }.
function planMigracion(libros) {
  const cambios = [];
  const excedidos = [];
  const sinCategoria = [];
  for (const libro of libros) {
    const despues = decisionPorLibro(libro) ? normalizarLista(decisionPorLibro(libro)) : categoriasDeLibro(libro);
    const entrada = {
      id: libro.id,
      titulo: libro.titulo || "",
      codigo: codigosDe(libro)[0] || "",
      antes: Array.isArray(libro.categorias) ? libro.categorias : (libro.categoria ?? ""),
      despues
    };
    if (despues.length > MAX_CATEGORIAS) { excedidos.push(entrada); continue; }
    if (!despues.length) sinCategoria.push(entrada);
    const tieneCampoViejo = Object.prototype.hasOwnProperty.call(libro, "categoria");
    const igual = Array.isArray(libro.categorias) && libro.categorias.length === despues.length
      && libro.categorias.every((valor, i) => valor === despues[i]);
    if (tieneCampoViejo || !igual) cambios.push(entrada);
  }
  return { cambios, excedidos, sinCategoria };
}

// Resumen del plan en Markdown, para la Junta.
function reporteMarkdown(plan, libros) {
  const texto = valor => Array.isArray(valor) ? valor.join(", ") : String(valor).trim();
  const celda = valor => (texto(valor) || "—").replace(/\|/g, "\\|");
  const conteo = new Map();
  for (const libro of libros) {
    const entrada = plan.cambios.find(cambio => cambio.id === libro.id);
    for (const categoria of entrada ? entrada.despues : categoriasDeLibro(libro)) conteo.set(categoria, (conteo.get(categoria) || 0) + 1);
  }
  const porGrupo = new Map();
  for (const [categoria, cantidad] of conteo) {
    const grupo = grupoDe(categoria) || "Sin grupo (revisar)";
    if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
    porGrupo.get(grupo).push(`${categoria} (${cantidad})`);
  }
  const renombres = plan.cambios.filter(cambio => clave(texto(cambio.antes)) !== clave(cambio.despues.join(" / ")));
  const lineas = [
    "# Migración de categorías de la Biblioteca",
    "",
    "Generado por `scripts/categorias/migrar.js` con los datos actuales del inventario.",
    "",
    `- Libros: **${libros.length}**. Libros que se actualizan: **${plan.cambios.length}**`
      + ` (en **${renombres.length}** cambia el nombre de alguna categoría; en el resto solo pasa al formato de lista).`,
    `- Categorías distintas después de la migración: **${conteo.size}**, en ${porGrupo.size} grupos.`,
    `- Libros que quedarían con más de ${MAX_CATEGORIAS} categorías (no se tocan): **${plan.excedidos.length}**.`,
    `- Libros sin categoría: **${plan.sinCategoria.length}**.`,
    "",
    "## Categorías por grupo",
    "",
    "El grupo solo se usa en el filtro de la página: el libro guarda sus categorías.",
    "",
    "| Grupo | Categorías (libros) |",
    "|---|---|",
    ...[...porGrupo.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([grupo, lista]) => `| ${grupo} | ${lista.sort((a, b) => a.localeCompare(b, "es")).join(", ")} |`),
    "",
    "## Libros cuyo nombre de categoría cambia",
    "",
    "| Código | Título | Antes | Después |",
    "|---|---|---|---|",
    ...renombres.sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
      .map(cambio => `| ${cambio.codigo} | ${celda(cambio.titulo)} | ${celda(cambio.antes)} | ${celda(cambio.despues)} |`)
  ];
  if (plan.excedidos.length || plan.sinCategoria.length) {
    lineas.push("", "## Para revisar a mano", "");
    for (const entrada of plan.excedidos) lineas.push(`- ${entrada.codigo} ${entrada.titulo}: más de ${MAX_CATEGORIAS} categorías (${texto(entrada.despues)}).`);
    for (const entrada of plan.sinCategoria) lineas.push(`- ${entrada.codigo} ${entrada.titulo}: sin categoría.`);
  }
  return lineas.join("\n") + "\n";
}

// Lectura sin credenciales: el inventario es de lectura pública (firestore.rules).
async function leerLibrosPublicos() {
  const convertir = valor => valor.stringValue ?? valor.integerValue ?? valor.doubleValue ?? valor.booleanValue ?? valor.timestampValue
    ?? (valor.arrayValue ? (valor.arrayValue.values || []).map(convertir)
      : valor.mapValue ? Object.fromEntries(Object.entries(valor.mapValue.fields || {}).map(([k, v]) => [k, convertir(v)])) : null);
  const libros = [];
  let pagina = "";
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents/inventario?pageSize=300${pagina ? `&pageToken=${pagina}` : ""}`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`No se pudo leer el inventario (${respuesta.status}).`);
    const datos = await respuesta.json();
    for (const documento of datos.documents || []) {
      const campos = Object.fromEntries(Object.entries(documento.fields || {}).map(([k, v]) => [k, convertir(v)]));
      if (campos.tipo === "biblioteca") libros.push({ id: documento.name.split("/").pop(), ...campos });
    }
    pagina = datos.nextPageToken;
  } while (pagina);
  return libros;
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const argReporte = process.argv.find(arg => arg.startsWith("--reporte="));

  let db;
  let admin;
  let libros;
  if (aplicar) {
    admin = require("firebase-admin");
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROYECTO });
    db = admin.firestore();
    const snapshot = await db.collection("inventario").where("tipo", "==", "biblioteca").get();
    libros = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
  } else {
    libros = await leerLibrosPublicos();
  }

  const plan = planMigracion(libros);
  const reporte = reporteMarkdown(plan, libros);
  if (argReporte) fs.writeFileSync(path.resolve(argReporte.replace("--reporte=", "")), reporte);
  console.log(reporte);

  if (!aplicar) {
    console.log("Simulación: no se escribió nada. Para guardar, usa --aplicar (o el flujo de GitHub con modo \"aplicar\").");
    return;
  }
  const LOTE = 400;
  for (let inicio = 0; inicio < plan.cambios.length; inicio += LOTE) {
    const lote = db.batch();
    for (const cambio of plan.cambios.slice(inicio, inicio + LOTE)) {
      lote.update(db.collection("inventario").doc(cambio.id), {
        categorias: cambio.despues,
        categoria: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await lote.commit();
  }
  console.log(`Listo: se actualizaron ${plan.cambios.length} libros.`);
}

module.exports = { POR_LIBRO, planMigracion, reporteMarkdown };

if (require.main === module) {
  main().catch(error => {
    console.error("Error en la migración de categorías:", error.message || error);
    process.exit(1);
  });
}
