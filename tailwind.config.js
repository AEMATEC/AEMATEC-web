// Configuración de Tailwind para todo el sitio. Después de cambiar clases en páginas o en assets/js,
// ejecuta `npm run css` y sube también assets/css/tailwind.css (el flujo "Páginas" revisa que esté al día).
module.exports = {
  // arcade.html es una página aparte que no carga tailwind.css (tiene su propio CSS): se excluye
  // para que su contenido no genere clases falsas al compilar.
  content: ["./*.html", "!./arcade.html", "./assets/js/**/*.js"],
  theme: {
    extend: {
      fontFamily: { sans: ["Montserrat", "sans-serif"], serif: ["Source Serif 4", "serif"] }
    }
  }
};
