(() => {
  // ====== НАСТРОЙКИ ======
  const CONFIG = {
    outlineCount: 1500,  // яркий контур сердца (делает форму чёткой)
    fillCount: 2300,     // заполнение сердца
    floatCount: 140,     // блуждающие огоньки
    burstCount: 140,     // частиц на одно касание
    lineSeconds: 3       // сколько держится строка (также в style.css -> lineLife)
  };

  const POEM = [
    ["Ты моя любимая,", "😘"],
    ["Нежная такая,", "🥰"],
    ["Самая красивая,", "😍"],
    ["Самая родная.", "🤗"],
    ["Мой родной цветочек ты,", "🥺"],
    ["Нежность ты и ласка.", "💗"],
    ["Ты моя принцессочка,", "🔥"],
    ["Волшебство и сказка!", "❤️"],
    ["Любимой Лене от Димы", "💗", true]
  ];
  // =======================

  const BLUE_SHADES = ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#bfdbfe", "#1d4ed8", "#ffffff"];

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let width, height, dpr, cx, cy, S, baseY;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min(width * 0.4, height * 0.26);
    cx = width / 2;
    cy = height * 0.38;
    baseY = cy + S * 1.25;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  resize();

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // Точка на классическом сердце (x = sin³t, y = 13cos t − 5cos2t − 2cos3t − cos4t).
  // r = 1 — контур, r < 1 — внутренняя область.
  function heartPoint(r) {
    const t = Math.random() * Math.PI * 2;
    const x = Math.pow(Math.sin(t), 3);
    const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
    return [x * r, y * r + 0.15];
  }

  class Particle {
    constructor(kind, x, y) {
      this.kind = kind;
      this.color = pick(BLUE_SHADES);
      this.phase = Math.random() * Math.PI * 2;
      if (kind === "outline") { this.size = rnd(1.4, 2.6); this.maxLife = rnd(260, 480); this.peak = 1; }
      if (kind === "fill")    { this.size = rnd(0.8, 1.7); this.maxLife = rnd(220, 420); this.peak = 0.7; }
      if (kind === "float")   { this.size = rnd(0.8, 1.8); this.maxLife = rnd(300, 600); }
      if (kind === "burst")   { this.size = rnd(1.2, 2.6); this.maxLife = rnd(80, 120); }
      this.reset(x, y);
      if (kind !== "burst") this.life = Math.random() * this.maxLife; // stagger starting life
    }
    reset(x, y) {
      this.life = 0;
      if (this.kind === "burst") {
        const p = heartPoint(Math.random() < 0.5 ? 1 : Math.sqrt(Math.random()));
        this.sx = x; this.sy = y;
        this.tx = x + p[0] * S * 0.55;
        this.ty = y - p[1] * S * 0.55;
      } else if (this.kind === "float") {
        this.x = Math.random() * width; this.y = Math.random() * height;
        this.vx = rnd(-0.25, 0.25); this.vy = rnd(-0.5, -0.1);
      } else {
        const p = this.kind === "outline"
          ? heartPoint(1 - Math.random() * 0.025)
          : heartPoint(Math.sqrt(Math.random()) * 0.97);
        this.ux = p[0]; this.uy = p[1];
        this.sx = cx + rnd(-1, 1) * S * 0.5;
        this.sy = baseY + rnd(-1, 1) * S * 0.1;
      }
    }
    update(t) {
      this.life++;
      const k = this.life / this.maxLife;

      if (this.kind === "float") {
        this.x += this.vx + Math.sin(t * 0.01 + this.phase) * 0.15;
        this.y += this.vy;
        if (this.life >= this.maxLife || this.y < -10) this.reset();
        this.alpha = Math.sin(Math.PI * Math.min(k, 1)) * 0.5;
        return;
      }
      if (this.life >= this.maxLife) {
        if (this.kind === "burst") { this.dead = true; return; }
        this.reset();
      }

      if (this.kind === "burst") {
        const e = easeOut(Math.min(k * 1.6, 1));
        this.x = this.sx + (this.tx - this.sx) * e;
        this.y = this.sy + (this.ty - this.sy) * e - k * 25;
        this.alpha = Math.min(1, Math.sin(Math.PI * Math.pow(k, 0.7)) * 1.2);
      } else {
        // лёгкое «дыхание» всего сердца
        const beat = 1 + Math.sin(t * 0.04) * 0.02 + Math.max(0, Math.sin(t * 0.08)) * 0.012;
        const tx = cx + this.ux * S * beat;
        const ty = cy - this.uy * S * beat;
        const e = easeOut(Math.min(k * 4, 1));       // быстро взлетает и надолго «садится» на форму
        const swirl = (1 - e) * S * 0.3;
        const jitter = this.kind === "outline" ? 0.6 : 1.1;
        this.x = this.sx + (tx - this.sx) * e + Math.sin(t * 0.03 + this.phase) * swirl
               + Math.sin(t * 0.09 + this.phase * 2) * jitter;
        this.y = this.sy + (ty - this.sy) * e + Math.cos(t * 0.025 + this.phase) * swirl * 0.4
               + Math.cos(t * 0.08 + this.phase) * jitter;
        const flick = 0.85 + 0.15 * Math.sin(t * 0.1 + this.phase);
        this.alpha = Math.min(1, k * 8) * Math.min(1, (1 - k) * 6) * this.peak * flick;
      }
    }
    draw() {
      if (this.alpha <= 0.01) return;
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      const s = this.size;
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    }
  }

  const heartParticles = [];
  for (let i = 0; i < CONFIG.outlineCount; i++) heartParticles.push(new Particle("outline"));
  for (let i = 0; i < CONFIG.fillCount; i++) heartParticles.push(new Particle("fill"));
  const floatParticles = [];
  for (let i = 0; i < CONFIG.floatCount; i++) floatParticles.push(new Particle("float"));
  let burstParticles = [];

  function spawnHeartBurst(x, y) {
    for (let i = 0; i < CONFIG.burstCount; i++) burstParticles.push(new Particle("burst", x, y));
  }

  // ----- стихотворение -----
  const poemEl = document.getElementById("poem");
  const hintEl = document.getElementById("hint");
  let lineIndex = 0;

  function showLine() {
    poemEl.querySelectorAll(".line:not(.out)").forEach(el => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 320);
    });
    const [text, emoji, sign] = POEM[lineIndex];
    lineIndex = (lineIndex + 1) % POEM.length;
    const el = document.createElement("div");
    el.className = "line" + (sign ? " sign" : "");
    el.textContent = text + " " + emoji;
    el.style.animationDuration = CONFIG.lineSeconds + "s";
    el.addEventListener("animationend", () => el.remove());
    poemEl.appendChild(el);
  }

  // ----- касания -----
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    window.Music && window.Music.start();
    spawnHeartBurst(e.clientX, e.clientY);
    showLine();
    hintEl.style.opacity = 0;
  });
  document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", e => e.preventDefault());

  const muteBtn = document.getElementById("mute");
  muteBtn.addEventListener("pointerdown", e => {
    e.stopPropagation();
    window.Music.start();
    muteBtn.textContent = window.Music.toggle() ? "🔇" : "🔊";
  });

  // ----- отрисовка -----
  function drawBase(t) {
    const pulse = 1 + Math.sin(t * 0.04) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, baseY);
    ctx.scale(1, 0.3);
    const r = S * 0.8 * pulse;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, "rgba(34,211,238,0.95)");
    g.addColorStop(0.35, "rgba(37,150,255,0.6)");
    g.addColorStop(1, "rgba(29,78,216,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  let t = 0;
  function frame() {
    t++;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.32)";      // короткий шлейф — форма сердца остаётся чёткой
    ctx.fillRect(0, 0, width, height);

    drawBase(t);

    ctx.globalCompositeOperation = "lighter";
    for (const p of floatParticles) { p.update(t); p.draw(); }
    for (const p of heartParticles) { p.update(t); p.draw(); }
    for (const p of burstParticles) { p.update(t); p.draw(); }
    burstParticles = burstParticles.filter(p => !p.dead);
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();
})();
