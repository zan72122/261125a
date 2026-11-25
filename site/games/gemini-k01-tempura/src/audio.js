/**
 * Procedural Web Audio API Sound Engine for Photorealistic Tempura Kitchen:
 * - Signature continuous multi-band "JUUUWA" frying sizzle + micro-crackle pops
 * - Explosive moisture-entry burst when batter/shrimp hits hot oil
 * - Creamy batter dip gloop, bamboo chopstick wood click, oil drip pichi
 * - Gas burner click + low warm flame hiss
 * - Sea salt crystal sprinkle (sara-sara), Tentsuyu pour (choro-choro)
 * - Crispy golden bite crunch (SAKU-SAKU) + Mama's warm non-verbal gentle hums!
 */
export class TempuraAudio {
  constructor() {
    this.ctx = null;
    this.noiseBuf = null;
    this.sizzleGain = null;
    this.sizzleFilter = null;
    this.crackleGain = null;
    this.burnerGain = null;
    this.crackleTimer = 0;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    // 2.5s looped stereo pink/white noise buffer
    const len = Math.floor(this.ctx.sampleRate * 2.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.35) * 0.72));
    }

    // Master gentle limiter / warmth
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.78;
    this.master.connect(this.ctx.destination);

    // 1. Continuous Oil Sizzle Bed (Bandpass + Highshelf)
    const sizzleSrc = this.ctx.createBufferSource();
    sizzleSrc.buffer = this.noiseBuf;
    sizzleSrc.loop = true;

    this.sizzleFilter = this.ctx.createBiquadFilter();
    this.sizzleFilter.type = 'bandpass';
    this.sizzleFilter.frequency.value = 2600;
    this.sizzleFilter.Q.value = 0.65;

    const sizzleHigh = this.ctx.createBiquadFilter();
    sizzleHigh.type = 'highpass';
    sizzleHigh.frequency.value = 900;

    this.sizzleGain = this.ctx.createGain();
    this.sizzleGain.gain.value = 0.0;

    sizzleSrc.connect(this.sizzleFilter);
    this.sizzleFilter.connect(sizzleHigh);
    sizzleHigh.connect(this.sizzleGain);
    this.sizzleGain.connect(this.master);
    sizzleSrc.start();

    // 2. Subtle Warm Gas Burner Low Hiss
    const burnerSrc = this.ctx.createBufferSource();
    burnerSrc.buffer = this.noiseBuf;
    burnerSrc.loop = true;

    const burnerFilter = this.ctx.createBiquadFilter();
    burnerFilter.type = 'lowpass';
    burnerFilter.frequency.value = 340;

    this.burnerGain = this.ctx.createGain();
    this.burnerGain.gain.value = 0.045;

    burnerSrc.connect(burnerFilter);
    burnerFilter.connect(this.burnerGain);
    this.burnerGain.connect(this.master);
    burnerSrc.start();

    this.unlocked = true;
  }

  /**
   * Updates continuous sizzling intensity from real physical frying state!
   */
  updateContinuous(dt, totalFryEnergy, heat) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Gas burner hum scales with heat knob
    this.burnerGain.gain.setTargetAtTime(0.025 + heat * 0.055, now, 0.08);

    // Continuous sizzle bed ("juwaaaa...")
    const clampedEnergy = Math.min(2.2, totalFryEnergy);
    const targetGain = clampedEnergy > 0.01 ? (0.04 + Math.min(0.32, clampedEnergy * 0.16)) : 0.008 * heat;
    const targetFreq = 1800 + Math.min(2400, clampedEnergy * 1100) + heat * 500;
    this.sizzleGain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.sizzleFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);

    // Stochastic crisp oil bubble micro-pops ("pichi! pachi!")
    if (clampedEnergy > 0.04) {
      this.crackleTimer -= dt * (6 + clampedEnergy * 18);
      if (this.crackleTimer <= 0) {
        this.crackleTimer = 0.35 + Math.random() * 0.9;
        this.playOilPop(0.3 + Math.min(0.7, clampedEnergy * 0.35));
      }
    }
  }

  /**
   * Signature explosive "JUUUWA!!" when food enters hot oil
   */
  playOilDrop(intensity = 1.0) {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Low splash thump
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
    og.gain.setValueAtTime(0.18 * intensity, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(og);
    og.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.17);

    // Lush wideband sizzle burst (JUUUWA!)
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3400, now);
    bp.frequency.exponentialRampToValueAtTime(1750, now + 0.95);
    bp.Q.value = 0.52;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.42 * intensity, now + 0.045);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 1.2, 1.2);

    // Rapid cluster of crisp bubble crackles right after entry
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.playOilPop(0.55 * intensity), 45 + i * 55 + Math.random() * 35);
    }
  }

  playOilPop(strength = 0.5) {
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2800 + Math.random() * 4400;
    hp.Q.value = 2.4;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.16 * strength, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.032 + Math.random() * 0.028);

    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 1.8, 0.07);
  }

  playChopstickClick() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180 + Math.random() * 240, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.038);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.046);
  }

  playBatterDip() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(430, now + 0.11);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.22);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playPlateSet(crispness = 0.7) {
    this.unlock();
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime;
    // Soft crisp washi paper rustle
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2100 + crispness * 1400;
    bp.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 1.5, 0.15);
  }

  playSaltSprinkle() {
    this.unlock();
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 1.5, 0.09);
  }

  playTentsuyuPour() {
    this.unlock();
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const baseF = 440 + Math.random() * 260;
    osc.frequency.setValueAtTime(baseF, now);
    osc.frequency.exponentialRampToValueAtTime(baseF * 1.38, now + 0.06);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playGasKnobClick() {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Joyful crispy tempura crunch ("SAKU! SAKU!") + Mama's warm delighted musical hum
   */
  playCrispyBite(crispness = 1.0) {
    this.unlock();
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime;

    for (let bite = 0; bite < 2; bite++) {
      const t = now + bite * 0.22;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + crispness * 1700;
      bp.Q.value = 0.85;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.28 * (0.65 + crispness * 0.45), t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      src.start(t, Math.random(), 0.16);
    }

    // Mama's warm gentle non-verbal delighted hum ("mmm~♪")
    this.playMamaWarmHum(0.45);
  }

  playMamaWarmHum(delay = 0.05) {
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const notes = [392.0, 493.88, 587.33]; // Warm G major gentle chord arpeggio hum
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const lpf = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      lpf.type = 'lowpass';
      lpf.frequency.value = 900;

      const t0 = now + idx * 0.095;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, t0 + 0.22);

      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.075, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);

      osc.connect(lpf);
      lpf.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.38);
    });
  }
}
