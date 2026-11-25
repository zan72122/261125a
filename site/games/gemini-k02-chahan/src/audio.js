/**
 * Procedural Web Audio synthesizer for realistic Chinese wok high-heat cooking foley:
 * - Gas burner roaring whoosh (scales continuously with fire level)
 * - Continuous sizzling oil & moisture crackle ("ジュウウウ...")
 * - Metallic wok ladle scrape, heavy wok toss & cascading parapara rice rain
 * - Liquid oil/egg/soy pour & steam hiss bursts
 * - Warm wordless joyful musical chimes for Mom's reactions
 */
export class CookingAudio {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.noiseBuffer = null;

    this.burnerGain = null;
    this.burnerFilter = null;
    this.sizzleGain = null;
    this.sizzleFilter = null;
    this.crackleGain = null;

    this.sizzleBurst = 0;
    this.lastScrapeTime = 0;
    this.crackleAccum = 0;
  }

  unlock() {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Create 3-second rich white/pink noise buffer
    const len = this.ctx.sampleRate * 3;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const master = this.ctx.createGain();
    master.gain.value = 0.72;
    master.connect(this.ctx.destination);
    this.master = master;

    // 1) Continuous Gas Burner Roar
    const burnerSrc = this.ctx.createBufferSource();
    burnerSrc.buffer = this.noiseBuffer;
    burnerSrc.loop = true;

    this.burnerFilter = this.ctx.createBiquadFilter();
    this.burnerFilter.type = 'lowpass';
    this.burnerFilter.frequency.value = 220;
    this.burnerFilter.Q.value = 1.4;

    this.burnerGain = this.ctx.createGain();
    this.burnerGain.gain.value = 0.001;

    burnerSrc.connect(this.burnerFilter);
    this.burnerFilter.connect(this.burnerGain);
    this.burnerGain.connect(master);
    burnerSrc.start();

    // 2) Continuous High-Heat Oil & Food Sizzle ("ジュウウ...")
    const sizzleSrc = this.ctx.createBufferSource();
    sizzleSrc.buffer = this.noiseBuffer;
    sizzleSrc.loop = true;

    const sizzleHP = this.ctx.createBiquadFilter();
    sizzleHP.type = 'highpass';
    sizzleHP.frequency.value = 1850;

    this.sizzleFilter = this.ctx.createBiquadFilter();
    this.sizzleFilter.type = 'bandpass';
    this.sizzleFilter.frequency.value = 4600;
    this.sizzleFilter.Q.value = 0.75;

    this.sizzleGain = this.ctx.createGain();
    this.sizzleGain.gain.value = 0.0001;

    sizzleSrc.connect(sizzleHP);
    sizzleHP.connect(this.sizzleFilter);
    this.sizzleFilter.connect(this.sizzleGain);
    this.sizzleGain.connect(master);
    sizzleSrc.start();

    this.unlocked = true;
  }

  update(dt, { heatLevel, wokTemp, oilAmount, foodAmount, moisture, stirEnergy }) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Decay burst
    this.sizzleBurst = Math.max(0, this.sizzleBurst - dt * 1.4);

    // Gas burner roar scales dramatically on strong fire
    const targetBurnerGain = heatLevel <= 0.01 ? 0.0001 : 0.025 + Math.pow(heatLevel, 1.4) * 0.145;
    const targetBurnerFreq = 140 + heatLevel * 440;
    this.burnerGain.gain.setTargetAtTime(targetBurnerGain, now, 0.08);
    this.burnerFilter.frequency.setTargetAtTime(targetBurnerFreq, now, 0.08);

    // Continuous sizzle intensity from wok temperature + oil/food moisture + stirring
    const heatNorm = Math.max(0, Math.min(1, (wokTemp - 85) / 165));
    const presence = Math.min(1, oilAmount * 0.55 + foodAmount * 0.65);
    const baseSizzle = heatNorm * presence * (0.045 + moisture * 0.095 + stirEnergy * 0.12);
    const totalSizzle = Math.min(0.32, baseSizzle + this.sizzleBurst * 0.22);

    this.sizzleGain.gain.setTargetAtTime(Math.max(0.0001, totalSizzle), now, 0.05);
    this.sizzleFilter.frequency.setTargetAtTime(3400 + heatNorm * 2400 + this.sizzleBurst * 1400, now, 0.06);

    // Stochastic realistic hot oil crackle micro-pops
    const popRate = heatNorm * presence * (8 + moisture * 22 + this.sizzleBurst * 26);
    this.crackleAccum += dt * popRate;
    while (this.crackleAccum >= 1) {
      this.crackleAccum -= 1;
      if (Math.random() < 0.72) {
        this._playMicroPop(0.018 + heatNorm * 0.032 + this.sizzleBurst * 0.03);
      }
    }
  }

  _playMicroPop(vol) {
    if (!this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200 + Math.random() * 5400;
    filter.Q.value = 2.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.012 + Math.random() * 0.022);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 2.5, 0.04);
  }

  triggerSizzleBurst(strength = 0.8) {
    this.sizzleBurst = Math.min(1.4, Math.max(this.sizzleBurst, strength));
    if (!this.unlocked || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Sharp "JUUUWAAA!" steam-hit burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(5200, now);
    bp.frequency.exponentialRampToValueAtTime(2400, now + 0.55);
    bp.Q.value = 0.6;

    const g = this.ctx.createGain();
    const peak = Math.min(0.32, 0.14 * strength);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42 + strength * 0.35);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 1.5, 0.9);
  }

  playGasClick(heatLevel) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Tactile knob click
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 + heatLevel * 220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.045);

    // Flame whoosh when turning up
    if (heatLevel > 0.1 && this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'bandpass';
      lp.frequency.setValueAtTime(220 + heatLevel * 380, now);
      lp.Q.value = 1.2;
      const wg = this.ctx.createGain();
      wg.gain.setValueAtTime(0.001, now);
      wg.gain.linearRampToValueAtTime(0.16 * heatLevel, now + 0.06);
      wg.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      src.connect(lp);
      lp.connect(wg);
      wg.connect(this.master);
      src.start(now, Math.random(), 0.36);
    }
  }

  playPour(type = 'oil', wokTemp = 160) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Liquid glug / plop tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const baseF = type === 'soy' ? 680 : type === 'egg' ? 320 : 440;
    osc.frequency.setValueAtTime(baseF, now);
    osc.frequency.exponentialRampToValueAtTime(baseF * 1.45, now + 0.09);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.12);

    if (wokTemp > 110) {
      const mult = type === 'soy' ? 1.25 : type === 'egg' ? 1.05 : 0.65;
      this.triggerSizzleBurst(mult * Math.min(1.1, (wokTemp - 90) / 140));
    }
  }

  playDrop(type = 'rice', wokTemp = 160) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = type === 'rice' ? 'sine' : 'triangle';
    const startF = type === 'rice' ? 165 : type === 'ham' ? 280 : 520;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(startF * 0.45, now + 0.085);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(type === 'rice' ? 0.18 : 0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.1);

    if (wokTemp > 110) {
      const mult = type === 'rice' ? 1.15 : type === 'negi' ? 0.85 : 0.75;
      this.triggerSizzleBurst(mult * Math.min(1.1, (wokTemp - 95) / 140));
    }
  }

  playLadleScrape(intensity = 0.6) {
    if (!this.unlocked || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    if (now - this.lastScrapeTime < 0.075) return;
    this.lastScrapeTime = now;

    // Authentic metallic iron-on-iron "SHAKA / KAN" resonance
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900 + Math.random() * 1400;
    bp.Q.value = 6.0;

    const g = this.ctx.createGain();
    const vol = Math.min(0.14, 0.045 + intensity * 0.085);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(now, Math.random() * 2, 0.09);

    // Subtle iron bell partial
    if (Math.random() < 0.55) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 880 + Math.random() * 520;
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(vol * 0.4, now);
      og.gain.exponentialRampToValueAtTime(0.0005, now + 0.055);
      osc.connect(og);
      og.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  playWokToss(parapara = 0.5, wokTemp = 180) {
    if (!this.unlocked || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Heavy iron wok lift + trivet clank "GASHAN!"
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.14);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.24, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(og);
    og.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.17);

    // Metallic ring harmonic
    const ring = this.ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.value = 640 + Math.random() * 110;
    const rg = this.ctx.createGain();
    rg.gain.setValueAtTime(0.08, now);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    ring.connect(rg);
    rg.connect(this.master);
    ring.start(now);
    ring.stop(now + 0.24);

    // Cascading rice rain "SHAAA-PARAPARA!" after 220ms
    const rainTime = now + 0.22;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3400 + parapara * 2800;
    bp.Q.value = 1.1;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.001, rainTime);
    ng.gain.linearRampToValueAtTime(0.16, rainTime + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, rainTime + 0.34);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    src.start(rainTime, Math.random(), 0.38);

    if (wokTemp > 115) {
      this.triggerSizzleBurst(0.95);
    }
  }

  playPlateScoop() {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Gentle porcelain clink
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(1420, now + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playMomJoy(variant = 'happy') {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Distinct warm wordless musical reactions tailored to the exact cooked dish!
    const melodies = {
      happy: [523.25, 659.25, 783.99, 1046.5],
      golden: [587.33, 739.99, 880.0, 1174.66, 1318.51, 1479.98],
      crispy: [440.0, 554.37, 659.25, 880.0, 987.77],
      playful: [523.25, 587.33, 659.25, 783.99, 659.25, 1046.5],
      burnt: [392.0, 349.23, 329.63, 440.0, 523.25], // Comical surprise -> delighted chuckle!
      cold: [659.25, 880.0, 659.25, 987.77], // Bright chilly surprise twinkle -> happy!
      salty: [587.33, 659.25, 587.33, 783.99, 880.0], // Lively punchy staccato grin!
    };
    const notes = melodies[variant] || melodies.happy;
    const step = variant === 'salty' ? 0.085 : variant === 'burnt' ? 0.125 : 0.105;
    notes.forEach((freq, i) => {
      const t = now + i * step;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const over = this.ctx.createOscillator();
      over.type = 'triangle';
      over.frequency.setValueAtTime(freq * 2, t);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);

      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.025, t);
      og.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);

      osc.connect(g);
      over.connect(og);
      og.connect(g);
      g.connect(this.master);
      osc.start(t);
      over.start(t);
      osc.stop(t + 0.44);
      over.stop(t + 0.22);
    });
  }
}
