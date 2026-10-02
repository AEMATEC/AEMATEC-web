// Login de moderador para el "Creador de hoyos" de Golf. Es una cuenta de correo y contraseña **del
// propio proyecto `arcade-matec`**, separada de la cuenta anónima con la que todo el mundo juega — y
// separada también de las cuentas del sitio principal (no se reusa admin.html). Esto evita por completo
// necesitar una Cloud Function o una cuenta de servicio de Google Cloud: las reglas de `arcade-matec`
// (ver arcade-firebase/firestore.rules, función esModerador()) distinguen directo si la sesión actual
// inició con contraseña (moderador) o es anónima (cualquiera jugando), sin tocar ningún otro proyecto.
//
// Por qué una SEGUNDA app de Firebase, si es el mismo proyecto: la app de core.js ya tiene una sesión
// anónima abierta (la de jugar). Iniciar sesión con contraseña en esa MISMA instancia reemplazaría esa
// sesión anónima (y su UID, usado en salas y puntajes) por la del moderador. Con una segunda app con
// nombre propio, apuntando a la misma configuración pública de arcade-matec, las dos sesiones conviven:
// la persona sigue pudiendo jugar mientras modera.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mensajeErrorAuth } from "../util.js";
import { firebaseConfig } from "./core.js";

const NOMBRE_APP = "arcade-moderacion";
const app = getApps().find(a => a.name === NOMBRE_APP) || initializeApp(firebaseConfig, NOMBRE_APP);
const auth = getAuth(app);
export const dbMod = getFirestore(app);

export { mensajeErrorAuth };
export const moderadorActual = () => auth.currentUser;
export const onModerador = cb => onAuthStateChanged(auth, cb);
export const moderadorLogin = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const moderadorLogout = () => signOut(auth);
