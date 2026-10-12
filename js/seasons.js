/* seasons.js — переключатель времён года: работает только активная сцена и только когда видна */
(() => {
  const { $, $$ } = R;
  const sec = $('#seasons');
  const tabs = $$('.ss-tab', sec);
  const title = $('#ssTitle'), hint = $('#ssHint');
  const INFO = {
    summer: ['Лето', 'Бросайте фрукты в банку. Два одинаковых сливаются в один побольше — дойдёте до арбуза?'],
    autumn: ['Осень', 'Стекло запотело. Проведите по нему пальцем или мышкой — и посмотрите на ночной город.'],
    winter: ['Зима', 'Поводите курсором — снежинки разлетятся. Нажмите — закрутится вихрь. Внизу растёт сугроб.'],
    spring: ['Весна', 'Коснитесь воды — пойдут круги. Нажмите, чтобы покормить карпов: они приплывут.'],
  };
  let active = null;

  const loop = R.loop(sec, (dt, t) => {
    const s = R.scenes[active];
    if (s) s.frame(dt, t);
  }, '50px');

  function show(name, fromTab) {
    if (name === active) return;
    const scene = R.scenes[name];
    if (!scene) return;
    const prev = active && R.scenes[active];
    active = name;
    Object.values(R.scenes).forEach((s) => { if (s !== scene && s !== prev) s.el.classList.remove('is-active', 'is-entering'); });
    sec.dataset.season = name;
    scene.start();
    tabs.forEach((b) => b.setAttribute('aria-selected', b.dataset.season === name));
    title.textContent = INFO[name][0];
    hint.textContent = INFO[name][1];
    const el = scene.el;
    if (fromTab && prev) {
      const sr = sec.getBoundingClientRect(), tr = fromTab.getBoundingClientRect();
      el.style.setProperty('--cx', `${tr.left + tr.width / 2 - sr.left}px`);
      el.style.setProperty('--cy', `${tr.top + tr.height / 2 - sr.top}px`);
      el.style.zIndex = 1;
      prev.el.style.zIndex = 0;
      el.classList.add('is-entering');
      // старая сцена ещё видна под новой, пока та раскрывается
      const old = prev.el;
      setTimeout(() => {
        el.classList.remove('is-entering');
        if (active === name) old.classList.remove('is-active');
      }, 1000);
    } else if (prev) prev.el.classList.remove('is-active');
    el.classList.add('is-active');
    loop.set(true);
  }

  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.season, b)));
  // клавиши-стрелки в табах
  sec.querySelector('.ss-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((b) => b.dataset.season === active);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); n.click();
  });

  R.whenNear(sec, () => show('summer'), '300px');
})();
