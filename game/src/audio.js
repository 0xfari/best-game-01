// Tiny synthesized sounds (WebAudio oscillators, no audio files): a blip when a tower
// shoots, a pop when a grub bursts, a chime when a tower is planted, a horn when a wave
// starts and a low thud when the Heartbloom is hurt. Everything is guarded: if the
// browser refuses audio, the game plays on silently.
export function createAudio() {
  let context = null;
  let enabled = true;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (!enabled) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      enabled = false;
    }
  }

  return {
    shoot() { tone(720, 0.07, 'square', 0.03, 420); },
    pop() { tone(300, 0.12, 'triangle', 0.06, 90); },
    place() { tone(520, 0.14, 'sine', 0.07, 780); },
    horn() { tone(196, 0.35, 'sawtooth', 0.05, 294); },
    hurt() { tone(140, 0.3, 'sawtooth', 0.09, 70); },
    win() { tone(523, 0.18, 'sine', 0.07); setTimeout(() => tone(659, 0.18, 'sine', 0.07), 160); setTimeout(() => tone(784, 0.3, 'sine', 0.07), 320); },
  };
}
