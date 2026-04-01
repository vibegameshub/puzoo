// sound.js - Web Audio API 효과음 (라이브러리 없음)

const SoundManager = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(type) {
    if (!enabled) return;
    const ac = getCtx();
    const t = ac.currentTime;
    let o, g;

    switch (type) {
      case 'move':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.setValueAtTime(220, t);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.start(t); o.stop(t + 0.05);
        break;

      case 'rotate':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(330, t);
        o.frequency.exponentialRampToValueAtTime(440, t + 0.1);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t); o.stop(t + 0.1);
        break;

      case 'land':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(80, t + 0.15);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;

      case 'hardDrop':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(50, t + 0.2);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
        break;

      case 'clear1':
        [523, 659, 784].forEach((freq, i) => {
          const o2 = ac.createOscillator();
          const g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = freq;
          g2.gain.setValueAtTime(0.2, t + i * 0.08);
          g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
          o2.start(t + i * 0.08); o2.stop(t + i * 0.08 + 0.2);
        });
        break;

      case 'tetris':
        [523, 659, 784, 1047].forEach((freq, i) => {
          const o2 = ac.createOscillator();
          const g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.type = 'sine';
          o2.frequency.value = freq;
          g2.gain.setValueAtTime(0.25, t + i * 0.07);
          g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.4);
          o2.start(t + i * 0.07); o2.stop(t + i * 0.07 + 0.4);
        });
        break;

      case 'fever':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(440, t);
        o.frequency.exponentialRampToValueAtTime(880, t + 0.3);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t); o.stop(t + 0.3);
        break;

      case 'levelup':
        [392, 523, 659, 784].forEach((freq, i) => {
          const o2 = ac.createOscillator();
          const g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = freq;
          g2.gain.setValueAtTime(0.2, t + i * 0.1);
          g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
          o2.start(t + i * 0.1); o2.stop(t + i * 0.1 + 0.3);
        });
        break;

      case 'gameover':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(440, t);
        o.frequency.exponentialRampToValueAtTime(110, t + 1.0);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        o.start(t); o.stop(t + 1.0);
        break;

      case 'hold':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.setValueAtTime(440, t);
        o.frequency.setValueAtTime(330, t + 0.1);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
        break;

      case 'combo':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(523, t);
        o.frequency.exponentialRampToValueAtTime(784, t + 0.15);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;

      case 'affinity':
        o = ac.createOscillator(); g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(880, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t); o.stop(t + 0.1);
        break;

      case 'perfect':
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
          const o2 = ac.createOscillator();
          const g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.type = 'sine';
          o2.frequency.value = freq;
          g2.gain.setValueAtTime(0.25, t + i * 0.1);
          g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);
          o2.start(t + i * 0.1); o2.stop(t + i * 0.1 + 0.5);
        });
        break;
    }
  }

  return { play, resume: getCtx, setEnabled(on) { enabled = on; } };
})();
