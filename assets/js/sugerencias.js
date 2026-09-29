// Lista de sugerencias con el estilo del sitio, para campos de texto (reemplaza a <datalist>,
// que cada navegador dibuja distinto y no se puede estilizar). Estilos: .sugerencias en assets/css/site.css.
//
// Uso:
//   conectarSugerencias(input, () => ["Cálculo", "Geometría"]);                 // un valor
//   conectarSugerencias(input, () => [...], { multiple: true, maximo: 3 });      // varios, separados por coma
// La persona puede escribir un valor que no esté en la lista. Teclado: ↑ ↓ para moverse, Enter para
// elegir, Esc para cerrar. Las opciones se insertan con textContent (nunca como HTML).

let contador = 0;
const clave = texto => String(texto ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function conectarSugerencias(input, obtenerOpciones, { multiple = false, maximo = Infinity } = {}) {
  if (!input || input.dataset.sugerenciasListas) return;
  input.dataset.sugerenciasListas = "1";
  contador += 1;
  const idLista = `sugerencias-${contador}`;

  const envoltura = document.createElement("div");
  envoltura.className = "sugerencias";
  input.replaceWith(envoltura);
  envoltura.append(input);
  const lista = document.createElement("ul");
  lista.className = "sugerencias__lista";
  lista.id = idLista;
  lista.setAttribute("role", "listbox");
  lista.hidden = true;
  envoltura.append(lista);

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", idLista);
  input.setAttribute("autocomplete", "off");

  let visibles = [];
  let activa = -1;

  const partes = () => input.value.split(",");
  const textoBuscado = () => (multiple ? partes().at(-1) : input.value).trim();
  const yaElegidas = () => multiple ? partes().slice(0, -1).map(clave).filter(Boolean) : [];

  function cerrar() {
    lista.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activa = -1;
  }

  function marcar(indice) {
    activa = indice;
    [...lista.children].forEach((opcion, i) => opcion.setAttribute("aria-selected", String(i === indice)));
    const elegida = lista.children[indice];
    if (elegida) {
      input.setAttribute("aria-activedescendant", elegida.id);
      elegida.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function abrir() {
    const buscado = clave(textoBuscado());
    const excluir = yaElegidas();
    if (multiple && excluir.length >= maximo) { cerrar(); return; }
    const unicas = [...new Map((obtenerOpciones() || []).map(valor => [clave(valor), String(valor).trim()])).values()]
      .filter(valor => valor && !excluir.includes(clave(valor)));
    visibles = unicas
      .filter(valor => !buscado || clave(valor).includes(buscado))
      .sort((a, b) => {
        // Primero las que empiezan con lo escrito; luego en orden alfabético.
        const inicioA = clave(a).startsWith(buscado) ? 0 : 1;
        const inicioB = clave(b).startsWith(buscado) ? 0 : 1;
        return inicioA - inicioB || a.localeCompare(b, "es");
      });
    // Si lo escrito ya es exactamente la única opción, no hace falta mostrar la lista.
    if (!visibles.length || (visibles.length === 1 && clave(visibles[0]) === buscado)) { cerrar(); return; }
    lista.replaceChildren(...visibles.map((valor, i) => {
      const opcion = document.createElement("li");
      opcion.id = `${idLista}-${i}`;
      opcion.className = "sugerencias__opcion";
      opcion.setAttribute("role", "option");
      opcion.setAttribute("aria-selected", "false");
      opcion.textContent = valor;
      return opcion;
    }));
    lista.hidden = false;
    input.setAttribute("aria-expanded", "true");
    activa = -1;
  }

  function elegir(valor) {
    if (multiple) {
      const previas = partes().slice(0, -1).map(parte => parte.trim()).filter(Boolean);
      const todas = [...previas, valor];
      input.value = todas.join(", ") + (todas.length < maximo ? ", " : "");
    } else {
      input.value = valor;
    }
    cerrar();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    if (multiple) abrir();
  }

  input.addEventListener("focus", abrir);
  input.addEventListener("input", event => { if (event.isTrusted) abrir(); });
  input.addEventListener("blur", cerrar);
  input.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (lista.hidden) { abrir(); return; }
      const paso = event.key === "ArrowDown" ? 1 : -1;
      marcar((activa + paso + visibles.length) % visibles.length);
    } else if (event.key === "Enter" && !lista.hidden && activa >= 0) {
      event.preventDefault();
      elegir(visibles[activa]);
    } else if (event.key === "Escape" && !lista.hidden) {
      // Solo cierra la lista, no el modal que la contiene.
      event.stopPropagation();
      cerrar();
    }
  });
  // mousedown (y no click) para elegir antes de que el campo pierda el foco.
  lista.addEventListener("mousedown", event => {
    const opcion = event.target.closest(".sugerencias__opcion");
    if (!opcion) return;
    event.preventDefault();
    elegir(opcion.textContent);
  });
}
