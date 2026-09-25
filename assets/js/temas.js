// Temas de temporada del sitio AEMATEC (Navidad, Halloween, mes patrio, Semana de la Carrera, etc.).
//
// Lo carga assets/js/layout.js en todas las páginas; no hay que agregarlo a mano.
// - El tema se elige solo según la fecha en Costa Rica. Si dos temas coinciden, gana el más corto
//   (por ejemplo, el 14 de setiembre "Faroles" gana a "Mes patrio").
// - La Junta puede apagar los temas o fijar uno desde admin.html → Tema del sitio (documento config/tema).
// - Vista previa: agrega ?tema=<id> a cualquier página (por ejemplo index.html?tema=navidad) o ?tema=ninguno.
// - "sutil" = franja de color bajo el encabezado y un aviso breve. "festivo" = además, una animación
//   corta que se detiene sola. Nunca hay animación si la persona pidió "reducir movimiento" en su equipo.
//
// Para agregar un tema: copia una entrada de TEMAS, cambia id, fechas, colores y mensaje, y agrega sus
// colores en assets/css/temas.css (bloque html[data-tema="<id>"]). Prueba con ?tema=<id>.
(function () {
  // ---------- Fechas (todas como texto "AAAA-MM-DD", en hora de Costa Rica) ----------
  const dosDigitos = n => String(n).padStart(2, "0");
  const iso = fecha => `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`;
  const dia = (anio, mes, d) => new Date(Date.UTC(anio, mes - 1, d));
  const sumarDias = (fecha, n) => new Date(fecha.getTime() + n * 86400000);

  // Un solo día o un rango fijo cada año ("MM-DD").
  const cadaAnio = (desde, hasta = desde) => anio => [`${anio}-${desde}`, `${anio}-${hasta}`];
  // Semana de la Carrera: de lunes a domingo de la semana en que cae el Día de π (14 de marzo).
  const semanaDePi = anio => {
    const pi = dia(anio, 3, 14);
    const lunes = sumarDias(pi, -((pi.getUTCDay() + 6) % 7));
    return [iso(lunes), iso(sumarDias(lunes, 6))];
  };
  // Día del Padre en Costa Rica: tercer domingo de junio.
  const diaDelPadre = anio => {
    const primero = dia(anio, 6, 1);
    const domingo = sumarDias(primero, (7 - primero.getUTCDay()) % 7 + 14);
    return [iso(domingo), iso(domingo)];
  };

  // ---------- Catálogo ----------
  // particulas: qué cae o sube en los temas festivos. "icono" usa Font Awesome; "texto" usa las palabras
  // indicadas; "confeti" y "farol" son figuras dibujadas en temas.css.
  const TEMAS = [
    {
      id: "anio-nuevo", nombre: "Año nuevo", estilo: "sutil", fechas: cadaAnio("01-01", "01-07"),
      icono: "fa-champagne-glasses",
      mensaje: () => "¡Feliz año nuevo! Inicia el periodo de la nueva Junta Directiva."
    },
    {
      id: "8m", nombre: "8 de marzo", estilo: "sutil", fechas: cadaAnio("03-08"),
      icono: "fa-venus",
      mensaje: () => "8 de marzo, Día Internacional de la Mujer."
    },
    {
      id: "semana-carrera", nombre: "Semana de la Carrera (Día de π)", estilo: "festivo", fechas: semanaDePi,
      texto: "π",
      mensaje: fecha => fecha.endsWith("-03-14")
        ? "¡Feliz Día de π! Semana de la Carrera: «La constante de Arquímedes»."
        : "Semana de la Carrera: «La constante de Arquímedes».",
      particulas: { tipo: "texto", valores: ["π", "π", "π", "3,1416", "22/7", "π"], movimiento: "subir" }
    },
    {
      id: "orgullo", nombre: "Mes del Orgullo", estilo: "sutil", fechas: cadaAnio("06-01", "06-30"),
      icono: "fa-rainbow",
      mensaje: () => "Junio, mes del Orgullo LGBTIQ+. En AEMATEC cabemos todas las personas."
    },
    {
      id: "dia-padre", nombre: "Día del Padre", estilo: "sutil", fechas: diaDelPadre,
      icono: "fa-heart",
      mensaje: () => "¡Feliz Día del Padre!"
    },
    {
      id: "dia-madre", nombre: "Día de la Madre", estilo: "sutil", fechas: cadaAnio("08-15"),
      icono: "fa-heart",
      mensaje: () => "¡Feliz Día de la Madre!"
    },
    {
      id: "mes-patrio", nombre: "Mes patrio", estilo: "festivo", fechas: cadaAnio("09-01", "09-30"),
      icono: "fa-flag",
      mensaje: fecha => fecha.endsWith("-09-15")
        ? "¡Feliz Día de la Independencia de Costa Rica!"
        : "Setiembre, mes de la patria.",
      particulas: { tipo: "confeti", movimiento: "caer" }
    },
    {
      id: "faroles", nombre: "Noche de faroles (14 de setiembre)", estilo: "festivo", fechas: cadaAnio("09-14"),
      icono: "fa-lightbulb",
      mensaje: () => "14 de setiembre: ¡noche de faroles!",
      particulas: { tipo: "farol", movimiento: "subir" }
    },
    {
      id: "halloween", nombre: "Halloween", estilo: "festivo", fechas: cadaAnio("10-24", "10-31"),
      icono: "fa-ghost",
      mensaje: fecha => fecha.endsWith("-10-31") ? "¡Feliz Halloween!" : "Se acerca Halloween.",
      particulas: { tipo: "icono", valores: ["fa-ghost", "fa-spider", "fa-hat-wizard"], movimiento: "caer" }
    },
    {
      id: "dia-docente", nombre: "Día del Docente Costarricense", estilo: "sutil", fechas: cadaAnio("11-22"),
      icono: "fa-chalkboard-user",
      mensaje: () => "22 de noviembre, Día del Docente Costarricense. ¡Gracias a quienes enseñan!"
    },
    {
      id: "navidad", nombre: "Navidad", estilo: "festivo", fechas: cadaAnio("12-01", "12-31"),
      icono: "fa-tree",
      mensaje: fecha => fecha >= fecha.slice(0, 5) + "12-24" && fecha <= fecha.slice(0, 5) + "12-25"
        ? "¡Feliz Navidad!"
        : fecha.endsWith("-12-31") ? "¡Feliz fin de año!" : "¡Felices fiestas!",
      particulas: { tipo: "icono", valores: ["fa-snowflake", "fa-snowflake", "fa-star"], movimiento: "caer" }
    }
  ];

  const hoyEnCostaRica = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());

  const duracion = ([desde, hasta]) => Date.parse(hasta) - Date.parse(desde);

  // El tema que corresponde a una fecha ("AAAA-MM-DD"), o null. Si hay varios, el de rango más corto.
  function temaDeFecha(fecha) {
    const anio = Number(fecha.slice(0, 4));
    const candidatos = TEMAS
      .map((tema, orden) => ({ tema, orden, rango: tema.fechas(anio) }))
      .filter(({ rango }) => rango[0] <= fecha && fecha <= rango[1])
      .sort((a, b) => duracion(a.rango) - duracion(b.rango) || a.orden - b.orden);
    return candidatos.length ? candidatos[0].tema : null;
  }

  // Aplica la decisión de la Junta (config/tema) sobre el tema automático.
  // config: { modo: "auto" | "apagado" | "<id de tema>", hasta?: "AAAA-MM-DD" }
  function temaConConfig(fecha, config) {
    const automatico = temaDeFecha(fecha);
    if (!config || !config.modo || config.modo === "auto") return automatico;
    if (config.hasta && fecha > config.hasta) return automatico; // la decisión ya venció
    if (config.modo === "apagado") return null;
    return TEMAS.find(tema => tema.id === config.modo) || automatico;
  }

  const api = { TEMAS, temaDeFecha, temaConConfig, hoyEnCostaRica };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; } // pruebas en Node
  window.aematecTemas = api;

  // ---------- En el navegador ----------
  const memoria = (almacen, clave, valor) => {
    try {
      if (valor === undefined) return window[almacen].getItem(clave);
      window[almacen].setItem(clave, valor);
    } catch { /* Navegación privada o almacenamiento bloqueado: se sigue sin recordar. */ }
    return null;
  };

  // Lee config/tema con la API REST de Firestore (lectura pública, sin cargar el SDK en todas las páginas).
  // Se guarda 10 minutos en la pestaña para no leerlo en cada página.
  async function leerConfig() {
    const guardada = JSON.parse(memoria("sessionStorage", "aematec-tema-config") || "null");
    if (guardada && Date.now() - guardada.leida < 10 * 60 * 1000) return guardada.config;
    const proyecto = (window.AEMATEC_FIREBASE_CONFIG || {}).projectId || "biblioteca-aematec";
    let config = null;
    try {
      const respuesta = await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents/config/tema`);
      if (respuesta.ok) {
        const { fields = {} } = await respuesta.json();
        config = { modo: fields.modo?.stringValue || "auto", hasta: fields.hasta?.stringValue || "" };
      }
    } catch { /* Sin conexión: se usa el tema automático. */ }
    memoria("sessionStorage", "aematec-tema-config", JSON.stringify({ config, leida: Date.now() }));
    return config;
  }

  let aplicado = null;

  function quitarTema() {
    document.documentElement.removeAttribute("data-tema");
    document.documentElement.removeAttribute("data-tema-estilo");
    document.querySelectorAll(".tema-aviso, .tema-particulas").forEach(el => el.remove());
    aplicado = null;
  }

  function cargarEstilos() {
    if (document.querySelector('link[href="assets/css/temas.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "assets/css/temas.css";
    document.head.appendChild(link);
  }

  function aplicarTema(tema, fecha, { vistaPrevia = false } = {}) {
    if (aplicado === tema) return;
    quitarTema();
    if (!tema) return;
    aplicado = tema;
    cargarEstilos();
    document.documentElement.dataset.tema = tema.id;
    document.documentElement.dataset.temaEstilo = tema.estilo;

    const clave = `${tema.id}-${fecha.slice(0, 4)}`;
    const sinAnimacion = memoria("localStorage", `aematec-tema-sin-animacion-${clave}`) === "1";
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animar = tema.estilo === "festivo" && tema.particulas && !sinAnimacion && !reducirMovimiento;

    if (vistaPrevia || !memoria("sessionStorage", `aematec-tema-aviso-${clave}`)) {
      memoria("sessionStorage", `aematec-tema-aviso-${clave}`, "1");
      mostrarAviso(tema, fecha, { animar, clave, vistaPrevia });
    }
    if (animar) lanzarParticulas(tema.particulas);
  }

  function mostrarAviso(tema, fecha, { animar, clave, vistaPrevia }) {
    const aviso = document.createElement("div");
    aviso.className = "tema-aviso";
    aviso.setAttribute("role", "status");
    const icono = tema.texto
      ? `<span class="tema-aviso__icono tema-aviso__icono--texto" aria-hidden="true">${tema.texto}</span>`
      : `<i class="tema-aviso__icono fa-solid ${tema.icono}" aria-hidden="true"></i>`;
    aviso.innerHTML = `${icono}<p class="tema-aviso__texto"></p>
      <div class="tema-aviso__acciones">
        ${animar ? '<button type="button" class="tema-aviso__detener">Detener animación</button>' : ""}
        <button type="button" class="tema-aviso__cerrar" aria-label="Cerrar aviso"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>`;
    aviso.querySelector(".tema-aviso__texto").textContent =
      (vistaPrevia ? "Vista previa · " : "") + tema.mensaje(fecha);
    const cerrar = () => aviso.remove();
    aviso.querySelector(".tema-aviso__cerrar").addEventListener("click", cerrar);
    aviso.querySelector(".tema-aviso__detener")?.addEventListener("click", () => {
      memoria("localStorage", `aematec-tema-sin-animacion-${clave}`, "1");
      document.querySelector(".tema-particulas")?.remove();
      cerrar();
    });
    document.body.appendChild(aviso);
    // Se oculta solo después de unos segundos, salvo que la persona lo esté usando.
    let temporizador = setTimeout(cerrar, 12000);
    const pausar = () => clearTimeout(temporizador);
    const reanudar = () => { temporizador = setTimeout(cerrar, 6000); };
    aviso.addEventListener("mouseenter", pausar);
    aviso.addEventListener("focusin", pausar);
    aviso.addEventListener("mouseleave", reanudar);
  }

  // Animación corta (unos 20 segundos) que no tapa nada: no recibe clics y es solo decorativa.
  function lanzarParticulas({ tipo, valores = [], movimiento }) {
    const capa = document.createElement("div");
    capa.className = `tema-particulas tema-particulas--${movimiento}`;
    capa.setAttribute("aria-hidden", "true");
    const cantidad = window.innerWidth < 640 ? 9 : 16;
    let maximo = 0;
    for (let i = 0; i < cantidad; i++) {
      const p = document.createElement("span");
      p.className = `tema-particula tema-particula--${tipo}`;
      if (tipo === "icono") p.innerHTML = `<i class="fa-solid ${valores[i % valores.length]}"></i>`;
      else if (tipo === "texto") p.textContent = valores[i % valores.length];
      const duracionSeg = 9 + Math.random() * 7;
      const retraso = Math.random() * 6;
      maximo = Math.max(maximo, duracionSeg + retraso);
      p.style.left = `${(i + Math.random()) * (100 / cantidad)}%`;
      p.style.animationDuration = `${duracionSeg}s`;
      p.style.animationDelay = `${retraso}s`;
      p.style.setProperty("--tamano", `${0.8 + Math.random() * 0.9}`);
      p.style.setProperty("--vaiven", `${Math.round((Math.random() - 0.5) * 80)}px`);
      p.dataset.variante = String(i % 3);
      capa.appendChild(p);
    }
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), (maximo + 1) * 1000);
  }

  async function iniciar() {
    const fecha = hoyEnCostaRica();
    const pedido = new URLSearchParams(window.location.search).get("tema");
    if (pedido) {
      const tema = TEMAS.find(t => t.id === pedido) || null;
      return aplicarTema(tema, tema ? (tema.fechas(Number(fecha.slice(0, 4)))[0]) : fecha, { vistaPrevia: Boolean(tema) });
    }
    // Se espera la decisión de la Junta (máximo 1,5 s) para no mostrar un tema que ella apagó.
    const config = await Promise.race([leerConfig(), new Promise(listo => setTimeout(listo, 1500, null))]);
    aplicarTema(temaConConfig(fecha, config), fecha);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
  document.dispatchEvent(new Event("aematec:temas"));
})();
