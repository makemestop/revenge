/* autumn.js — запотевшее стекло с каплями дождя, за ним ночной город. Пальцем стекло протирается */
(() => {
  const { $ } = R;
  const cv = $('#scAutumn');
  const ctx = cv.getContext('2d');
  let w = 1, h = 1, d = 1, sharp, blur, mask, mctx, tmp, tctx, inited = false;
  let small = [], big = [], leaves = [], t = 0;
  let px = -1, py = -1, lpx = -1, lpy = -1;

  function makeCanvas(W, H) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H)); return c; }

  function paintCity() {
    sharp = makeCanvas(w * d, h * d);
    const c = sharp.getContext('2d');
    c.scale(d, d);
    let g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1030'); g.addColorStop(0.5, '#2a1c4a'); g.addColorStop(0.78, '#6a3050'); g.addColorStop(1, '#2a1426');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // луна за облаками
    g = c.createRadialGradient(w * 0.75, h * 0.18, 0, w * 0.75, h * 0.18, h * 0.12);
    g.addColorStop(0, 'rgba(255,240,220,.9)'); g.addColorStop(0.3, 'rgba(255,220,200,.3)'); g.addColorStop(1, 'rgba(255,220,200,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // дальние дома
    const rows = [
      { base: h * 0.74, maxH: h * 0.42, col: '#1d1636', win: 0.22, ww: 3 },
      { base: h * 0.86, maxH: h * 0.5, col: '#120d22', win: 0.32, ww: 5 },
    ];
    rows.forEach((row) => {
      let x = -20;
      while (x < w + 20) {
        const bw = R.rand(40, 110) * (row.ww / 4 + 0.5);
        const bh = R.rand(row.maxH * 0.35, row.maxH);
        c.fillStyle = row.col;
        c.fillRect(x, row.base - bh, bw, bh + 4);
        for (let wy = row.base - bh + 10; wy < row.base - 8; wy += row.ww * 3) {
          for (let wx = x + 6; wx < x + bw - 6; wx += row.ww * 2.6) {
            if (Math.random() < row.win) {
              c.fillStyle = Math.random() < 0.8 ? `rgba(255,${R.rand(180, 220) | 0},120,${R.rand(0.5, 0.95)})` : 'rgba(150,200,255,.7)';
              c.fillRect(wx, wy, row.ww * 1.4, row.ww * 1.8);
            }
          }
        }
        x += bw + R.rand(2, 10);
      }
    });
    // неоновая вывеска
    const nx = w * 0.18, ny = h * 0.5;
    c.save();
    c.shadowColor = '#ff3df0'; c.shadowBlur = 24;
    c.strokeStyle = '#ffb3f6'; c.lineWidth = 3;
    c.strokeRect(nx, ny, 120, 46);
    c.font = '400 30px "Dela Gothic One", sans-serif';
    c.fillStyle = '#fff0fd';
    c.fillText('カフェ', nx + 14, ny + 35);
    c.restore();
    // улица
    g = c.createLinearGradient(0, h * 0.86, 0, h);
    g.addColorStop(0, '#24142a'); g.addColorStop(1, '#0c0810');
    c.fillStyle = g; c.fillRect(0, h * 0.86, w, h * 0.14);
    // фонари
    for (let i = 0; i < 6; i++) {
      const lx = w * (0.08 + i * 0.18), ly = h * 0.66;
      c.fillStyle = '#0a0710'; c.fillRect(lx - 2, ly, 4, h * 0.22);
      g = c.createRadialGradient(lx, ly, 0, lx, ly, h * 0.12);
      g.addColorStop(0, 'rgba(255,220,150,1)'); g.addColorStop(0.08, 'rgba(255,200,120,.8)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, h * 0.12, 0, 7); c.fill();
    }
    // осенние деревья
    for (let i = 0; i < 9; i++) {
      const tx = w * (i / 8) + R.rand(-30, 30), ty = h * R.rand(0.8, 0.9), s = R.rand(40, 80) * (w / 1400 + 0.5);
      c.fillStyle = '#1a0f12'; c.fillRect(tx - 3, ty, 6, h - ty);
      for (let k = 0; k < 26; k++) {
        const a = R.rand(0, 6.28), rr = R.rand(0, s);
        c.fillStyle = R.pick(['#ff7a1a', '#e8501a', '#ffb02e', '#c8321e', '#ff9a3c']);
        c.globalAlpha = R.rand(0.55, 0.95);
        c.beginPath(); c.arc(tx + Math.cos(a) * rr, ty - s * 0.6 + Math.sin(a) * rr * 0.7, R.rand(6, 16), 0, 7); c.fill();
      }
      c.globalAlpha = 1;
    }
    // огни машин
    for (let i = 0; i < 14; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(255,60,60,.9)' : 'rgba(255,250,220,.95)';
      c.beginPath(); c.arc(R.rand(0, w), h * R.rand(0.9, 0.95), R.rand(2, 4), 0, 7); c.fill();
    }

    // размытая версия + боке
    blur = makeCanvas(w * d, h * d);
    const b = blur.getContext('2d');
    const s1 = makeCanvas(w / 10, h / 10), s2 = makeCanvas(w / 4, h / 4);
    s2.getContext('2d').drawImage(sharp, 0, 0, s2.width, s2.height);
    s1.getContext('2d').drawImage(s2, 0, 0, s1.width, s1.height);
    s2.getContext('2d').drawImage(s1, 0, 0, s2.width, s2.height);
    b.imageSmoothingQuality = 'high';
    b.drawImage(s2, 0, 0, blur.width, blur.height);
    b.scale(d, d);
    for (let i = 0; i < 40; i++) {
      const x = R.rand(0, w), y = R.rand(h * 0.4, h), r = R.rand(14, 46);
      const col = R.pick(['255,200,120', '255,140,80', '255,90,140', '150,190,255']);
      g = b.createRadialGradient(x, y, r * 0.6, x, y, r);
      g.addColorStop(0, `rgba(${col},.22)`); g.addColorStop(0.9, `rgba(${col},.3)`); g.addColorStop(1, `rgba(${col},0)`);
      b.fillStyle = g; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill();
    }
    b.fillStyle = 'rgba(190,200,230,.13)';
    b.fillRect(0, 0, w, h);
  }

  // спрайт мелкой капли
  const dropSprite = (() => {
    const c = makeCanvas(48, 48), x = c.getContext('2d');
    let g = x.createRadialGradient(24, 20, 2, 24, 24, 22);
    g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.7, 'rgba(255,255,255,.05)'); g.addColorStop(0.92, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(24, 24, 22, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(17, 15, 5, 3, -0.6, 0, 7); x.fill();
    return c;
  })();
  const leafSprite = (() => {
    const c = makeCanvas(60, 60), x = c.getContext('2d');
    x.translate(30, 30);
    x.fillStyle = '#ff7a1a';
    x.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.62;
      x.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
      x.lineTo(Math.cos(a + 0.31) * 11, Math.sin(a + 0.31) * 11);
    }
    x.lineTo(0, 10); x.closePath(); x.fill();
    x.strokeStyle = '#b8400a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 22); x.lineTo(0, -16); x.stroke();
    const small = makeCanvas(15, 15);
    small.getContext('2d').drawImage(c, 0, 0, 15, 15);
    const out = makeCanvas(60, 60);
    out.getContext('2d').drawImage(small, 0, 0, 60, 60);
    return out;
  })();

  function setup() {
    const r = R.fit(cv, 1.5);
    w = r.w; h = r.h; d = r.d;
    paintCity();
    mask = makeCanvas(w / 2, h / 2); mctx = mask.getContext('2d');
    tmp = makeCanvas(w * d, h * d); tctx = tmp.getContext('2d');
    small = [];
    const n = Math.round((w * h) / 2200);
    for (let i = 0; i < n; i++) small.push(newSmall());
    big = [];
    for (let i = 0; i < Math.round(w / 60); i++) big.push(newBig(R.rand(0, h)));
    leaves = Array.from({ length: 7 }, () => ({ x: R.rand(0, w), y: R.rand(-h, h), r: R.rand(0, 6), vr: R.rand(-1, 1), s: R.rand(24, 54), sp: R.rand(30, 60), ph: R.rand(0, 6) }));
  }
  const newSmall = () => ({ x: R.rand(0, w), y: R.rand(0, h), r: Math.pow(Math.random(), 2.5) * 4 + 1.2 });
  const newBig = (y) => ({ x: R.rand(0, w), y: y ?? R.rand(-50, h * 0.6), r: R.rand(5, 10), vy: 0, stick: R.rand(0.5, 3), wob: R.rand(0, 6), lastTrail: 0 });

  function wipe(x0, y0, x1, y1) {
    mctx.globalCompositeOperation = 'source-over';
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 6));
    const rad = (R.small() ? 28 : 40) / 2;
    for (let i = 0; i <= steps; i++) {
      const x = (x0 + (x1 - x0) * (i / steps)) / 2, y = (y0 + (y1 - y0) * (i / steps)) / 2;
      const g = mctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g; mctx.beginPath(); mctx.arc(x, y, rad, 0, 7); mctx.fill();
    }
    // стираем мелкие капли на пути пальца
    const rr = rad * 2;
    small = small.filter((s) => distToSeg(s.x, s.y, x0, y0, x1, y1) > rr * 0.8);
  }
  function distToSeg(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy;
    let k = l ? ((px - x0) * dx + (py - y0) * dy) / l : 0;
    k = R.clamp(k, 0, 1);
    return Math.hypot(px - (x0 + dx * k), py - (y0 + dy * k));
  }

  cv.addEventListener('pointermove', (e) => {
    if (!inited) return;
    const r = cv.getBoundingClientRect();
    px = e.clientX - r.left; py = e.clientY - r.top;
    if (lpx >= 0) wipe(lpx, lpy, px, py);
    lpx = px; lpy = py;
  }, { passive: true });
  cv.addEventListener('pointerleave', () => { lpx = lpy = -1; });
  cv.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') lpx = lpy = -1; });

  function frame(dt) {
    t += dt;
    const f = dt * 60;
    // туман возвращается
    mctx.globalCompositeOperation = 'destination-out';
    mctx.fillStyle = `rgba(0,0,0,${0.0045 * f})`;
    mctx.fillRect(0, 0, mask.width, mask.height);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(blur, 0, 0);
    // протёртое — резкое
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(mask, 0, 0, tmp.width, tmp.height);
    tctx.globalCompositeOperation = 'source-in';
    tctx.drawImage(sharp, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);

    // листья за стеклом
    for (const l of leaves) {
      l.y += l.sp * dt; l.x += Math.sin(t + l.ph) * 20 * dt; l.r += l.vr * dt;
      if (l.y > h + 60) { l.y = -60; l.x = R.rand(0, w); }
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.globalAlpha = 0.75;
      ctx.drawImage(leafSprite, -l.s / 2, -l.s / 2, l.s, l.s); ctx.restore();
    }
    ctx.globalAlpha = 1;

    // новые мелкие капли
    if (Math.random() < 0.6 * f) small.push(newSmall());
    if (small.length > (w * h) / 1500) small.splice(0, small.length - (w * h) / 1500);
    for (const s of small) ctx.drawImage(dropSprite, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);

    // крупные капли
    if (Math.random() < 0.02 * f && big.length < w / 30) big.push(newBig());
    const sd = d;
    for (let i = big.length - 1; i >= 0; i--) {
      const b = big[i];
      if (b.stick > 0) { b.stick -= dt; if (Math.random() < 0.01) b.r += 0.4; }
      else {
        b.vy = Math.min(b.vy + dt * (b.r * 9), b.r * 18);
        b.y += b.vy * dt;
        b.wob += dt * 3;
        b.x += Math.sin(b.wob) * 0.25 * f;
        // след
        if (b.y - b.lastTrail > b.r * 1.4) {
          b.lastTrail = b.y;
          if (Math.random() < 0.7) small.push({ x: b.x + R.rand(-1, 1), y: b.y - b.r * 1.5, r: R.rand(1.2, b.r * 0.35) });
          mctx.globalCompositeOperation = 'source-over';
          mctx.fillStyle = 'rgba(0,0,0,.55)';
          mctx.beginPath(); mctx.ellipse(b.x / 2, (b.y - b.r) / 2, b.r * 0.35, b.r * 0.9, 0, 0, 7); mctx.fill();
        }
        if (Math.random() < 0.004 * f) { b.stick = R.rand(0.3, 1.2); b.vy = 0; }
      }
      // впитывает мелкие капли
      for (let k = small.length - 1; k >= 0; k--) {
        const s = small[k];
        const dx = s.x - b.x, dy = s.y - b.y;
        if (dx * dx + dy * dy < (b.r + s.r) * (b.r + s.r)) { small.splice(k, 1); b.r = Math.min(16, b.r + s.r * 0.08); }
      }
      if (b.y - b.r > h) { big.splice(i, 1); continue; }
      // линза: перевёрнутый резкий город внутри капли
      const r = b.r, ry = r * 1.12;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(b.x, b.y, r, ry, 0, 0, 7); ctx.clip();
      ctx.translate(b.x, b.y); ctx.scale(1, -1);
      // капля работает как линза: показывает большой кусок города (с огнями) вверх ногами
      const span = r * 16;
      const sx = R.clamp(b.x - span / 2, 0, w - span), sy = R.clamp(b.y - span * 0.2, 0, h - span);
      ctx.drawImage(sharp, sx * sd, sy * sd, span * sd, span * sd, -r, -ry, r * 2, ry * 2);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(120,110,160,.35)';
      ctx.fillRect(-r, -ry, r * 2, ry * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      const g = ctx.createRadialGradient(b.x, b.y - r * 0.2, r * 0.4, b.x, b.y, ry);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,.08)'); g.addColorStop(1, 'rgba(20,10,30,.4)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(b.x, b.y, r, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(b.x - r * 0.35, b.y - ry * 0.45, r * 0.22, r * 0.13, -0.6, 0, 7); ctx.fill();
    }
  }

  R.scenes = R.scenes || {};
  R.scenes.autumn = {
    el: cv,
    start() {
      if (inited) return;
      setup(); inited = true;
      R.onSize(cv, () => setup());
    },
    frame,
  };
})();
