// Quién tiene qué permisos en la interfaz. OJO: esto solo decide qué se muestra;
// los permisos reales los aplican firestore.rules y storage.rules.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Personas con acceso total al sitio. Si cambian (traspaso de Junta, RI Art. 107), actualízalas
// también en firestore.rules, storage.rules y functions/index.js (ver skill traspaso-de-junta).
export const OWNER_EMAILS = ["angeloyeshuac@gmail.com", "angcalderon@estudiantec.cr"];

export const esDueno = email => OWNER_EMAILS.includes(String(email || "").trim().toLowerCase());

// ¿La cuenta pertenece a la lista `coleccion` ("junta", "moderators" o "fiscalia")?
// Igual que en las reglas: los dueños siempre sí; el resto necesita el correo verificado.
export async function tieneRol(user, coleccion) {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  if (esDueno(email)) return true;
  if (!user.emailVerified) return false;
  try {
    return (await getDoc(doc(db, coleccion, email))).exists();
  } catch {
    return false;
  }
}
