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
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword, updatePassword,
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
    case 'auth/requires-recent-login': return 'PASÓ DEMASIADO TIEMPO. RECARGA LA PÁGINA E INTENTA DE NUEVO.';
    default: return 'NO SE PUDO COMPLETAR LA ACCIÓN. INTENTA DE NUEVO.';
  }
}

export function onCuenta(cb) {
  fbReady.then(ok => { if (ok) onAuthStateChanged(auth, u => cb(u && !u.isAnonymous ? u : null)); });
}

// Crea la cuenta (sobre la sesión anónima actual, ver arriba) y el perfil público. OJO: linkWithCredential
// convierte la sesión anónima EN SITIO (mismo objeto de usuario, mismo uid) y Firebase Auth no vuelve a
// avisar a onCuenta()/onAuthStateChanged cuando pasa esto —sí avisa con signOut/signInAnonymously/
// signInWithEmailAndPassword, porque ahí sí hay una sesión nueva de verdad—, así que quien llama a esta
// función debe actualizar la pantalla a mano con el uid que devuelve, no esperar a que onCuenta() reaccione
// solo.
//
// Si el usuario ya existe de verdad, Firebase Auth rechaza el propio linkWithCredential
// ("auth/email-already-in-use") SIN tocar la sesión anónima — no hay nada que deshacer. El caso raro que sí
// hay que cuidar es otro: que linkWithCredential funcione bien pero la escritura en Firestore falle por algo
// ajeno al usuario (una falla pasajera, o estas reglas todavía sin publicar) — ahí la sesión queda "a
// medias": ya no es anónima, pero no tiene perfil. Un reintento entonces NO puede cambiar el correo de esa
// cuenta a uno nuevo (Firebase exige verificarlo antes, y estos correos son falsos, no se puede verificar
// nada) — así que sigue el registro con el USUARIO YA VINCULADO (el que corresponde al correo actual),
// ignorando el usuario que se acaba de escribir; sí actualiza la contraseña, por si no la recuerda. Si la
// cuenta YA tiene perfil, es una cuenta de verdad en uso, no una a medias: no se toca nada.
export async function registrarCuenta(usuario, contrasena, descripcion, avatar) {
  const errU = validarUsuario(usuario); if (errU) throw new Error(errU);
  const errC = validarContrasena(contrasena); if (errC) throw new Error(errC);
  if (!AVATARES.includes(avatar)) avatar = AVATARES[0];
  descripcion = String(descripcion || '').slice(0, 140);
  let uid, usuarioFinal = usuario, usuarioMinFinal = usuario.toLowerCase();
  if (auth.currentUser.isAnonymous) {
    const cred = EmailAuthProvider.credential(correoFalso(usuario), contrasena);
    const res = await linkWithCredential(auth.currentUser, cred);
    uid = res.user.uid;
  } else {
    if (await cargarPerfil(auth.currentUser.uid)) throw new Error('YA TIENES UNA CUENTA. CIERRA SESIÓN SI QUIERES CREAR OTRA.');
    const correoActual = auth.currentUser.email || '';
    usuarioMinFinal = correoActual.slice(0, correoActual.indexOf(DOMINIO_FALSO));
    if (!usuarioMinFinal) throw new Error('NO SE PUDO CONTINUAR EL REGISTRO. RECARGA LA PÁGINA E INTENTA DE NUEVO.');
    usuarioFinal = usuarioMinFinal;
    await updatePassword(auth.currentUser, contrasena);
    uid = auth.currentUser.uid;
  }
  try {
    await fs.runTransaction(db, async tx => {
      tx.set(fs.doc(db, 'usuariosTomados', usuarioMinFinal), { uid });
      tx.set(fs.doc(db, 'perfiles', uid), {
        usuario: usuarioFinal, usuarioMin: usuarioMinFinal, descripcion, avatar, creado: fs.serverTimestamp(),
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
  const res = await signInWithEmailAndPassword(auth, correoFalso(usuario), contrasena);
  return res.user.uid;
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

// Amigos de `uid` (por defecto, los míos). Para ver los de OTRA persona las reglas exigen que ya sea mi
// amiga (ver perfiles/{uid}/amigos en arcade-firebase/firestore.rules); si no lo es, Firestore rechaza la lectura.
export async function amigos(uid = auth.currentUser.uid) {
  const snap = await fs.getDocs(fs.collection(db, 'perfiles', uid, 'amigos'));
  const perfiles = await Promise.all(snap.docs.map(d => cargarPerfil(d.id)));
  return perfiles.filter(Boolean);
}

// Desde cuándo soy amigo/a de `otroUid` (null si no lo soy): sirve tanto para mostrar la fecha como para saber
// si ya somos amigos antes de ofrecer "QUITAR AMIGO" o "AGREGAR AMIGO".
export async function amigoDesde(otroUid) {
  const snap = await fs.getDoc(fs.doc(db, 'perfiles', auth.currentUser.uid, 'amigos', otroUid));
  return snap.exists() ? (snap.data().desde || true) : null;
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
