class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', delay = 0, gainVal = 0.06) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playVoiceJoin() {
    this.playTone(523.25, 0.11, 'triangle', 0, 0.07); // C5
    this.playTone(659.25, 0.15, 'triangle', 0.08, 0.07); // E5
  }

  playVoiceLeave() {
    this.playTone(587.33, 0.11, 'triangle', 0, 0.06); // D5
    this.playTone(440.0, 0.16, 'triangle', 0.08, 0.06); // A4
  }

  playMute(isMuted: boolean) {
    if (isMuted) {
      this.playTone(392.0, 0.08, 'sine', 0, 0.05);
      this.playTone(311.13, 0.09, 'sine', 0.06, 0.05);
    } else {
      this.playTone(349.23, 0.08, 'sine', 0, 0.05);
      this.playTone(466.16, 0.09, 'sine', 0.06, 0.05);
    }
  }

  playMessageSend() {
    this.playTone(660, 0.06, 'sine', 0, 0.03);
  }

  playSuperReact() {
    this.playTone(587.33, 0.08, 'triangle', 0, 0.05);
    this.playTone(880.0, 0.12, 'triangle', 0.06, 0.06);
    this.playTone(1174.66, 0.16, 'sine', 0.12, 0.05);
  }

  playSoundboard(clipId: string) {
    switch (clipId) {
      case 'airhorn':
        this.playTone(466.16, 0.14, 'sawtooth', 0, 0.07);
        this.playTone(466.16, 0.14, 'sawtooth', 0.16, 0.07);
        this.playTone(466.16, 0.32, 'sawtooth', 0.32, 0.08);
        break;
      case 'gg':
        this.playTone(523.25, 0.1, 'triangle', 0, 0.07);
        this.playTone(659.25, 0.1, 'triangle', 0.09, 0.07);
        this.playTone(783.99, 0.1, 'triangle', 0.18, 0.07);
        this.playTone(1046.5, 0.25, 'triangle', 0.27, 0.08);
        break;
      case 'drumroll':
        for (let i = 0; i < 6; i++) {
          this.playTone(140 + i * 18, 0.05, 'square', i * 0.06, 0.04);
        }
        this.playTone(523.25, 0.24, 'triangle', 0.38, 0.08);
        break;
      case 'trombone':
        this.playTone(392.0, 0.18, 'sawtooth', 0, 0.05);
        this.playTone(369.99, 0.18, 'sawtooth', 0.2, 0.05);
        this.playTone(349.23, 0.18, 'sawtooth', 0.4, 0.05);
        this.playTone(329.63, 0.42, 'sawtooth', 0.6, 0.06);
        break;
      case 'laser':
        this.playTone(1200, 0.06, 'sawtooth', 0, 0.06);
        this.playTone(680, 0.07, 'sawtooth', 0.05, 0.05);
        this.playTone(280, 0.12, 'sawtooth', 0.11, 0.04);
        break;
      case 'levelup':
        this.playTone(440, 0.07, 'square', 0, 0.04);
        this.playTone(554.37, 0.07, 'square', 0.07, 0.04);
        this.playTone(659.25, 0.07, 'square', 0.14, 0.04);
        this.playTone(880, 0.22, 'square', 0.21, 0.05);
        break;
      case 'boost':
        this.playTone(523.25, 0.1, 'sine', 0, 0.06);
        this.playTone(783.99, 0.12, 'sine', 0.08, 0.07);
        this.playTone(1046.5, 0.2, 'sine', 0.16, 0.08);
        this.playTone(1318.5, 0.28, 'triangle', 0.24, 0.06);
        break;
      default:
        this.playTone(587.33, 0.08, 'triangle', 0, 0.06);
        this.playTone(880.0, 0.16, 'triangle', 0.08, 0.07);
        break;
    }
  }

  playEntranceSound(entranceId?: string) {
    if (!entranceId || entranceId === 'default') {
      this.playVoiceJoin();
      return;
    }
    this.playSoundboard(entranceId);
  }
}

export const soundEngine = new SoundEngine();
