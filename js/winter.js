/* winter.js — снег разлетается от курсора, копится сугробом; по клику — вихрь */
(() => {
  const { $ } = R;
  const cv = $('#scWinter');
  const ctx = cv.getContext('2d');
  let w = 1, h = 1, d = 1, bg, flakes = [], hm = [], col = 4, ground = 0, t = 0, inited = false;
  const aur = document.createElement('canvas');
  aur.width = 160; aur.height = 90;
  const actx = aur.getContext('2d');
  let px = -999, py = -999, pvx = 0, pvy = 0, pt = 0, vortex = null;

  const flakeSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const x = c.getContext('2d');
    x.translate(24, 24);
    x.strokeStyle = '#fff'; x.lineWidth = 2.2; x.lineCap = 'round';
    x.shadowColor = 'rgba(200,230,255,.9)'; x.shadowBlur = 6;
    for (let i = 0; i < 6; i++) {
      x.rotate(Math.PI / 3);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -18);
      x.moveTo(0, -9); x.lineTo(-5, -14); x.moveTo(0, -9); x.lineTo(5, -14);
      x.stroke();
    }
    return c;
  })();

  function paintBg() {
    bg = document.createElement('canvas');
    bg.width = Math.round(w * d); bg.height = Math.round(h * d);
    const c = bg.getContext('2d');
    c.scale(d, d);
    let g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#050a1f'); g.addColorStop(0.55, '#0f2149'); g.addColorStop(1, '#1f3c6e');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      c.fillStyle = `rgba(255,255,255,${R.rand(0.2, 0.9)})`;
      c.fillRect(R.rand(0, w), R.rand(0, h * 0.6), R.rand(0.6, 1.8), R.rand(0.6, 1.8));
    }
    // горы
    const mtn = (base, amp, colr, seed) => {
      c.fillStyle = colr; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) c.lineTo(x, base - Math.abs(Math.sin(x / (w * 0.13) + seed)) * amp - Math.sin(x / 57 + seed) * amp * 0.08);
      c.lineTo(w, h); c.fill();
    };
    mtn(h * 0.72, h * 0.22, '#1a2d58', 1);
    mtn(h * 0.8, h * 0.16, '#142349', 3);
    // ёлки
    for (let i = 0; i < Math.round(w / 40); i++) {
      const x = R.rand(0, w), y = h * R.rand(0.8, 0.9), s = R.rand(30, 70);
      c.fillStyle = '#0b1834';
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x, y - s + k * s * 0.28); c.lineTo(x - s * (0.25 + k * 0.08), y - s * 0.5 + k * s * 0.3); c.lineTo(x + s * (0.25 + k * 0.08), y - s * 0.5 + k * s * 0.3); c.fill(); }
      c.fillStyle = 'rgba(235,245,255,.75)';
      c.beginPath(); c.moveTo(x, y - s); c.lineTo(x - s * 0.12, y - s * 0.78); c.lineTo(x + s * 0.12, y - s * 0.78); c.fill();
    }
    // домик с тёплым окном
    const hx = w * 0.72, hy = h * 0.86, hs = Math.min(90, w * 0.08);
    c.fillStyle = '#0d1a38'; c.fillRect(hx, hy - hs * 0.7, hs, hs * 0.7);
    c.beginPath(); c.moveTo(hx - hs * 0.12, hy - hs * 0.68); c.lineTo(hx + hs / 2, hy - hs * 1.15); c.lineTo(hx + hs * 1.12, hy - hs * 0.68); c.fill();
    c.fillStyle = '#eef6ff';
    c.beginPath(); c.moveTo(hx - hs * 0.14, hy - hs * 0.66); c.lineTo(hx + hs / 2, hy - hs * 1.18); c.lineTo(hx + hs * 1.14, hy - hs * 0.66); c.lineTo(hx + hs * 1.0, hy - hs * 0.66); c.lineTo(hx + hs / 2, hy - hs * 1.05); c.lineTo(hx, hy - hs * 0.66); c.fill();
    g = c.createRadialGradient(hx + hs * 0.5, hy - hs * 0.35, 0, hx + hs * 0.5, hy - hs * 0.35, hs * 1.4);
    g.addColorStop(0, 'rgba(255,200,110,.55)'); g.addColorStop(1, 'rgba(255,200,110,0)');
    c.fillStyle = g; c.fillRect(hx - hs, hy - hs * 2, hs * 3, hs * 3);
    c.fillStyle = '#ffd27a'; c.fillRect(hx + hs * 0.32, hy - hs * 0.5, hs * 0.36, hs * 0.28);
    // земля
    ground = h * 0.9;
    g = c.createLinearGradient(0, ground - 30, 0, h);
    g.addColorStop(0, '#dfeaff'); g.addColorStop(1, '#9fb6e0');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) c.lineTo(x, ground + Math.sin(x / 160) * 10);
    c.lineTo(w, h); c.fill();
  }

  function spawn(layer, anywhere) {
    const L = [
      { r: [0.6, 1.4], v: [18, 36], a: 0.55 },
      { r: [1.5, 2.6], v: [36, 64], a: 0.85 },
      { r: [5, 9], v: [60, 100], a: 1 },
    ][layer];
    return { x: R.rand(0, w), y: anywhere ? R.rand(0, h) : R.rand(-40, -5), r: R.rand(...L.r), v: R.rand(...L.v), a: L.a, layer, vx: 0, vy: 0, ph: R.rand(0, 6), rot: R.rand(0, 6), vr: R.rand(-1, 1) };
  }

  function setup() {
    const r = R.fit(cv, 1.75);
    w = r.w; h = r.h; d = r.d;
    paintBg();
    const k = (w * h) / (1440 * 900);
    flakes = [];
    const counts = [Math.round(240 * k) + 60, Math.round(140 * k) + 40, Math.round(40 * k) + 14];
    counts.forEach((n, l) => { for (let i = 0; i < n; i++) flakes.push(spawn(l, true)); });
    col = 4;
    hm = new Float32Array(Math.ceil(w / col) + 2);
  }

  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const now = performance.now();
    if (px > -900) { const k = 1000 / Math.max(8, now - pt); pvx = (x - px) * k * 0.016; pvy = (y - py) * k * 0.016; }
    px = x; py = y; pt = now;
  }, { passive: true });
  cv.addEventListener('pointerleave', () => { px = py = -999; });
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    vortex = { x: e.clientX - r.left, y: e.clientY - r.top, t: 1.6 };
    for (let i = 0; i < 50; i++) {
      const f = spawn(R.rand(0, 1) < 0.7 ? 1 : 2, false);
      const a = R.rand(0, 6.28), v = R.rand(100, 420);
      f.x = vortex.x; f.y = vortex.y; f.vx = Math.cos(a) * v; f.vy = Math.sin(a) * v;
      f.extra = true;
      flakes.push(f);
    }
  });

  function frame(dt) {
    t += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);

    // северное сияние: рисуем в маленьком буфере и растягиваем — получается мягко
    const aw = aur.width, ah = aur.height;
    actx.clearRect(0, 0, aw, ah);
    const g = actx.createLinearGradient(0, ah * 0.05, 0, ah * 0.5);
    g.addColorStop(0, 'rgba(80,255,180,0)'); g.addColorStop(0.45, 'rgba(80,255,180,.3)'); g.addColorStop(0.7, 'rgba(140,90,255,.2)'); g.addColorStop(1, 'rgba(140,90,255,0)');
    actx.fillStyle = g;
    for (let x = 0; x < aw; x++) {
      const X = (x / aw) * w;
      const top = ah * (0.08 + 0.06 * Math.sin(X / 210 + t * 0.4) + 0.03 * Math.sin(X / 63 - t * 0.9));
      const bot = ah * (0.4 + 0.05 * Math.sin(X / 170 - t * 0.3));
      actx.globalAlpha = 0.55 + 0.45 * Math.sin(X / 90 + t * 0.7);
      actx.fillRect(x, top, 1.2, bot - top);
    }
    actx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(aur, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    const fresh = performance.now() - pt < 120;
    if (vortex) { vortex.t -= dt; if (vortex.t <= 0) vortex = null; }
    const wind = Math.sin(t * 0.3) * 14;
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      const depth = 0.4 + f.layer * 0.4;
      if (fresh) {
        const dx = f.x - px, dy = f.y - py, dd = dx * dx + dy * dy, RR = 120;
        if (dd < RR * RR) {
          const dist = Math.sqrt(dd) || 1, k = (1 - dist / RR);
          f.vx += (dx / dist) * k * 260 * dt * 60 * 0.12 * depth + pvx * k * 6 * depth;
          f.vy += (dy / dist) * k * 260 * dt * 60 * 0.12 * depth + pvy * k * 6 * depth;
        }
      }
      if (vortex) {
        const dx = f.x - vortex.x, dy = f.y - vortex.y, dist = Math.hypot(dx, dy) || 1;
        if (dist < 260) {
          const k = (1 - dist / 260) * vortex.t * 9 * depth;
          f.vx += (-dy / dist) * k * 60 * dt * 8 - dx / dist * k * 3;
          f.vy += (dx / dist) * k * 60 * dt * 8 - dy / dist * k * 3;
        }
      }
      f.vx *= Math.pow(0.95, dt * 60); f.vy *= Math.pow(0.95, dt * 60);
      f.x += (f.vx + wind * depth + Math.sin(t * 1.3 + f.ph) * 12 * depth) * dt;
      f.y += (f.v + f.vy) * dt;
      f.rot += f.vr * dt;
      if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20;
      // приземление
      const ci = R.clamp((f.x / col) | 0, 0, hm.length - 1);
      const gy = ground + Math.sin(f.x / 160) * 10 - hm[ci];
      if (f.y >= gy) {
        if (f.layer > 0) {
          const add = f.r * (f.layer === 2 ? 0.22 : 0.5);
          for (let k = -3; k <= 3; k++) { const j = ci + k; if (j >= 0 && j < hm.length) hm[j] = Math.min(h * 0.22, hm[j] + add * (1 - Math.abs(k) / 4)); }
        }
        if (f.extra || flakes.length > 2000) { flakes.splice(i, 1); continue; }
        Object.assign(f, spawn(f.layer, false));
        continue;
      }
      if (f.y < -60) f.y = -10;
      if (f.layer === 2) {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
        ctx.drawImage(flakeSprite, -f.r, -f.r, f.r * 2, f.r * 2);
        ctx.restore();
      } else {
        ctx.globalAlpha = f.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // сугроб: сглаживание и медленное таяние
    for (let i = 1; i < hm.length - 1; i++) hm[i] = hm[i] * 0.6 + (hm[i - 1] + hm[i + 1]) * 0.2;
    for (let i = 0; i < hm.length; i++) hm[i] = Math.max(0, hm[i] - dt * 0.6);
    const sg = ctx.createLinearGradient(0, ground - h * 0.2, 0, ground + 20);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#cfdcf5');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let i = 0; i < hm.length; i++) { const x = i * col; ctx.lineTo(x, ground + Math.sin(x / 160) * 10 - hm[i]); }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }

  R.scenes = R.scenes || {};
  R.scenes.winter = {
    el: cv,
    start() { if (inited) return; setup(); inited = true; R.onSize(cv, setup); },
    frame,
  };
})();
