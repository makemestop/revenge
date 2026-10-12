/* =========================================================
   core.js — общее: утилиты, цикл анимаций, плеер, курсор,
   навигация, лепестки сакуры, конфетти, пасхалка
   ========================================================= */
(() => {
  const R = (window.R = {});
  const doc = document.documentElement;

  R.$ = (s, r = document) => r.querySelector(s);
  R.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  R.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  R.lerp = (a, b, t) => a + (b - a) * t;
  R.rand = (a, b) => a + Math.random() * (b - a);
  R.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  R.fine = matchMedia('(pointer: fine)').matches;
  R.touch = !R.fine;
  R.small = () => innerWidth < 640;
  R.dpr = (cap = 2) => Math.min(window.devicePixelRatio || 1, cap);

  R.store = {
    get(k, d) { try { const v = localStorage.getItem('rv_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rv_' + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* Подгоняет canvas под CSS-размер. Возвращает {w, h, d}. */
  R.fit = (cv, cap = 2) => {
    const r = cv.getBoundingClientRect();
    const d = R.dpr(cap);
    const W = Math.max(1, Math.round(r.width * d));
    const H = Math.max(1, Math.round(r.height * d));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return { w: r.width, h: r.height, d };
  };

  /* Следит за размером элемента (с защитой от лишних срабатываний) */
  R.onSize = (el, fn) => {
    let lw = -1, lh = -1, raf = 0;
    const ro = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        if (Math.abs(r.width - lw) < 1 && Math.abs(r.height - lh) < 1) return;
        lw = r.width; lh = r.height;
        fn(r.width, r.height);
      });
    });
    ro.observe(el);
  };

  /* ---------- Общий цикл: анимации работают, только когда видны ---------- */
  const loops = new Set();
  let raf = 0, last = 0;
  function frame(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
    last = t;
    let any = false;
    for (const L of loops) {
      if (!L.vis || !L.enabled) continue;
      any = true;
      try { L.fn(dt, t / 1000); } catch (e) { console.error(e); L.enabled = false; }
    }
    if (any && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  R.kick = kick;
  R.loop = (el, fn, margin = '120px') => {
    const L = { fn, vis: false, enabled: true };
    const io = new IntersectionObserver((es) => { L.vis = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: margin });
    io.observe(el);
    L.set = (b) => { L.enabled = b; kick(); };
    loops.add(L);
    return L;
  };
  document.addEventListener('visibilitychange', kick);

  /* Однократный вызов, когда элемент приблизился к экрану */
  R.whenNear = (el, fn, margin = '600px') => {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: margin });
    io.observe(el);
  };

  /* ---------- Звук: общий AudioContext ---------- */
  R.ac = null;
  R.getAC = () => {
    if (!R.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      R.ac = new AC();
    }
    if (R.ac.state === 'suspended') R.ac.resume();
    return R.ac;
  };

  /* ---------- Музыка и плеер ---------- */
  const audio = new Audio('assets/stay.mp3');
  audio.loop = true;
  audio.preload = 'none';
  let gain = null, analyser = null, freq = null, vol = 0.6;
  function ensureGraph() {
    if (gain) return true;
    const ac = R.getAC();
    if (!ac) return false;
    try {
      const src = ac.createMediaElementSource(audio);
      gain = ac.createGain();
      analyser = ac.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      freq = new Uint8Array(analyser.frequencyBinCount);
      src.connect(gain); gain.connect(analyser); analyser.connect(ac.destination);
      gain.gain.value = vol;
      return true;
    } catch (e) { return false; }
  }
  function setVol(v, ramp = 0) {
    vol = v;
    if (gain) {
      const t = R.ac.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(v, t + ramp + 0.02);
    } else audio.volume = v;
  }

  const player = R.$('#player');
  const pcPlay = R.$('#pcPlay');
  const pcBar = R.$('#pcBar');
  const pcCur = R.$('#pcCur');
  const pcDur = R.$('#pcDur');
  const pcVol = R.$('#pcVol');
  const fmt = (s) => (isFinite(s) ? `${(s / 60) | 0}:${String((s % 60) | 0).padStart(2, '0')}` : '0:00');

  R.music = {
    audio,
    get playing() { return !audio.paused; },
    play(fade = 0) {
      ensureGraph();
      if (fade && gain) { gain.gain.value = 0; setVol(vol, fade); }
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    },
    pause() { audio.pause(); },
    toggle() { audio.paused ? this.play(0.4) : this.pause(); },
    levels() {
      if (!analyser || audio.paused) return null;
      analyser.getByteFrequencyData(freq);
      return freq;
    },
  };
  audio.addEventListener('play', () => { player.classList.add('is-playing'); vizLoop.set(true); });
  audio.addEventListener('pause', () => player.classList.remove('is-playing'));
  audio.addEventListener('loadedmetadata', () => (pcDur.textContent = fmt(audio.duration)));
  audio.addEventListener('timeupdate', () => {
    pcCur.textContent = fmt(audio.currentTime);
    pcBar.style.setProperty('--p', audio.duration ? audio.currentTime / audio.duration : 0);
  });
  pcPlay.addEventListener('click', () => R.music.toggle());
  pcVol.addEventListener('input', () => setVol(+pcVol.value, 0.05));
  R.$('#vinylBtn').addEventListener('click', () => player.classList.add('is-open'));
  R.$('#pcClose').addEventListener('click', () => player.classList.remove('is-open'));
  document.addEventListener('pointerdown', (e) => {
    if (player.classList.contains('is-open') && !player.contains(e.target)) player.classList.remove('is-open');
  });
  // перемотка
  const prog = R.$('#pcProgress');
  const seek = (e) => {
    const r = prog.getBoundingClientRect();
    const p = R.clamp((e.clientX - r.left) / r.width, 0, 1);
    if (audio.duration) audio.currentTime = p * audio.duration;
  };
  prog.addEventListener('pointerdown', (e) => {
    prog.setPointerCapture(e.pointerId); seek(e);
    const mv = (ev) => seek(ev);
    prog.addEventListener('pointermove', mv);
    prog.addEventListener('pointerup', () => prog.removeEventListener('pointermove', mv), { once: true });
  });
  prog.addEventListener('keydown', (e) => {
    if (!audio.duration) return;
    if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
  R.player = { setHidden(h) { player.classList.toggle('is-hidden', h); if (h) player.classList.remove('is-open'); } };

  // кольцо-визуализатор вокруг пластинки
  const viz = R.$('#vinylViz');
  const vctx = viz.getContext('2d');
  const vizLoop = R.loop(player, () => {
    const lv = R.music.levels();
    vctx.clearRect(0, 0, 200, 200);
    if (!lv) { vizLoop.set(false); return; }
    const n = 48;
    for (let i = 0; i < n; i++) {
      const v = lv[(i % 24) + 2] / 255;
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r1 = 64, r2 = 64 + 4 + v * 30;
      vctx.strokeStyle = `hsla(${340 + v * 40}, 100%, ${70 - v * 10}%, ${0.35 + v * 0.65})`;
      vctx.lineWidth = 3.2;
      vctx.lineCap = 'round';
      vctx.beginPath();
      vctx.moveTo(100 + Math.cos(a) * r1, 100 + Math.sin(a) * r1);
      vctx.lineTo(100 + Math.cos(a) * r2, 100 + Math.sin(a) * r2);
      vctx.stroke();
    }
  }, '0px');

  /* ---------- Вход ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  doc.classList.add('locked');
  R.entered = false;
  R.enter = (withSound) => {
    if (R.entered) return;
    R.entered = true;
    doc.classList.remove('locked');
    doc.classList.add('entered');
    if (withSound) R.music.play(2.5);
    window.dispatchEvent(new CustomEvent('r:enter', { detail: { sound: withSound } }));
  };
  R.$('#enterSound').addEventListener('click', () => R.enter(true));
  R.$('#enterMute').addEventListener('click', () => R.enter(false));
  // на всякий случай — колёсико/свайп по закрытой странице подсказывает кнопки
  let nudged = 0;
  const nudge = () => {
    if (R.entered || Date.now() - nudged < 900) return;
    nudged = Date.now();
    const box = R.$('#introEnter');
    box.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' });
  };
  addEventListener('wheel', nudge, { passive: true });
  addEventListener('touchmove', nudge, { passive: true });

  /* ---------- HUD: глава и прогресс ---------- */
  const secs = R.$$('[data-chapter]');
  const hudNum = R.$('#hudNum'), hudName = R.$('#hudName');
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = secs.indexOf(e.target);
      hudNum.textContent = String(i).padStart(2, '0');
      hudName.textContent = e.target.dataset.chapter;
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  secs.forEach((s) => io.observe(s));
  const bar = R.$('#progressBar');
  const onScroll = () => {
    const max = doc.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Появление при скролле ---------- */
  R.$$('.sec:not(.gravity) .kicker, .sec:not(.gravity) .title, .sec:not(.gravity) .lead, .ss-head, .final-title, .final .btn-big').forEach((el) => {
    el.setAttribute('data-reveal', '');
    const sib = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--d', `${Math.min(sib, 4) * 0.08}s`);
  });
  const rio = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  R.$$('[data-reveal]').forEach((el) => rio.observe(el));

  /* ---------- Курсор и магнитные кнопки ---------- */
  if (R.fine) {
    doc.classList.add('has-cursor');
    const cur = R.$('#cursor');
    const dot = R.$('.c-dot', cur), ring = R.$('.c-ring', cur), label = R.$('#cursorLabel');
    let mx = -100, my = -100, rx = -100, ry = -100, moving = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      if (!moving) { moving = true; requestAnimationFrame(follow); }
    }, { passive: true });
    function follow() {
      rx = R.lerp(rx, mx, 0.2); ry = R.lerp(ry, my, 0.2);
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      if (Math.abs(rx - mx) + Math.abs(ry - my) > 0.3) requestAnimationFrame(follow);
      else moving = false;
    }
    const HOV = 'a, button, label, [role="slider"], .wgt, .gbody.phys, input';
    addEventListener('pointerover', (e) => {
      const t = e.target;
      const lab = t.closest && t.closest('[data-cursor]');
      if (lab) { label.textContent = lab.dataset.cursor; cur.classList.add('label'); cur.classList.remove('hover'); return; }
      cur.classList.remove('label');
      cur.classList.toggle('hover', !!(t.closest && t.closest(HOV)));
    });
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
    document.addEventListener('pointerleave', () => { mx = my = -100; dot.style.transform = 'translate(-100px,-100px)'; });

    R.$$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.28}px, ${y * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* ---------- Лепестки сакуры ---------- */
  const petalSprites = (() => {
    const cols = [['#ffe3ea', '#ff9fb8'], ['#ffd0dc', '#ff7fa0'], ['#fff1f4', '#ffb7c8']];
    return cols.map(([a, b]) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      x.translate(32, 32);
      const s = 26;
      const g = x.createLinearGradient(0, -s, 0, s);
      g.addColorStop(0, b); g.addColorStop(0.55, a); g.addColorStop(1, a);
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, s);
      x.bezierCurveTo(-s * 1.05, s * 0.25, -s * 0.62, -s * 0.9, -s * 0.2, -s);
      x.lineTo(0, -s * 0.74);
      x.lineTo(s * 0.2, -s);
      x.bezierCurveTo(s * 0.62, -s * 0.9, s * 1.05, s * 0.25, 0, s);
      x.fill();
      x.strokeStyle = 'rgba(214, 70, 110, .25)';
      x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(0, s * 0.8); x.lineTo(0, -s * 0.5); x.stroke();
      return c;
    });
  })();

  R.Petals = class {
    constructor(cv, o = {}) {
      this.cv = cv; this.ctx = cv.getContext('2d');
      this.o = Object.assign({ count: 60, colliders: null, wind: 18, speed: 1, area: cv.parentElement }, o);
      this.ps = []; this.w = 1; this.h = 1; this.t = 0;
      this.px = -999; this.py = -999; this.pvx = 0; this.pvy = 0; this.pt = 0;
      this.surfaces = [];
      R.onSize(cv, () => this.resize());
      this.resize();
      for (let i = 0; i < this.o.count; i++) this.ps.push(this.spawn(true));
      const area = this.o.area;
      area.addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        if (this.px > -900) { this.pvx = x - this.px; this.pvy = y - this.py; }
        this.px = x; this.py = y; this.pt = performance.now();
      }, { passive: true });
      area.addEventListener('pointerleave', () => { this.px = this.py = -999; });
    }
    resize() {
      const { w, h, d } = R.fit(this.cv, 2);
      this.w = w; this.h = h; this.d = d;
      if (this.o.colliders) this.surfaces = this.o.colliders();
    }
    spawn(anywhere) {
      const z = R.rand(0.45, 1);
      return {
        x: R.rand(-40, this.w + 40), y: anywhere ? R.rand(-this.h, this.h) : R.rand(-80, -20),
        z, s: R.rand(7, 12) * z, rot: R.rand(0, 6.28), vr: R.rand(-1.4, 1.4),
        fl: R.rand(0, 6.28), vf: R.rand(1.5, 4), vx: 0, vy: R.rand(30, 60) * z,
        ph: R.rand(0, 6.28), sp: R.pick(petalSprites), st: 0, rest: 0, sx: 0,
      };
    }
    burst(x, y, n = 24, power = 260) {
      for (let i = 0; i < n; i++) {
        const p = this.spawn(false);
        const a = R.rand(0, Math.PI * 2), v = R.rand(0.3, 1) * power;
        p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 60;
        p.extra = true;
        this.ps.push(p);
      }
    }
    step(dt) {
      const { ctx, w, h, d } = this;
      this.t += dt;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const fresh = performance.now() - this.pt < 120;
      const surf = this.surfaces;
      for (let i = this.ps.length - 1; i >= 0; i--) {
        const p = this.ps[i];
        // ветер от курсора
        if (fresh) {
          const dx = p.x - this.px, dy = p.y - this.py;
          const dd = dx * dx + dy * dy;
          if (dd < 140 * 140) {
            const f = (1 - Math.sqrt(dd) / 140) * 9;
            p.vx += this.pvx * f; p.vy += this.pvy * f * 0.7;
            if (p.st === 1 && Math.abs(this.pvx) + Math.abs(this.pvy) > 4) { p.st = 0; p.vy -= 40; }
          }
        }
        if (p.st === 1) {
          // лежит на букве
          p.rest -= dt;
          p.x += p.sx * dt;
          p.fl += dt * 0.6;
          if (p.rest <= 0 || p.x < p.sa || p.x > p.sb) { p.st = 0; p.vy = 10; p.vx = p.sx * 2; }
        } else {
          const term = (34 + 30 * p.z) * this.o.speed;
          p.vx += (Math.sin(this.t * 0.9 + p.ph) * this.o.wind * p.z - p.vx) * dt * 1.2;
          p.vy += (term - p.vy) * dt * 1.6;
          const oy = p.y;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.rot += p.vr * dt; p.fl += p.vf * dt;
          if (p.vy > 0 && surf.length && !p.extra) {
            for (const s of surf) {
              if (p.x > s.a && p.x < s.b && oy <= s.y && p.y >= s.y) {
                if (Math.random() < 0.85) {
                  p.st = 1; p.y = s.y - p.s * 0.25; p.rest = R.rand(1.2, 4.5);
                  p.sx = R.rand(-8, 8); p.sa = s.a - 2; p.sb = s.b + 2; p.vy = 0;
                }
                break;
              }
            }
          }
          if (p.y > h + 30 || p.x < -80 || p.x > w + 80) {
            if (p.extra || this.ps.length > this.o.count + 40) { this.ps.splice(i, 1); continue; }
            Object.assign(p, this.spawn(false));
          }
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.st === 1 ? 0.9 : Math.cos(p.fl) * 0.85 + 0.15 * Math.sign(Math.cos(p.fl) || 1), 1);
        ctx.globalAlpha = 0.55 + p.z * 0.45;
        ctx.drawImage(p.sp, -p.s, -p.s, p.s * 2, p.s * 2);
        ctx.restore();
      }
    }
  };

  /* ---------- Конфетти ---------- */
  const cf = R.$('#confetti');
  const cfx = cf.getContext('2d');
  let cfParts = [], cfRun = false;
  const CF_COLORS = ['#e5243b', '#ffb7c5', '#d7ff3d', '#7b5cff', '#3de0ff', '#ffd23f', '#ffffff'];
  R.confetti = (x, y, n = 140) => {
    const { d } = R.fit(cf, 2);
    cf.dpr = d;
    for (let i = 0; i < n; i++) {
      const a = R.rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = R.rand(300, 900);
      cfParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: R.rand(0, 6), vr: R.rand(-12, 12), w: R.rand(6, 11), h: R.rand(10, 18), c: R.pick(CF_COLORS), l: R.rand(2.2, 3.6), petal: Math.random() < 0.25 });
    }
    if (!cfRun) { cfRun = true; let lt = performance.now(); requestAnimationFrame(function f(t) {
      const dt = Math.min(0.05, (t - lt) / 1000); lt = t;
      cfx.setTransform(cf.dpr, 0, 0, cf.dpr, 0, 0);
      cfx.clearRect(0, 0, cf.width, cf.height);
      cfParts = cfParts.filter((p) => (p.l -= dt) > 0);
      for (const p of cfParts) {
        p.vy += 900 * dt; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        cfx.save(); cfx.translate(p.x, p.y); cfx.rotate(p.r);
        cfx.globalAlpha = Math.min(1, p.l * 1.5);
        if (p.petal) { cfx.scale(Math.cos(p.r * 2), 1); cfx.drawImage(petalSprites[0], -9, -9, 18, 18); }
        else { cfx.scale(1, Math.cos(p.r * 1.7)); cfx.fillStyle = p.c; cfx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        cfx.restore();
      }
      if (cfParts.length) requestAnimationFrame(f); else { cfRun = false; cfx.clearRect(0, 0, cf.width, cf.height); }
    }); }
  };

  /* ---------- Пасхалка ---------- */
  const egg = R.$('#egg');
  let eggPetals = null, eggLoop = null, eggTimer = 0;
  R.egg = () => {
    if (!eggPetals) {
      eggPetals = new R.Petals(R.$('#eggCanvas'), { count: R.small() ? 160 : 320, wind: 70, speed: 2.2, area: egg });
      eggLoop = R.loop(egg, (dt) => eggPetals.step(dt), '0px');
    }
    egg.classList.add('on');
    eggPetals.resize();
    eggLoop.set(true);
    R.confetti(innerWidth / 2, innerHeight * 0.6, 120);
    clearTimeout(eggTimer);
    eggTimer = setTimeout(() => { egg.classList.remove('on'); setTimeout(() => eggLoop.set(false), 700); }, 5200);
  };
  // 1) набрать «revenge» (или «кумутпу» в русской раскладке)
  let typed = '';
  addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /INPUT|TEXTAREA/.test(t.tagName))) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-7);
    if (typed === 'revenge' || typed === 'кумутпу') { typed = ''; R.egg(); }
  });
  // 2) пять быстрых нажатий на логотип
  let taps = [];
  R.$('#hudLogo').addEventListener('click', () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 2000);
    taps.push(now);
    if (taps.length >= 5) { taps = []; R.egg(); return; }
    if (taps.length === 1) scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
