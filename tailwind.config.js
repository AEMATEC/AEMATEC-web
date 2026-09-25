// Configuración de Tailwind para todo el sitio. Después de cambiar clases en páginas o en assets/js,
// ejecuta `npm run css` y sube también assets/css/tailwind.css (el flujo "Páginas" revisa que esté al día).
module.exports = {
  content: ["./*.html", "./assets/js/**/*.js"],
  theme: {
    extend: {
      fontFamily: { sans: ["Montserrat", "sans-serif"], serif: ["Source Serif 4", "serif"] }
    }
  }
};
