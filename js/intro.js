/* intro.js — логотип Revenge, на буквы падают и ложатся лепестки сакуры */
(() => {
  const { $, $$ } = R;
  const intro = $('#intro');
  const cv = $('#introPetals');
  const letters = $$('#logo .lt');
  letters.forEach((el, i) => el.style.setProperty('--i', i));

  const mc = document.createElement('canvas').getContext('2d');
  function colliders() {
    const cr = cv.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle($('#logo')).fontSize);
    mc.font = `${fs}px "Dela Gothic One"`;
    const m = mc.measureText('E');
    const capA = m.actualBoundingBoxAscent || fs * 0.72;
    const fA = m.fontBoundingBoxAscent, fD = m.fontBoundingBoxDescent;
    return letters.map((el) => {
      const r = el.getBoundingClientRect();
      const top = fA ? r.top + (r.height - (fA + fD)) / 2 + fA - capA : r.top + r.height * 0.2;
      return { a: r.left - cr.left + r.width * 0.1, b: r.right - cr.left - r.width * 0.1, y: top - cr.top + 2 };
    });
  }

  const petals = new R.Petals(cv, { count: R.small() ? 42 : 80, colliders, wind: 16, area: intro });
  R.loop(intro, (dt) => petals.step(dt));
  // буквы въезжают с анимацией — пересчитываем «полки» после неё и после загрузки шрифта
  const remeasure = () => { petals.surfaces = colliders(); };
  setTimeout(remeasure, 1900);
  if (document.fonts) document.fonts.ready.then(() => setTimeout(remeasure, 100));
  addEventListener('r:enter', () => setTimeout(remeasure, 1200));

  intro.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const r = cv.getBoundingClientRect();
    petals.burst(e.clientX - r.left, e.clientY - r.top, 26, 320);
  });
  addEventListener('r:enter', () => {
    const r = $('#logo').getBoundingClientRect();
    const cr = cv.getBoundingClientRect();
    petals.burst(r.left + r.width / 2 - cr.left, r.top - cr.top, 50, 420);
  });
})();
