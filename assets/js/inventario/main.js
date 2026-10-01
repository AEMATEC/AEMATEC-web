// Inventario (inventario.html): arranque de la página. La lógica está en los módulos de esta carpeta:
// publico.js (consulta), prestamos.js (solicitudes de préstamo) y admin.js (administración de la Junta).
import { tieneRol } from "../roles.js";
import { accederConRol } from "../acceso.js";
import { browserSessionPersistence, onAuthStateChanged, setPersistence, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, inv, showModal, hideModal } from "./estado.js";
import { loadInventory, renderGrid } from "./publico.js";
import { loadSolicitudes, updateLoanBadge } from "./prestamos.js";
import "./admin.js";

setPersistence(auth, browserSessionPersistence);
document.querySelector("#junta-access-btn").addEventListener("click", () => {
  document.querySelector("#junta-login-status").hidden = true;
  document.querySelector("#junta-login-form").reset();
  showModal(document.querySelector("#junta-login-modal"));
});
document.querySelector("#junta-login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#junta-login-status");
  status.hidden = true;
  const email = document.querySelector("#junta-email").value.trim();
  const password = document.querySelector("#junta-password").value;
  // Solo se acepta el inicio de sesión si el correo autenticado en Firebase es de Junta Directiva
  // y, para cuentas autocreadas, si ya verificó su correo.
  const resultado = await accederConRol(auth, email, password, ["junta"], "Este correo no pertenece a la Junta Directiva.");
  if (resultado.ok) {
    hideModal(document.querySelector("#junta-login-modal"));
  } else {
    status.hidden = false;
    status.textContent = resultado.mensaje;
  }
});
document.querySelector("#junta-logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  inv.isJunta = await tieneRol(user, "junta");
  document.querySelector("#junta-access-btn").hidden = !!user;
  document.querySelector("#junta-session-bar").hidden = !user;
  if (user) document.querySelector("#junta-session-email").textContent = user.email;
  if (inv.isJunta) {
    await loadSolicitudes();
  } else {
    inv.solicitudes = [];
    updateLoanBadge();
  }
  renderGrid();
});

loadInventory();
