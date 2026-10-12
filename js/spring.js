/* spring.js — весенний пруд: вода расходится кругами под пальцем, карпы кои плывут к корму, падают лепестки */
(() => {
  const { $ } = R;
  const cv = $('#scSpring');
  const ctx = cv.getContext('2d');
  let w = 1, h = 1, d = 1, sc = 3, gw = 1, gh = 1;
  let b1, b2, floor, fctx, fish = [], food = [], pads = [], petals = [], fg, water, wctx, img, inited = false, t = 0;
  let lx = -1, ly = -1;

  function mk(W, H) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H)); return c; }

  function setup() {
    const r = R.fit(cv, 1.5);
    w = r.w; h = r.h; d = r.d;
    sc = Math.max(2, Math.ceil(Math.sqrt((w * h) / 150000)));
    gw = Math.ceil(w / sc) + 2; gh = Math.ceil(h / sc) + 2;
    b1 = new Int16Array(gw * gh); b2 = new Int16Array(gw * gh);
    water = mk(gw, gh); wctx = water.getContext('2d', { willReadFrequently: true });
    img = wctx.createImageData(gw, gh);
    paintFloor();
    paintFg();
    if (!fish.length) {
      const cols = [['#ff6a2a', '#fff4ea'], ['#fff4ea', '#ff4a2a'], ['#ffb02e', '#2a1a1a'], ['#ffffff', '#e5243b'], ['#ff7a3a', '#ffffff']];
      fish = cols.map(([a, b]) => ({ x: R.rand(w * 0.2, w * 0.8), y: R.rand(h * 0.3, h * 0.8), a: R.rand(0, 6.28), v: R.rand(40, 60), c: a, s: b, ph: R.rand(0, 6), turn: 0, len: R.rand(46, 70) * Math.min(1, w / 900 + 0.35) }));
    }
    pads = Array.from({ length: Math.round(w / 220) + 2 }, () => ({ x: R.rand(w * 0.08, w * 0.92), y: R.rand(h * 0.35, h * 0.85), r: R.rand(24, 44) * Math.min(1, w / 900 + 0.4), a: R.rand(0, 6.28), flower: Math.random() < 0.45, ph: R.rand(0, 6) }));
  }

  function paintFloor() {
    floor = mk(gw, gh); fctx = floor.getContext('2d');
    const g = fctx.createRadialGradient(gw * 0.5, gh * 0.55, 0, gw * 0.5, gh * 0.55, Math.max(gw, gh) * 0.75);
    g.addColorStop(0, '#1f6f78'); g.addColorStop(0.6, '#2b8a7e'); g.addColorStop(1, '#4fa37a');
    fctx.fillStyle = g; fctx.fillRect(0, 0, gw, gh);
    // камешки и водоросли на дне
    for (let i = 0; i < (gw * gh) / 900; i++) {
      fctx.fillStyle = R.pick(['rgba(20,70,70,.28)', 'rgba(90,150,130,.3)', 'rgba(200,225,195,.18)', 'rgba(25,80,80,.3)']);
      fctx.beginPath(); fctx.ellipse(R.rand(0, gw), R.rand(0, gh), R.rand(1, 5), R.rand(1, 3.5), R.rand(0, 3), 0, 7); fctx.fill();
    }
    for (let i = 0; i < 26; i++) {
      fctx.strokeStyle = 'rgba(40,110,70,.5)'; fctx.lineWidth = 1.2;
      const x = R.rand(0, gw), y = R.rand(0, gh);
      fctx.beginPath(); fctx.moveTo(x, y);
      fctx.quadraticCurveTo(x + R.rand(-6, 6), y - 10, x + R.rand(-4, 4), y - R.rand(12, 24)); fctx.stroke();
    }
    floor.base = fctx.getImageData(0, 0, gw, gh);
  }

  function paintFg() {
    fg = mk(w * d, h * d);
    const c = fg.getContext('2d');
    c.scale(d, d);
    // берег снизу
    const bank = (cx, cy, rx, ry) => {
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, rx);
      g.addColorStop(0, '#5f9e3a'); g.addColorStop(0.85, '#7fbf4a'); g.addColorStop(1, 'rgba(127,191,74,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill();
    };
    bank(0, h * 1.02, w * 0.32, h * 0.2);
    bank(w, h * 1.04, w * 0.36, h * 0.22);
    bank(w * 0.5, h * 1.12, w * 0.3, h * 0.12);
    // трава и цветы
    const flower = (x, y, s, kind) => {
      c.strokeStyle = '#3f8a2e'; c.lineWidth = Math.max(1.5, s * 0.12);
      c.beginPath(); c.moveTo(x, y + s * 2); c.quadraticCurveTo(x + s * 0.3, y + s, x, y); c.stroke();
      if (kind === 0) { // тюльпан
        c.fillStyle = R.pick(['#ff4d6d', '#ff8fab', '#ffd23f', '#e5243b']);
        c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.1); c.lineTo(x - s * 0.5, y - s * 0.8); c.lineTo(x - s * 0.18, y - s * 0.45); c.lineTo(x, y - s * 0.9); c.lineTo(x + s * 0.18, y - s * 0.45); c.lineTo(x + s * 0.5, y - s * 0.8); c.lineTo(x + s * 0.5, y - s * 0.1); c.quadraticCurveTo(x, y + s * 0.45, x - s * 0.5, y - s * 0.1); c.fill();
      } else { // ромашка
        c.fillStyle = '#fff';
        for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; c.beginPath(); c.ellipse(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45, s * 0.32, s * 0.13, a, 0, 7); c.fill(); }
        c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(x, y, s * 0.2, 0, 7); c.fill();
      }
    };
    const scatter = (x0, x1, y0, y1, n) => {
      for (let i = 0; i < n; i++) {
        const x = R.rand(x0, x1), y = R.rand(y0, y1);
        c.strokeStyle = R.pick(['#4c9a34', '#5fae3e', '#3b8a2a']); c.lineWidth = 2;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 3, y + 14); c.quadraticCurveTo(x + k * 3 + R.rand(-4, 4), y, x + k * 3 + R.rand(-8, 8), y - R.rand(8, 22)); c.stroke(); }
        if (Math.random() < 0.6) flower(x + R.rand(-6, 6), y - R.rand(14, 30), R.rand(9, 15), Math.random() < 0.55 ? 0 : 1);
      }
    };
    scatter(0, w * 0.24, h * 0.88, h, Math.round(w / 60));
    scatter(w * 0.74, w, h * 0.86, h, Math.round(w / 55));
    // ветка сакуры сверху справа
    c.strokeStyle = '#4a2a22'; c.lineCap = 'round';
    const branch = (x, y, a, len, wd, depth) => {
      if (depth === 0 || wd < 1) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      c.lineWidth = wd; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      for (let i = 0; i < 4; i++) {
        const k = Math.random();
        const bx = x + (x2 - x) * k, by = y + (y2 - y) * k;
        c.fillStyle = R.pick(['#ffd1dc', '#ffb7c5', '#ffe3ea', '#ff9fb8']);
        for (let p = 0; p < 5; p++) { const pa = (p / 5) * 6.28; c.beginPath(); c.ellipse(bx + Math.cos(pa) * 4, by + Math.sin(pa) * 4, 4.2, 2.6, pa, 0, 7); c.fill(); }
        c.fillStyle = '#e5243b'; c.beginPath(); c.arc(bx, by, 1.6, 0, 7); c.fill();
      }
      branch(x2, y2, a + R.rand(-0.6, 0.1), len * 0.72, wd * 0.62, depth - 1);
      branch(x2, y2, a + R.rand(0.1, 0.7), len * 0.62, wd * 0.55, depth - 1);
    };
    branch(w + 10, -10, Math.PI * 0.82, Math.min(260, w * 0.22), 12, 5);
    // лёгкая виньетка
    const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,40,30,.35)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
  }

  function disturb(x, y, rad, str) {
    const gx = (x / sc) | 0, gy = (y / sc) | 0;
    for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
      if (i * i + j * j > rad * rad) continue;
      const X = gx + i, Y = gy + j;
      if (X > 0 && X < gw - 1 && Y > 0 && Y < gh - 1) b1[Y * gw + X] = Math.max(-30000, Math.min(30000, b1[Y * gw + X] + str));
    }
  }

  cv.addEventListener('pointermove', (e) => {
    if (!inited) return;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (lx >= 0) {
      const dist = Math.hypot(x - lx, y - ly), n = Math.max(1, Math.ceil(dist / (sc * 2)));
      for (let i = 1; i <= n; i++) disturb(lx + (x - lx) * (i / n), ly + (y - ly) * (i / n), 2, 220);
    }
    lx = x; ly = y;
  }, { passive: true });
  cv.addEventListener('pointerleave', () => { lx = ly = -1; });
  cv.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') lx = ly = -1; });
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    disturb(x, y, 4, 2400);
    for (let i = 0; i < 6; i++) food.push({ x: x + R.rand(-26, 26), y: y + R.rand(-26, 26), l: 9 });
  });

  function drawFish(c, f, k) {
    // рисуем в координатах сетки (k = 1/sc)
    c.save();
    c.translate(f.x * k, f.y * k);
    c.rotate(f.a);
    const L = f.len * k, W = L * 0.26;
    const sway = Math.sin(f.ph) * 0.35;
    c.fillStyle = 'rgba(0,30,30,.25)';
    c.beginPath(); c.ellipse(2, 3, L * 0.5, W, 0, 0, 7); c.fill();
    // хвост
    c.save(); c.translate(-L * 0.45, 0); c.rotate(sway);
    c.fillStyle = f.c;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-L * 0.25, -W * 1.4, -L * 0.38, -W * 1.2); c.quadraticCurveTo(-L * 0.25, 0, -L * 0.38, W * 1.2); c.quadraticCurveTo(-L * 0.25, W * 1.4, 0, 0); c.fill();
    c.restore();
    // тело
    c.fillStyle = f.c;
    c.beginPath(); c.ellipse(0, 0, L * 0.5, W, 0, 0, 7); c.fill();
    c.fillStyle = f.s;
    c.beginPath(); c.ellipse(L * 0.08, -W * 0.2, L * 0.16, W * 0.55, 0.3, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-L * 0.22, W * 0.25, L * 0.12, W * 0.45, -0.4, 0, 7); c.fill();
    // плавники
    c.fillStyle = f.c;
    c.beginPath(); c.ellipse(L * 0.15, -W * 1.05, L * 0.12, W * 0.35, -0.6 + sway * 0.5, 0, 7); c.ellipse(L * 0.15, W * 1.05, L * 0.12, W * 0.35, 0.6 - sway * 0.5, 0, 7); c.fill();
    c.restore();
  }

  function frame(dt) {
    t += dt;
    const f60 = dt * 60;
    // редкие капли «дождика»
    if (Math.random() < 0.025 * f60) disturb(R.rand(0, w), R.rand(0, h), 1, 900);
    // волновое уравнение (2 шага для плавности)
    for (let s = 0; s < 2; s++) {
      for (let y = 1; y < gh - 1; y++) {
        let i = y * gw + 1;
        for (let x = 1; x < gw - 1; x++, i++) {
          let v = ((b1[i - 1] + b1[i + 1] + b1[i - gw] + b1[i + gw]) >> 1) - b2[i];
          v -= v >> 5;
          b2[i] = v;
        }
      }
      const tmp = b1; b1 = b2; b2 = tmp;
    }

    // рыбы
    for (const f of fish) {
      let target = null, best = 1e9;
      for (const p of food) { const dd = (p.x - f.x) ** 2 + (p.y - f.y) ** 2; if (dd < best) { best = dd; target = p; } }
      let want = f.a;
      if (target) {
        want = Math.atan2(target.y - f.y, target.x - f.x);
        if (best < 18 * 18) { target.l = 0; disturb(target.x, target.y, 2, 600); }
      } else {
        f.turn += R.rand(-1, 1) * dt * 2; f.turn *= 0.98;
        want = f.a + f.turn;
      }
      // держимся подальше от краёв
      const m = 70;
      if (f.x < m) want = 0; else if (f.x > w - m) want = Math.PI;
      if (f.y < m + h * 0.08) want = Math.PI / 2; else if (f.y > h - m) want = -Math.PI / 2;
      let da = want - f.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      f.a += R.clamp(da, -2.2 * dt, 2.2 * dt) * (target ? 1.6 : 1);
      const sp = target ? f.v * 2.3 : f.v;
      f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt;
      f.ph += dt * (target ? 14 : 7);
    }
    food = food.filter((p) => (p.l -= dt) > 0);

    // дно + рыбы в маленьком масштабе
    fctx.putImageData(floor.base, 0, 0);
    const k = 1 / sc;
    const src = fctx.getImageData(0, 0, gw, gh).data;

    // преломление + блики
    const out = img.data;
    for (let y = 1; y < gh - 1; y++) {
      let i = y * gw + 1;
      for (let x = 1; x < gw - 1; x++, i++) {
        const xo = b1[i - 1] - b1[i + 1];
        const yo = b1[i - gw] - b1[i + gw];
        let sx = x + (xo >> 6), sy = y + (yo >> 6);
        if (sx < 0) sx = 0; else if (sx >= gw) sx = gw - 1;
        if (sy < 0) sy = 0; else if (sy >= gh) sy = gh - 1;
        const si = (sy * gw + sx) << 2, o = i << 2;
        const shade = (xo + yo) >> 4;
        out[o] = src[si] + shade;
        out[o + 1] = src[si + 1] + shade;
        out[o + 2] = src[si + 2] + shade;
        out[o + 3] = 255;
      }
    }
    wctx.putImageData(img, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(water, 1, 1, gw - 2, gh - 2, 0, 0, cv.width, cv.height);
    ctx.setTransform(d, 0, 0, d, 0, 0);

    // корм и карпы — в полном разрешении, слегка «под водой»
    for (const p of food) { ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 0.86;
    for (const f of fish) {
      const gx = R.clamp((f.x / sc) | 0, 1, gw - 2), gy = R.clamp((f.y / sc) | 0, 1, gh - 2), ii = gy * gw + gx;
      const ox = (b1[ii - 1] - b1[ii + 1]) / 400, oy = (b1[ii - gw] - b1[ii + gw]) / 400;
      drawFish(ctx, { ...f, x: f.x + ox, y: f.y + oy }, 1);
    }
    ctx.globalAlpha = 1;

    // кувшинки
    for (const p of pads) {
      const gx = (p.x / sc) | 0, gy = (p.y / sc) | 0;
      const ii = R.clamp(gy, 1, gh - 2) * gw + R.clamp(gx, 1, gw - 2);
      const bob = (b1[ii - 1] - b1[ii + 1]) / 1200;
      ctx.save(); ctx.translate(p.x + bob * 6, p.y); ctx.rotate(p.a + Math.sin(t * 0.5 + p.ph) * 0.06 + bob * 0.2);
      ctx.fillStyle = 'rgba(0,40,30,.25)';
      ctx.beginPath(); ctx.ellipse(4, 5, p.r, p.r * 0.92, 0, 0.25, Math.PI * 2 - 0.25); ctx.lineTo(4, 5); ctx.fill();
      ctx.fillStyle = '#4fae4a';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.ellipse(0, 0, p.r, p.r * 0.92, 0, 0.25, Math.PI * 2 - 0.25); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,90,40,.6)'; ctx.lineWidth = 1;
      for (let a = 0.6; a < 6; a += 0.9) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * p.r * 0.85, Math.sin(a) * p.r * 0.8); ctx.stroke(); }
      if (p.flower) {
        for (let k2 = 0; k2 < 8; k2++) {
          const a = (k2 / 8) * 6.28 + 0.2;
          ctx.fillStyle = k2 % 2 ? '#ffb7c5' : '#ff8fab';
          ctx.beginPath(); ctx.ellipse(Math.cos(a) * p.r * 0.28, Math.sin(a) * p.r * 0.28, p.r * 0.3, p.r * 0.13, a, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.12, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // лепестки с ветки
    if (Math.random() < 0.05 * f60 && petals.length < 40) petals.push({ x: R.rand(w * 0.6, w), y: R.rand(0, h * 0.2), z: h * R.rand(0.3, 0.95), r: R.rand(0, 6), vr: R.rand(-2, 2), fl: 0, onWater: false, l: 8 });
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      if (!p.onWater) {
        p.y += 45 * dt; p.x -= 22 * dt + Math.sin(t * 2 + p.r) * 0.4; p.r += p.vr * dt; p.fl += dt * 4;
        if (p.y >= p.z) { p.onWater = true; disturb(p.x, p.y, 1, 700); }
      } else {
        const gx = R.clamp((p.x / sc) | 0, 1, gw - 2), gy = R.clamp((p.y / sc) | 0, 1, gh - 2), ii = gy * gw + gx;
        p.x += (b1[ii - 1] - b1[ii + 1]) * 0.002 - 4 * dt; p.y += (b1[ii - gw] - b1[ii + gw]) * 0.002;
        p.l -= dt;
        if (p.l <= 0) { petals.splice(i, 1); continue; }
      }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.scale(p.onWater ? 1 : Math.cos(p.fl), 1);
      ctx.globalAlpha = p.onWater ? Math.min(1, p.l / 2) : 1;
      ctx.fillStyle = '#ffc2d1';
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.6, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fg, 0, 0);
  }

  R.scenes = R.scenes || {};
  R.scenes.spring = {
    el: cv,
    start() { if (inited) return; setup(); inited = true; R.onSize(cv, setup); },
    frame,
  };
})();
