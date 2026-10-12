/* summer.js — «Суйка»: бросай фрукты, одинаковые сливаются в фрукт побольше */
(() => {
  const { $ } = R;
  const cv = $('#scSummer');
  const ctx = cv.getContext('2d');
  const M = window.Matter;
  if (!M) return;
  const { Engine, Bodies, Body, Composite, Events } = M;

  // 11 ступеней: вишня → … → арбуз
  const FRUITS = [
    { n: 'Вишня', r: 1, c: '#e3263b', d: '#a8142a' },
    { n: 'Клубника', r: 1.32, c: '#ff4d5e', d: '#c62839' },
    { n: 'Виноград', r: 1.68, c: '#9b59d0', d: '#6b3399' },
    { n: 'Мандарин', r: 2.05, c: '#ffab2e', d: '#d97e00' },
    { n: 'Апельсин', r: 2.5, c: '#ff8c1a', d: '#cc6200' },
    { n: 'Яблоко', r: 2.95, c: '#ef3b3b', d: '#b51f1f' },
    { n: 'Груша', r: 3.4, c: '#c8dc4a', d: '#93a72a' },
    { n: 'Персик', r: 3.9, c: '#ffb08a', d: '#e8806a' },
    { n: 'Ананас', r: 4.45, c: '#ffd23f', d: '#d6a400' },
    { n: 'Дыня', r: 5.05, c: '#b9e27c', d: '#86b84a' },
    { n: 'Арбуз', r: 5.75, c: '#3fae49', d: '#21772b' },
  ];
  const POINTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];

  let engine, w = 1, h = 1, d = 1, jar = null, base = 10;
  let bodies = [], current = 0, upcoming = 0, aimX = 0, canDrop = true, dropT = 0;
  let score = 0, best = R.store.get('suikaBest', 0), over = false, overT = 0;
  let juice = [], bg = null, inited = false, time = 0;
  const scoreEl = $('#skScore'), bestEl = $('#skBest'), overEl = $('#skOver'), finalEl = $('#skFinal');
  const nextCv = $('#skNext'), nctx = nextCv.getContext('2d');
  bestEl.textContent = best;

  function layout() {
    const r = R.fit(cv, 2);
    w = r.w; h = r.h; d = r.d;
    const top = R.small() ? 238 : Math.max(150, h * 0.2);
    const bottom = R.small() ? 96 : 132;
    const maxW = R.small() ? w * 0.74 : Math.min(460, w * 0.4);
    const jh = h - top - bottom;
    const jw = Math.min(maxW, jh * 0.86);
    jar = { x: w / 2 - jw / 2 - (R.small() ? w * 0.09 : 0), y: top, w: jw, h: jh };
    base = jw * 0.052;
    aimX = jar.x + jar.w / 2;
    paintBg();
  }

  function paintBg() {
    bg = document.createElement('canvas');
    bg.width = Math.round(w * d); bg.height = Math.round(h * d);
    const b = bg.getContext('2d');
    b.scale(d, d);
    let g = b.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.45, '#d9f1ff'); g.addColorStop(0.62, '#ffe3c2');
    g.addColorStop(0.63, '#3cb8d6'); g.addColorStop(0.72, '#7fd9e0'); g.addColorStop(0.73, '#f6dfae'); g.addColorStop(1, '#eccb8a');
    b.fillStyle = g; b.fillRect(0, 0, w, h);
    // солнце
    const sx = w * 0.82, sy = h * 0.22;
    g = b.createRadialGradient(sx, sy, 0, sx, sy, h * 0.3);
    g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.18, 'rgba(255,236,150,.95)'); g.addColorStop(0.2, 'rgba(255,220,120,.35)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    b.fillStyle = g; b.fillRect(0, 0, w, h);
    // облака
    b.fillStyle = 'rgba(255,255,255,.85)';
    [[0.15, 0.16, 1], [0.55, 0.1, 0.7], [0.32, 0.3, 0.6]].forEach(([x, y, s]) => {
      const cx = w * x, cy = h * y, k = 40 * s * (w / 1200 + 0.5);
      b.beginPath();
      b.arc(cx, cy, k, 0, 7); b.arc(cx + k, cy - k * 0.4, k * 1.2, 0, 7); b.arc(cx + k * 2.2, cy, k * 0.9, 0, 7);
      b.fill();
    });
    // блики на воде
    b.strokeStyle = 'rgba(255,255,255,.55)'; b.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, y = h * (0.64 + Math.random() * 0.08), l = 10 + Math.random() * 30;
      b.beginPath(); b.moveTo(x, y); b.lineTo(x + l, y); b.stroke();
    }
    // пальма слева (на телефоне её нет — места мало)
    if (!R.small()) {
      b.save();
      b.translate(w * 0.06, h);
      b.strokeStyle = '#8a5a2b'; b.lineWidth = Math.max(10, w * 0.012); b.lineCap = 'round';
      b.beginPath(); b.moveTo(0, 0); b.quadraticCurveTo(w * 0.03, -h * 0.35, w * 0.08, -h * 0.62); b.stroke();
      b.translate(w * 0.08, -h * 0.62);
      b.fillStyle = '#2f9e4f';
      for (let i = 0; i < 7; i++) {
        b.save(); b.rotate(-2.6 + i * 0.75);
        b.beginPath(); b.ellipse(h * 0.11, 0, h * 0.12, h * 0.025, 0.25, 0, 7); b.fill();
        b.restore();
      }
      b.restore();
    }
  }

  function radius(lvl) { return FRUITS[lvl].r * base; }

  function initWorld() {
    engine = Engine.create();
    engine.gravity.y = 1.15;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    const t = 60;
    const opts = { isStatic: true, friction: 0.4, restitution: 0.1, label: 'wall' };
    Composite.add(engine.world, [
      Bodies.rectangle(jar.x + jar.w / 2, jar.y + jar.h + t / 2, jar.w + t * 2, t, opts),
      Bodies.rectangle(jar.x - t / 2, jar.y + jar.h / 2 - 200, t, jar.h + 400, opts),
      Bodies.rectangle(jar.x + jar.w + t / 2, jar.y + jar.h / 2 - 200, t, jar.h + 400, opts),
    ]);
    Events.on(engine, 'collisionStart', onCollide);
    Events.on(engine, 'collisionActive', onCollide);
    bodies = [];
    juice = [];
    score = 0; over = false; overT = 0;
    scoreEl.textContent = '0';
    overEl.hidden = true;
    current = randLvl(); upcoming = randLvl();
    canDrop = true;
    drawNext();
  }

  function randLvl() { return (Math.random() * 5) | 0; }

  function makeFruit(lvl, x, y) {
    const b = Bodies.circle(x, y, radius(lvl), { restitution: 0.12, friction: 0.25, frictionAir: 0.004, density: 0.0012, label: 'fruit' });
    b.lvl = lvl; b.born = time; b.pop = 0;
    Composite.add(engine.world, b);
    bodies.push(b);
    return b;
  }

  const merges = [];
  function onCollide(ev) {
    for (const pr of ev.pairs) {
      const a = pr.bodyA, b = pr.bodyB;
      if (a.label !== 'fruit' || b.label !== 'fruit' || a.lvl !== b.lvl || a.gone || b.gone) continue;
      a.gone = b.gone = true;
      merges.push([a, b]);
    }
  }
  function doMerges() {
    while (merges.length) {
      const [a, b] = merges.shift();
      Composite.remove(engine.world, a); Composite.remove(engine.world, b);
      bodies = bodies.filter((x) => x !== a && x !== b);
      const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
      const lvl = a.lvl;
      score += POINTS[lvl] * 2;
      splash(x, y, FRUITS[lvl].c, radius(lvl));
      if (lvl < FRUITS.length - 1) {
        const nb = makeFruit(lvl + 1, x, y);
        Body.setVelocity(nb, { x: (a.velocity.x + b.velocity.x) / 2, y: (a.velocity.y + b.velocity.y) / 2 - 1 });
        nb.pop = 1;
        if (lvl + 1 === FRUITS.length - 1) {
          const r = cv.getBoundingClientRect();
          R.confetti(r.left + x, r.top + y, 120);
        }
      } else {
        score += 200;
        const r = cv.getBoundingClientRect();
        R.confetti(r.left + x, r.top + y, 200);
      }
      scoreEl.textContent = score;
      scoreEl.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
      if (score > best) { best = score; bestEl.textContent = best; R.store.set('suikaBest', best); }
      plop(lvl);
    }
  }

  function splash(x, y, c, r) {
    for (let i = 0; i < 18; i++) {
      const a = R.rand(0, 6.28), v = R.rand(80, 260);
      juice.push({ x: x + Math.cos(a) * r * 0.6, y: y + Math.sin(a) * r * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, l: R.rand(0.4, 0.8), s: R.rand(2, 5), c });
    }
  }

  // мягкий «плюх» при слиянии
  function plop(lvl) {
    const ac = R.ac;
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    const f = 520 - lvl * 32;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.2);
  }

  /* ---------- рисование фруктов ---------- */
  function drawFruit(c, lvl, x, y, ang, scale = 1) {
    const F = FRUITS[lvl];
    const r = radius(lvl) * scale;
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    // тело
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, lighten(F.c, 0.35)); g.addColorStop(0.6, F.c); g.addColorStop(1, F.d);
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.lineWidth = Math.max(1.5, r * 0.06); c.strokeStyle = F.d; c.stroke();
    detail(c, lvl, r);
    // блик
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
    // мордочка
    const ey = r * 0.02, ex = r * 0.28, es = Math.max(1.6, r * 0.09);
    c.fillStyle = '#2a1a1a';
    c.beginPath(); c.arc(-ex, ey, es, 0, 7); c.arc(ex, ey, es, 0, 7); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-ex + es * 0.35, ey - es * 0.35, es * 0.35, 0, 7); c.arc(ex + es * 0.35, ey - es * 0.35, es * 0.35, 0, 7); c.fill();
    c.strokeStyle = '#2a1a1a'; c.lineWidth = Math.max(1.2, r * 0.05); c.lineCap = 'round';
    c.beginPath(); c.arc(0, ey + r * 0.12, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,120,150,.45)';
    c.beginPath(); c.ellipse(-ex * 1.45, ey + r * 0.16, r * 0.11, r * 0.06, 0, 0, 7); c.ellipse(ex * 1.45, ey + r * 0.16, r * 0.11, r * 0.06, 0, 0, 7); c.fill();
    c.restore();
  }

  function leaf(c, x, y, s, a, col = '#3aa655') {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = col;
    c.beginPath(); c.ellipse(s * 0.5, 0, s * 0.55, s * 0.22, 0, 0, 7); c.fill();
    c.restore();
  }

  function detail(c, lvl, r) {
    switch (lvl) {
      case 0: // вишня
        c.strokeStyle = '#4a7a2a'; c.lineWidth = Math.max(1.5, r * 0.1);
        c.beginPath(); c.moveTo(0, -r * 0.85); c.quadraticCurveTo(r * 0.3, -r * 1.5, r * 0.7, -r * 1.6); c.stroke();
        leaf(c, r * 0.55, -r * 1.55, r * 0.7, -0.4);
        break;
      case 1: // клубника
        c.fillStyle = '#ffe9a0';
        for (let i = 0; i < 10; i++) { const a = i * 2.4, rr = r * (0.3 + (i % 3) * 0.2); c.beginPath(); c.ellipse(Math.cos(a) * rr, Math.sin(a) * rr + r * 0.1, r * 0.05, r * 0.08, a, 0, 7); c.fill(); }
        for (let i = -2; i <= 2; i++) leaf(c, 0, -r * 0.88, r * 0.55, -Math.PI / 2 + i * 0.55, '#2f9a4a');
        break;
      case 2: // виноград
        c.fillStyle = 'rgba(255,255,255,.14)';
        for (let i = 0; i < 7; i++) { const a = i * 0.9; c.beginPath(); c.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.3, 0, 7); c.fill(); }
        c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(1.5, r * 0.08);
        c.beginPath(); c.moveTo(0, -r * 0.9); c.lineTo(r * 0.1, -r * 1.25); c.stroke();
        leaf(c, r * 0.1, -r * 1.1, r * 0.6, -0.3, '#5aa83a');
        break;
      case 3: case 4: // цитрусы
        c.fillStyle = 'rgba(255,255,255,.18)';
        for (let i = 0; i < 16; i++) { const a = i * 2.39, rr = r * Math.sqrt((i + 0.5) / 16) * 0.85; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.035, 0, 7); c.fill(); }
        leaf(c, 0, -r * 0.92, r * 0.6, -0.5, '#3a9a3a');
        break;
      case 5: // яблоко
        c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(1.5, r * 0.07);
        c.beginPath(); c.moveTo(0, -r * 0.8); c.quadraticCurveTo(r * 0.05, -r * 1.1, r * 0.15, -r * 1.25); c.stroke();
        leaf(c, r * 0.1, -r * 1.05, r * 0.55, -0.6, '#3a9a3a');
        break;
      case 6: // груша
        c.fillStyle = 'rgba(120,90,20,.18)';
        for (let i = 0; i < 12; i++) { const a = i * 2.1, rr = r * (0.2 + (i % 4) * 0.17); c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.03, 0, 7); c.fill(); }
        c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(1.5, r * 0.06);
        c.beginPath(); c.moveTo(0, -r * 0.85); c.lineTo(-r * 0.05, -r * 1.2); c.stroke();
        break;
      case 7: // персик
        c.strokeStyle = 'rgba(200,90,80,.45)'; c.lineWidth = Math.max(1.5, r * 0.05);
        c.beginPath(); c.moveTo(-r * 0.05, -r * 0.95); c.quadraticCurveTo(-r * 0.4, -r * 0.2, -r * 0.1, r * 0.5); c.stroke();
        leaf(c, 0, -r * 0.92, r * 0.5, -0.8, '#4aa043');
        break;
      case 8: // ананас
        c.save(); c.beginPath(); c.arc(0, 0, r * 0.97, 0, 7); c.clip();
        c.strokeStyle = 'rgba(150,100,0,.35)'; c.lineWidth = Math.max(1, r * 0.035);
        for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * r * 0.3 - r, -r); c.lineTo(i * r * 0.3 + r, r); c.stroke(); c.beginPath(); c.moveTo(i * r * 0.3 + r, -r); c.lineTo(i * r * 0.3 - r, r); c.stroke(); }
        c.restore();
        for (let i = -2; i <= 2; i++) leaf(c, 0, -r * 0.9, r * 0.75, -Math.PI / 2 + i * 0.32, '#2f8f3f');
        break;
      case 9: // дыня
        c.save(); c.beginPath(); c.arc(0, 0, r * 0.97, 0, 7); c.clip();
        c.strokeStyle = 'rgba(255,255,230,.4)'; c.lineWidth = Math.max(1, r * 0.025);
        for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-r + i * r * 0.25, -r); c.quadraticCurveTo(-r * 0.4 + i * r * 0.2, 0, -r + i * r * 0.25, r); c.stroke(); }
        for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-r, -r + i * r * 0.25); c.quadraticCurveTo(0, -r * 0.4 + i * r * 0.2, r, -r + i * r * 0.25); c.stroke(); }
        c.restore();
        break;
      case 10: // арбуз
        c.save(); c.beginPath(); c.arc(0, 0, r * 0.97, 0, 7); c.clip();
        c.fillStyle = '#1d6b27';
        for (let i = -3; i <= 3; i++) {
          c.beginPath();
          c.moveTo(i * r * 0.3, -r);
          for (let y = -r; y <= r; y += r * 0.1) c.lineTo(i * r * 0.3 + Math.sin(y / r * 9) * r * 0.05 + (y / r) * i * r * 0.08, y);
          for (let y = r; y >= -r; y -= r * 0.1) c.lineTo(i * r * 0.3 + r * 0.12 + Math.sin(y / r * 9 + 1) * r * 0.05 + (y / r) * i * r * 0.08, y);
          c.fill();
        }
        c.restore();
        break;
    }
  }

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgb(${Math.round(r + (255 - r) * k)},${Math.round(g + (255 - g) * k)},${Math.round(b + (255 - b) * k)})`;
  }

  function drawNext() {
    nctx.clearRect(0, 0, 80, 80);
    const r = radius(upcoming);
    const s = Math.min(1, 26 / r);
    nctx.save();
    nctx.translate(40, 44);
    nctx.scale(s, s);
    drawFruit(nctx, upcoming, 0, 0, 0);
    nctx.restore();
  }

  /* ---------- управление ---------- */
  function aim(e) {
    const r = cv.getBoundingClientRect();
    const rr = radius(current);
    aimX = R.clamp(e.clientX - r.left, jar.x + rr + 2, jar.x + jar.w - rr - 2);
  }
  let downX = 0, downY = 0, downT = 0;
  cv.addEventListener('pointermove', (e) => { if (inited) aim(e); }, { passive: true });
  cv.addEventListener('pointerdown', (e) => { if (!inited) return; downX = e.clientX; downY = e.clientY; downT = performance.now(); aim(e); });
  cv.addEventListener('pointerup', (e) => {
    if (!inited || over) return;
    // на телефоне не бросаем, если человек скроллил страницу
    if (Math.abs(e.clientY - downY) > 24 && Math.abs(e.clientY - downY) > Math.abs(e.clientX - downX)) return;
    const r = cv.getBoundingClientRect();
    const y = e.clientY - r.top;
    if (y < jar.y - 140 || y > jar.y + jar.h + 40) return;
    aim(e);
    drop();
  });
  function drop() {
    if (!canDrop || over) return;
    R.getAC();
    makeFruit(current, aimX, jar.y - radius(current) - 6);
    current = upcoming; upcoming = randLvl();
    drawNext();
    canDrop = false; dropT = 0.45;
  }
  $('#skRestart').addEventListener('click', () => {
    Composite.clear(engine.world, false);
    Events.off(engine);
    initWorld();
  });

  /* ---------- кадр ---------- */
  function frame(dt) {
    time += dt;
    // фиксированный шаг физики
    const steps = Math.max(1, Math.round(dt / (1 / 60)));
    for (let i = 0; i < Math.min(steps, 3); i++) Engine.update(engine, 1000 / 60);
    doMerges();
    if (!canDrop) { dropT -= dt; if (dropT <= 0) canDrop = true; }

    // проверка переполнения
    const limit = jar.y + 4;
    let danger = false;
    for (const b of bodies) {
      if (time - b.born < 1.4) continue;
      if (b.position.y - radius(b.lvl) < limit && Math.abs(b.velocity.y) < 0.6) danger = true;
    }
    if (!over) {
      overT = danger ? overT + dt : Math.max(0, overT - dt * 2);
      if (overT > 1.6) { over = true; finalEl.textContent = score; overEl.hidden = false; }
    }

    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.drawImage(bg, 0, 0, w, h);

    // банка
    const { x, y, w: jw, h: jh } = jar;
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    roundRect(x - 8, y - 10, jw + 16, jh + 18, 26); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x - 8, y + jh - 18); ctx.quadraticCurveTo(x - 8, y + jh + 8, x + 18, y + jh + 8);
    ctx.lineTo(x + jw - 18, y + jh + 8); ctx.quadraticCurveTo(x + jw + 8, y + jh + 8, x + jw + 8, y + jh - 18); ctx.lineTo(x + jw + 8, y - 10); ctx.stroke();
    // линия опасности
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = overT > 0.1 ? `rgba(229,36,59,${0.5 + Math.sin(time * 14) * 0.4})` : 'rgba(32,48,74,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, limit); ctx.lineTo(x + jw, limit); ctx.stroke();
    ctx.setLineDash([]);

    // прицел и текущий фрукт
    if (!over) {
      const rr = radius(current);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.moveTo(aimX, y - rr); ctx.lineTo(aimX, y + jh); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = canDrop ? 1 : 0.35;
      drawFruit(ctx, current, aimX, y - rr - 6 + Math.sin(time * 3) * 2, Math.sin(time * 2) * 0.08);
      ctx.globalAlpha = 1;
    }

    for (const b of bodies) {
      let s = 1;
      if (b.pop > 0) { b.pop = Math.max(0, b.pop - dt * 4); s = 1 + Math.sin(b.pop * Math.PI) * 0.18; }
      drawFruit(ctx, b.lvl, b.position.x, b.position.y, b.angle, s);
    }
    // сок
    juice = juice.filter((p) => (p.l -= dt) > 0);
    for (const p of juice) {
      p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.min(1, p.l * 2);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // стекло поверх
    const gl = ctx.createLinearGradient(x, 0, x + jw, 0);
    gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(0.12, 'rgba(255,255,255,0)'); gl.addColorStop(0.85, 'rgba(255,255,255,0)'); gl.addColorStop(0.95, 'rgba(255,255,255,.18)');
    ctx.fillStyle = gl; ctx.fillRect(x - 8, y - 10, jw + 16, jh + 18);

    // цепочка эволюции под банкой (на телефоне не помещается рядом с плеером)
    if (R.small()) return;
    const cy = y + jh + (R.small() ? 30 : 36);
    const step = Math.min(30, (jw + 40) / FRUITS.length);
    for (let i = 0; i < FRUITS.length; i++) {
      const cx = x + jw / 2 + (i - (FRUITS.length - 1) / 2) * step;
      ctx.save(); ctx.translate(cx, cy);
      const s = (step * 0.42) / radius(i);
      ctx.scale(s, s);
      drawFruit(ctx, i, 0, 0, 0);
      ctx.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  let lastW = 0;
  R.scenes = R.scenes || {};
  R.scenes.summer = {
    el: cv,
    start() {
      if (!inited) {
        layout(); initWorld(); inited = true; lastW = w;
        R.onSize(cv, () => {
          const r = cv.getBoundingClientRect();
          if (Math.abs(r.width - lastW) < 40 && Math.abs(r.height - h) < 80) { R.fit(cv, 2); return; }
          lastW = r.width;
          layout();
          Composite.clear(engine.world, false); Events.off(engine); initWorld();
        });
      }
    },
    frame,
  };
})();
