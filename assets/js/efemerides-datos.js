// Datos y lógica del calendario de efemérides (efemerides.html y la sección Efemérides de admin.html).
//
// Hay tres fuentes que se combinan:
//  1. FIJAS y `movibles`: efemérides de fábrica (internacionales, de Costa Rica, de matemática y de AEMATEC).
//  2. CALENDARIOS_FIJOS: calendarios del MEP y del TEC de un año concreto (semilla de 2026).
//  3. Documentos de Firestore (colección `efemerides`): lo que la Junta o la moderación agregan, editan u ocultan
//     desde admin.html. Un documento con el mismo `id` que una de fábrica la reemplaza (o la oculta si trae
//     `oculta: true`). Cada año los calendarios MEP/TEC se cargan desde el panel, sin tocar el código.
//
// Tipos: "cr" Costa Rica · "int" internacional · "mate" matemática y ciencia · "aematec" de la asociación ·
// "mep" calendario escolar del MEP · "tec" calendario del TEC. `tema` (opcional) es el id de un tema de
// temporada de assets/js/temas.js. La lista es informativa: no reemplaza el calendario oficial de feriados.
(function () {
  const TIPOS = {
    aematec: { nombre: "AEMATEC", orden: 0 },
    cr: { nombre: "Costa Rica", orden: 1 },
    mate: { nombre: "Matemática y ciencia", orden: 2 },
    int: { nombre: "Internacional", orden: 3 },
    mep: { nombre: "MEP", orden: 4 },
    tec: { nombre: "TEC", orden: 5 }
  };
  // Las pestañas de la página: qué tipos muestra cada una.
  const GRUPOS = { general: ["aematec", "cr", "mate", "int"], mep: ["mep"], tec: ["tec"] };
  const FUENTES = {
    mep: { nombre: "Calendario MEP", texto: "Calendario escolar oficial del MEP", url: anio => `https://calendario.mep.go.cr/${anio}` },
    tec: { nombre: "Calendario TEC", texto: "Calendario del TEC (Admisión y Registro)", url: () => "https://www.tec.ac.cr/semestre-verano" }
  };
  const DIAS_LARGO = 14; // un rango de más días se marca solo en su primer y último día

  const dos = n => String(n).padStart(2, "0");
  const slug = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const iso = fecha => `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}-${dos(fecha.getUTCDate())}`;
  const dia = (anio, mes, d) => new Date(Date.UTC(anio, mes - 1, d));
  const sumarDias = (fecha, n) => new Date(fecha.getTime() + n * 86400000);
  const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);
  const esFechaReal = (a, m, d) => { const f = dia(a, m, d); return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d; };

  // [mes, día, tipo, título, descripción, tema?]
  const FIJAS = [
    [1, 1, "cr", "Año Nuevo", "Comienza el año.", "anio-nuevo"],
    [1, 1, "aematec", "Inicio del periodo de la Junta Directiva", "Inicia el periodo de la nueva Junta Directiva de AEMATEC."],
    [1, 4, "int", "Día Mundial del Braille", "Reconoce el braille como medio de comunicación de las personas ciegas o con baja visión."],
    [1, 24, "int", "Día Internacional de la Educación", "La ONU destaca el papel de la educación en la paz y el desarrollo."],
    [2, 11, "int", "Día Internacional de la Mujer y la Niña en la Ciencia", "Promueve el acceso y la participación plena de mujeres y niñas en la ciencia."],
    [2, 21, "int", "Día Internacional de la Lengua Materna", "Promueve la diversidad lingüística y cultural."],
    [3, 8, "int", "Día Internacional de la Mujer", "Se recuerda la lucha por la igualdad de derechos de las mujeres.", "8m"],
    [3, 14, "mate", "Día de π y Día Internacional de las Matemáticas", "El 14/3 (3,14) se celebra el número π, y la UNESCO proclamó esta fecha para celebrar las matemáticas.", "semana-carrera"],
    [3, 20, "int", "Día Internacional de la Felicidad", "La ONU reconoce la búsqueda de la felicidad como un objetivo humano fundamental."],
    [3, 21, "int", "Día Mundial de la Poesía", "La UNESCO promueve la lectura, la escritura y la enseñanza de la poesía."],
    [3, 22, "int", "Día Mundial del Agua", "Llama la atención sobre la importancia del agua dulce."],
    [3, 23, "mate", "Natalicio de Emmy Noether (1882)", "Matemática alemana clave en el álgebra abstracta y en la física teórica (teorema de Noether)."],
    [4, 1, "mate", "Natalicio de Sophie Germain (1776)", "Matemática francesa que hizo aportes a la teoría de números y a la teoría de la elasticidad."],
    [4, 7, "int", "Día Mundial de la Salud", "Aniversario de la fundación de la Organización Mundial de la Salud."],
    [4, 11, "cr", "Día de Juan Santamaría", "Se recuerda al héroe nacional de la Batalla de Rivas (1856), en la Campaña Nacional contra los filibusteros.", "juan-santamaria"],
    [4, 15, "mate", "Natalicio de Leonhard Euler (1707)", "Matemático suizo, una de las figuras más prolíficas de la historia; popularizó notaciones como f(x) y el número e."],
    [4, 22, "int", "Día de la Tierra", "Día Internacional de la Madre Tierra: se promueve el cuidado del planeta."],
    [4, 23, "int", "Día Mundial del Libro y del Derecho de Autor", "La UNESCO fomenta la lectura y la protección de la propiedad intelectual."],
    [4, 30, "mate", "Natalicio de Carl Friedrich Gauss (1777)", "Matemático alemán conocido como el «príncipe de las matemáticas»."],
    [5, 1, "cr", "Día del Trabajo", "Día Internacional de las Personas Trabajadoras; también se celebra en gran parte del mundo."],
    [5, 12, "mate", "Natalicio de Maryam Mirzakhani (1977)", "Matemática iraní, la primera mujer en ganar la Medalla Fields (2014)."],
    [6, 5, "int", "Día Mundial del Medio Ambiente", "Impulsa la acción para proteger el ambiente."],
    [6, 10, "cr", "Aniversario del TEC", "El Instituto Tecnológico de Costa Rica fue creado por la Ley 4777 del 10 de junio de 1971."],
    [6, 23, "mate", "Natalicio de Alan Turing (1912)", "Matemático británico, pionero de la informática teórica y de la inteligencia artificial."],
    [6, 28, "int", "Día Internacional del Orgullo LGBTIQ+", "Recuerda los disturbios de Stonewall (1969) y la lucha por la igualdad de derechos.", "orgullo"],
    [7, 22, "mate", "Día de la aproximación de π", "22/7 ≈ 3,142857…: una fracción muy usada como aproximación de π."],
    [7, 25, "cr", "Anexión del Partido de Nicoya", "Se recuerda la anexión del Partido de Nicoya a Costa Rica, en 1824."],
    [8, 2, "cr", "Día de la Virgen de los Ángeles", "Fiesta de la Patrona de Costa Rica; muchas personas peregrinan a la Basílica en Cartago."],
    [8, 12, "int", "Día Internacional de la Juventud", "La ONU destaca el papel de las personas jóvenes en la sociedad."],
    [8, 15, "cr", "Día de la Madre", "Se celebra el Día de la Madre en Costa Rica.", "dia-madre"],
    [8, 26, "mate", "Natalicio de Katherine Johnson (1918)", "Matemática estadounidense de la NASA; calculó trayectorias de vuelos espaciales."],
    [8, 31, "cr", "Día de la Persona Negra y la Cultura Afrocostarricense", "Se reconoce el aporte de la población afrodescendiente a la identidad costarricense."],
    [9, 8, "int", "Día Internacional de la Alfabetización", "Recuerda que saber leer y escribir es un derecho humano."],
    [9, 14, "cr", "Noche de faroles", "Víspera de la Independencia: niñas y niños recorren las calles con faroles.", "faroles"],
    [9, 15, "cr", "Día de la Independencia", "Se celebra la independencia de Centroamérica, proclamada en 1821.", "mes-patrio"],
    [9, 21, "int", "Día Internacional de la Paz", "La ONU invita a la no violencia y al cese del fuego."],
    [10, 5, "int", "Día Mundial de los Docentes", "Reconoce la labor del personal docente en todo el mundo."],
    [10, 12, "cr", "Día de las Culturas", "Se celebra la diversidad cultural de Costa Rica."],
    [10, 31, "int", "Halloween", "Tradición de disfraces y dulces.", "halloween"],
    [11, 17, "int", "Día Internacional del Estudiante", "Recuerda la lucha estudiantil de 1939 en Praga."],
    [11, 22, "cr", "Día del Docente Costarricense", "Se agradece a quienes enseñan.", "dia-docente"],
    [11, 25, "int", "Día Internacional de la Eliminación de la Violencia contra la Mujer", "La ONU llama a prevenir y erradicar la violencia contra mujeres y niñas."],
    [12, 1, "cr", "Día de la Abolición del Ejército", "En 1948 se anunció la abolición del ejército; hoy Costa Rica no tiene fuerza armada permanente."],
    [12, 3, "int", "Día Internacional de las Personas con Discapacidad", "Promueve sus derechos, su bienestar y su participación plena."],
    [12, 10, "int", "Día de los Derechos Humanos", "Se conmemora la Declaración Universal de Derechos Humanos (1948)."],
    [12, 10, "mate", "Natalicio de Ada Lovelace (1815)", "Considerada la primera persona en escribir un algoritmo pensado para una máquina (la Máquina Analítica)."],
    [12, 22, "mate", "Natalicio de Srinivasa Ramanujan (1887)", "Matemático indio autodidacta con grandes aportes a la teoría de números; en India este día es el Día Nacional de las Matemáticas."],
    [12, 25, "cr", "Navidad", "Se celebra la Navidad.", "navidad"]
  ];

  // Calendarios de un año concreto: [tipo, desde, hasta, título, descripción]. Los de 2026 son una semilla tomada de las
  // páginas oficiales (MEP: calendario.mep.go.cr/2026; TEC: tec.ac.cr/semestre-verano); pueden tener ajustes
  // posteriores. Los años siguientes NO se escriben aquí: la Junta los carga desde admin.html → Efemérides.
  const OFICIAL_MEP = "Fuente: calendario escolar oficial del MEP; verifica ajustes en calendario.mep.go.cr.";
  const OFICIAL_TEC = "Fuente: página oficial del TEC (Semestre y Verano 2026-2027); verifica en tec.ac.cr.";
  const CALENDARIOS_FIJOS = [
    ["mep", "2026-02-09", "2026-02-20", "Capacitación del personal", `Dos semanas antes de las lecciones, para el personal docente, técnico-docente, administrativo y de apoyo. ${OFICIAL_MEP}`],
    ["mep", "2026-02-09", "2026-02-13", "Segunda prueba de ampliación (curso 2025)", `Pruebas de ampliación de Educación General Básica y ciclo diversificado. ${OFICIAL_MEP}`],
    ["mep", "2026-02-23", "2026-02-23", "Inicio de lecciones", `Comienza el curso lectivo 2026. ${OFICIAL_MEP}`],
    ["mep", "2026-02-23", "2026-07-03", "Primer periodo lectivo", `Del 23 de febrero al 3 de julio. ${OFICIAL_MEP}`],
    ["mep", "2026-03-29", "2026-04-05", "Semana Santa", `Receso por Semana Santa. ${OFICIAL_MEP}`],
    ["mep", "2026-07-06", "2026-07-17", "Vacaciones de medio periodo", `Receso entre el primer y el segundo periodo. ${OFICIAL_MEP}`],
    ["mep", "2026-07-20", "2026-12-09", "Segundo periodo lectivo", `Del 20 de julio al 9 de diciembre (fin de lecciones). ${OFICIAL_MEP}`],
    ["mep", "2026-12-10", "2026-12-11", "Actos de graduación", `Graduaciones de fin de curso. ${OFICIAL_MEP}`],
    ["tec", "2026-02-09", "2026-02-10", "I Semestre · Matrícula ordinaria (estudiantes regulares)", OFICIAL_TEC],
    ["tec", "2026-02-16", "2026-06-13", "I Semestre · Periodo lectivo", `16 semanas lectivas. ${OFICIAL_TEC}`],
    ["tec", "2026-02-16", "2026-03-27", "I Semestre · Retiro de materias", OFICIAL_TEC],
    ["tec", "2026-06-22", "2026-07-02", "I Semestre · Evaluaciones y actividades finales", OFICIAL_TEC],
    ["tec", "2026-07-03", "2026-07-21", "I Semestre · Revisión de calificaciones", `Periodo ordinario. ${OFICIAL_TEC}`],
    ["tec", "2026-07-21", "2026-07-22", "II Semestre · Matrícula ordinaria (estudiantes regulares)", OFICIAL_TEC],
    ["tec", "2026-08-03", "2026-11-21", "II Semestre · Periodo lectivo", `16 semanas lectivas. ${OFICIAL_TEC}`],
    ["tec", "2026-08-03", "2026-09-11", "II Semestre · Retiro de materias", OFICIAL_TEC],
    ["tec", "2026-10-05", "2026-10-07", "Admisión · Elección de carrera definitiva", "Proceso de admisión 2026-2027. Fuente: página «Admisión 2026» del TEC; verifica en tec.ac.cr."],
    ["tec", "2026-11-09", "2026-11-09", "I Semestre 2027 · Citas de matrícula (publicación preliminar)", OFICIAL_TEC],
    ["tec", "2026-11-20", "2026-11-20", "I Semestre 2027 · Citas de matrícula (publicación definitiva)", OFICIAL_TEC],
    ["tec", "2026-11-30", "2026-12-10", "II Semestre · Evaluaciones y actividades finales", OFICIAL_TEC],
    ["tec", "2026-12-15", "2027-01-30", "Verano 2026-2027 · Periodo lectivo", `6 semanas lectivas. ${OFICIAL_TEC}`]
  ];

  // Domingo de Pascua (calendario gregoriano, algoritmo de Meeus/Jones/Butcher): { mes, dia }.
  function pascua(anio) {
    const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return { mes: Math.floor((h + l - 7 * m + 114) / 31), dia: ((h + l - 7 * m + 114) % 31) + 1 };
  }
  // El n-ésimo (1, 2, 3…) día de la semana indicado (0 = domingo) de un mes.
  function enesimoDia(anio, mes, diaSemana, n) {
    const primero = dia(anio, mes, 1);
    return sumarDias(primero, (diaSemana - primero.getUTCDay() + 7) % 7 + (n - 1) * 7);
  }

  // Efemérides de fábrica de un año (sin lo que la Junta haya editado). Todas llevan `id` estable.
  function movibles(anio) {
    const pas = pascua(anio), domingo = dia(anio, pas.mes, pas.dia);
    const unica = (fecha, tipo, titulo, desc, tema) => ({ id: `m-${slug(titulo)}`, desde: iso(fecha), hasta: iso(fecha), tipo, titulo, desc, tema });
    const pi = dia(anio, 3, 14), lunes = sumarDias(pi, -((pi.getUTCDay() + 6) % 7));
    return [
      unica(sumarDias(domingo, -3), "cr", "Jueves Santo", "Semana Santa: se conmemora la Última Cena."),
      unica(sumarDias(domingo, -2), "cr", "Viernes Santo", "Semana Santa: se conmemora la Pasión y muerte de Jesús."),
      unica(domingo, "cr", "Domingo de Pascua", "Domingo de Resurrección: termina la Semana Santa."),
      unica(enesimoDia(anio, 6, 0, 3), "cr", "Día del Padre", "En Costa Rica se celebra el tercer domingo de junio.", "dia-padre"),
      unica(enesimoDia(anio, 10, 2, 2), "mate", "Día de Ada Lovelace", "Se celebran los logros de las mujeres en ciencia, tecnología, ingeniería y matemáticas (segundo martes de octubre)."),
      { id: "m-semana-de-la-carrera", desde: iso(lunes), hasta: iso(sumarDias(lunes, 6)), tipo: "aematec", titulo: "Semana de la Carrera", desc: "De lunes a domingo de la semana del Día de π: actividades de la carrera, con el tema «La constante de Arquímedes».", tema: "semana-carrera" }
    ];
  }
  function deFabrica(anio) {
    const fijas = FIJAS.map(([mes, d, tipo, titulo, desc, tema]) => ({ id: `f${dos(mes)}${dos(d)}-${slug(titulo)}`, desde: `${anio}-${dos(mes)}-${dos(d)}`, hasta: `${anio}-${dos(mes)}-${dos(d)}`, tipo, titulo, desc, tema, anual: true }));
    const calendarios = CALENDARIOS_FIJOS
      .filter(([, desde, hasta]) => Number(desde.slice(0, 4)) <= anio && anio <= Number(hasta.slice(0, 4)))
      .map(([tipo, desde, hasta, titulo, desc]) => ({ id: `c-${tipo}-${desde}-${slug(titulo)}`, desde, hasta, tipo, titulo, desc }));
    return [...fijas, ...movibles(anio), ...calendarios];
  }

  // Un documento de Firestore { id, tipo, titulo, desc, desde, hasta, anual, tema } como ocurrencia de un año (o null).
  function expandir(doc, anio) {
    let { desde, hasta } = doc;
    if (doc.anual) {
      const mes = Number(desde.slice(5, 7)), d = Number(desde.slice(8, 10));
      if (!esFechaReal(anio, mes, d)) return null; // por ejemplo, un 29 de febrero en un año que no es bisiesto
      desde = hasta = `${anio}-${desde.slice(5)}`;
    }
    if (!(Number(desde.slice(0, 4)) <= anio && anio <= Number(hasta.slice(0, 4)))) return null;
    return { id: doc.id, desde, hasta, tipo: doc.tipo, titulo: doc.titulo, desc: doc.desc || "", tema: doc.tema || undefined, anual: Boolean(doc.anual), personalizada: true };
  }

  const ordenar = (a, b) => a.desde.localeCompare(b.desde) || TIPOS[a.tipo].orden - TIPOS[b.tipo].orden || a.titulo.localeCompare(b.titulo, "es");

  // Todas las efemérides de un año, ya combinadas con lo que editó la Junta (`docs`), ordenadas por fecha.
  function delAnio(anio, docs = []) {
    const porId = new Map(docs.map(d => [d.id, d]));
    const base = deFabrica(anio).filter(e => !porId.has(e.id));
    const propias = docs.filter(d => !d.oculta).map(d => expandir(d, anio)).filter(Boolean);
    return [...base, ...propias].sort(ordenar);
  }
  // Solo las de fábrica de un año, con su `id` (lo usa el panel para saber cuáles se pueden editar u ocultar).
  const fabrica = anio => deFabrica(anio).sort(ordenar);

  // ¿La efeméride está "en" esta fecha? Las de más de DIAS_LARGO días solo cuentan su primer y su último día.
  const largo = e => dias(e.desde, e.hasta) > DIAS_LARGO;
  function enDia(e, fecha) {
    if (e.desde > fecha || fecha > e.hasta) return false;
    return !largo(e) || fecha === e.desde || fecha === e.hasta;
  }
  // Las efemérides de una fecha "AAAA-MM-DD"; las largas traen `fase` ("inicio" o "fin").
  function delDia(fecha, docs = []) {
    const anio = Number(fecha.slice(0, 4));
    return [...delAnio(anio, docs), ...(Number(fecha.slice(5, 7)) === 1 ? delAnio(anio - 1, docs) : [])]
      .filter((e, i, todas) => todas.findIndex(o => o.id === e.id && o.desde === e.desde) === i && enDia(e, fecha))
      .map(e => (largo(e) ? { ...e, fase: fecha === e.desde ? "inicio" : "fin" } : e))
      .sort(ordenar);
  }
  // Las próximas `cantidad` efemérides desde una fecha. `cuando` es la fecha que cuenta: la de inicio, o hoy si ya
  // está en curso; para una larga en curso es su último día ("fin").
  function proximas(fecha, cantidad, tipos = Object.keys(TIPOS), docs = []) {
    const anio = Number(fecha.slice(0, 4)), vistas = new Set(), lista = [];
    for (const e of [...delAnio(anio - 1, docs), ...delAnio(anio, docs), ...delAnio(anio + 1, docs)]) {
      const clave = `${e.id}|${e.desde}`;
      if (vistas.has(clave) || e.hasta < fecha || !tipos.includes(e.tipo)) continue;
      vistas.add(clave);
      if (e.desde >= fecha) lista.push({ ...e, cuando: e.desde, fase: largo(e) ? "inicio" : undefined });
      else if (largo(e)) lista.push({ ...e, cuando: e.hasta, fase: "fin" });
      else lista.push({ ...e, cuando: fecha, enCurso: true });
    }
    return lista.sort((a, b) => a.cuando.localeCompare(b.cuando) || ordenar(a, b)).slice(0, cantidad);
  }

  // ---------- Pegar varias fechas (admin.html) ----------
  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  // Una fecha escrita de varias formas → { a?, m, d }: "2026-02-23", "23-02-26", "23/02/2026", "23 de febrero", "23 de febrero de 2026".
  function unaFecha(texto) {
    const t = texto.trim().toLowerCase().replace(/^del\s+/, "").replace(/\.$/, "");
    let r;
    if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) return { a: Number(r[1]), m: Number(r[2]), d: Number(r[3]) };
    if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(t))) return { a: r[3].length === 2 ? 2000 + Number(r[3]) : Number(r[3]), m: Number(r[2]), d: Number(r[1]) };
    if ((r = /^(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:de\s+)?(\d{4}))?$/.exec(t)) && MESES[r[2]]) return { a: r[3] ? Number(r[3]) : undefined, m: MESES[r[2]], d: Number(r[1]) };
    return null;
  }
  // El texto de fechas de una línea → [desde, hasta] ("AAAA-MM-DD") o null. `anio` es el año si no se escribe.
  function leerFechas(texto, anio) {
    const t = texto.trim().toLowerCase();
    let r = /^(?:del\s+)?(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:de\s+)?(\d{4}))?$/.exec(t); // "6 al 17 de julio"
    let partes;
    if (r && MESES[r[3]]) partes = [{ a: r[4] && Number(r[4]), m: MESES[r[3]], d: Number(r[1]) }, { a: r[4] && Number(r[4]), m: MESES[r[3]], d: Number(r[2]) }];
    else {
      const trozos = t.split(/\s+(?:a|al|hasta|-|–|—)\s+/);
      if (trozos.length > 2) return null;
      partes = trozos.map(unaFecha);
      if (partes.some(p => !p)) return null;
    }
    const explicito = partes.map(p => p.a).find(Boolean);
    const [p1, p2] = partes.length === 1 ? [partes[0], partes[0]] : partes;
    const a1 = p1.a || explicito || anio;
    let a2 = p2.a || explicito || anio;
    if (!p1.a && !p2.a && !explicito && (p2.m < p1.m || (p2.m === p1.m && p2.d < p1.d))) a2 = a1 + 1; // de diciembre a enero
    if (!esFechaReal(a1, p1.m, p1.d) || !esFechaReal(a2, p2.m, p2.d)) return null;
    const desde = `${a1}-${dos(p1.m)}-${dos(p1.d)}`, hasta = `${a2}-${dos(p2.m)}-${dos(p2.d)}`;
    return desde <= hasta ? [desde, hasta] : null;
  }
  // Varias líneas "fechas | título | descripción (opcional)" → { items, errores }.
  function leerLineas(texto, anio) {
    const items = [], errores = [];
    String(texto).split(/\r?\n/).forEach((linea, i) => {
      if (!linea.trim()) return;
      const [fechas, titulo = "", desc = ""] = linea.split(/\s*[|;\t]\s*/).map(p => p.trim());
      const rango = leerFechas(fechas, anio);
      if (!rango) return errores.push({ linea: i + 1, texto: linea, motivo: "No se entendió la fecha. Ejemplos: 23-02-26, 2026-02-23, 23 de febrero, 6 al 17 de julio, 16-02-26 a 13-06-26." });
      if (titulo.length < 3 || titulo.length > 120) return errores.push({ linea: i + 1, texto: linea, motivo: "Falta el título (de 3 a 120 letras). Formato: fechas | título | descripción." });
      if (desc.length > 400) return errores.push({ linea: i + 1, texto: linea, motivo: "La descripción es muy larga (máximo 400 letras)." });
      items.push({ desde: rango[0], hasta: rango[1], titulo, desc });
    });
    return { items, errores };
  }
  // Id estable para lo que se importa: volver a pegar la misma lista no duplica nada.
  const idImportado = (tipo, e) => `i-${tipo}-${e.desde}-${slug(e.titulo)}`.slice(0, 120);

  const api = { TIPOS, GRUPOS, FUENTES, FIJAS, CALENDARIOS_FIJOS, DIAS_LARGO, delAnio, delDia, proximas, fabrica, expandir, enDia, largo, leerLineas, leerFechas, idImportado, slug, pascua, enesimoDia };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; } // pruebas en Node
  window.aematecEfemerides = api;
})();
