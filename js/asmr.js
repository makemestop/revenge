/* asmr.js — ASMR-клавиатура (звук синтезируется на лету) + лампа со шнурком */
(() => {
  const { $, $$ } = R;
  const sec = $('#asmr');
  const room = $('#asmrRoom');
  const kb = $('#kb');
  const screenText = $('#asmrText');

  /* ---------- раскладки ---------- */
  const FULL = [
    [['Esc', 'Escape', 1, 'mod'], ['1', 'Digit1'], ['2', 'Digit2'], ['3', 'Digit3'], ['4', 'Digit4'], ['5', 'Digit5'], ['6', 'Digit6'], ['7', 'Digit7'], ['8', 'Digit8'], ['9', 'Digit9'], ['0', 'Digit0'], ['-', 'Minus'], ['=', 'Equal'], ['⌫', 'Backspace', 2, 'mod']],
    [['Tab', 'Tab', 1.5, 'mod'], ['Q', 'KeyQ'], ['W', 'KeyW'], ['E', 'KeyE'], ['R', 'KeyR'], ['T', 'KeyT'], ['Y', 'KeyY'], ['U', 'KeyU'], ['I', 'KeyI'], ['O', 'KeyO'], ['P', 'KeyP'], ['[', 'BracketLeft'], [']', 'BracketRight'], ['\\', 'Backslash', 1.5, 'mod']],
    [['Caps', 'CapsLock', 1.75, 'mod'], ['A', 'KeyA'], ['S', 'KeyS'], ['D', 'KeyD'], ['F', 'KeyF'], ['G', 'KeyG'], ['H', 'KeyH'], ['J', 'KeyJ'], ['K', 'KeyK'], ['L', 'KeyL'], [';', 'Semicolon'], ["'", 'Quote'], ['Enter', 'Enter', 2.25, 'enter']],
    [['Shift', 'ShiftLeft', 2.25, 'mod'], ['Z', 'KeyZ'], ['X', 'KeyX'], ['C', 'KeyC'], ['V', 'KeyV'], ['B', 'KeyB'], ['N', 'KeyN'], ['M', 'KeyM'], [',', 'Comma'], ['.', 'Period'], ['/', 'Slash'], ['Shift', 'ShiftRight', 2.75, 'mod']],
    [['Ctrl', 'ControlLeft', 1.25, 'mod'], ['Win', 'MetaLeft', 1.25, 'mod'], ['Alt', 'AltLeft', 1.25, 'mod'], ['リベンジ', 'Space', 6.25, 'space'], ['Alt', 'AltRight', 1.25, 'mod'], ['Fn', 'Fn', 1.25, 'mod'], ['☰', 'ContextMenu', 1.25, 'mod'], ['Ctrl', 'ControlRight', 1.25, 'mod']],
  ];
  const COMPACT = [
    [['Q', 'KeyQ'], ['W', 'KeyW'], ['E', 'KeyE'], ['R', 'KeyR'], ['T', 'KeyT'], ['Y', 'KeyY']],
    [['A', 'KeyA'], ['S', 'KeyS'], ['D', 'KeyD'], ['F', 'KeyF'], ['G', 'KeyG'], ['H', 'KeyH']],
    [['Z', 'KeyZ'], ['X', 'KeyX'], ['C', 'KeyC'], ['V', 'KeyV'], ['B', 'KeyB'], ['N', 'KeyN']],
    [['⌫', 'Backspace', 1.5, 'mod'], ['リベンジ', 'Space', 3, 'space'], ['⏎', 'Enter', 1.5, 'enter']],
  ];
  let keys = [], byCode = {}, layoutName = '';
  function build() {
    const want = innerWidth < 640 ? 'compact' : 'full';
    if (want === layoutName) return;
    layoutName = want;
    kb.textContent = '';
    keys = []; byCode = {};
    const L = want === 'compact' ? COMPACT : FULL;
    L.forEach((row, ri) => {
      const r = document.createElement('div');
      r.className = 'kb-row';
      row.forEach(([label, code, wdt = 1, kind = 'char']) => {
        const k = document.createElement('button');
        k.className = 'key' + (kind === 'mod' || kind === 'space' ? ' mod' : '') + (kind === 'enter' ? ' k-enter' : '') + (code === 'Escape' ? ' k-esc' : '');
        k.style.setProperty('--w', wdt);
        k.setAttribute('aria-label', label);
        k.tabIndex = -1;
        const s = document.createElement('span');
        s.textContent = label;
        k.appendChild(s);
        k.dataset.code = code;
        k.kind = kind; k.row = ri; k.label = label;
        r.appendChild(k);
        keys.push(k);
        byCode[code] = k;
      });
      kb.appendChild(r);
    });
    requestAnimationFrame(() => {
      const kr = kb.getBoundingClientRect();
      keys.forEach((k) => { const r = k.getBoundingClientRect(); k.px = (r.left + r.width / 2 - kr.left) / kr.width; k.py = (r.top - kr.top) / kr.height; });
    });
  }
  build();
  addEventListener('resize', build);

  /* ---------- звук ---------- */
  let sw = 'thock', master = null, noiseBuf = null;
  function audio() {
    const ac = R.getAC();
    if (!ac) return null;
    if (!master) {
      master = ac.createGain(); master.gain.value = 0.9;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ac;
  }
  function noise(ac, t, { type = 'bandpass', f = 2000, q = 1, dur = 0.03, g = 0.3, at = 0.001 }) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + at);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    s.connect(fl); fl.connect(gn); gn.connect(master);
    s.start(t, Math.random() * 0.8); s.stop(t + at + dur + 0.05);
  }
  function tone(ac, t, { f0 = 200, f1 = 120, dur = 0.08, g = 0.3, type = 'sine', at = 0.002 }) {
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + at);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(gn); gn.connect(master);
    o.start(t); o.stop(t + at + dur + 0.05);
  }

  const PROFILES = {
    thock: {
      down(ac, t, v, k) {
        const lo = k.kind === 'space' ? 0.7 : 1;
        tone(ac, t, { f0: 190 * v * lo, f1: 105 * lo, dur: 0.085, g: 0.32 });
        tone(ac, t, { f0: 380 * v * lo, f1: 220 * lo, dur: 0.05, g: 0.08, type: 'triangle' });
        noise(ac, t, { type: 'lowpass', f: 1300 * v, q: 0.8, dur: 0.05, g: 0.5 });
        noise(ac, t, { f: 3400, q: 1.4, dur: 0.01, g: 0.12 });
        if (k.kind === 'space') noise(ac, t + 0.02, { f: 1800, q: 2, dur: 0.02, g: 0.1 });
      },
      up(ac, t, v) { noise(ac, t, { f: 2100 * v, q: 1.2, dur: 0.018, g: 0.12 }); tone(ac, t, { f0: 280 * v, f1: 210, dur: 0.035, g: 0.06 }); },
    },
    clicky: {
      down(ac, t, v) {
        noise(ac, t, { type: 'highpass', f: 3200, q: 0.7, dur: 0.012, g: 0.4 });
        noise(ac, t, { f: 4800 * v, q: 3, dur: 0.014, g: 0.35 });
        noise(ac, t + 0.012, { f: 2300 * v, q: 1.2, dur: 0.03, g: 0.3 });
        tone(ac, t + 0.012, { f0: 1300 * v, f1: 900, dur: 0.02, g: 0.05 });
      },
      up(ac, t, v) { noise(ac, t, { f: 5200 * v, q: 3, dur: 0.012, g: 0.3 }); noise(ac, t, { type: 'highpass', f: 3500, dur: 0.008, g: 0.2 }); },
    },
    linear: {
      down(ac, t, v, k) {
        const lo = k.kind === 'space' ? 0.75 : 1;
        noise(ac, t, { type: 'lowpass', f: 900 * v * lo, q: 0.6, dur: 0.06, g: 0.4 });
        tone(ac, t, { f0: 150 * v * lo, f1: 95, dur: 0.06, g: 0.16 });
      },
      up(ac, t, v) { noise(ac, t, { type: 'lowpass', f: 750 * v, dur: 0.03, g: 0.1 }); },
    },
    tactile: {
      down(ac, t, v) {
        noise(ac, t, { f: 1500 * v, q: 1, dur: 0.018, g: 0.22 });
        noise(ac, t + 0.022, { type: 'lowpass', f: 1500 * v, q: 0.8, dur: 0.05, g: 0.38 });
        tone(ac, t + 0.022, { f0: 220 * v, f1: 140, dur: 0.07, g: 0.2 });
      },
      up(ac, t, v) { noise(ac, t, { f: 1900 * v, q: 1.3, dur: 0.022, g: 0.13 }); },
    },
    typewriter: {
      down(ac, t, v, k) {
        noise(ac, t, { f: 2600 * v, q: 6, dur: 0.03, g: 0.55 });
        noise(ac, t, { type: 'lowpass', f: 420, q: 1, dur: 0.07, g: 0.45 });
        tone(ac, t, { f0: 1900 * v, f1: 1850, dur: 0.12, g: 0.04 });
        tone(ac, t, { f0: 2950 * v, f1: 2900, dur: 0.09, g: 0.03 });
        if (k.kind === 'enter') {
          tone(ac, t + 0.02, { f0: 2093, f1: 2090, dur: 1.4, g: 0.18 });
          tone(ac, t + 0.02, { f0: 4186, f1: 4180, dur: 0.9, g: 0.06 });
          for (let i = 0; i < 9; i++) noise(ac, t + 0.15 + i * 0.03, { f: 3500, q: 4, dur: 0.01, g: 0.18 });
        }
      },
      up(ac, t) { noise(ac, t, { type: 'lowpass', f: 600, dur: 0.02, g: 0.08 }); },
    },
    bubble: {
      down(ac, t, v, k) {
        const lo = k.kind === 'space' ? 0.6 : 1;
        tone(ac, t, { f0: 380 * v * lo, f1: 1150 * v * lo, dur: 0.075, g: 0.38, at: 0.004 });
      },
      up(ac, t, v) { tone(ac, t, { f0: 900 * v, f1: 1700 * v, dur: 0.045, g: 0.12, at: 0.003 }); },
    },
  };

  // зажатый ⌫ стирает подряд, как на настоящей клавиатуре: пауза, потом быстрый повтор
  let eraseDelay = 0, eraseRep = 0;
  function startErase(k) {
    stopErase();
    eraseDelay = setTimeout(() => {
      eraseRep = setInterval(() => {
        if (!k.classList.contains('down') || !screenText.textContent) { stopErase(); return; }
        screenText.textContent = screenText.textContent.slice(0, -1);
      }, 45);
    }, 380);
  }
  function stopErase() { clearTimeout(eraseDelay); clearInterval(eraseRep); eraseDelay = eraseRep = 0; }
  // если окно потеряло фокус с зажатой клавишей — отпускаем всё
  addEventListener('blur', () => keys.forEach((k) => release(k)));

  function press(k) {
    if (k.classList.contains('down')) return;
    k.classList.add('down');
    const ac = audio();
    if (ac) {
      const v = R.rand(0.93, 1.07) * (1 + (2 - k.row) * 0.025);
      PROFILES[sw].down(ac, ac.currentTime + 0.003, v, k);
    }
    // текст на экранчике
    let s = screenText.textContent;
    if (k.dataset.code === 'Backspace') s = s.slice(0, -1);
    else if (k.kind === 'space') s += ' ';
    else if (k.kind === 'enter') { s = ''; screenText.parentElement.animate([{ transform: 'translateX(-12px)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' }); }
    else if (k.kind === 'char') s += k.typed || k.label.toLowerCase();
    screenText.textContent = s.slice(-48);
    k.typed = null;
    if (k.dataset.code === 'Backspace') startErase(k);
  }
  function release(k) {
    if (!k.classList.contains('down')) return;
    k.classList.remove('down');
    if (k.dataset.code === 'Backspace') stopErase();
    const ac = R.ac;
    if (ac && master) PROFILES[sw].up(ac, ac.currentTime + 0.003, R.rand(0.93, 1.07), k);
  }

  // мышь и пальцы (мультитач)
  const held = new Map();
  kb.addEventListener('pointerdown', (e) => {
    const k = e.target.closest('.key');
    if (!k) return;
    e.preventDefault();
    held.set(e.pointerId, k);
    press(k);
  });
  // долгое нажатие пальцем не должно вызывать меню телефона
  kb.addEventListener('contextmenu', (e) => e.preventDefault());
  const up = (e) => { const k = held.get(e.pointerId); if (k) { release(k); held.delete(e.pointerId); } };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  kb.addEventListener('pointerover', (e) => {
    // ведём зажатой мышкой по клавишам — «пробегаем» по ним
    if (!held.has(e.pointerId) || e.pointerType !== 'mouse') return;
    const k = e.target.closest('.key');
    const prev = held.get(e.pointerId);
    if (k && k !== prev) { release(prev); held.set(e.pointerId, k); press(k); }
  });

  // настоящая клавиатура — пока блок на экране
  let visible = false;
  new IntersectionObserver((es) => { visible = es[0].intersectionRatio > 0.35; }, { threshold: [0, 0.35, 0.6] }).observe(kb);
  addEventListener('keydown', (e) => {
    if (!visible || e.repeat || e.metaKey || e.ctrlKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    const k = byCode[e.code] || (layoutName === 'compact' && e.code === 'Space' ? byCode.Space : null);
    if (e.code === 'Space' || e.code === 'Quote' || e.code === 'Slash' || e.code === 'Tab' || e.code === 'Backspace') e.preventDefault();
    if (!k && e.key.length === 1) {
      // клавиша, которой нет на компактной раскладке, — просто звук и символ
      const ac = audio();
      if (ac) PROFILES[sw].down(ac, ac.currentTime + 0.003, R.rand(0.93, 1.07), { kind: 'char', row: 1 });
      screenText.textContent = (screenText.textContent + e.key).slice(-48);
      return;
    }
    if (!k) return;
    if (e.key.length === 1) k.typed = e.key;
    press(k);
  });
  addEventListener('keyup', (e) => { const k = byCode[e.code]; if (k) release(k); });

  // переключатели звука и колпачков
  $('#swChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    sw = b.dataset.sw;
    $$('#swChips .chip').forEach((c) => c.classList.toggle('is-on', c === b));
    // демо-нажатие, чтобы сразу услышать
    const demo = keys.filter((k) => k.kind === 'char').slice(0, 4);
    demo.forEach((k, i) => setTimeout(() => { press(k); setTimeout(() => release(k), 70); }, i * 110));
  });
  $('#capChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    kb.dataset.cap = b.dataset.cap;
    $$('#capChips .chip').forEach((c) => c.classList.toggle('is-on', c === b));
  });

  /* ---------- шнурок лампы (верле-верёвка) ---------- */
  const cord = $('#cord');
  const cctx = cord.getContext('2d');
  const bulb = $('.lamp-bulb', room);
  const grip = document.createElement('div');
  grip.className = 'cord-grip';
  grip.setAttribute('aria-hidden', 'true');
  Object.assign(grip.style, { position: 'absolute', width: '56px', height: '56px', marginLeft: '-28px', marginTop: '-28px', borderRadius: '50%', zIndex: 7, touchAction: 'none', cursor: 'grab' });
  room.appendChild(grip);
  const lampBtn = document.createElement('button');
  lampBtn.className = 'sr-only';
  lampBtn.textContent = 'Включить или выключить лампу';
  Object.assign(lampBtn.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' });
  room.appendChild(lampBtn);

  const N = 14, SEG = 10;
  let pts = [], ax = 0, ay = 0, w = 1, h = 1, d = 1, dragging = false, armed = false, gx = 0, gy = 0, idle = 0;
  function anchor() {
    const rr = room.getBoundingClientRect(), br = bulb.getBoundingClientRect();
    ax = br.left + br.width * 0.78 - rr.left; ay = br.bottom - rr.top - 4;
  }
  function setup() {
    const r = R.fit(cord, 2); w = r.w; h = r.h; d = r.d;
    anchor();
    pts = Array.from({ length: N }, (_, i) => ({ x: ax, y: ay + i * SEG, ox: ax, oy: ay + i * SEG }));
  }
  R.onSize(room, setup);
  setup();

  function toggleLight() {
    room.classList.toggle('is-lit');
    const ac = audio();
    if (ac) {
      const t = ac.currentTime;
      noise(ac, t, { f: 3000, q: 2, dur: 0.02, g: 0.4 });
      noise(ac, t + 0.005, { type: 'lowpass', f: 500, dur: 0.05, g: 0.3 });
    }
  }
  lampBtn.addEventListener('click', toggleLight);

  grip.addEventListener('pointerdown', (e) => {
    dragging = true; armed = false; idle = 0;
    grip.setPointerCapture(e.pointerId);
    const rr = room.getBoundingClientRect();
    gx = e.clientX - rr.left; gy = e.clientY - rr.top;
    e.preventDefault();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rr = room.getBoundingClientRect();
    gx = e.clientX - rr.left; gy = e.clientY - rr.top;
  });
  const drop = () => {
    if (!dragging) return;
    dragging = false;
    if (armed) toggleLight();
    armed = false;
  };
  grip.addEventListener('pointerup', drop);
  grip.addEventListener('pointercancel', drop);

  R.loop(room, (dt, t) => {
    anchor();
    // RGB-подсветка клавиш
    if (kb.dataset.cap === 'rgb') keys.forEach((k) => k.style.setProperty('--h', ((k.px || 0) * 300 + (k.py || 0) * 80 + t * 120) % 360 | 0));
    idle += dt;
    // время от времени шнурок покачивается, чтобы его заметили
    if (idle > 5 && !dragging) { idle = 0; const last = pts[N - 1]; last.ox -= 6; }
    // верле
    const gr = 900 * dt * dt;
    for (let i = 1; i < N; i++) {
      const p = pts[i];
      const vx = (p.x - p.ox) * 0.985, vy = (p.y - p.oy) * 0.985;
      p.ox = p.x; p.oy = p.y;
      p.x += vx; p.y += vy + gr;
    }
    pts[0].x = ax; pts[0].y = ay;
    const last = pts[N - 1];
    if (dragging) { last.x = gx; last.y = gy; }
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < N - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
        // верёвка не растягивается, но при натяжении «пружинит» — так ощущается выключатель
        const maxL = dragging ? SEG * 1.5 : SEG;
        if (dist <= maxL && (dragging || dist <= SEG)) continue;
        const target = dragging ? maxL : SEG;
        const diff = (dist - target) / dist;
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; }
        else if (dragging && i + 1 === N - 1) { a.x += dx * diff; a.y += dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
      pts[0].x = ax; pts[0].y = ay;
      if (dragging) { last.x = gx; last.y = gy; }
    }
    if (dragging) {
      const pull = Math.hypot(last.x - ax, last.y - ay);
      armed = pull > SEG * (N - 1) + 34;
      if (pull > SEG * (N - 1) * 1.5 + 20) {
        // тянуть дальше нельзя
        const k = (SEG * (N - 1) * 1.5 + 20) / pull;
        gx = ax + (last.x - ax) * k; gy = ay + (last.y - ay) * k;
      }
    }
    grip.style.left = last.x + 'px';
    grip.style.top = last.y + 'px';
    cctx.setTransform(d, 0, 0, d, 0, 0);
    cctx.clearRect(0, 0, w, h);
    cctx.strokeStyle = room.classList.contains('is-lit') ? '#e8dcc8' : '#8d8478';
    cctx.lineWidth = 2;
    cctx.beginPath();
    cctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < N; i++) cctx.lineTo(pts[i].x, pts[i].y);
    cctx.stroke();
    const g = cctx.createRadialGradient(last.x - 3, last.y - 3, 1, last.x, last.y, 10);
    g.addColorStop(0, armed ? '#fff3c2' : '#f2d29a'); g.addColorStop(1, armed ? '#ffb02e' : '#9a6a2c');
    cctx.fillStyle = g;
    cctx.beginPath(); cctx.ellipse(last.x, last.y + 4, 8, 11, 0, 0, 7); cctx.fill();
  });
})();
