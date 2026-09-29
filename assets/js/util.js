// Funciones pequeñas que usan varias páginas.

// Escapa texto antes de insertarlo como HTML (datos de Firestore o escritos por usuarios).
export const escapeHtml = value => (value == null || value === false ? "" : String(value)).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

// Devuelve el enlace solo si es https (evita enlaces javascript: u otros esquemas).
export const safeHttpsUrl = value => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

export const safeEmail = value => /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(String(value || "")) ? String(value) : null;

// Traduce los códigos de error de Firebase Auth a una frase sencilla en español, en vez de mostrar
// el mensaje técnico crudo (p. ej. "Firebase: Error (auth/too-many-requests).") en la pantalla.
const MENSAJES_ERROR_AUTH = {
  "auth/wrong-password": "La contraseña no es correcta.",
  "auth/user-not-found": "No encontramos una cuenta con ese correo.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "Ese correo no es válido.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/too-many-requests": "Hubo demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.",
  "auth/user-disabled": "Esta cuenta fue deshabilitada. Contacta a la Junta Directiva.",
  "auth/network-request-failed": "No hay conexión a internet. Revisa tu red e intenta de nuevo.",
  "auth/email-already-in-use": 'Ya existe una cuenta con este correo. Usa "¿Olvidaste tu contraseña?" si no la recuerdas.',
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión antes de hacer esto."
};

export const mensajeErrorAuth = error => MENSAJES_ERROR_AUTH[error?.code]
  || "No se pudo completar la acción. Intenta de nuevo en unos minutos.";
