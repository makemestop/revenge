/* gravity.js — элементы страницы становятся физическими телами: невесомость, падение, броски */
(() => {
  const { $, $$ } = R;
  const M = window.Matter;
  if (!M) return;
  const { Engine, Bodies, Body, Composite, Constraint } = M;
  const sec = $('#gravity');
  const btnZero = $('#gvZero'), btnDrop = $('#gvDrop'), btnReset = $('#gvReset'), hint = $('#gvHint');
  let engine = null, items = [], active = false, grab = null, loop = null;

  function start() {
    if (active) return;
    active = true;
    engine = Engine.create();
    engine.gravity.y = 0;
    const sr = sec.getBoundingClientRect();
    const W = sr.width, H = sr.height, T = 200;
    const wall = { isStatic: true, restitution: 0.6, friction: 0.2 };
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, wall),
      Bodies.rectangle(W / 2, -T / 2, W + T * 2, T, wall),
      Bodies.rectangle(-T / 2, H / 2, T, H + T * 2, wall),
      Bodies.rectangle(W + T / 2, H / 2, T, H + T * 2, wall),
    ]);
    items = $$('.gbody', sec).map((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - sr.left, cy = r.top + r.height / 2 - sr.top;
      const round = el.classList.contains('gv-badge') || el.classList.contains('gv-sticker');
      const opts = { restitution: 0.85, friction: 0.05, frictionAir: 0.012, density: 0.0015 };
      const b = round
        ? Bodies.circle(cx, cy, Math.max(r.width, r.height) / 2, opts)
        : Bodies.rectangle(cx, cy, r.width, r.height, Object.assign({ chamfer: { radius: Math.min(14, r.height / 2 - 1) } }, opts));
      Body.setVelocity(b, { x: R.rand(-2.5, 2.5), y: R.rand(-3, 1) });
      Body.setAngularVelocity(b, R.rand(-0.03, 0.03));
      Composite.add(engine.world, b);
      el.classList.remove('restoring');
      el.classList.add('phys');
      return { el, b, ox: cx, oy: cy };
    });
    btnZero.hidden = true; btnDrop.hidden = false; btnReset.hidden = false; hint.hidden = false;
    btnDrop.textContent = 'Уронить всё';
    loop.set(true);
  }

  function drop() {
    if (!active) return;
    if (engine.gravity.y === 0) {
      engine.gravity.y = 1.1;
      items.forEach(({ b }) => { b.restitution = 0.35; b.frictionAir = 0.004; b.friction = 0.3; });
      btnDrop.textContent = 'Снова невесомость';
    } else {
      engine.gravity.y = 0;
      items.forEach(({ b }) => {
        b.restitution = 0.85; b.frictionAir = 0.012;
        Body.setVelocity(b, { x: R.rand(-4, 4), y: R.rand(-9, -4) });
        Body.setAngularVelocity(b, R.rand(-0.05, 0.05));
      });
      btnDrop.textContent = 'Уронить всё';
    }
  }

  function reset() {
    if (!active) return;
    active = false;
    loop.set(false);
    items.forEach(({ el }, i) => {
      el.classList.add('restoring');
      el.style.transitionDelay = `${i * 25}ms`;
      el.style.transform = '';
      setTimeout(() => { el.classList.remove('phys', 'restoring'); el.style.transitionDelay = ''; }, 1000 + i * 25);
    });
    Composite.clear(engine.world, false);
    engine = null; items = []; grab = null;
    btnZero.hidden = false; btnDrop.hidden = true; btnReset.hidden = true; hint.hidden = true;
  }

  btnZero.addEventListener('click', start);
  btnDrop.addEventListener('click', drop);
  btnReset.addEventListener('click', reset);

  // хватаем и бросаем
  sec.addEventListener('pointerdown', (e) => {
    if (!active) return;
    const el = e.target.closest('.gbody.phys');
    if (!el) return;
    const it = items.find((x) => x.el === el);
    if (!it) return;
    e.preventDefault();
    const sr = sec.getBoundingClientRect();
    const p = { x: e.clientX - sr.left, y: e.clientY - sr.top };
    const local = { x: p.x - it.b.position.x, y: p.y - it.b.position.y };
    const cos = Math.cos(-it.b.angle), sin = Math.sin(-it.b.angle);
    const c = Constraint.create({ pointA: p, bodyB: it.b, pointB: { x: local.x * cos - local.y * sin, y: local.x * sin + local.y * cos }, stiffness: 0.25, damping: 0.05, length: 0 });
    Composite.add(engine.world, c);
    grab = { c, id: e.pointerId };
    sec.setPointerCapture(e.pointerId);
  });
  sec.addEventListener('pointermove', (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    const sr = sec.getBoundingClientRect();
    grab.c.pointA = { x: e.clientX - sr.left, y: e.clientY - sr.top };
  });
  const letGo = (e) => { if (grab && e.pointerId === grab.id) { if (engine) Composite.remove(engine.world, grab.c); grab = null; } };
  sec.addEventListener('pointerup', letGo);
  sec.addEventListener('pointercancel', letGo);

  loop = R.loop(sec, () => {
    if (!active) return;
    Engine.update(engine, 1000 / 60);
    for (const it of items) {
      const { b, el, ox, oy } = it;
      el.style.transform = `translate(${b.position.x - ox}px, ${b.position.y - oy}px) rotate(${b.angle}rad)`;
    }
  });
  loop.set(false);
  addEventListener('resize', () => { if (active && Math.abs(innerWidth - (sec.lastW || innerWidth)) > 60) reset(); sec.lastW = innerWidth; });
})();
