/* final.js — финальный экран: сакура, конфетти на кнопке, подсказка к пасхалке */
(() => {
  const { $ } = R;
  const sec = $('#final');
  const petals = new R.Petals($('#finalPetals'), { count: R.small() ? 30 : 55, wind: 22, area: sec });
  R.loop(sec, (dt) => petals.step(dt));

  $('#ctaBtn').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    R.confetti(r.left + r.width / 2, r.top + r.height / 2, 160);
  });

  const hint = $('.egg-hint');
  hint.style.cursor = 'pointer';
  hint.setAttribute('role', 'button');
  hint.tabIndex = 0;
  const tip = () => {
    hint.textContent = R.fine
      ? '🌸 Подсказка: наберите на клавиатуре revenge или 5 раз быстро нажмите на логотип вверху'
      : '🌸 Подсказка: 5 раз быстро нажмите на логотип REVENGE вверху';
  };
  hint.addEventListener('click', tip);
  hint.addEventListener('keydown', (e) => { if (e.key === 'Enter') tip(); });
})();
