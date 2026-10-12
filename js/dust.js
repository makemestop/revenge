/* dust.js — слова из тысяч частиц: разлетаются от курсора, по клику собираются в новое слово */
(() => {
  const { $ } = R;
  const sec = $('#dust');
  const cv = $('#dustCanvas');
  const ctx = cv.getContext('2d');
  const countEl = $('#dustCount');
  const WORDS = ['ИДЕЯ', 'ДИЗАЙН', 'КОД', 'САЙТ', 'ВАУ!'];
  const BUCKETS = 14;

  let w = 1, h = 1, d = 1, ps = [], targets = [], wi = 0, ready = false;
  let px = -9999, py = -9999, lastTouch = 0, acc = 0;
  const off = document.createElement('canvas');
  const octx = off.getContext('2d', { willReadFrequently: true });

  function sample(word) {
    off.width = Math.ceil(w); off.height = Math.ceil(h);
    octx.clearRect(0, 0, off.width, off.height);
    octx.font = '900 100px Unbounded';
    const mw = octx.measureText(word).width;
    const fs = Math.min(h * 0.62, (w * 0.86) / (mw / 100));
    octx.font = `900 ${fs}px Unbounded`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';
    octx.fillText(word, w / 2, h / 2 + fs * 0.04);
    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const gap = w < 640 ? 4 : 5;
    const out = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (data[(y * off.width + x) * 4 + 3] > 128) out.push(x, y);
      }
    }
    return out;
  }

  function build() {
    const r = R.fit(cv, 2);
    w = r.w; h = r.h; d = r.d;
    targets = WORDS.map(sample);
    const max = Math.max(...targets.map((t) => t.length / 2));
    // пул частиц под самое «тяжёлое» слово
    while (ps.length < max) ps.push({ x: R.rand(0, w), y: R.rand(0, h), vx: 0, vy: 0, tx: 0, ty: 0, b: 0, s: R.rand(1.2, 2.2) });
    ps.length = max;
    retarget(false);
    ready = true;
  }

  function retarget(kick = true) {
    const t = targets[wi];
    const n = t.length / 2;
    // перемешанный порядок, чтобы частицы летели вперемешку
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    ps.forEach((p, i) => {
      const k = order[i % n];
      p.tx = t[k * 2] + (i >= n ? R.rand(-1.5, 1.5) : 0);
      p.ty = t[k * 2 + 1] + (i >= n ? R.rand(-1.5, 1.5) : 0);
      p.b = Math.min(BUCKETS - 1, ((p.tx / w) * BUCKETS) | 0);
      if (kick) { const a = R.rand(0, 6.28), v = R.rand(4, 16); p.vx += Math.cos(a) * v; p.vy += Math.sin(a) * v; }
    });
    ps.sort((a, b) => a.b - b.b);
    countEl.textContent = `${ps.length.toLocaleString('ru-RU')} частиц · ${WORDS[wi]}`;
  }

  const colors = Array.from({ length: BUCKETS }, (_, i) => {
    const t = i / (BUCKETS - 1);
    const hue = t < 0.5 ? R.lerp(340, 275, t * 2) : R.lerp(275, 190, (t - 0.5) * 2);
    return `hsl(${hue}, 100%, 68%)`;
  });

  function next() { wi = (wi + 1) % WORDS.length; retarget(true); acc = 0; }

  R.loop(sec, (dt) => {
    if (!ready) return;
    const f = dt * 60;
    const k = 0.045 * f, damp = Math.pow(0.86, f);
    const R2 = (w < 640 ? 70 : 100) ** 2;
    const active = performance.now() - lastTouch < 140;
    acc += dt;
    if (acc > 5 && performance.now() - lastTouch > 4000) next();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let cb = -1;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.vx = (p.vx + (p.tx - p.x) * k) * damp;
      p.vy = (p.vy + (p.ty - p.y) * k) * damp;
      if (active) {
        const dx = p.x - px, dy = p.y - py, dd = dx * dx + dy * dy;
        if (dd < R2) {
          const m = (1 - dd / R2) * 7 * f / (Math.sqrt(dd) + 1);
          p.vx += dx * m; p.vy += dy * m;
        }
      }
      p.x += p.vx * f * 0.6; p.y += p.vy * f * 0.6;
      if (p.b !== cb) { cb = p.b; ctx.fillStyle = colors[cb]; }
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
  });

  const pos = (e) => { const r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; lastTouch = performance.now(); };
  cv.addEventListener('pointermove', pos, { passive: true });
  cv.addEventListener('pointerdown', pos, { passive: true });
  cv.addEventListener('pointerleave', () => { px = py = -9999; });
  cv.addEventListener('click', () => { next(); lastTouch = performance.now(); });

  R.whenNear(sec, () => {
    const go = () => { build(); R.onSize(cv, () => ready && build()); };
    if (document.fonts && document.fonts.load) document.fonts.load('900 100px Unbounded', 'ИДЕЯ').then(go, go);
    else go();
  });
})();
