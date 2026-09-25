// Tema del sitio: la Junta puede dejar los temas de temporada en automático, apagarlos o fijar uno
// (con fecha de fin opcional). Se guarda en config/tema, que las páginas leen sin iniciar sesión;
// solo la Junta puede escribirlo (firestore.rules, match /config). Catálogo y fechas: assets/js/temas.js.
import { db } from "../firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// temas.js lo carga layout.js; puede terminar de cargar después que este módulo.
const catalogo = () => window.aematecTemas
  ? Promise.resolve(window.aematecTemas)
  : new Promise(listo => document.addEventListener("aematec:temas", () => listo(window.aematecTemas), { once: true }));

const formatoFecha = texto => new Date(`${texto}T12:00:00`).toLocaleDateString("es-CR", { day: "numeric", month: "long" });

export async function iniciarTema() {
  const { TEMAS, temaDeFecha, temaConConfig, hoyEnCostaRica } = await catalogo();
  const hoy = hoyEnCostaRica();
  const anio = Number(hoy.slice(0, 4));
  const modo = document.querySelector("#tema-modo");
  const hasta = document.querySelector("#tema-hasta");
  const estado = document.querySelector("#tema-estado");
  const actual = document.querySelector("#tema-actual");

  modo.innerHTML = '<option value="auto">Automático según la fecha</option><option value="apagado">Apagado (sin temas)</option>' +
    TEMAS.map(tema => `<option value="${tema.id}">Fijar: ${tema.nombre}</option>`).join("");

  document.querySelector("#tema-lista").innerHTML = TEMAS.map(tema => {
    const [desde, fin] = tema.fechas(anio);
    const fechas = desde === fin ? formatoFecha(desde) : `${formatoFecha(desde)} al ${formatoFecha(fin)}`;
    return `<li class="flex flex-wrap items-center justify-between gap-2 py-3">
      <span><strong class="font-sans text-sm">${tema.nombre}</strong>
        <span class="ml-2 rounded-full bg-[#EEF4F6] px-2 py-0.5 font-sans text-[11px] font-bold text-[#405769]">${tema.estilo}</span>
        <span class="block text-sm text-[#607480]">${fechas} de ${anio}</span></span>
      <a href="index.html?tema=${tema.id}" target="_blank" rel="noopener" class="font-sans text-xs font-bold text-[#087F8C] underline">Vista previa</a>
    </li>`;
  }).join("");

  const mostrarActual = config => {
    const tema = temaConConfig(hoy, config);
    const automatico = temaDeFecha(hoy);
    actual.textContent = tema
      ? `Hoy se muestra: ${tema.nombre}.`
      : automatico ? `Hoy no se muestra ningún tema (le correspondía ${automatico.nombre}).` : "Hoy no corresponde ningún tema.";
  };

  const guardado = (await getDoc(doc(db, "config", "tema"))).data() || { modo: "auto" };
  modo.value = TEMAS.some(t => t.id === guardado.modo) || guardado.modo === "apagado" ? guardado.modo : "auto";
  hasta.value = guardado.hasta || "";
  mostrarActual(guardado);

  const actualizarHasta = () => { hasta.disabled = modo.value === "auto"; if (hasta.disabled) hasta.value = ""; };
  modo.addEventListener("change", actualizarHasta);
  actualizarHasta();

  document.querySelector("#tema-form").addEventListener("submit", async event => {
    event.preventDefault();
    const config = { modo: modo.value, hasta: modo.value === "auto" ? "" : hasta.value };
    try {
      await setDoc(doc(db, "config", "tema"), { ...config, actualizadoEn: serverTimestamp() });
      try { sessionStorage.removeItem("aematec-tema-config"); } catch { /* sin almacenamiento */ }
      mostrarActual(config);
      estado.textContent = "Guardado. Las páginas lo aplican en unos minutos (o al recargar en una pestaña nueva).";
      estado.className = "mt-3 text-sm text-[#087F8C]";
    } catch {
      estado.textContent = "No se pudo guardar. Solo la Junta Directiva puede cambiar el tema.";
      estado.className = "mt-3 text-sm text-[#C2413B]";
    }
    estado.hidden = false;
  });
}
