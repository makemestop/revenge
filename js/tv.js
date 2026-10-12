/* tv.js — ретро-телевизор; по нажатию — режим кинотеатра с подсветкой вокруг экрана и каналами */
(() => {
  const { $, $$ } = R;
  const doc = document.documentElement;
  const sec = $('#tv');
  const btn = $('#tvBtn');
  const mini = $('#tvMini');
  const screen = $('.tv-screen', btn);
  const noise = $('#tvNoise');
  const cinema = $('#cinema');
  const frameEl = $('#cineFrame');
  const video = $('#cineVideo');
  const glow = $('#cineGlow'), gctx = glow.getContext('2d');
  const stat = $('#cineStatic');
  const osd = $('#cineOsd');
  const chBox = $('#cineCh');
  const SRC = (n) => `assets/ch${n}.mp4`;
  let ch = 1, open = false, osdT = 0;

  function paintNoise(cv, alpha = 255) {
    const c = cv.getContext('2d');
    const im = c.createImageData(cv.width, cv.height);
    const a = new Uint32Array(im.data.buffer);
    for (let i = 0; i < a.length; i++) { const v = (Math.random() * 255) | 0; a[i] = (alpha << 24) | (v << 16) | (v << 8) | v; }
    c.putImageData(im, 0, 0);
  }

  // маленький ТВ: видео играет, только пока блок на экране
  const io = new IntersectionObserver((es) => {
    const vis = es[0].isIntersecting;
    if (vis) { if (mini.preload === 'none') { mini.preload = 'auto'; mini.load(); } const p = mini.play(); if (p) p.catch(() => {}); }
    else mini.pause();
  }, { rootMargin: '100px' });
  io.observe(sec);
  let nt = 0;
  R.loop(sec, (dt) => { nt += dt; if (nt > 0.06) { nt = 0; paintNoise(noise); } });

  function setOsd(text) { osd.textContent = text; osd.classList.add('on'); osdT = 1.6; }

  function tune(n, instant) {
    ch = n;
    $$('button', chBox).forEach((b) => b.classList.toggle('is-on', +b.dataset.ch === n));
    stat.classList.add('on');
    setOsd('CH ' + String(n).padStart(2, '0'));
    beep();
    setTimeout(() => {
      video.src = SRC(n);
      const p = video.play(); if (p) p.catch(() => {});
      setTimeout(() => stat.classList.remove('on'), instant ? 80 : 260);
    }, instant ? 0 : 220);
  }

  // короткий «щелчок» переключения канала
  function beep() {
    const ac = R.ac;
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime, len = 0.18;
    const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
    const dd = buf.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / dd.length);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.7;
    g.gain.value = 0.08;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
  }

  function flip(from, to, reverse) {
    const dx = from.left - to.left, dy = from.top - to.top;
    const sx = from.width / to.width, sy = from.height / to.height;
    const a = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, b = 'none';
    return frameEl.animate([{ transform: reverse ? b : a, borderRadius: reverse ? '10px' : '30px' }, { transform: reverse ? a : b, borderRadius: reverse ? '30px' : '10px' }], { duration: 750, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  }

  function openCinema() {
    if (open) return;
    open = true;
    R.getAC();
    const from = screen.getBoundingClientRect();
    cinema.classList.add('is-on');
    cinema.setAttribute('aria-hidden', 'false');
    doc.classList.add('locked');
    video.src = SRC(ch);
    try { video.currentTime = mini.currentTime || 0; } catch (e) {}
    const p = video.play(); if (p) p.catch(() => {});
    const to = frameEl.getBoundingClientRect();
    flip(from, to, false);
    setOsd('CH ' + String(ch).padStart(2, '0'));
    glowLoop.set(true);
    setTimeout(() => $('#cineClose').focus({ preventScroll: true }), 50);
  }
  function closeCinema() {
    if (!open) return;
    open = false;
    const to = frameEl.getBoundingClientRect();
    const from = screen.getBoundingClientRect();
    const anim = flip(from, to, true);
    cinema.classList.remove('is-on');
    cinema.setAttribute('aria-hidden', 'true');
    anim.onfinish = () => { anim.cancel(); video.pause(); glowLoop.set(false); };
    doc.classList.remove('locked');
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', openCinema);
  $('#cineClose').addEventListener('click', closeCinema);
  addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') closeCinema();
    if (/^[1-4]$/.test(e.key)) tune(+e.key);
    if (e.key === 'ArrowRight') tune((ch % 4) + 1);
    if (e.key === 'ArrowLeft') tune(((ch + 2) % 4) + 1);
  });
  chBox.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) tune(+b.dataset.ch); });
  // свайп по экрану — следующий канал
  let sx = 0;
  frameEl.addEventListener('pointerdown', (e) => (sx = e.clientX));
  frameEl.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 50) tune(dx < 0 ? (ch % 4) + 1 : ((ch + 2) % 4) + 1);
  });

  // подсветка: крошечная копия кадра, сильно размытая CSS-фильтром
  let st = 0;
  const glowLoop = R.loop(cinema, (dt) => {
    if (video.readyState >= 2) gctx.drawImage(video, 0, 0, glow.width, glow.height);
    if (stat.classList.contains('on')) { st += dt; if (st > 0.04) { st = 0; paintNoise(stat); } }
    if (osdT > 0) { osdT -= dt; if (osdT <= 0) osd.classList.remove('on'); }
  }, '0px');
  glowLoop.set(false);
})();
