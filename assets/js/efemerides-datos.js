// Datos del calendario de efemérides (efemerides.html): fechas internacionales, de Costa Rica, de matemática y de
// AEMATEC. Es solo una lista: para agregar o corregir una fecha, edita FIJAS (cada año) o `movibles` (fechas que
// cambian de día cada año, como Semana Santa). Después corre `node --test tests/efemerides.test.js`.
//
// Tipos: "cr" = Costa Rica · "int" = internacional · "mate" = matemática y ciencia · "aematec" = de la asociación.
// `tema` (opcional) es el id de un tema de temporada de assets/js/temas.js, para ofrecer su vista previa.
//
// Es la fuente única del calendario; la pantalla está en assets/js/efemerides.js. Esta lista es informativa: no
// reemplaza el calendario oficial de feriados del Ministerio de Trabajo y Seguridad Social.
(function () {
  const TIPOS = {
    aematec: { nombre: "AEMATEC", orden: 0 },
    cr: { nombre: "Costa Rica", orden: 1 },
    mate: { nombre: "Matemática y ciencia", orden: 2 },
    int: { nombre: "Internacional", orden: 3 }
  };

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

  const dos = n => String(n).padStart(2, "0");
  const iso = fecha => `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}-${dos(fecha.getUTCDate())}`;
  const dia = (anio, mes, d) => new Date(Date.UTC(anio, mes - 1, d));
  const sumarDias = (fecha, n) => new Date(fecha.getTime() + n * 86400000);

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

  // Fechas que cambian de día cada año.
  function movibles(anio) {
    const pas = pascua(anio), domingo = dia(anio, pas.mes, pas.dia);
    const unica = (fecha, tipo, titulo, desc, tema) => ({ desde: iso(fecha), hasta: iso(fecha), tipo, titulo, desc, tema });
    const pi = dia(anio, 3, 14), lunes = sumarDias(pi, -((pi.getUTCDay() + 6) % 7));
    const lista = [
      unica(sumarDias(domingo, -3), "cr", "Jueves Santo", "Semana Santa: se conmemora la Última Cena."),
      unica(sumarDias(domingo, -2), "cr", "Viernes Santo", "Semana Santa: se conmemora la Pasión y muerte de Jesús."),
      unica(domingo, "cr", "Domingo de Pascua", "Domingo de Resurrección: termina la Semana Santa."),
      unica(enesimoDia(anio, 6, 0, 3), "cr", "Día del Padre", "En Costa Rica se celebra el tercer domingo de junio.", "dia-padre"),
      unica(enesimoDia(anio, 10, 2, 2), "mate", "Día de Ada Lovelace", "Se celebran los logros de las mujeres en ciencia, tecnología, ingeniería y matemáticas (segundo martes de octubre)."),
      { desde: iso(lunes), hasta: iso(sumarDias(lunes, 6)), tipo: "aematec", titulo: "Semana de la Carrera", desc: "De lunes a domingo de la semana del Día de π: actividades de la carrera, con el tema «La constante de Arquímedes».", tema: "semana-carrera" }
    ];
    return lista;
  }

  // Todas las efemérides de un año, ordenadas por fecha (y por tipo dentro del mismo día).
  function delAnio(anio) {
    const fijas = FIJAS.map(([mes, d, tipo, titulo, desc, tema]) => ({ desde: `${anio}-${dos(mes)}-${dos(d)}`, hasta: `${anio}-${dos(mes)}-${dos(d)}`, tipo, titulo, desc, tema }));
    return [...fijas, ...movibles(anio)].sort((a, b) => a.desde.localeCompare(b.desde) || TIPOS[a.tipo].orden - TIPOS[b.tipo].orden || a.titulo.localeCompare(b.titulo, "es"));
  }
  // Las efemérides que ocurren (o están en curso) en una fecha "AAAA-MM-DD".
  const delDia = fecha => delAnio(Number(fecha.slice(0, 4))).filter(e => e.desde <= fecha && fecha <= e.hasta);
  // Las próximas `cantidad` efemérides desde una fecha (incluye las que están en curso), de los tipos pedidos.
  function proximas(fecha, cantidad, tipos = Object.keys(TIPOS)) {
    const anio = Number(fecha.slice(0, 4));
    return [...delAnio(anio), ...delAnio(anio + 1)].filter(e => e.hasta >= fecha && tipos.includes(e.tipo)).slice(0, cantidad);
  }

  const api = { TIPOS, FIJAS, delAnio, delDia, proximas, pascua, enesimoDia };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; } // pruebas en Node
  window.aematecEfemerides = api;
})();
