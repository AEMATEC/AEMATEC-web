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
