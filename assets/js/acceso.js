// Inicio de sesión con correo y contraseña para quien administra el sitio (Junta, Fiscalía, moderación).
// Lo usan el panel (admin/panel.js) y el modal de la Junta del Inventario. OJO: esto solo decide qué se
// muestra; los permisos reales los aplican firestore.rules y storage.rules.
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { tieneRol } from "./roles.js";
import { mensajeErrorAuth } from "./util.js";

// Inicia sesión. Devuelve { user } si funcionó o { mensaje } (en español) si falló.
export async function iniciarSesion(auth, email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user };
  } catch (error) {
    return { mensaje: mensajeErrorAuth(error) };
  }
}

// ¿La cuenta tiene al menos uno de los roles ("junta", "moderators", "fiscalia")?
export async function tieneAlgunRol(user, roles) {
  const resultados = await Promise.all(roles.map(rol => tieneRol(user, rol)));
  return resultados.some(Boolean);
}

// Mensaje para una cuenta que inició sesión pero no tiene el rol. Las cuentas nuevas necesitan el correo
// verificado, así que se le dice eso primero. No se consulta la colección `junta` para distinguir los casos:
// esa lectura ya no es pública (firestore.rules).
export const mensajeSinAcceso = (user, sinPermiso) => user?.emailVerified
  ? sinPermiso
  : "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";

// Inicia sesión y exige uno de los roles; si no lo tiene, cierra la sesión.
// Devuelve { ok: true, user } o { ok: false, mensaje }.
export async function accederConRol(auth, email, password, roles, sinPermiso) {
  const sesion = await iniciarSesion(auth, email, password);
  if (!sesion.user) return { ok: false, mensaje: sesion.mensaje };
  let tieneRolPedido = false, fallo = false;
  try {
    tieneRolPedido = await tieneAlgunRol(sesion.user, roles);
  } catch {
    fallo = true;
  }
  if (tieneRolPedido) return { ok: true, user: sesion.user };
  // Sin el rol (o si no se pudo comprobar), la sesión no queda abierta.
  await signOut(auth);
  return { ok: false, mensaje: fallo ? "No se pudo comprobar tu acceso. Intenta de nuevo en unos minutos." : mensajeSinAcceso(sesion.user, sinPermiso) };
}
