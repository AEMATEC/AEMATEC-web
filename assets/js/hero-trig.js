// Animación del compás dibujando las funciones trigonométricas, de fondo en el inicio (index.html).
// Basada en la animación de la Junta (compás + circunferencia unitaria): la circunferencia y el
// compás quedan del lado derecho de la sección y las curvas (seno, coseno...) cruzan todo el ancho,
// por detrás del título. Se activa sola si existe <canvas id="hero-trig">; no hace nada si no está.
(() => {
  const canvas = document.getElementById("hero-trig");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const NAVY = "#0D2B45";
  const CYAN = "#00A6B8";
  const GRID = "rgba(13,43,69,0.08)";
  const T_DRAW = 3000, T_MOVE = 1200, T_TRACE = 4000, T_HOLD = 1200, T_CLEAR = 500;

  // Todas dentro de la misma familia de azules/verdes del sitio (nada de colores muy vivos):
  // es un fondo decorativo, no debe competir con el título.
  const FUNCS = [
    { f: x => Math.sin(x), color: "#3B8FA6" },
    { f: x => Math.cos(x), color: "#43708F" },
    { f: x => Math.tan(x), color: "#5B7FB0" },
    { f: x => 1 / Math.sin(x), color: "#2F8F82" },
    { f: x => 1 / Math.cos(x), color: "#4F7A9C" },
    { f: x => Math.cos(x) / Math.sin(x), color: "#5A6FA0" }
  ];

  let W, H, R, cx, cy, XMAX, YMAX, park;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(H * 0.17, W * 0.11);
    cx = W * (W < 640 ? 0.62 : 0.74);
    cy = H / 2;
    XMAX = (Math.max(cx, W - cx) - 8) / R;
    YMAX = (H / 2 - 8) / R;
    park = { x: cx + R * 1.2, y: cy };
  }
  window.addEventListener("resize", resize);
  resize();

  const ease = p => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
  const P = (x, y) => [cx + x * R, cy - y * R];

  function line(a, b, color, w) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }
  function dot(p, color, radius) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI); ctx.fill();
  }

  function drawCompass(ax, ay, bx, by) {
    const w = R * 0.085;
    const hx = (ax + bx) / 2, hy = (ay + by) / 2 - R * 0.8;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = NAVY; ctx.lineWidth = w * 1.1;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - R * 0.25); ctx.stroke();

    const leg = (tx, ty, pencil) => {
      const k = pencil ? 0.86 : 0.9;
      const ex = hx + (tx - hx) * k, ey = hy + (ty - hy) * k;
      ctx.strokeStyle = NAVY; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
      const nx = -(ty - hy), ny = tx - hx, nl = Math.hypot(nx, ny) || 1;
      const s = w * (pencil ? 0.55 : 0.3);
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.moveTo(ex + (nx / nl) * s, ey + (ny / nl) * s);
      ctx.lineTo(tx, ty);
      ctx.lineTo(ex - (nx / nl) * s, ey - (ny / nl) * s);
      ctx.closePath(); ctx.fill();
      if (pencil) dot([tx, ty], CYAN, w * 0.28);
    };
    leg(ax, ay, false);
    leg(bx, by, true);

    const f = 0.58;
    const x1 = hx + (ax - hx) * f, y1 = hy + (ay - hy) * f;
    const x2 = hx + (bx - hx) * f, y2 = hy + (by - hy) * f;
    const dx = x2 - x1, dy = y2 - y1, dl = Math.hypot(dx, dy) || 1;
    const ex = (dx / dl) * R * 0.14, ey = (dy / dl) * R * 0.14;
    ctx.strokeStyle = CYAN; ctx.lineWidth = w * 0.75;
    ctx.beginPath(); ctx.moveTo(x1 - ex, y1 - ey); ctx.lineTo(x2 + ex, y2 + ey); ctx.stroke();

    dot([hx, hy], NAVY, R * 0.16);
    dot([hx, hy], "#ffffff", R * 0.105);
    dot([hx, hy], CYAN, R * 0.07);
    ctx.restore();
  }

  function drawAxes(alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    line([0, cy], [W, cy], GRID, 1.5);
    line([cx, 0], [cx, H], GRID, 1.5);
    ctx.restore();
  }

  function drawCircle(end) {
    ctx.save();
    ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, -end, true); ctx.stroke();
    ctx.restore();
  }

  function drawFunction(fn, p, alpha) {
    const x0 = -XMAX, x1 = -XMAX + 2 * XMAX * p;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = fn.color; ctx.lineWidth = 2.25;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    const N = Math.ceil(W * 1.5 * p) + 2;
    let pen = false, prevY = NaN;
    for (let i = 0; i <= N; i++) {
      const x = x0 + (x1 - x0) * (i / N);
      const y = fn.f(x);
      const ok = isFinite(y) && Math.abs(y) <= YMAX + 1;
      const jump = pen && isFinite(prevY) && Math.sign(y) !== Math.sign(prevY) && Math.abs(y - prevY) > YMAX;
      if (!ok || jump) { pen = false; prevY = y; continue; }
      const q = P(x, y);
      if (!pen) { ctx.moveTo(q[0], q[1]); pen = true; } else ctx.lineTo(q[0], q[1]);
      prevY = y;
    }
    ctx.stroke();

    const yNow = fn.f(x1);
    if (p < 1 && isFinite(yNow) && Math.abs(yNow) <= YMAX) dot(P(x1, yNow), fn.color, 4);

    if (p >= 1) {
      for (let i = 0; i <= 2000; i++) {
        const xa = -1.05 + (2.1 * i) / 2000, xb = xa + 2.1 / 2000;
        const ga = xa * xa + fn.f(xa) ** 2 - 1, gb = xb * xb + fn.f(xb) ** 2 - 1;
        if (isFinite(ga) && isFinite(gb) && Math.sign(ga) !== Math.sign(gb) && Math.abs(fn.f(xa) - fn.f(xb)) < 0.5) {
          const xm = (xa + xb) / 2;
          dot(P(xm, fn.f(xm)), "#ffffff", 5);
          dot(P(xm, fn.f(xm)), fn.color, 3);
        }
      }
    }
    ctx.restore();
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INTRO = T_DRAW + T_MOVE;
  const PER = T_TRACE + T_HOLD + T_CLEAR;
  let start = null;

  function frame(now) {
    if (start === null) start = now;
    let t = now - start;
    if (reduce) t = INTRO + T_TRACE + 10;
    ctx.clearRect(0, 0, W, H);

    if (t < T_DRAW) {
      const a = ease(t / T_DRAW) * 2 * Math.PI;
      drawAxes((t / T_DRAW) * 0.6);
      drawCircle(a);
      const b = P(Math.cos(a), Math.sin(a));
      drawCompass(cx, cy, b[0], b[1]);
    } else if (t < INTRO) {
      const p = ease((t - T_DRAW) / T_MOVE);
      drawAxes(0.6 + 0.4 * p);
      drawCircle(2 * Math.PI);
      const lerp = (u, v) => u + (v - u) * p;
      const lift = Math.sin(p * Math.PI) * R * 0.35;
      const ax = lerp(cx, park.x), ay = lerp(cy, park.y) - lift;
      const bx = lerp(cx + R, park.x + R * 0.7), by = lerp(cy, park.y) - lift;
      drawCompass(ax, ay, bx, by);
    } else {
      const tf = t - INTRO;
      const fn = FUNCS[Math.floor(tf / PER) % FUNCS.length];
      const local = tf % PER;
      const p = Math.min(local / T_TRACE, 1);
      const alpha = local > T_TRACE + T_HOLD ? 1 - (local - T_TRACE - T_HOLD) / T_CLEAR : 1;
      drawAxes(1);
      drawCircle(2 * Math.PI);
      drawFunction(fn, p, Math.max(0, alpha));
      drawCompass(park.x, park.y, park.x + R * 0.7, park.y);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
