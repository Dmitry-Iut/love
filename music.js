// МУЗЫКА (синтезируется в браузере). Два трека:
//   'love' — нежный, для сердца и приза
//   'shop' — бодрый «как в супермаркете», для игры
// Управление: Music.start(), Music.setTrack('love'|'shop'), Music.duck(0..1), Music.toggle()
(() => {
  const AK = window.AudioKit;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const buses = {};
  let current = null, pending = null, step = 0, nextTime = 0, timer = null;

  function getBus(name) {
    if (buses[name]) return buses[name];
    const c = AK.ctx;
    const g = c.createGain(); g.gain.value = 0;
    const send = c.createGain(); send.gain.value = name === 'love' ? 0.55 : 0.18;
    g.connect(AK.musicBus); g.connect(send); send.connect(AK.fx);
    return (buses[name] = g);
  }

  function tone(freq, t, dur, type, vol, attack, bus) {
    const c = AK.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function hat(t, vol, bus) {
    const c = AK.ctx, src = c.createBufferSource();
    src.buffer = AK.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5, 0.06);
  }
  function mallet(freq, t, vol, bus) {          // «маримба»
    tone(freq, t, 0.45, 'triangle', vol, 0.004, bus);
    tone(freq * 3, t, 0.12, 'sine', vol * 0.25, 0.003, bus);
  }

  // ---------- нежный трек ----------
  const LOVE = {
    dur: 60 / 68 / 2,
    chords: [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]],
    arp: [0, 1, 2, 3, 2, 1, 3, 2],
    play(s, t, bus) {
      const inBar = s % 8, bi = Math.floor(s / 8), chord = this.chords[bi % 4];
      if (inBar === 0) chord.forEach(n => tone(hz(n), t, this.dur * 8.5, 'sine', 0.05, 0.8, bus));
      const n = chord[this.arp[inBar]] + 12;
      tone(hz(n), t, 1.8, 'triangle', 0.08, 0.01, bus);
      tone(hz(n + 12), t, 1.0, 'sine', 0.025, 0.01, bus);
      if (inBar === 0 && bi % 2 === 1) tone(hz(chord[3] + 24), t + this.dur * 2, 2.2, 'sine', 0.045, 0.02, bus);
    }
  };

  // ---------- бодрый «магазинный» трек ----------
  const SHOP = {
    dur: 60 / 118 / 2,
    roots: [48, 55, 57, 53],                                   // C  G  Am  F
    stabs: [[60, 64, 67], [59, 62, 67], [57, 60, 64], [60, 65, 69]],
    chords: [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [60, 65, 69, 72]],
    melA: [[76, 0, 79, 0, 84, 0, 79, 76], [74, 0, 79, 0, 83, 0, 79, 74],
           [76, 0, 81, 0, 84, 0, 81, 76], [77, 0, 81, 0, 84, 81, 77, 74]],
    arpB: [0, 1, 2, 1, 3, 2, 1, 2],
    play(s, t, bus) {
      const inBar = s % 8, bar = Math.floor(s / 8) % 8, ci = bar % 4, sect = bar < 4 ? 0 : 1;
      const root = this.roots[ci];
      if (inBar === 0 || inBar === 4) tone(hz(root), t, 0.24, 'triangle', 0.2, 0.005, bus);
      if (inBar === 2) tone(hz(root + 7), t, 0.18, 'triangle', 0.13, 0.005, bus);
      if (inBar === 6) tone(hz(root + 12), t, 0.2, 'triangle', 0.13, 0.005, bus);
      if (inBar % 2 === 1) this.stabs[ci].forEach(n => tone(hz(n), t, 0.13, 'triangle', 0.05, 0.004, bus));
      hat(t, inBar % 2 ? 0.035 : 0.02, bus);
      const m = sect === 0 ? this.melA[ci][inBar] : this.chords[ci][this.arpB[inBar]] + 12;
      if (m) mallet(hz(m), t, sect ? 0.08 : 0.1, bus);
    }
  };
  const TRACKS = { love: LOVE, shop: SHOP };

  function schedule() {
    if (!current || !AK.ctx || AK.ctx.state !== 'running') return;
    const T = TRACKS[current], bus = getBus(current), c = AK.ctx;
    if (nextTime < c.currentTime - 0.1) nextTime = c.currentTime + 0.05;   // догоняем после паузы
    while (nextTime < c.currentTime + 0.35) {
      T.play(step, nextTime, bus);
      nextTime += T.dur; step++;
    }
  }

  function setTrack(name) {
    if (!AK.ctx) { pending = name; return; }
    if (name === current) return;
    const c = AK.ctx, now = c.currentTime;
    if (current) {
      const old = getBus(current).gain;
      old.cancelScheduledValues(now); old.setTargetAtTime(0, now, 0.18);
    }
    current = name;
    if (name) {
      const g = getBus(name).gain;
      g.cancelScheduledValues(now);
      g.setTargetAtTime(1, now + 0.05, name === 'love' ? 0.8 : 0.25);
      step = 0; nextTime = now + 0.12;
      if (!timer) timer = setInterval(schedule, 100);
    }
  }

  window.Music = {
    start() {
      if (!AK.init()) return;
      AK.resume();
      if (!current) setTrack(pending || 'love');
    },
    setTrack,
    duck(v) { AK.duckMusic(v); },
    toggle() { return AK.toggleMute(); }
  };
})();
