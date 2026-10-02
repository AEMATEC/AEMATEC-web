// Login de moderador para el "Creador de hoyos" de Golf. Reusa la MISMA cuenta de correo y contraseña
// del panel de administración del sitio principal (admin.html) — no es una cuenta nueva del Arcade.
// El Arcade sigue sin cuentas propias: esto es una SEGUNDA app de Firebase, aparte de la de
// assets/js/arcade/core.js (que sigue siendo anónima, para jugar), apuntando al proyecto del sitio
// (biblioteca-aematec) solo para que la persona pruebe quién es. Quien de verdad decide si puede votar
// o borrar algo es la Cloud Function (functions/arcadeModeracion.js) — aquí no se revisa ningún rol,
// porque hacerlo solo cambiaría qué se muestra, nunca lo que de verdad se puede hacer (ver AGENTS.md).
//
// No se puede usar assets/js/firebase.js/roles.js tal cual: esos inicializan la app de Firebase SIN
// nombre ("[DEFAULT]"), y core.js ya usa ese nombre para arcade-matec — inicializarla dos veces con
// configuraciones distintas da error. Por eso esta app lleva un nombre propio.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { mensajeErrorAuth } from "../util.js";

const NOMBRE_APP = "arcade-moderacion";
const app = getApps().find(a => a.name === NOMBRE_APP)
  || initializeApp(window.AEMATEC_FIREBASE_CONFIG, NOMBRE_APP);
const auth = getAuth(app);
const functions = getFunctions(app);

export { mensajeErrorAuth };
export const moderadorActual = () => auth.currentUser;
export const onModerador = cb => onAuthStateChanged(auth, cb);
export const moderadorLogin = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const moderadorLogout = () => signOut(auth);

export async function votarPropuesta(id, voto) {
  const { data } = await httpsCallable(functions, "arcadeVotarPropuesta")({ id, voto });
  return data;
}
export async function borrarRegistro(tipo, id, juego) {
  const { data } = await httpsCallable(functions, "arcadeBorrarRegistro")({ tipo, id, juego });
  return data;
}
