// Perfiles opcionales del Arcade AEMATEC: cuenta (usuario y contraseña, sin correo real), amigos
// (solicitud y aceptación) y récords ligados a la cuenta. Todo sobre el MISMO proyecto (arcade-matec)
// y la MISMA app/sesión de Firebase que ya usa core.js para jugar —a propósito, distinto del patrón de
// moderacion.js (que abre una segunda app aparte): aquí SÍ queremos reemplazar la sesión anónima actual
// por la cuenta real, para no perder los récords que esa persona ya tenía jugando sin cuenta.
//
// Cómo funciona sin correo real: Firebase Auth no tiene un login "solo usuario", así que se arma un
// correo falso interno (usuario + "@arcade.aematec.local") y se usa con las funciones normales de
// correo/contraseña. Ese correo falso nunca se muestra ni se envía a ningún lado.
//
// Registro = linkWithCredential sobre la sesión anónima actual: convierte esa sesión en una cuenta
// real CONSERVANDO el mismo uid. Como los puntajes ya se guardan por uid (leaderboards/{juego}/scores/
// {uid}), los récords que la persona ya tenía jugando sin cuenta pasan a ser automáticamente los de su
// cuenta nueva, sin mover nada a mano.
// Iniciar sesión en otro dispositivo SÍ cambia de uid (al de la cuenta real): los récords de ESE
// dispositivo, jugados sin cuenta, quedan atrás —igual que ya se explica hoy que sin conexión los
// récords quedan solo en el navegador (ver el título de #net en core.js).
//
// "Usuario único" sin Cloud Function: un documento en usuariosTomados con id = usuario en minúsculas
// solo se puede CREAR, nunca actualizar (lo cierran las reglas) — así un segundo registro con el mismo
// usuario choca solo porque el documento ya existe, sin que nadie tenga que contarlos ni compararlos.
import {
  onAuthStateChanged, signInAnonymously, signOut,
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, fs, auth, fbReady } from "./core.js";

const DOMINIO_FALSO = "@arcade.aematec.local";
const RE_USUARIO = /^[A-Za-z0-9_]{3,16}$/;
export const AVATARES = ['zorro', 'llama', 'erizo', 'nave', 'mina'];

const correoFalso = usuario => usuario.toLowerCase() + DOMINIO_FALSO;

function validarUsuario(usuario) {
  if (!RE_USUARIO.test(usuario)) return 'EL USUARIO DEBE TENER DE 3 A 16 LETRAS, NÚMEROS O GUION BAJO.';
  return null;
}
function validarContrasena(contrasena) {
  if (!contrasena || contrasena.length < 6) return 'LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES.';
  return null;
}

// Errores propios (no se reusa mensajeErrorAuth de assets/js/util.js: ahí los mensajes hablan de
// "correo", y aquí la persona nunca escribió uno de verdad).
export function mensajeErrorCuenta(e) {
  switch (e?.code) {
    case 'auth/email-already-in-use': return 'ESE USUARIO YA EXISTE. PRUEBA CON OTRO.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'USUARIO O CONTRASEÑA INCORRECTOS.';
    case 'auth/weak-password': return 'LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES.';
    case 'auth/too-many-requests': return 'DEMASIADOS INTENTOS SEGUIDOS. ESPERA UNOS MINUTOS.';
    case 'auth/network-request-failed': return 'NO HAY CONEXIÓN A INTERNET.';
    default: return 'NO SE PUDO COMPLETAR LA ACCIÓN. INTENTA DE NUEVO.';
  }
}

export function onCuenta(cb) {
  fbReady.then(ok => { if (ok) onAuthStateChanged(auth, u => cb(u && !u.isAnonymous ? u : null)); });
}

// Crea la cuenta (sobre la sesión anónima actual, ver arriba) y el perfil público. Si el usuario
// elegido ya estaba tomado, la transacción del perfil falla SIN deshacer la cuenta —a propósito: borrar
// la cuenta recién vinculada obligaría a crear una sesión anónima nueva, con un uid distinto, perdiendo
// los récords que la persona ya tenía. En vez de eso, si ya existe una cuenta real sin perfil (un intento
// anterior con un usuario tomado), este mismo intento reusa esa cuenta y solo prueba con el usuario nuevo.
export async function registrarCuenta(usuario, contrasena, descripcion, avatar) {
  const errU = validarUsuario(usuario); if (errU) throw new Error(errU);
  if (!AVATARES.includes(avatar)) avatar = AVATARES[0];
  descripcion = String(descripcion || '').slice(0, 140);
  const usuarioMin = usuario.toLowerCase();
  let uid;
  if (auth.currentUser.isAnonymous) {
    const errC = validarContrasena(contrasena); if (errC) throw new Error(errC);
    const cred = EmailAuthProvider.credential(correoFalso(usuario), contrasena);
    const res = await linkWithCredential(auth.currentUser, cred);
    uid = res.user.uid;
  } else {
    uid = auth.currentUser.uid;
  }
  try {
    await fs.runTransaction(db, async tx => {
      tx.set(fs.doc(db, 'usuariosTomados', usuarioMin), { uid });
      tx.set(fs.doc(db, 'perfiles', uid), {
        usuario, usuarioMin, descripcion, avatar, creado: fs.serverTimestamp(),
      });
    });
  } catch (e) {
    // Firestore da el mismo error ("permission-denied") tanto si el usuario ya está tomado (las reglas
    // no dejan "update" sobre un documento que ya existe) como si las reglas nuevas de este archivo
    // todavía no se publicaron en la consola — no hay forma de distinguirlos desde aquí.
    throw new Error('ESE USUARIO YA EXISTE, O TODAVÍA NO SE PUEDEN CREAR CUENTAS AQUÍ.');
  }
  return uid;
}

