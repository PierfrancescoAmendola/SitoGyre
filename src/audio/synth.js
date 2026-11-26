/**
 * Pure Web Audio API synthesizer for GYRE.
 * Off until user explicitly enables sound.
 * Signal chain routes through a master DynamicsCompressorNode limiter.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.limiter = null;

    this.roomFilter = null;
    this.roomGain = null;
    this.droneGain = null;
    this.windFilter = null;
    this.windGain = null;
    this.noiseBuffer = null;

    this._lastTooth = 0;
    this._lastSite = -1;
  }

  _initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 18;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    // Shared 2-second pink-ish noise buffer
    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.05) * 0.5;
    }

    // Room tone: filtered noise + subtle 55Hz sub-drone
    const roomSrc = this.ctx.createBufferSource();
    roomSrc.buffer = this.noiseBuffer;
    roomSrc.loop = true;

    this.roomFilter = this.ctx.createBiquadFilter();
    this.roomFilter.type = 'lowpass';
    this.roomFilter.frequency.value = 140;

    this.roomGain = this.ctx.createGain();
    this.roomGain.gain.value = 0.18;

    roomSrc.connect(this.roomFilter);
    this.roomFilter.connect(this.roomGain);
    this.roomGain.connect(this.master);
    roomSrc.start();

    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.05;
    drone.connect(this.droneGain);
    this.droneGain.connect(this.master);
    drone.start();

    // Dive wind: bandpass noise modulated by scroll speed
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 320;
    this.windFilter.Q.value = 1.6;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    windSrc.start();
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) {
      this._initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0.75, this.ctx.currentTime, 0.08);
      }
    } else if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
    }
  }

  update(depth01, scrollVelocity, drumTurn, activeSite) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Room tone opens up with depth
    const cutoff = 120 + depth01 * 560;
    this.roomFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    this.droneGain.gain.setTargetAtTime(0.03 + depth01 * 0.06, now, 0.1);

    // Wind on the dive
    const speed = Math.min(1, Math.abs(scrollVelocity) * 1.8);
    this.windGain.gain.setTargetAtTime(speed * 0.22, now, 0.05);
    this.windFilter.frequency.setTargetAtTime(240 + speed * 760, now, 0.05);

    // Drum ratchet: 48 teeth per full turn
    const tooth = Math.floor((drumTurn / (Math.PI * 2)) * 48);
    if (tooth !== this._lastTooth) {
      this._lastTooth = tooth;
      this._playRatchetClick(0.025 + speed * 0.03);
    }

    // Site tick when crossing site boundary
    if (activeSite !== this._lastSite && this._lastSite !== -1) {
      this.playTick();
    }
    this._lastSite = activeSite;
  }

  _playRatchetClick(vol = 0.03) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.018);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.022);
  }

  playTick() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.03);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playClunk() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playRush(entering = true) {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    if (entering) {
      filter.frequency.setValueAtTime(220, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.42);
    } else {
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.42);
    }

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.28, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + 0.5);
  }
}
