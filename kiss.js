// ПРИЗ — ВИРТУАЛЬНЫЙ ПОЦЕЛУЙ ЧЕРЕЗ ЭКРАН: Kiss.show(onClose)
// 1) «Закрой глаза» -> 2) губы приближаются к экрану -> 3) поцелуй, запотевшее стекло, сердечки
// 4) Лена касается экрана — остаются отпечатки губ и летят сердечки (ответный поцелуй).
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const sfx = (n, ...a) => { try { window.SFX[n](...a); } catch (e) {} };

  function lipsSVG() {
    return '<svg viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M8 68 C25 60 45 38 68 36 C82 35 92 44 100 50 C108 44 118 35 132 36 C155 38 175 60 192 68 C165 74 135 72 100 72 C65 72 35 74 8 68 Z" fill="#d6204f"/>' +
      '<path d="M8 68 C35 74 65 72 100 72 C135 72 165 74 192 68 C178 100 145 118 100 118 C55 118 22 100 8 68 Z" fill="#f0456e"/>' +
      '<path d="M8 68 C35 74 65 72 100 72 C135 72 165 74 192 68" fill="none" stroke="#8f1236" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="94" rx="38" ry="9" fill="#fff" opacity=".28"/>' +
      '<ellipse cx="72" cy="48" rx="14" ry="4" fill="#fff" opacity=".25" transform="rotate(-18 72 48)"/>' +
      '</svg>';
  }

  window.Kiss = {
    show(onClose) {
      try { Music.setTrack('love'); Music.duck(1); } catch (e) {}

      const root = document.createElement('div');
      root.className = 'kiss';
      root.innerHTML =
        '<div class="k-fog"></div>' +
        '<div class="k-lips">' + lipsSVG() + '</div>' +
        '<div class="k-text"></div>' +
        '<div class="k-hint">А теперь твой черёд: коснись экрана,<br>и поцелуй долетит до меня 💋</div>' +
        '<button class="g-btn k-close">Закрыть 💗</button>';
      document.body.appendChild(root);

      const text = root.querySelector('.k-text'), lips = root.querySelector('.k-lips'),
            fog = root.querySelector('.k-fog'), hint = root.querySelector('.k-hint'),
            closeBtn = root.querySelector('.k-close');
      let canPrint = false, closed = false;
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      const setText = html => { text.style.opacity = 0; later(() => { text.innerHTML = html; text.style.opacity = 1; }, 450); };

      function hearts(x, y, n, spread) {
        for (let k = 0; k < n; k++) {
          const h = document.createElement('span');
          h.className = 'k-heart';
          h.textContent = pick(['💗', '💖', '💕', '❤️', '💋', '💘']);
          h.style.left = (x + rnd(-spread, spread)) + 'px';
          h.style.top = y + 'px';
          h.style.setProperty('--x', rnd(-spread * 1.5, spread * 1.5) + 'px');
          h.style.setProperty('--y', -rnd(120, 300) + 'px');
          h.style.setProperty('--d', rnd(1.6, 2.8) + 's');
          h.style.fontSize = rnd(20, 40) + 'px';
          h.addEventListener('animationend', () => h.remove());
          root.appendChild(h);
        }
      }

      function print(x, y) {
        const p = document.createElement('div');
        p.className = 'k-print';
        p.innerHTML = lipsSVG();
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.setProperty('--r', rnd(-28, 28) + 'deg');
        p.addEventListener('animationend', () => p.remove());
        root.appendChild(p);
        sfx('kiss'); hearts(x, y, 5, 40);
        const all = root.querySelectorAll('.k-print');
        if (all.length > 14) all[0].remove();
      }

      requestAnimationFrame(() => root.classList.add('show'));

      // ---- сценарий ----
      later(() => { text.innerHTML = 'Закрой глаза… 😌'; text.style.opacity = 1; }, 500);
      later(() => { text.style.opacity = 0; }, 1900);
      later(() => {
        text.innerHTML = 'Кто-то приближается… 💗'; text.style.opacity = 1;
        lips.classList.add('approach');
        sfx('heartbeat', 4, 0.62);
      }, 2400);
      later(() => {                                   // ПОЦЕЛУЙ
        lips.classList.remove('approach'); lips.classList.add('press');
        fog.classList.add('on');
        sfx('kiss');
        root.classList.add('shake'); later(() => root.classList.remove('shake'), 500);
        if (navigator.vibrate) navigator.vibrate([30, 40, 70]);
        const r = lips.getBoundingClientRect();
        hearts(r.left + r.width / 2, r.top + r.height / 2, 22, 140);
        later(() => sfx('sparkle'), 250);
      }, 4900);
      later(() => { text.style.opacity = 0; }, 5300);
      later(() => { text.innerHTML = 'Целую тебя, Лена! 😘<small>Твой Дима 💗</small>'; text.style.opacity = 1; }, 5750);
      later(() => { hint.style.opacity = 1; canPrint = true; }, 7000);
      later(() => { closeBtn.style.opacity = 1; }, 8500);

      root.addEventListener('pointerdown', e => {
        if (!canPrint || e.target.closest('.k-close')) return;
        e.preventDefault();
        hint.style.opacity = 0.0;
        print(e.clientX, e.clientY);
      });

      closeBtn.addEventListener('click', () => {
        if (closed || closeBtn.style.opacity !== '1') return;
        closed = true;
        sfx('button');
        timers.forEach(clearTimeout);
        root.classList.remove('show');
        setTimeout(() => { root.remove(); onClose && onClose(); }, 600);
      });
    }
  };
})();