export async function iniciarSesion(usuario, contrasena) {
  const errU = validarUsuario(usuario); if (errU) throw new Error(errU);
  await signInWithEmailAndPassword(auth, correoFalso(usuario), contrasena);
}

export async function cerrarSesion() {
  await signOut(auth);
  await signInAnonymously(auth); // para poder seguir jugando sin cuenta
}

export async function cargarPerfil(uid) {
  const snap = await fs.getDoc(fs.doc(db, 'perfiles', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function guardarPerfil(descripcion, avatar) {
  const uid = auth.currentUser.uid;
  if (!AVATARES.includes(avatar)) throw new Error('AVATAR NO VÁLIDO.');
  await fs.updateDoc(fs.doc(db, 'perfiles', uid), { descripcion: String(descripcion || '').slice(0, 140), avatar });
}

export async function buscarUsuario(usuario) {
  const snap = await fs.getDoc(fs.doc(db, 'usuariosTomados', usuario.toLowerCase()));
  if (!snap.exists()) return null;
  return cargarPerfil(snap.data().uid);
}

export async function solicitudesRecibidas() {
  const uid = auth.currentUser.uid;
  const snap = await fs.getDocs(fs.collection(db, 'perfiles', uid, 'solicitudesRecibidas'));
  const salida = [];
  for (const d of snap.docs) {
    const perfil = await cargarPerfil(d.id);
    if (perfil) salida.push(perfil);
  }
  return salida;
}

export async function enviarSolicitud(uidDestino) {
  const uid = auth.currentUser.uid;
  if (uidDestino === uid) throw new Error('ESE ERES TÚ.');
  await fs.setDoc(fs.doc(db, 'perfiles', uidDestino, 'solicitudesRecibidas', uid), {
    de: uid, creado: fs.serverTimestamp(),
  });
}

export async function aceptarSolicitud(deUid) {
  const uid = auth.currentUser.uid;
  await fs.runTransaction(db, async tx => {
    tx.set(fs.doc(db, 'perfiles', uid, 'amigos', deUid), { desde: fs.serverTimestamp() });
    tx.set(fs.doc(db, 'perfiles', deUid, 'amigos', uid), { desde: fs.serverTimestamp() });
    tx.delete(fs.doc(db, 'perfiles', uid, 'solicitudesRecibidas', deUid));
  });
}

export async function rechazarSolicitud(deUid) {
  const uid = auth.currentUser.uid;
  await fs.deleteDoc(fs.doc(db, 'perfiles', uid, 'solicitudesRecibidas', deUid));
}

export async function amigos() {
  const uid = auth.currentUser.uid;
  const snap = await fs.getDocs(fs.collection(db, 'perfiles', uid, 'amigos'));
  const salida = [];
  for (const d of snap.docs) {
    const perfil = await cargarPerfil(d.id);
    if (perfil) salida.push(perfil);
  }
  return salida;
}

export async function quitarAmigo(otroUid) {
  const uid = auth.currentUser.uid;
  await Promise.all([
    fs.deleteDoc(fs.doc(db, 'perfiles', uid, 'amigos', otroUid)),
    fs.deleteDoc(fs.doc(db, 'perfiles', otroUid, 'amigos', uid)).catch(() => {}),
  ]);
}

// Lector genérico de una marca en una tabla de clasificación, para el panel "Records": arcade.html ya
// conoce la lista completa de juegos/variantes (algunas, como las pistas de Carreras, solo existen ahí),
// así que arma la lista de claves y usa este lector simple para cada una.
export async function recordDe(uid, key) {
  const snap = await fs.getDoc(fs.doc(db, 'leaderboards', key, 'scores', uid));
  return snap.exists() ? snap.data() : null;
}
