/* ==========================================================
   SOUND.JS — звуковые эффекты через синтез (Web Audio API)
   Никаких mp3/wav файлов: звук генерируется кодом в моменте,
   поэтому не увеличивает вес сайта и не требует хостинга медиа.
   Отключается через SoundSystem.setEnabled(false).
   ========================================================== */

const SoundSystem = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(v) { enabled = v; }

  // Простой тон с плавной атакой/затуханием (чтобы не щёлкало)
  function tone({ freq, start = 0, dur = 0.15, type = 'sine', peak = 0.18, slideTo = null }) {
    const c = getCtx();
    if (!c || !enabled) return;
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Взрыв шума через фильтр — для "вжух"/"шелест" эффектов
  function noiseBurst({ start = 0, dur = 0.25, peak = 0.12, filterFreq = 1200, filterType = 'bandpass' }) {
    const c = getCtx();
    if (!c || !enabled) return;
    const t0 = c.currentTime + start;
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  function tap() {
    tone({ freq: 520, dur: 0.06, type: 'triangle', peak: 0.1 });
  }

  function packShake() {
    noiseBurst({ dur: 0.35, peak: 0.15, filterFreq: 600, filterType: 'lowpass' });
    tone({ freq: 90, dur: 0.3, type: 'sine', peak: 0.2 });
  }

  // Звук раскрытия карты — сила зависит от редкости
  function reveal(rarity) {
    if (rarity === 'common') {
      tone({ freq: 660, dur: 0.12, type: 'triangle', peak: 0.14 });
    } else if (rarity === 'uncommon') {
      tone({ freq: 520, dur: 0.1, type: 'triangle', peak: 0.14 });
      tone({ freq: 780, start: 0.08, dur: 0.14, type: 'triangle', peak: 0.14 });
    } else if (rarity === 'rare') {
      tone({ freq: 440, dur: 0.1, type: 'sine', peak: 0.16 });
      tone({ freq: 660, start: 0.08, dur: 0.12, type: 'sine', peak: 0.16 });
      tone({ freq: 880, start: 0.16, dur: 0.2, type: 'sine', peak: 0.16 });
      noiseBurst({ start: 0, dur: 0.3, peak: 0.06, filterFreq: 3000 });
    } else if (rarity === 'epic') {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, start: i * 0.07, dur: 0.22, type: 'sine', peak: 0.17 }));
      noiseBurst({ start: 0, dur: 0.5, peak: 0.08, filterFreq: 4000 });
    } else if (rarity === 'legendary') {
      [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, start: i * 0.06, dur: 0.35, type: 'sine', peak: 0.18 }));
      tone({ freq: 196, dur: 0.6, type: 'sine', peak: 0.15 });
      noiseBurst({ start: 0, dur: 0.8, peak: 0.1, filterFreq: 5000 });
    }
  }

  function battleHit() {
    noiseBurst({ dur: 0.12, peak: 0.14, filterFreq: 900, filterType: 'lowpass' });
    tone({ freq: 180, dur: 0.1, type: 'square', peak: 0.1 });
  }

  function victory() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, start: i * 0.12, dur: 0.28, type: 'triangle', peak: 0.18 }));
  }

  function defeat() {
    [392, 349, 293].forEach((f, i) => tone({ freq: f, start: i * 0.16, dur: 0.32, type: 'sawtooth', peak: 0.12 }));
  }

  function coin() {
    tone({ freq: 880, dur: 0.08, type: 'square', peak: 0.1, slideTo: 1200 });
  }

  return { setEnabled, tap, packShake, reveal, battleHit, victory, defeat, coin };
})();
