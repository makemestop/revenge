/* widgets.js — конструктор: включаем/выключаем виджеты, перетаскиваем их; переключатель плеера управляет настоящим плеером */
(() => {
  const { $, $$ } = R;
  const sec = $('#widgets');
  const desk = $('#wgDesk');
  const empty = $('.wg-empty', desk);
  const toggles = $$('#wgToggles input');

  function refresh() {
    let any = false;
    toggles.forEach((inp) => {
      const k = inp.dataset.w;
      if (k === 'player') { R.player.setHidden(!inp.checked); return; }
      const el = $(`.wgt[data-w="${k}"]`, desk);
      el.classList.toggle('is-on', inp.checked);
      if (inp.checked) any = true;
      if (k === 'weather' && inp.checked) loadWeather();
    });
    empty.style.opacity = any ? 0 : '';
  }
  toggles.forEach((inp) => inp.addEventListener('change', refresh));
  refresh();

  /* ---------- перетаскивание ---------- */
  $$('.wgt', desk).forEach((el) => {
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, [contenteditable]')) return;
      drag = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.getPropertyValue('--tx')) || 0;
      oy = parseFloat(el.style.getPropertyValue('--ty')) || 0;
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dr = desk.getBoundingClientRect();
      const base = { l: el.offsetLeft, t: el.offsetTop };
      let tx = ox + e.clientX - sx, ty = oy + e.clientY - sy;
      tx = R.clamp(tx, -base.l + 4, dr.width - base.l - el.offsetWidth - 4);
      ty = R.clamp(ty, -base.t + 4, dr.height - base.t - el.offsetHeight - 4);
      el.style.setProperty('--tx', tx + 'px');
      el.style.setProperty('--ty', ty + 'px');
    });
    const end = () => { drag = false; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  /* ---------- часы ---------- */
  const ticks = $('.clock-ticks', desk);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 50 + Math.sin(a) * 40); l.setAttribute('y1', 50 - Math.cos(a) * 40);
    l.setAttribute('x2', 50 + Math.sin(a) * (i % 3 ? 43 : 45)); l.setAttribute('y2', 50 - Math.cos(a) * (i % 3 ? 43 : 45));
    ticks.appendChild(l);
  }
  const hH = $('#hH'), hM = $('#hM'), hS = $('#hS'), digits = $('#clockDigits');
  R.loop(sec, () => {
    const n = new Date();
    const ms = n.getMilliseconds(), s = n.getSeconds() + ms / 1000, m = n.getMinutes() + s / 60, hr = (n.getHours() % 12) + m / 60;
    hS.setAttribute('transform', `rotate(${s * 6} 50 50)`);
    hM.setAttribute('transform', `rotate(${m * 6} 50 50)`);
    hH.setAttribute('transform', `rotate(${hr * 30} 50 50)`);
    digits.textContent = n.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // до Нового года
    const ny = new Date(n.getFullYear() + 1, 0, 1);
    let left = Math.max(0, ny - n) / 1000;
    const D = Math.floor(left / 86400); left -= D * 86400;
    const H = Math.floor(left / 3600); left -= H * 3600;
    const M = Math.floor(left / 60);
    const S = Math.floor(left - M * 60);
    nyD.textContent = D; nyH.textContent = H; nyM.textContent = M; nyS.textContent = S;
  });
  const nyD = $('#nyD'), nyH = $('#nyH'), nyM = $('#nyM'), nyS = $('#nyS');

  /* ---------- календарь ---------- */
  (() => {
    const n = new Date();
    const ds = n.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#calTitle').textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
    const grid = $('#calGrid');
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach((d) => { const s = document.createElement('span'); s.className = 'dow'; s.textContent = d; grid.appendChild(s); });
    const first = new Date(n.getFullYear(), n.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('span'));
    for (let dd = 1; dd <= days; dd++) {
      const s = document.createElement('span');
      s.textContent = dd;
      if (dd === n.getDate()) s.className = 'today';
      grid.appendChild(s);
    }
  })();

  /* ---------- погода (open-meteo, без ключа) ---------- */
  const CITIES = { msk: [55.75, 37.62], tyo: [35.68, 139.69], dxb: [25.2, 55.27] };
  let city = 'msk';
  const cache = {};
  const WMO = (c) => {
    if (c === 0) return ['☀️', 'ясно'];
    if (c <= 2) return ['🌤️', 'малооблачно'];
    if (c === 3) return ['☁️', 'пасмурно'];
    if (c <= 48) return ['🌫️', 'туман'];
    if (c <= 57) return ['🌦️', 'морось'];
    if (c <= 67) return ['🌧️', 'дождь'];
    if (c <= 77) return ['🌨️', 'снег'];
    if (c <= 82) return ['🌧️', 'ливень'];
    if (c <= 86) return ['🌨️', 'снегопад'];
    return ['⛈️', 'гроза'];
  };
  function show(d) {
    $('#wxIco').textContent = d.ico;
    $('#wxTemp').textContent = d.temp;
    $('#wxDesc').textContent = d.desc;
  }
  function loadWeather() {
    if (cache[city]) { show(cache[city]); return; }
    const [la, lo] = CITIES[city];
    const want = city;
    $('#wxDesc').textContent = 'загружаю…';
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code`)
      .then((r) => r.json())
      .then((j) => {
        const tC = Math.round(j.current.temperature_2m);
        const [ico, desc] = WMO(j.current.weather_code);
        cache[want] = { ico, temp: (tC > 0 ? '+' : '') + tC + '°', desc: desc + ' · сейчас' };
        if (want === city) show(cache[want]);
      })
      .catch(() => { if (want === city) show({ ico: '🌤️', temp: '—', desc: 'нет связи с сервисом погоды' }); });
  }
  $('#wxCity').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    city = b.dataset.city;
    $$('#wxCity button').forEach((x) => x.classList.toggle('is-on', x === b));
    loadWeather();
  });

  /* ---------- заметка ---------- */
  const note = $('#noteText');
  const saved = R.store.get('note', null);
  if (saved) note.textContent = saved;
  note.addEventListener('input', () => R.store.set('note', note.textContent.slice(0, 400)));
})();
