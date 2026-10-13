// Reduce una foto a un JPEG pequeño (texto data:) para guardarla dentro del anuncio, sin Storage.
// Reglas: firestore.rules (esExtraAnuncio, máximo 200 000 caracteres).
export async function reducirImagen(archivo, lado = 640) {
  if (!archivo || !/^image\//.test(archivo.type)) throw new Error("no es una imagen");
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(1, Math.round(bmp.width * escala));
  lienzo.height = Math.max(1, Math.round(bmp.height * escala));
  const c = lienzo.getContext("2d");
  c.fillStyle = "#fff"; c.fillRect(0, 0, lienzo.width, lienzo.height); // fondo para PNG con transparencia
  c.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  for (let q = 0.8; q >= 0.3; q -= 0.1) {
    const url = lienzo.toDataURL("image/jpeg", q);
    if (url.length <= 150000) return url;
  }
  throw new Error("imagen demasiado grande");
}
export const TIZAS = { blanca: "Blanca", amarilla: "Amarilla", azul: "Azul", rosa: "Rosa", verde: "Verde", naranja: "Naranja" };
