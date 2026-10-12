/* curtain.js — шторка «много текста / мало текста» */
(() => {
  const { $ } = R;
  const cv = $('#cv');
  const handle = $('#cvHandle');
  let p = 50, dragging = false;

  function set(v) {
    p = R.clamp(v, 0, 100);
    cv.style.setProperty('--p', p + '%');
    handle.setAttribute('aria-valuenow', Math.round(p));
  }
  function fromEvent(e) {
    const r = cv.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  }
  cv.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    dragging = true;
    cv.classList.remove('nudge');
    handle.classList.add('drag');
    cv.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  cv.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  const end = () => { dragging = false; handle.classList.remove('drag'); };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { set(p - 5); e.preventDefault(); }
    if (e.key === 'ArrowRight') { set(p + 5); e.preventDefault(); }
  });

  // подсказка: шторка сама слегка ездит, когда блок появился
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    cv.classList.add('nudge');
    const seq = [72, 28, 50];
    seq.forEach((v, i) => setTimeout(() => { if (cv.classList.contains('nudge')) set(v); }, 500 + i * 950));
    setTimeout(() => cv.classList.remove('nudge'), 500 + seq.length * 950);
  }, { threshold: 0.6 });
  io.observe(cv);
  set(50);
})();
