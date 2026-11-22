class NexusAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private enabled = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(next: boolean): boolean {
    this.enabled = next;
    if (next) {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) {
        this.enabled = false;
        return false;
      }

      if (!this.oscA && !this.oscB) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 260;
        filter.Q.value = 1.2;
        filter.connect(this.masterGain);

        this.oscA = ctx.createOscillator();
        this.oscA.type = 'sine';
        this.oscA.frequency.value = 65.41; // C2

        this.oscB = ctx.createOscillator();
        this.oscB.type = 'triangle';
        this.oscB.frequency.value = 98.0; // G2

        const subGain = ctx.createGain();
        subGain.gain.value = 0.08;
        this.oscA.connect(subGain);
        this.oscB.connect(subGain);
        subGain.connect(filter);

        this.oscA.start();
        this.oscB.start();
      }

      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.35);
      this.playChime(523.25);
    } else if (this.ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playChime(freq = 440): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.18);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.14, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playClick(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);

    env.gain.setValueAtTime(0.12, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playPortalWarp(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.75);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.4);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.16, now + 0.12);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.82);
  }

  public playVictoryChord(): void {
    if (!this.enabled) return;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((n, idx) => {
      window.setTimeout(() => this.playChime(n), idx * 90);
    });
  }

  public playWeatherShift(mode: 'clear' | 'rain' | 'fog' | 'snow'): void {
    if (!this.enabled) return;
    const freqMap = {
      clear: 587.33,
      rain: 392.0,
      fog: 293.66,
      snow: 783.99,
    };
    this.playChime(freqMap[mode]);
  }

  public dispose(): void {
    try {
      this.oscA?.stop();
      this.oscB?.stop();
      void this.ctx?.close();
    } catch {
      // ignore close errors
    }
    this.oscA = null;
    this.oscB = null;
    this.masterGain = null;
    this.ctx = null;
  }
}

export const nexusAudio = new NexusAudioEngine();
