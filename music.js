// Нежная музыка, синтезируется прямо в браузере (Web Audio) — отдельных файлов не нужно.
// Аккорды C – Am – F – G, мягкий «пэд» и колокольчики-арпеджио с эхом.
(() => {
  let ctx, master, fx, timer, nextTime = 0, step = 0;
  let started = false, muted = false;

  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const BPM = 68, EIGHTH = 60 / BPM / 2;
  const CHORDS = [
    [48, 55, 60, 64],  // C
    [45, 52, 57, 60],  // Am
    [41, 48, 53, 57],  // F
    [43, 50, 55, 59]   // G
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2];

  function makeReverb(seconds) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function tone(freq, t, dur, type, vol, attack) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); g.connect(fx);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.35) {
      const inBar = step % 8;
      const chord = CHORDS[Math.floor(step / 8) % 4];
      if (inBar === 0) {
        chord.forEach(n => tone(hz(n), nextTime, EIGHTH * 8.5, "sine", 0.05, 0.8));
      }
      const n = chord[ARP[inBar]] + 12;
      tone(hz(n), nextTime, 1.8, "triangle", 0.08, 0.01);
      tone(hz(n + 12), nextTime, 1.0, "sine", 0.025, 0.01);
      // редкая нежная мелодия поверх
      if (inBar === 0 && (Math.floor(step / 8) % 2 === 1)) {
        tone(hz(chord[3] + 24), nextTime + EIGHTH * 2, 2.2, "sine", 0.045, 0.02);
      }
      nextTime += EIGHTH;
      step++;
    }
  }

  // Бесшумный <audio>: на iPhone это включает звук даже при выключенном «беззвучном» режиме
  function unlockIOS() {
    try {
      const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
      a.loop = true; a.play().catch(() => {});
    } catch (e) {}
  }

  window.Music = {
    start() {
      if (started) { if (ctx.state === "suspended") ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      started = true;
      ctx = new AC();
      unlockIOS();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      fx = ctx.createGain(); fx.gain.value = 0.55;
      const rev = makeReverb(3); fx.connect(rev); rev.connect(master);
      ctx.resume();
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.7, ctx.currentTime + 3);
      nextTime = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 100);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) ctx.suspend(); else if (!muted) ctx.resume();
      });
    },
    toggle() {
      muted = !muted;
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.15);
      return muted;
    }
  };
})();
