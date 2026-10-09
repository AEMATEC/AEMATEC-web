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
      // Festivo desde octubre 2026 (pedido de la Junta): una marcha de mujeres cruza la pantalla con pancartas.
      id: "8m", nombre: "8 de marzo", estilo: "festivo", fechas: cadaAnio("03-08"),
      icono: "fa-venus",
      mensaje: () => "8 de marzo, Día Internacional de la Mujer. ¡Mujeres en marcha por la igualdad!",
      escena: "marcha"
    },
    {
      // 11 de abril: Juan Santamaría, héroe nacional (Batalla de Rivas, 1856). La escena lo muestra corriendo con
      // una antorcha hacia el mesón que se incendia.
      id: "juan-santamaria", nombre: "Día de Juan Santamaría (11 de abril)", estilo: "festivo", fechas: cadaAnio("04-11"),
      icono: "fa-fire",
      mensaje: () => "11 de abril, Día de Juan Santamaría: héroe nacional de la Batalla de Rivas (1856).",
      escena: "juan"
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
      particulas: { tipo: "bandera", movimiento: "caer" } // banderas de Costa Rica que ondean mientras caen
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
    if (!document.querySelector('link[href="assets/css/temas.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "assets/css/temas.css";
      document.head.appendChild(link);
    }
    // Tipografía de los textos de 8 bits (el Arcade ya la trae; el resto del sitio la pide solo cuando hay un tema).
    if (!document.querySelector('link[href*="Press+Start+2P"]')) {
      const fuente = document.createElement("link");
      fuente.rel = "stylesheet";
      fuente.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
      document.head.appendChild(fuente);
    }
  }

  // Los dibujos de 8 bits viven en assets/js/temas-pixel.js; se piden solo cuando hay un tema que mostrar.
  let pixelListo = null;
  function cargarPixel() {
    if (window.aematecPixel) return Promise.resolve();
    if (!pixelListo) {
      pixelListo = new Promise((ok, mal) => {
        const s = document.createElement("script");
        s.src = "assets/js/temas-pixel.js";
        s.onload = ok;
        s.onerror = mal;
        document.head.appendChild(s);
      });
    }
    return pixelListo;
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
    const animar = tema.estilo === "festivo" && (tema.particulas || tema.escena) && !sinAnimacion && !reducirMovimiento;

    cargarPixel().catch(() => null).then(() => {
      if (aplicado !== tema) return; // mientras tanto se cambió o quitó el tema
      if (vistaPrevia || !memoria("sessionStorage", `aematec-tema-aviso-${clave}`)) {
        memoria("sessionStorage", `aematec-tema-aviso-${clave}`, "1");
        mostrarAviso(tema, fecha, { animar, clave, vistaPrevia });
      }
      if (animar && window.aematecPixel) { if (tema.escena) lanzarEscena(tema.escena); else lanzarParticulas(tema.particulas); }
    });
  }

  function mostrarAviso(tema, fecha, { animar, clave, vistaPrevia }) {
    const aviso = document.createElement("div");
    aviso.className = "tema-aviso";
    aviso.setAttribute("role", "status");
    aviso.innerHTML = `<span class="tema-aviso__icono" aria-hidden="true"></span><p class="tema-aviso__texto"></p>
      <div class="tema-aviso__acciones">
        ${animar ? '<button type="button" class="tema-aviso__detener">Detener animación</button>' : ""}
        <button type="button" class="tema-aviso__cerrar" aria-label="Cerrar aviso"><span aria-hidden="true">✕</span></button>
      </div>`;
    if (window.aematecPixel) aviso.querySelector(".tema-aviso__icono").appendChild(window.aematecPixel.iconoDeTema(tema.id, 3));
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

  // ---------- Partículas de 8 bits ----------
  // Los catálogos nombran los íconos como Font Awesome ("fa-snowflake"); aquí se traducen al sprite de píxeles.
  const FA_A_SPRITE = { "fa-snowflake": "copo", "fa-star": "estrella", "fa-ghost": "fantasma", "fa-spider": "arana", "fa-hat-wizard": "sombrero" };

  // Animación corta (unos 20 segundos) que no tapa nada: no recibe clics y es solo decorativa.
  function lanzarParticulas({ tipo, valores = [], movimiento }) {
    const px = window.aematecPixel;
    const capa = document.createElement("div");
    capa.className = `tema-particulas tema-particulas--${movimiento}`;
    capa.setAttribute("aria-hidden", "true");
    const cantidad = window.innerWidth < 640 ? 14 : 24;
    let maximo = 0;
    for (let i = 0; i < cantidad; i++) {
      const p = document.createElement("span");
      p.className = `tema-particula tema-particula--${tipo}`;
      const valor = valores[i % (valores.length || 1)];
      const escala = [2, 3, 3, 4][i % 4], variante = i % 3;
      if (tipo === "icono") p.appendChild(px.elemento(FA_A_SPRITE[valor] || "estrella", { escala, variante }));
      else if (tipo === "texto") {
        if (valor === "π") p.appendChild(px.elemento("pi", { escala, variante }));
        else { const t = document.createElement("span"); t.className = "tema-pixel-texto"; t.textContent = valor; p.appendChild(t); }
      } else if (tipo === "farol") p.appendChild(px.elemento("farol", { escala, variante }));
      else if (tipo === "bandera") p.appendChild(px.elemento("bandera", { escala: escala === 4 ? 3 : 2, t: 0.16 }));
      const duracionSeg = 9 + Math.random() * 7;
      const retraso = Math.random() * 6;
      maximo = Math.max(maximo, duracionSeg + retraso);
      p.style.left = `${(i + Math.random()) * (100 / cantidad)}%`;
      p.style.animationDuration = `${duracionSeg}s`;
      p.style.animationDelay = `${retraso}s`;
      p.style.setProperty("--vaiven", `${Math.round((Math.random() - 0.5) * 80)}px`);
      p.dataset.variante = String(variante);
      capa.appendChild(p);
    }
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), (maximo + 1) * 1000);
  }

  // ---------- Escenas de 8 bits (temas festivos con "escena") ----------
  // Se arman con los sprites de temas-pixel.js y se mueven con steps() (a saltos, como una consola). Duran unos
  // 20 segundos, no reciben clics y se quitan solas (o con "Detener animación"), igual que las partículas.
  const sumaPx = (e, estilos) => Object.assign(e.style, estilos);

  // 8 de marzo: una marcha de mujeres cruza la parte de abajo de la pantalla con pancartas y el puño en alto.
  const MARCHA = [
    { pelo: "#2B1B12", piel: "#C68642", ropa: "#7B2D8E", estilo: 0, pancarta: ["IGUALDAD", "#FFFFFF", "#7B2D8E"], retraso: 0 },
    { pelo: "#6B3A1E", piel: "#F1C27D", ropa: "#2E9E6B", estilo: 2, retraso: 0.9 },
    { pelo: "#1B1B1B", piel: "#8D5524", ropa: "#C2185B", estilo: 1, pancarta: ["NI UNA MENOS", "#7B2D8E", "#FFFFFF"], retraso: 1.7 },
    { pelo: "#B5651D", piel: "#FFDBAC", ropa: "#9B59B6", estilo: 3, retraso: 2.6 },
    { pelo: "#3B2314", piel: "#E0AC69", ropa: "#2E9E6B", estilo: 0, pancarta: ["ELLAS TAMBIÉN CUENTAN", "#2E9E6B", "#FFFFFF"], retraso: 3.4 },
    { pelo: "#111111", piel: "#C68642", ropa: "#F4EDF7", estilo: 2, retraso: 4.3 },
    { pelo: "#4A2C17", piel: "#F1C27D", ropa: "#7B2D8E", estilo: 1, pancarta: ["MISMOS DERECHOS", "#FFFFFF", "#C2185B"], retraso: 5.1 },
    { pelo: "#1B1B1B", piel: "#8D5524", ropa: "#C2185B", estilo: 3, retraso: 5.6 }
  ];
  function escenaMarcha(capa) {
    const esc = window.innerWidth < 640 ? 2 : 3;
    capa.style.setProperty("--esc", esc);
    capa.style.height = `${30 * esc + 70}px`;
    MARCHA.forEach((m, i) => {
      const mujer = document.createElement("div");
      mujer.className = "marcha__mujer";
      mujer.style.setProperty("--retraso", `${m.retraso}s`);
      mujer.style.setProperty("--dur", `${12.5 + (i % 3) * 0.8}s`);
      if (m.pancarta) {
        const cartel = document.createElement("div");
        cartel.className = "marcha__pancarta";
        cartel.textContent = m.pancarta[0];
        sumaPx(cartel, { background: m.pancarta[1], color: m.pancarta[2], borderColor: m.pancarta[2] });
        mujer.appendChild(cartel);
      }
      mujer.appendChild(window.aematecPixel.elemento("mujer", { escala: esc, variante: m, t: 0.28 }));
      capa.appendChild(mujer);
    });
  }

  // 11 de abril: Juan Santamaría corre con la antorcha, la lanza al mesón y este se incendia (Batalla de Rivas, 1856).
  // Línea de tiempo (s): 0-5,6 corre · 5,6 lanza la antorcha · 6,8 empieza el fuego · 7,4 humo y brasas · 17,6 se desvanece.
  function escenaJuan(capa) {
    const px = window.aematecPixel;
    const vw = window.innerWidth, movil = vw < 640;
    const es = movil ? 3 : 4, eh = movil ? 2 : 3;               // escala del mesón y de Juan
    const suelo = 14, mesonW = 72 * es, mesonH = 54 * es;
    const xMeson = Math.round(vw * (movil ? 0.58 : 0.64)), heroW = 26 * eh, xHeroe = xMeson - heroW - 28;
    capa.style.height = `${mesonH + 110}px`;
    capa.style.animation = "juan-sale 1.8s steps(6) 17.6s forwards";
    capa.style.setProperty("--suelo", suelo + "px");
    const abs = (e, estilos) => { e.style.position = "absolute"; sumaPx(e, estilos); capa.appendChild(e); return e; };

    abs(document.createElement("div"), { left: 0, right: 0, bottom: 0, height: suelo + "px", background: "repeating-linear-gradient(90deg,#5B4630 0 12px,#6E5738 12px 24px)" });

    // mesón y sus llamas (cada una crece a saltos, una tras otra)
    const meson = abs(px.elemento("meson", { escala: es }), { left: xMeson + "px", bottom: suelo + "px" });
    const LLAMAS = [[0.40, 0.10, 5], [0.08, 0.38, 4], [0.70, 0.38, 4], [0.25, 0.55, 4], [0.52, 0.55, 4], [0.40, 0.66, 5], [0.04, 0.12, 3], [0.84, 0.12, 3], [0.30, 0.25, 3], [0.58, 0.25, 3]];
    LLAMAS.forEach(([fx, fy, e], i) => {
      const escala = movil ? Math.max(2, e - 1) : e;
      // El contenedor crece a saltos (juan__llama) y el dibujo de dentro cambia de cuadro: son dos animaciones distintas.
      const ll = abs(document.createElement("div"), { left: Math.round(xMeson + fx * mesonW - 6 * escala) + "px", bottom: Math.round(suelo + fy * mesonH) + "px" });
      ll.className = "juan__llama";
      ll.style.animationDelay = `${6.8 + i * 0.28}s`;
      ll.appendChild(px.elemento("llama", { escala, t: 0.17 }));
    });
    void meson;

    // humo y brasas
    for (let k = 0; k < 5; k++) {
      const h = abs(px.elemento("humo", { escala: movil ? 4 : 6 }), { left: Math.round(xMeson + mesonW * (0.2 + k * 0.1)) + "px", bottom: Math.round(suelo + mesonH * 0.8) + "px" });
      h.classList.add("juan__humo");
      h.style.animationDelay = `${7.4 + k * 1.1}s`;
    }
    for (let i = 0; i < 14; i++) {
      const b = abs(document.createElement("i"), { left: Math.round(xMeson + mesonW * (0.08 + i * 0.062)) + "px", bottom: Math.round(suelo + mesonH * 0.4) + "px" });
      b.className = "juan__brasa";
      b.style.setProperty("--i", i);
      b.style.animationDelay = `${7 + i * 0.37}s`;
    }

    // Juan: corre (2 cuadros), y al llegar lanza la antorcha (cuadro propio, sin antorcha)
    const heroe = abs(document.createElement("div"), { left: 0, bottom: suelo + "px" });
    heroe.className = "juan__heroe";
    heroe.appendChild(px.elemento("juan", { escala: eh, t: 0.17 }));
    const fuegoMano = px.elemento("llama", { escala: eh, t: 0.17 });
    sumaPx(fuegoMano, { position: "absolute", left: 13 * eh + "px", top: -13 * eh + "px" });
    heroe.appendChild(fuegoMano);
    heroe.animate([{ transform: "translateX(-190px)" }, { transform: `translateX(${xHeroe}px)` }], { duration: 5600, easing: "steps(56)", fill: "forwards" });
    setTimeout(() => {
      heroe.replaceChildren(px.elemento("juanLanza", { escala: eh }));
      const manoX = xHeroe + 19 * eh, manoY = suelo + 27 * eh;
      const antorcha = abs(document.createElement("div"), { left: manoX + "px", bottom: manoY + "px" });
      sumaPx(antorcha.appendChild(px.elemento("llama", { escala: eh, t: 0.17 })), { position: "absolute", left: -6 * eh + "px", bottom: 14 * eh + "px" });
      sumaPx(antorcha.appendChild(document.createElement("div")), { width: 2 * eh + "px", height: 14 * eh + "px", background: "#6B4A2B" });
      const dx = xMeson + mesonW * 0.42 - manoX, dy = manoY - (suelo + mesonH * 0.22);
      antorcha.animate([
        { transform: "translate(0,0)", easing: "steps(6)" },
        { transform: `translate(${dx * 0.5}px,${-70 * eh / 3}px)`, easing: "steps(6)" },
        { transform: `translate(${dx}px,${dy}px)` }
      ], { duration: 1000, fill: "forwards" });
      setTimeout(() => antorcha.remove(), 1000);
    }, 5600);
  }

  const ESCENAS = { marcha: { dibuja: escenaMarcha, segundos: 21 }, juan: { dibuja: escenaJuan, segundos: 20 } };

  function lanzarEscena(nombre) {
    const escena = ESCENAS[nombre];
    if (!escena) return;
    const capa = document.createElement("div");
    capa.className = `tema-particulas tema-escena tema-escena--${nombre}`;
    capa.setAttribute("aria-hidden", "true");
    escena.dibuja(capa);
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), escena.segundos * 1000);
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
