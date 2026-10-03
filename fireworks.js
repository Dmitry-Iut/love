// САЛЮТ ИЗ СЕРДЕЦ: Fireworks.start() / Fireworks.stop()
(() => {
  const cv = document.createElement('canvas');
  cv.id = 'fw'; cv.className = 'hidden';
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:25;pointer-events:none';
  document.body.appendChild(cv);
  const c = cv.getContext('2d');

  const COLORS = ['#ff4d8d', '#ff8fb8', '#ffd1e3', '#ff3b5c', '#ffd166', '#7dd3fc', '#c4b5fd', '#ffffff'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const G = 0.16;
  let w = 0, h = 0, parts = [], rockets = [], running = false, raf = 0, nextLaunch = 0, last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launch() {
    const ty = rnd(0.14, 0.42) * h;
    rockets.push({ x: rnd(0.18, 0.82) * w, y: h + 10, vx: rnd(-0.5, 0.5), vy: -Math.sqrt(2 * G * (h + 10 - ty)), color: pick(COLORS) });
    window.SFX && SFX.whistle();
  }

  function heartVel(t) {
    return [Math.pow(Math.sin(t), 3),
            (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16];
  }

  function explode(x, y, color) {
    window.SFX && SFX.boom();
    const sp = rnd(3.4, 4.4), col2 = pick(COLORS);
    // большое сердце
    for (let k = 0; k < 84; k++) {
      const [hx, hy] = heartVel((k / 84) * Math.PI * 2);
      parts.push({ x, y, vx: hx * sp * 1.15, vy: -hy * sp * 1.15, life: 0, max: rnd(70, 100), size: rnd(1.8, 2.8), color, drag: 0.972, g: 0.03 });
    }
    // маленькое сердце внутри
    for (let k = 0; k < 46; k++) {
      const [hx, hy] = heartVel((k / 46) * Math.PI * 2);
      parts.push({ x, y, vx: hx * sp * 0.6, vy: -hy * sp * 0.6, life: 0, max: rnd(60, 90), size: rnd(1.5, 2.4), color: col2, drag: 0.972, g: 0.03 });
    }
    // искры
    for (let k = 0; k < 28; k++) {
      const a = Math.random() * Math.PI * 2, s = rnd(0.8, 3.2);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rnd(40, 70), size: rnd(1, 1.8), color: '#fff', drag: 0.96, g: 0.05 });
    }
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (ts - last < 12) return;               // не быстрее ~60 кадров/с (на iPhone экран 120 Гц)
    last = ts;

    if (ts > nextLaunch && parts.length < 1800) { launch(); nextLaunch = ts + rnd(380, 800); }

    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx; r.y += r.vy; r.vy += G;
      c.globalAlpha = 1; c.fillStyle = '#fff';
      c.beginPath(); c.arc(r.x, r.y, 2.2, 0, 6.283); c.fill();
      if (r.vy >= -0.8) { explode(r.x, r.y, r.color); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life++;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy;
      const k = p.life / p.max;
      c.globalAlpha = Math.pow(1 - k, 0.8);
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k * 0.4), 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
  }

  window.Fireworks = {
    start() {
      if (running) return;
      resize(); cv.classList.remove('hidden');
      parts = []; rockets = []; running = true; nextLaunch = 0; last = 0;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false; cancelAnimationFrame(raf);
      c.clearRect(0, 0, w, h); cv.classList.add('hidden');
    }
  };
  window.addEventListener('resize', () => { if (running) resize(); });
})();
