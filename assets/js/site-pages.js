// Lista fija de páginas públicas del sitio, usada por el buscador de la portada
// (index.html) y por el asistente básico (assets/js/chatbot.js). Si agregas o
// renombras una página del sitio, agrégala también aquí.
export const SITE_PAGES = [
  { title: "Repositorio", desc: "Materiales docentes y académicos compartidos por la comunidad, de acceso público.", href: "repositorio.html", kw: "materiales recursos compartir" },
  { title: "Recursos docentes", desc: "Actividades, juegos y planeamientos listos para llevar al aula.", href: "repositorio-docentes.html", kw: "actividades juegos planeamientos docentes" },
  { title: "Recursos académicos", desc: "Exámenes anteriores, apuntes y soluciones para acompañarte en la carrera.", href: "repositorio-academicos.html", kw: "examenes apuntes soluciones cursos academicos" },
  { title: "Subir material", desc: "Comparte un recurso con la comunidad de MATEC.", href: "repositorio-subir.html", kw: "subir compartir aportar material" },
  { title: "Inventario", desc: "Consulta los bienes de la asociación y solicita préstamos como Asociado.", href: "inventario.html", kw: "bienes prestamos equipo inventario" },
  { title: "Inventario institucional", desc: "Bienes institucionales a cargo de la asociación.", href: "inventario.html?tipo=institucional", kw: "institucional inventario" },
  { title: "Inventario AEMATEC", desc: "Bienes propios de AEMATEC.", href: "inventario.html?tipo=aematec", kw: "aematec inventario" },
  { title: "Biblioteca", desc: "Colección física de libros del Inventario.", href: "inventario.html?tipo=biblioteca", kw: "libros biblioteca inventario" },
  { title: "Consumibles", desc: "Materiales consumibles disponibles para préstamo o uso.", href: "inventario.html?tipo=consumible", kw: "consumibles materiales inventario" },
  { title: "Junta Directiva", desc: "Quiénes integran la Junta y cómo contactarlos.", href: "junta-directiva.html", kw: "junta directiva contacto correo integrantes" },
  { title: "Efemérides", desc: "Calendario de fechas internacionales, de Costa Rica, de matemática y de AEMATEC.", href: "efemerides.html", kw: "efemerides calendario fechas dias feriados celebraciones aniversarios pi independencia" },
  { title: "Trámites", desc: "Solicitudes a la Junta, postulaciones, AGEC y consultas o denuncias a Fiscalía.", href: "tramites.html", kw: "tramite solicitud postulacion agec denuncia fiscalia" },
  { title: "Privacidad, términos y cookies", desc: "Cómo tratamos tus datos, condiciones de uso del sitio y cookies.", href: "legal.html", kw: "privacidad datos personales terminos condiciones cookies derechos autor borrar" },
  { title: "Arcade AEMATEC", desc: "Minijuegos de la asociación para pasar el rato.", href: "arcade.html", kw: "juegos arcade minijuegos" }
];
