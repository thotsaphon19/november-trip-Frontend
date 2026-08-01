// Two-tone "heads up" beep for the contract-expiry alert, synthesized with
// the Web Audio API so there's no audio file to ship/host. Safe to call
// from anywhere in the browser; does nothing (silently) in environments
// without audio support.
export function playAlertBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tones = [880, 660]; // short high-low chime, not jarring
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      const end = start + 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
    // Close the context a bit after the last tone finishes, so it doesn't
    // linger as an open audio node.
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Autoplay-blocked or unsupported - fail silently, the visual banner
    // still carries the alert.
  }
}
