// ОБЩИЙ ЗВУКОВОЙ ДВИЖОК: один AudioContext для музыки и эффектов.
// Остальные файлы (music.js, sfx.js) берут всё отсюда через window.AudioKit.
(() => {
  const AK = {
    ctx: null, master: null, musicBus: null, sfxBus: null, fx: null, noiseBuf: null,
    muted: false, VOL: 0.85, MUSIC_VOL: 0.7,

    init() {
      if (this.ctx) return this.ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = (this.ctx = new AC());
      unlockIOS();

      // мастер -> компрессор (чтобы звуки не «хрипели» вместе) -> динамики
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      comp.attack.value = 0.005; comp.release.value = 0.2;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.VOL, ctx.currentTime, 0.3);

      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.MUSIC_VOL; this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);

      // общее «эхо» (реверберация)
      this.fx = ctx.createGain();
      const rev = ctx.createConvolver();
      const len = ctx.sampleRate * 2.6;
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      rev.buffer = ir; this.fx.connect(rev); rev.connect(this.master);

      // белый шум для шипящих/хлопающих звуков
      const nl = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, nl, ctx.sampleRate);
      const nd = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;

      ctx.resume();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) ctx.suspend(); else ctx.resume();
      });
      return ctx;
    },

    resume() {
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.VOL, this.ctx.currentTime, 0.1);
      return this.muted;
    },

    // приглушить/вернуть музыку (1 = обычная громкость)
    duckMusic(v) {
      if (this.ctx) this.musicBus.gain.setTargetAtTime(this.MUSIC_VOL * v, this.ctx.currentTime, 0.25);
    }
  };

  // Беззвучный <audio>: на iPhone включает звук даже при выключенном «беззвучном» режиме
  function unlockIOS() {
    try {
      const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
      a.loop = true; a.play().catch(() => {});
    } catch (e) {}
  }

  window.AudioKit = AK;
})();
