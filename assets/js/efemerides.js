// Pantalla del calendario de efemérides (efemerides.html). Los datos están en assets/js/efemerides-datos.js.
// Todo texto que se muestra se pone con textContent (nunca con innerHTML).
(function () {
  const D = window.aematecEfemerides;
  if (!D) return;

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
  const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const $ = id => document.getElementById(id);
  const el = (etiqueta, clase, texto) => { const e = document.createElement(etiqueta); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };
  const dos = n => String(n).padStart(2, "0");

  const hoyEnCostaRica = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());
  const esFecha = f => /^\d{4}-\d\d-\d\d$/.test(f) && !Number.isNaN(Date.parse(f));
  const fechaLarga = f => `${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]} de ${f.slice(0, 4)}`;
  const fechaCorta = f => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1].slice(0, 3)}`;
  const diaSemana = f => ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][new Date(`${f}T12:00:00Z`).getUTCDay()];

  const hoy = hoyEnCostaRica();
  const parametros = new URLSearchParams(location.search);
  let seleccion = esFecha(parametros.get("fecha") || "") ? parametros.get("fecha") : hoy;
  let anio = Number(seleccion.slice(0, 4)), mes = Number(seleccion.slice(5, 7)) - 1;
  // Pestañas: "general" (efemérides), "mep" y "tec". Cada una muestra solo los tipos de su grupo.
  let vista = D.GRUPOS[parametros.get("vista")] ? parametros.get("vista") : "general";
  let activos = new Set(D.GRUPOS[vista]);
  let docs = []; // fechas que la Junta agregó o cambió desde el panel (colección "efemerides" de Firestore)

  const cache = {};
  const delAnio = a => cache[a] || (cache[a] = D.delAnio(a, docs));
  const visibles = lista => lista.filter(e => activos.has(e.tipo));
  const eventosDe = fecha => visibles(D.delDia(fecha, docs));
  const claveDia = (a, m, d) => `${a}-${dos(m + 1)}-${dos(d)}`;

  // Los periodos largos solo se marcan al empezar y al terminar.
  const textoFase = e => e.fase === "inicio" ? `Inicia: ${e.titulo}` : e.fase === "fin" ? `Termina: ${e.titulo}` : e.titulo;

  // ---------- Filtros ----------
  function dibujarFiltros() {
    const caja = $("ef-filtros");
    caja.replaceChildren();
    caja.hidden = D.GRUPOS[vista].length < 2;
    D.GRUPOS[vista].map(tipo => [tipo, D.TIPOS[tipo]]).forEach(([tipo, { nombre }]) => {
      const b = el("button", `ef-filtro ef-t-${tipo}`, nombre);
      b.type = "button";
      b.setAttribute("aria-pressed", String(activos.has(tipo)));
      b.addEventListener("click", () => {
        if (activos.has(tipo)) { if (activos.size > 1) activos.delete(tipo); } else activos.add(tipo); // siempre queda al menos uno
        dibujarFiltros();
        dibujarTodo();
      });
      caja.appendChild(b);
    });
  }

  // ---------- Calendario del mes ----------
  function dibujarCalendario() {
    $("ef-titulo").textContent = `${MESES[mes]} ${anio}`;
    const grilla = $("ef-dias");
    grilla.replaceChildren();
    const primero = (new Date(Date.UTC(anio, mes, 1)).getUTCDay() + 6) % 7; // lunes = 0
    const total = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    for (let i = 0; i < primero; i++) grilla.appendChild(el("div", "ef-vacio"));
    for (let d = 1; d <= total; d++) {
      const fecha = claveDia(anio, mes, d), eventos = eventosDe(fecha), columna = (primero + d - 1) % 7;
      const celda = el("button", `ef-dia${fecha === hoy ? " ef-dia--hoy" : ""}${columna >= 5 ? " ef-dia--finde" : ""}`);
      celda.type = "button";
      celda.dataset.fecha = fecha;
      celda.setAttribute("role", "gridcell");
      celda.setAttribute("aria-pressed", String(fecha === seleccion));
      celda.setAttribute("aria-label", `${fechaLarga(fecha)}${fecha === hoy ? " (hoy)" : ""}: ${eventos.length ? eventos.map(textoFase).join("; ") : "sin efemérides"}`);
      celda.appendChild(el("span", "ef-num", String(d)));
      if (eventos.length) {
        const marcas = el("span", "ef-marcas");
        eventos.slice(0, 2).forEach(e => marcas.appendChild(el("span", `ef-marca ef-t-${e.tipo}`, textoFase(e))));
        if (eventos.length > 2) marcas.appendChild(el("span", "ef-mas", `+${eventos.length - 2} más`));
        celda.appendChild(marcas);
      }
      celda.addEventListener("click", () => {
        elegir(fecha);
        // En pantallas angostas el detalle queda debajo del calendario: se acerca solo si no se alcanza a ver.
        if (innerWidth <= 980) $("ef-dia-titulo").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
      celda.addEventListener("keydown", e => moverConTeclado(e, fecha));
      grilla.appendChild(celda);
    }
  }

  // Flechas del teclado: se mueve entre los días del mes (y salta al mes vecino si se sale).
  function moverConTeclado(e, fecha) {
    const paso = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!paso) return;
    e.preventDefault();
    const nueva = new Date(`${fecha}T12:00:00Z`);
    nueva.setUTCDate(nueva.getUTCDate() + paso);
    elegir(nueva.toISOString().slice(0, 10), true);
  }

  // ---------- Detalle del día, próximas y lista del mes ----------
  function tarjetaEvento(e) {
    const caja = el("article", `ef-evento ef-t-${e.tipo}`);
    caja.appendChild(el("span", "ef-insignia", D.TIPOS[e.tipo].nombre));
    caja.appendChild(el("h4", "", textoFase(e)));
    if (e.desde !== e.hasta) caja.appendChild(el("p", "ef-rango", `Del ${fechaLarga(e.desde).replace(/ de \d{4}$/, "")} al ${fechaLarga(e.hasta)}`));
    caja.appendChild(el("p", "", e.desc));
    if (e.tema) {
      const enlaces = el("div", "ef-enlaces");
      [["index.html", "Ver el tema de temporada en el sitio"], ["arcade.html", "…y en el Arcade"]].forEach(([pagina, texto]) => {
        const a = el("a", "", texto);
        a.href = `${pagina}?tema=${encodeURIComponent(e.tema)}`;
        enlaces.appendChild(a);
      });
      caja.appendChild(enlaces);
    }
    return caja;
  }
  function dibujarDetalle() {
    const texto = `${diaSemana(seleccion)} ${fechaLarga(seleccion)}${seleccion === hoy ? " · hoy" : ""}`;
    $("ef-dia-titulo").textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
    const lista = $("ef-dia-lista");
    lista.replaceChildren();
    const eventos = eventosDe(seleccion);
    if (!eventos.length) lista.appendChild(el("p", "ef-sin", "No hay nada registrado este día."));
    eventos.forEach(e => lista.appendChild(tarjetaEvento(e)));
  }
  function filaLista(e, mostrarTipo = true) {
    const li = el("li", `ef-t-${e.tipo}`);
    const b = el("button", "ef-item");
    b.type = "button";
    b.appendChild(el("span", "ef-item__fecha", fechaCorta(e.cuando || e.desde)));
    b.appendChild(el("span", "ef-item__titulo", e.fase ? textoFase(e) : e.titulo));
    if (mostrarTipo) b.appendChild(el("span", "ef-item__tipo", D.TIPOS[e.tipo].nombre));
    // Una efeméride de varios días que ya está en curso se abre en el día de hoy; las demás, en su primer día.
    b.addEventListener("click", () => elegir(e.cuando || (e.desde <= hoy && hoy <= e.hasta ? hoy : e.desde), false, true));
    li.appendChild(b);
    return li;
  }
  function dibujarProximas() {
    const ul = $("ef-proximas");
    ul.replaceChildren();
    const lista = D.proximas(hoy, 6, [...activos], docs);
    if (!lista.length) ul.appendChild(el("li", "ef-sin", "No hay efemérides próximas con los filtros elegidos."));
    lista.forEach(e => ul.appendChild(filaLista(e, false)));
  }
  function dibujarMes() {
    $("ef-mes-titulo").textContent = `Efemérides de ${MESES[mes]} de ${anio}`;
    const ul = $("ef-mes-lista");
    ul.replaceChildren();
    const prefijo = `${anio}-${dos(mes + 1)}`;
    const lista = visibles(delAnio(anio)).filter(e => e.desde.slice(0, 7) === prefijo || (e.desde < `${prefijo}-01` && e.hasta.slice(0, 7) >= prefijo));
    if (!lista.length) ul.appendChild(el("li", "ef-sin", "No hay efemérides este mes con los filtros elegidos."));
    lista.forEach(e => ul.appendChild(filaLista(e)));
  }

  let dibujarTodo = function () { dibujarCalendario(); dibujarDetalle(); dibujarProximas(); dibujarMes(); };

  // Elige una fecha; si es de otro mes, el calendario se mueve a ese mes. `enfocar` devuelve el foco a la celda.
  function elegir(fecha, enfocar = false, subir = false) {
    seleccion = fecha;
    anio = Number(fecha.slice(0, 4)); mes = Number(fecha.slice(5, 7)) - 1;
    history.replaceState(null, "", `?${vista === "general" ? "" : `vista=${vista}&`}fecha=${fecha}`);
    dibujarTodo();
    if (enfocar) document.querySelector(`.ef-dia[data-fecha="${fecha}"]`)?.focus();
    if (subir) $("ef-titulo").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function irAMes(delta) {
    mes += delta;
    if (mes < 0) { mes = 11; anio -= 1; } else if (mes > 11) { mes = 0; anio += 1; }
    const primerDia = claveDia(anio, mes, 1);
    seleccion = hoy.slice(0, 7) === primerDia.slice(0, 7) ? hoy : primerDia;
    dibujarTodo();
  }

  $("ef-semana").replaceChildren(...DIAS.map(d => el("div", "", d)));
  $("ef-ant").addEventListener("click", () => irAMes(-1));
  $("ef-sig").addEventListener("click", () => irAMes(1));
  $("ef-hoy").addEventListener("click", () => elegir(hoy));
  // ---------- Pestañas y aviso de cada calendario ----------
  const TEXTOS = {
    general: ["Fechas para recordar", "Efemérides", "Un calendario con fechas internacionales, de Costa Rica, de la matemática y de la asociación. Toca un día para ver qué se recuerda, o filtra por tipo."],
    mep: ["Educación pública", "Calendario MEP", "El calendario escolar del Ministerio de Educación Pública: inicio y fin de periodos, recesos y fechas importantes."],
    tec: ["Instituto Tecnológico de Costa Rica", "Calendario TEC", "Semestres, matrícula, retiros, exámenes y vacaciones del TEC."]
  };
  function dibujarPestanas() {
    document.querySelectorAll("#ef-pestanas [role=tab]").forEach(b => {
      const activa = b.dataset.vista === vista;
      b.setAttribute("aria-selected", String(activa));
      b.tabIndex = activa ? 0 : -1;
    });
    const [sobre, titulo, texto] = TEXTOS[vista];
    $("ef-sobre").textContent = sobre; $("ef-h1").textContent = titulo; $("ef-intro").textContent = texto;
    document.title = `${titulo} — AEMATEC`;
    const fuente = D.FUENTES[vista];
    $("ef-fuente").hidden = !fuente;
    if (fuente) {
      $("ef-fuente-enlace").href = fuente.url(mes < 0 ? anio : anio);
      $("ef-fuente-enlace").textContent = fuente.nombre;
    }
    const sinDatos = fuente && !delAnio(anio).some(e => activos.has(e.tipo));
    $("ef-vacio-aviso").hidden = !sinDatos;
  }
  function cambiarVista(nueva) {
    vista = nueva;
    activos = new Set(D.GRUPOS[vista]);
    history.replaceState(null, "", `?${vista === "general" ? "" : `vista=${vista}&`}fecha=${seleccion}`);
    dibujarFiltros();
    dibujarTodo();
  }
  document.querySelectorAll("#ef-pestanas [role=tab]").forEach(b => {
    b.addEventListener("click", () => cambiarVista(b.dataset.vista));
    b.addEventListener("keydown", e => {
      const todas = [...document.querySelectorAll("#ef-pestanas [role=tab]")], i = todas.indexOf(b);
      const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: todas.length - 1 }[e.key];
      if (j == null) return;
      e.preventDefault();
      const destino = todas[(j + todas.length) % todas.length];
      destino.focus();
      cambiarVista(destino.dataset.vista);
    });
  });

  const dibujarTodoBase = dibujarTodo;
  dibujarTodo = function () { dibujarTodoBase(); dibujarPestanas(); };

  // Fechas editadas por la Junta: se leen del documento público (sin iniciar sesión). Si falla, se usan solo las de fábrica.
  async function cargarDocumentos() {
    const proyecto = window.AEMATEC_FIREBASE_CONFIG && window.AEMATEC_FIREBASE_CONFIG.projectId;
    if (!proyecto) return;
    const lista = [];
    let pagina = "";
    do {
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents/efemerides?pageSize=300${pagina}`);
      if (!r.ok) return;
      const j = await r.json();
      (j.documents || []).forEach(d => {
        const c = d.fields || {}, v = k => c[k] && (c[k].stringValue ?? c[k].booleanValue);
        lista.push({ id: d.name.split("/").pop(), tipo: v("tipo"), titulo: v("titulo"), desc: v("desc") || "", desde: v("desde"), hasta: v("hasta"), anual: v("anual") === true, tema: v("tema") || undefined, oculta: v("oculta") === true });
      });
      pagina = j.nextPageToken ? `&pageToken=${encodeURIComponent(j.nextPageToken)}` : "";
    } while (pagina);
    docs = lista;
    Object.keys(cache).forEach(k => delete cache[k]);
    dibujarTodo();
  }

  dibujarFiltros();
  dibujarTodo();
  cargarDocumentos().catch(() => {});
})();
