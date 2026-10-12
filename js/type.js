/* type.js — «Вам нужен сайт?»: стили текста сменяют друг друга, буквы убегают от курсора */
(() => {
  const { $ } = R;
  const sec = $('#type');
  const tt = $('#tt');
  const chipsBox = $('#ttChips');
  const PRESETS = [
    { id: 'serif', name: 'Классика' },
    { id: 'grotesk', name: 'Гротеск' },
    { id: 'gradient', name: 'Градиент' },
    { id: 'neon', name: 'Неон', dark: true },
    { id: 'outline', name: 'Контур' },
    { id: 'hand', name: 'Рукопись' },
    { id: 'pixel', name: 'Пиксели' },
    { id: '3d', name: '3D' },
    { id: 'wave', name: 'Волна' },
    { id: 'glitch', name: 'Глитч', dark: true },
    { id: 'type', name: 'Машинка' },
    { id: 'ransom', name: 'Вырезки' },
    { id: 'size', name: 'Размер' },
  ];

  // разбиваем текст на слова и буквы
  const text = tt.dataset.text;
  tt.textContent = '';
  tt.style.position = 'relative';
  let idx = 0;
  text.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span');
    w.className = 'word';
    w.style.display = 'inline-block';
    w.style.whiteSpace = 'nowrap';
    [...word].forEach((c) => {
      const ch = document.createElement('span');
      ch.className = 'ch';
      const ci = document.createElement('span');
      ci.className = 'ci';
      ci.textContent = c;
      ci.style.setProperty('--i', idx++);
      ch.appendChild(ci);
      w.appendChild(ch);
    });
    tt.appendChild(w);
    if (wi < arr.length - 1) {
      const sp = document.createElement('span');
      sp.className = 'sp';
      sp.textContent = ' ';
      tt.appendChild(sp);
    }
  });
  const chars = [...tt.querySelectorAll('.ch')];
  const N = chars.length;

  // кнопки стилей
  PRESETS.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = p.name;
    b.addEventListener('click', () => { pausedUntil = performance.now() + 9000; set(i); });
    chipsBox.appendChild(b);
  });
  const chips = [...chipsBox.children];

  let cur = -1, busy = false, centers = [];
  function measure() {
    centers = chars.map((c) => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 }));
    const tw = tt.offsetWidth;
    tt.style.setProperty('--tw', tw + 'px');
    chars.forEach((c) => c.firstChild.style.setProperty('--lx', c.offsetLeft + 'px'));
  }
  function apply(i) {
    PRESETS.forEach((p) => tt.classList.remove('p-' + p.id));
    tt.classList.add('p-' + PRESETS[i].id);
    sec.classList.toggle('is-dark', !!PRESETS[i].dark);
    chips.forEach((c, k) => c.classList.toggle('is-on', k === i));
  }
  function set(i) {
    if (i === cur) return;
    if (cur < 0) { cur = i; apply(i); requestAnimationFrame(measure); return; }
    if (busy) { cur = i; apply(i); requestAnimationFrame(measure); return; }
    busy = true;
    cur = i;
    chips.forEach((c, k) => c.classList.toggle('is-on', k === i));
    tt.classList.add('swap');
    setTimeout(() => {
      apply(cur);
      void tt.offsetWidth;
      measure();
      tt.classList.remove('swap');
      busy = false;
    }, 300 + N * 22);
  }
  set(0);

  // автосмена стилей
  let pausedUntil = 0, acc = 0, gs = 0;
  R.loop(sec, (dt) => {
    acc += dt;
    const now = performance.now();
    if (acc > 2.3 && now > pausedUntil && !busy) {
      acc = 0;
      set((cur + 1) % PRESETS.length);
    }
    if (PRESETS[cur].id === 'gradient') {
      gs = (gs + dt * 260) % 4000;
      tt.style.setProperty('--gs', gs + 'px');
    }
  }, '0px');

  // буквы убегают от курсора / пальца
  const RAD = 150;
  sec.addEventListener('pointermove', (e) => {
    const r = tt.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    for (let k = 0; k < N; k++) {
      const c = centers[k];
      if (!c) continue;
      const dx = c.x - px, dy = c.y - py;
      const d = Math.hypot(dx, dy) || 1;
      const ch = chars[k];
      if (d < RAD) {
        const f = Math.pow(1 - d / RAD, 2) * 40;
        ch.style.setProperty('--x', (dx / d) * f + 'px');
        ch.style.setProperty('--y', (dy / d) * f + 'px');
        ch.style.setProperty('--r', (dx / d) * f * 0.5 + 'deg');
        ch.classList.add('hot');
      } else if (ch.classList.contains('hot')) {
        ch.style.setProperty('--x', '0px');
        ch.style.setProperty('--y', '0px');
        ch.style.setProperty('--r', '0deg');
        ch.classList.remove('hot');
      }
    }
  }, { passive: true });
  sec.addEventListener('pointerleave', () => chars.forEach((ch) => {
    ch.style.setProperty('--x', '0px'); ch.style.setProperty('--y', '0px'); ch.style.setProperty('--r', '0deg');
    ch.classList.remove('hot');
  }));
  R.onSize(tt, measure);
  if (document.fonts) document.fonts.ready.then(measure);
})();
