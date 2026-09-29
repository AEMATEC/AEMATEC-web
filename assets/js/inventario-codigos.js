// Códigos del Inventario: cuál sugerir al agregar un bien y cómo renumerar al duplicar.
//
// Lo usa inventario.html (window.InventarioCodigos) y lo prueban tests/inventario-codigos.test.js.
// No lee Firestore: recibe la lista de bienes ya cargada.
//
// Formato de los códigos: PREFIJO-NÚMERO y, si hay varias unidades iguales, un sufijo de 2 dígitos
// (ACA-065, ACA-031-01, ACA-031-02; en la Biblioteca cada ejemplar tiene el suyo: BIB-001-01).
(function () {
  // Prefijo y cantidad de dígitos que se usan si un apartado todavía no tiene ningún bien.
  const PREFIJOS = {
    institucional: ["ACI", 2],
    aematec: ["ACA", 3],
    biblioteca: ["BIB", 3],
    consumible: ["ACC", 2]
  };

  // Estados de un bien que ya no está en la asociación: su código queda libre para otro bien.
  const ESTADOS_BAJA = ["extraviado", "regalado", "vendido", "donado", "dado de baja", "desechado"];

  const clave = texto => String(texto ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esBaja = estado => ESTADOS_BAJA.includes(clave(estado));
  const conCeros = (numero, digitos) => String(numero).padStart(digitos, "0");

  // Cada código del apartado con el estado de su bien (en la Biblioteca, el de cada ejemplar).
  function codigosConEstado(items) {
    return items.flatMap(item => item.tipo === "biblioteca" || Array.isArray(item.ejemplares)
      ? (item.ejemplares || []).map(ejemplar => ({ codigo: String(ejemplar.codigo || "").trim(), estado: ejemplar.estado, item }))
      : [{ codigo: String(item.codigo || "").trim(), estado: item.estado, item }]
    ).filter(entrada => entrada.codigo);
  }

  // Códigos que usa algún bien que sigue en la asociación (los de bienes dados de baja no cuentan).
  function codigosActivos(items) {
    return new Set(codigosConEstado(items).filter(entrada => !esBaja(entrada.estado)).map(entrada => clave(entrada.codigo)));
  }

  // Código para un bien nuevo del apartado `tipo`.
  // 1) Si hay un bien dado de baja (regalado, extraviado, vendido…), se reutiliza el primer código libre.
  // 2) Si no, el siguiente número después del mayor (ACA-065 → ACA-066), sin repetir uno existente.
  // Devuelve { codigo, reutilizaDe } (reutilizaDe = el bien dado de baja, o null).
  function siguienteCodigo(tipo, items, todosLosItems = items) {
    const enUso = codigosActivos(todosLosItems);
    const libres = codigosConEstado(items)
      .filter(entrada => esBaja(entrada.estado) && !enUso.has(clave(entrada.codigo)))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    if (libres.length) return { codigo: libres[0].codigo, reutilizaDe: libres[0].item };

    const [prefijoBase, digitosBase] = PREFIJOS[tipo] || ["INV", 3];
    const porPrefijo = new Map();
    for (const { codigo } of codigosConEstado(items)) {
      const partes = /^([A-Za-z]+)-(\d+)/.exec(codigo);
      if (!partes) continue;
      const actual = porPrefijo.get(partes[1]) || { cantidad: 0, mayor: 0, digitos: partes[2].length };
      actual.cantidad += 1;
      if (Number(partes[2]) >= actual.mayor) { actual.mayor = Number(partes[2]); actual.digitos = partes[2].length; }
      porPrefijo.set(partes[1], actual);
    }
    // El prefijo más usado del apartado (por si algún bien quedó con uno distinto).
    const [prefijo, datos] = [...porPrefijo.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad)[0]
      || [prefijoBase, { mayor: 0, digitos: digitosBase }];
    const todos = new Set(codigosConEstado(todosLosItems).map(entrada => clave(entrada.codigo)));
    let numero = datos.mayor + 1;
    while (todos.has(clave(`${prefijo}-${conCeros(numero, datos.digitos)}`))) numero += 1;
    return { codigo: `${prefijo}-${conCeros(numero, datos.digitos)}`, reutilizaDe: null };
  }

  // Códigos al duplicar un bien. El original y la copia quedan como una familia con sufijo:
  //   ACA-065 (sin familia)          → original ACA-065-01, copia ACA-065-02
  //   ACA-065 (ya existe ACA-065-01) → original ACA-065-02, copia ACA-065-03
  //   ACA-031-01 (existe ACA-031-02) → original sin cambio,  copia ACA-031-03
  // Devuelve { original, copia } (original === codigo si no hay que renombrarlo).
  function codigosAlDuplicar(codigo, todosLosCodigos) {
    const actual = String(codigo || "").trim();
    const conSufijo = /^(.+-\d+)-(\d{2,})$/.exec(actual);
    const base = conSufijo ? conSufijo[1] : actual;
    const prefijoFamilia = clave(`${base}-`);
    let mayor = 0;
    for (const otro of todosLosCodigos) {
      const texto = clave(otro);
      if (!texto.startsWith(prefijoFamilia)) continue;
      const resto = texto.slice(prefijoFamilia.length);
      if (/^\d{2,}$/.test(resto)) mayor = Math.max(mayor, Number(resto));
    }
    if (conSufijo) return { original: actual, copia: `${base}-${conCeros(mayor + 1, 2)}` };
    return { original: `${base}-${conCeros(mayor + 1, 2)}`, copia: `${base}-${conCeros(mayor + 2, 2)}` };
  }

  // Revisa que los códigos de un bien no choquen con los de otro bien activo.
  // Devuelve el primer código repetido (o null). `idPropio` es el bien que se está editando.
  function codigoRepetido(codigos, items, idPropio = "") {
    const vistos = new Set();
    for (const codigo of codigos) {
      if (vistos.has(clave(codigo))) return codigo;
      vistos.add(clave(codigo));
    }
    const otros = codigosActivos(items.filter(item => item.id !== idPropio));
    return codigos.find(codigo => otros.has(clave(codigo))) || null;
  }

  const api = { PREFIJOS, ESTADOS_BAJA, esBaja, codigosConEstado, siguienteCodigo, codigosAlDuplicar, codigoRepetido };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; } // pruebas en Node
  window.InventarioCodigos = api;
})();
