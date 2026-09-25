// Conexión única con Firebase para todas las páginas.
// La configuración pública está en assets/firebase-config.js (se carga antes, como script normal).
// Uso en una página:
//   import { app } from "./assets/js/firebase.js";
//   import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
//   const db = getFirestore(app);
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const app = initializeApp(window.AEMATEC_FIREBASE_CONFIG);
export const db = getFirestore(app);
