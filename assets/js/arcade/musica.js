/* ---------- música de fondo de cada juego (8-bit, sintetizada, sin archivos) ----------
   Cada juego tiene su canción en assets/js/arcade/musica/<id del juego>.js (el mismo id que la pestaña:
   'minas', 'batalla', '21'…). Se carga solo cuando se abre ese juego.

   Formato de una canción (export default):
   {
     titulo: 'Nombre corto',
     bpm: 120,          // pulsos por minuto
     pasos: 4,          // pasos por pulso (4 = cada paso es una semicorchea)
     swing: 0,          // 0 a 0.33: retrasa los pasos impares (sensación de "shuffle")
     canales: [
       { onda: 'pulso25', vol: .05, env: 'sostenido', notas: 'C4 - E4 . G4 - - . | ...' },
       { onda: 'triangle', vol: .08, notas: 'C2 . . . G2 . . . |' },
       { onda: 'ruido', vol: .06, notas: 'k . h . s . h . |' },
     ],
   }
   - onda: 'square', 'pulso25', 'pulso12' (cuadradas "de Nintendo"), 'triangle', 'sawtooth' o 'ruido'.
   - notas: una ficha por paso, separadas por espacios. 'C4', 'F#3', 'Bb5' = nota nueva; '-' = sigue sonando
     la nota anterior; '.' = silencio. '|' solo sirve para ordenar a la vista (se ignora).
     En el canal 'ruido': 'k' bombo, 's' caja, 'h' platillo cerrado, 'o' platillo abierto, 'x' golpe corto.
   - Cada canal se repite solo al terminar; pueden tener largos distintos (p. ej. un bajo de 16 pasos
     debajo de una melodía de 128).
   - env: 'sostenido' (por defecto, órgano) o 'punteado' (cae como cuerda pulsada: guitarra, arpa, piano).
   - vib: vibrato en centésimas de semitono (p. ej. 15), para cuerdas o voces. oct: transpone el canal
     esas octavas. ar: arpegio, lista de semitonos que se alternan muy rápido sobre cada nota (acorde
     "de consola", p. ej. [0, 4, 7]).
*/
import { $, store, SFX } from './core.js';
import { parse, nota, MEZCLA } from './sinte.js';

const LEVEL = { full: MEZCLA, low: MEZCLA * .45 }; // 'low' = ya dentro de la partida: la música baja para no tapar el juego
export const MUSIC = {
  on: store.get('pa_mus', true), cur: null, song: null, out: null, level: 'full',
  timer: 0, next: 0, step: 0, parsed: null, loading: null,
  audible() { return SFX.on && this.on && !document.hidden; },
  // Toca la canción del juego `g` ('full' en su pantalla de inicio, 'low' ya jugando). Sin `g`, se detiene.
  async play(g, level = 'full') {
    if (!g || !this.audible()) return this.stop();
    SFX.init(); const c = SFX.ctx; if (!c) return;
    this.level = level;
    if (this.cur === g && this.timer) { this.out.gain.setTargetAtTime(LEVEL[level], c.currentTime, .25); return; }
    this.stop();
    this.cur = g;
    const req = this.loading = import(`./musica/${g}.js`).then(m => m.default).catch(e => { console.warn('Música', g, e); return null; });
    const song = await req;
    if (this.loading !== req || this.cur !== g || !song || !this.audible()) return;
    this.song = song; this.parsed = song.canales.map(parse);
    this.out = c.createGain(); this.out.gain.setValueAtTime(0, c.currentTime);
    this.out.gain.linearRampToValueAtTime(LEVEL[this.level], c.currentTime + .6);
    this.out.connect(c.destination);
    this.step = 0; this.next = c.currentTime + .1;
    this.timer = setInterval(() => this.tick(), 25); this.tick();
  },
  tick() {
    const c = SFX.ctx, s = this.song, st = 60 / s.bpm / (s.pasos || 4);
    while (this.next < c.currentTime + .15) {
      const t = this.next + ((s.swing || 0) && this.step % 2 ? s.swing * st : 0);
      this.parsed.forEach((p, k) => {
        const i = this.step % p.largo, e = p.ev.find(x => x.paso === i);
        if (e) nota(c, this.out, s.canales[k], e, t, e.largo * st * .98);
      });
      this.step++; this.next += st;
    }
  },
  stop() {
    this.loading = null; this.cur = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
    if (this.out && SFX.ctx) {
      const o = this.out, t = SFX.ctx.currentTime;
      o.gain.cancelScheduledValues(t); o.gain.setValueAtTime(o.gain.value, t); o.gain.linearRampToValueAtTime(0, t + .3);
      setTimeout(() => o.disconnect(), 700);
    }
    this.out = null;
  },
};

// Botón "♪" del encabezado: apaga solo la música (el botón de sonido apaga todo, efectos incluidos).
let onMusicToggle = () => {};
export function setMusicToggleHook(fn) { onMusicToggle = fn; }
function musBtn() {
  const b = $('#mus');
  b.querySelector('.lbl').textContent = MUSIC.on ? 'SÍ' : 'NO';
  b.classList.toggle('off', !MUSIC.on);
  b.setAttribute('aria-pressed', String(MUSIC.on));
}
$('#mus').onclick = () => { MUSIC.on = !MUSIC.on; store.set('pa_mus', MUSIC.on); musBtn(); SFX.play('click'); onMusicToggle(); };
musBtn();
