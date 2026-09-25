// Panel de administración (admin.html): un solo acceso para Junta, Fiscalía y moderación.
// Cada persona ve las secciones de sus roles. Los permisos reales los aplican firestore.rules y storage.rules.
import { app } from "../firebase.js";
import { tieneRol } from "../roles.js";
import {
  browserSessionPersistence, getAuth, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { iniciarModeracion } from "./moderacion.js";
import { iniciarAsociacion } from "./asociacion.js";

const auth = getAuth(app);
// Sesión solo mientras la pestaña esté abierta: el panel muestra datos personales (padrón).
await setPersistence(auth, browserSessionPersistence);

const loginPanel = document.querySelector("#login-panel");
const adminPanel = document.querySelector("#admin-panel");

document.querySelector("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#login-status");
  status.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, document.querySelector("#email").value.trim(), document.querySelector("#password").value);
  } catch (error) {
    status.textContent = "No se pudo iniciar sesión. Verifica el correo y la contraseña.";
    status.hidden = false;
  }
});

document.querySelector("#logout").addEventListener("click", () => signOut(auth));

function showLoginMode(mode) {
  document.querySelector("#login-form").hidden = mode !== "login";
  document.querySelector("#login-links").hidden = mode !== "login";
  document.querySelector("#signup-form").hidden = mode !== "signup";
  document.querySelector("#reset-form").hidden = mode !== "reset";
}
document.querySelector("#show-signup-link").addEventListener("click", event => { event.preventDefault(); showLoginMode("signup"); });
document.querySelector("#show-reset-link").addEventListener("click", event => { event.preventDefault(); showLoginMode("reset"); });
document.querySelector("#back-to-login-from-signup").addEventListener("click", event => { event.preventDefault(); showLoginMode("login"); });
document.querySelector("#back-to-login-from-reset").addEventListener("click", event => { event.preventDefault(); showLoginMode("login"); });

document.querySelector("#signup-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#signup-status");
  status.hidden = true;
  const email = document.querySelector("#signup-email").value.trim().toLowerCase();
  const password = document.querySelector("#signup-password").value;
  const confirmPassword = document.querySelector("#signup-password-confirm").value;
  if (password !== confirmPassword) {
    status.textContent = "Las contraseñas no coinciden.";
    status.className = "text-sm text-[#C2413B]";
    status.hidden = false;
    return;
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credential.user);
    await signOut(auth);
    document.querySelector("#signup-form").reset();
    status.textContent = `Cuenta creada. Revisa ${email} y confirma el enlace de verificación antes de iniciar sesión.`;
    status.className = "text-sm text-[#087F8C]";
    status.hidden = false;
  } catch (error) {
    status.textContent = error.code === "auth/email-already-in-use"
      ? "Ya existe una cuenta con este correo. Usa '¿Olvidaste tu contraseña?' si no la recuerdas."
      : error.code === "auth/weak-password"
        ? "La contraseña debe tener al menos 6 caracteres."
        : `No se pudo crear la cuenta: ${error.message}`;
    status.className = "text-sm text-[#C2413B]";
    status.hidden = false;
  }
});

document.querySelector("#reset-form").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.querySelector("#reset-status");
  const email = document.querySelector("#reset-email").value.trim().toLowerCase();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch { /* Se ignora para no revelar si el correo tiene cuenta registrada. */ }
  document.querySelector("#reset-form").reset();
  status.textContent = "Si el correo tiene una cuenta registrada, recibirás un enlace para restablecer la contraseña.";
  status.className = "text-sm text-[#087F8C]";
  status.hidden = false;
});

const SECCIONES = [
  { id: "asociacion", etiqueta: "Asociación", icono: "fa-users" },
  { id: "moderacion", etiqueta: "Moderación del Repositorio", icono: "fa-user-shield" }
];

onAuthStateChanged(auth, async user => {
  const [moderador, junta, fiscalia] = await Promise.all([
    tieneRol(user, "moderators"), tieneRol(user, "junta"), tieneRol(user, "fiscalia")
  ]);
  const allowed = moderador || junta || fiscalia;
  loginPanel.hidden = allowed;
  adminPanel.hidden = !allowed;
  if (allowed) {
    showLoginMode("login");
    const roles = [junta && "Junta Directiva", fiscalia && "Fiscalía", moderador && "Moderación"].filter(Boolean);
    document.querySelector("#admin-session").textContent = `${user.email} · ${roles.join(" · ")}`;
    const visibles = { asociacion: junta || fiscalia, moderacion: moderador };
    for (const seccion of SECCIONES) document.querySelector(`#${seccion.id}`).hidden = !visibles[seccion.id];
    // Los accesos directos solo tienen sentido si la cuenta ve más de una sección.
    document.querySelector("#admin-nav").hidden = SECCIONES.filter(seccion => visibles[seccion.id]).length < 2;
    document.querySelector("#admin-nav").innerHTML = SECCIONES.filter(seccion => visibles[seccion.id]).map(seccion =>
      `<a href="#${seccion.id}" class="flex items-center gap-2 rounded-full border border-[#BFD0D8] bg-white px-4 py-2 text-[#0D2B45] hover:border-[#00A6B8] hover:text-[#00A6B8]"><i class="fa-solid ${seccion.icono}"></i>${seccion.etiqueta}</a>`
    ).join("");
    if (junta || fiscalia) await iniciarAsociacion({ junta });
    if (moderador) {
      iniciarModeracion();
      if (new URLSearchParams(window.location.search).has("edit")) document.querySelector("#moderacion").scrollIntoView();
    }
  } else if (user) {
    document.querySelector("#login-status").textContent = user.emailVerified
      ? "Esta cuenta no tiene permisos de administración (Junta, Fiscalía o moderación)."
      : "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
    document.querySelector("#login-status").hidden = false;
    await signOut(auth);
  }
});
