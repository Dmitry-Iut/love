// ЗВУКОВЫЕ ЭФФЕКТЫ (все синтезируются, файлов не нужно).
// Использование: SFX.select(), SFX.match(2), SFX.win() ...
(() => {
  const AK = window.AudioKit;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const pick = a => a[(Math.random() * a.length) | 0];

  function ready() {
    if (!AK.init()) return null;
    AK.resume();
    return AK.ctx;
  }
  function osc(type, f0, f1, t, dur, vol, o = {}) {
    const c = AK.ctx, os = c.createOscillator(), g = c.createGain();
    os.type = type; os.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) os.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(AK.sfxBus);
    if (o.wet) { const s = c.createGain(); s.gain.value = o.wet; g.connect(s); s.connect(AK.fx); }
    os.start(t); os.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type, freq, q, o = {}) {
    const c = AK.ctx, src = c.createBufferSource();
    src.buffer = AK.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q || 1;
    f.frequency.setValueAtTime(freq, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(AK.sfxBus);
    if (o.wet) { const s = c.createGain(); s.gain.value = o.wet; g.connect(s); s.connect(AK.fx); }
    src.start(t, Math.random() * 0.8, dur + 0.02);
  }
  function bell(note, t, vol, dur) {
    const f = hz(note);
    osc('sine', f, null, t, dur, vol, { wet: 0.35 });
    osc('sine', f * 2.01, null, t, dur * 0.6, vol * 0.35, { wet: 0.35 });
  }

  const SFX = {
    // ----- сердце -----
    tap() { const c = ready(); if (!c) return; bell(pick([72, 76, 79, 81, 84]), c.currentTime, 0.12, 0.7); },
    sparkle() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      [88, 91, 95].forEach((n, k) => bell(n, t + k * 0.07, 0.07, 0.5));
    },
    button() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      osc('triangle', 500, 760, t, 0.07, 0.2); osc('sine', 1000, 1400, t + 0.03, 0.06, 0.08);
    },

    // ----- игра -----
    select() { const c = ready(); if (!c) return; const t = c.currentTime; osc('sine', 600, 900, t, 0.09, 0.22); osc('triangle', 1200, 1800, t, 0.05, 0.06); },
    deselect() { const c = ready(); if (!c) return; osc('sine', 700, 420, c.currentTime, 0.09, 0.18); },
    place() { const c = ready(); if (!c) return; const t = c.currentTime; osc('sine', 240, 110, t, 0.11, 0.4); noise(t, 0.05, 0.25, 'lowpass', 900); },
    error() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      osc('square', 160, 120, t, 0.1, 0.1); osc('square', 140, 100, t + 0.12, 0.12, 0.1);
    },
    pop(i = 0) {
      const c = ready(); if (!c) return; const t = c.currentTime, f = 620 + i * 160;
      osc('sine', f, f * 2, t, 0.12, 0.2); noise(t, 0.06, 0.12, 'highpass', 5000);
    },
    match(combo = 1) {
      const c = ready(); if (!c) return; const t = c.currentTime, sh = Math.min(combo - 1, 5) * 2;
      [72, 76, 79, 84].forEach((n, k) => bell(n + sh, t + k * 0.07, 0.16, 0.5));
    },
    bonus() { const c = ready(); if (!c) return; const t = c.currentTime; bell(88, t, 0.1, 0.35); bell(93, t + 0.08, 0.1, 0.4); },
    tick(urgent) {
      const c = ready(); if (!c) return;
      osc('triangle', urgent ? 1600 : 1100, null, c.currentTime, 0.04, urgent ? 0.2 : 0.12);
    },
    countdown(final) {
      const c = ready(); if (!c) return; const t = c.currentTime;
      if (final) { osc('sine', 880, null, t, 0.4, 0.25, { wet: 0.2 }); osc('triangle', 1760, null, t, 0.3, 0.08); }
      else osc('sine', 523, null, t, 0.15, 0.25);
    },
    start() { const c = ready(); if (!c) return; const t = c.currentTime; [72, 76, 79, 84].forEach((n, k) => bell(n, t + k * 0.09, 0.14, 0.4)); },
    win() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36, 0.6], [79, 0.72], [84, 0.84], [88, 0.96], [91, 1.08, 0.9]]
        .forEach(([n, dt, d]) => { bell(n, t + dt, 0.2, d || 0.35); osc('triangle', hz(n), null, t + dt, d || 0.3, 0.07); });
      [96, 100, 103, 108].forEach((n, k) => bell(n, t + 1.4 + k * 0.08, 0.06, 0.5));
    },
    lose() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      osc('triangle', 330, 311, t, 0.38, 0.25); osc('triangle', 294, 277, t + 0.4, 0.38, 0.25);
      osc('triangle', 262, 247, t + 0.8, 0.38, 0.25); osc('triangle', 196, 130, t + 1.2, 0.8, 0.28);
    },

    // ----- салют -----
    whistle() { const c = ready(); if (!c) return; osc('sine', 500, 2200, c.currentTime, 0.5, 0.06, { attack: 0.05 }); },
    boom() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      noise(t, 0.7, 0.5, 'lowpass', 1400, 0.7, { f1: 200, wet: 0.2 });
      osc('sine', 110, 40, t, 0.45, 0.5);
      for (let k = 0; k < 7; k++) noise(t + 0.08 + Math.random() * 0.5, 0.03, 0.16, 'highpass', 4000 + Math.random() * 3000);
    },

    // ----- поцелуй -----
    heartbeat(n = 4, gap = 0.7) {
      const c = ready(); if (!c) return; const t = c.currentTime;
      for (let k = 0; k < n; k++) {
        const b = t + k * gap;
        osc('sine', 120, 60, b, 0.14, 0.5); osc('triangle', 240, 120, b, 0.08, 0.15);
        osc('sine', 110, 55, b + 0.2, 0.12, 0.4); osc('triangle', 220, 110, b + 0.2, 0.07, 0.12);
      }
    },
    kiss() {
      const c = ready(); if (!c) return; const t = c.currentTime;
      osc('sine', 1300, 320, t, 0.07, 0.35); noise(t, 0.05, 0.35, 'bandpass', 2600, 3);
      osc('triangle', 520, 300, t + 0.07, 0.14, 0.2); noise(t + 0.06, 0.12, 0.08, 'bandpass', 1200, 2);
    }
  };
  window.SFX = SFX;
})();
