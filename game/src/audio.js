// Sound, synthesized live with WebAudio: no audio files, no network. An
// engine hum that follows speed, a two-tone police siren, gunshots, a
// pickup chime and mission jingles. Everything starts on the first user
// gesture, as browsers require; M mutes.

export function createSoundEngine() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 40;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      const engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 660;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  function blip(frequency, duration, type, volume, slideTo) {
    if (!ensure()) return;
    const start = context.currentTime;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noiseBurst(duration, volume, filterFreq) {
    if (!ensure()) return;
    const start = context.currentTime;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    /** Call from any user gesture (click / key) so audio may start. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** speed 0..1 while driving; 0 and the hum fades out. */
    engine(speed) {
      if (!context || !engineOsc) return;
      engineOsc.frequency.value = 42 + speed * 130;
      engineGain.gain.value = speed > 0.02 ? 0.05 + speed * 0.05 : 0;
    },
    siren(active, dt) {
      if (!context || !sirenOsc) return;
      sirenOn = active;
      if (!active) {
        sirenGain.gain.value = 0;
        return;
      }
      sirenTimer += dt;
      sirenOsc.frequency.value = Math.floor(sirenTimer * 1.6) % 2 === 0 ? 660 : 880;
      sirenGain.gain.value = 0.045;
    },
    get sirenActive() {
      return sirenOn;
    },
    gunshot() {
      noiseBurst(0.14, 0.5, 1800);
    },
    punch() {
      noiseBurst(0.08, 0.3, 500);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.25, 990);
    },
    cash() {
      blip(880, 0.1, 'triangle', 0.22);
      setTimeout(() => blip(1320, 0.14, 'triangle', 0.22), 90);
    },
    crash() {
      noiseBurst(0.25, 0.45, 700);
    },
    missionDone() {
      blip(523, 0.14, 'triangle', 0.25);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.25), 130);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.28), 260);
    },
    busted() {
      blip(392, 0.3, 'sawtooth', 0.2, 196);
    },
  };
}
