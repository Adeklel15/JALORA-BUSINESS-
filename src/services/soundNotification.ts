/**
 * JALORA — Audio & Transaction Notification Service
 * Premium sound synthesized via Web Audio API with idempotency lock,
 * user preference persistence, and device vibration support.
 * 
 * Created by Abdul Jalil
 */

export interface SoundConfig {
  soundEnabled: boolean;
  volume: number; // 0.0 to 1.0
  vibrateEnabled: boolean;
}

const SOUND_STORAGE_KEY = 'jalora_sound_config';

const DEFAULT_SOUND_CONFIG: SoundConfig = {
  soundEnabled: true,
  volume: 0.8,
  vibrateEnabled: true,
};

class SoundNotificationService {
  private audioCtx: AudioContext | null = null;
  private isLocked = false;
  private lockTimeout: any = null;

  public getSoundConfig(): SoundConfig {
    if (typeof window === 'undefined') return DEFAULT_SOUND_CONFIG;
    try {
      const stored = localStorage.getItem(SOUND_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SOUND_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SOUND_CONFIG;
  }

  public saveSoundConfig(config: Partial<SoundConfig>): SoundConfig {
    const current = this.getSoundConfig();
    const updated = { ...current, ...config };
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('[JALORA Sound] AudioContext initialization skipped:', e);
      return null;
    }
  }

  /**
   * Plays a warm, crisp two-tone chime (A5 880Hz -> E6 1318.5Hz)
   * Designed to sound like a modern, pleasant POS transaction confirmation.
   * Debounced with an 800ms lock to avoid double sounds from rapid clicks or retries.
   */
  public playTransactionSuccessSound(forceTest = false) {
    const config = this.getSoundConfig();
    if (!config.soundEnabled && !forceTest) {
      return;
    }

    // Prevent double sounds
    if (this.isLocked && !forceTest) {
      return;
    }

    this.isLocked = true;
    clearTimeout(this.lockTimeout);
    this.lockTimeout = setTimeout(() => {
      this.isLocked = false;
    }, 850);

    // Haptic feedback for mobile if enabled
    if (config.vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // ignore
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const volumeLevel = Math.max(0.05, Math.min(1.0, config.volume));

      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volumeLevel * 0.28, now);
      masterGain.connect(ctx.destination);

      // Tone 1: 880 Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      // Gentle exponential decay
      gain1.gain.setValueAtTime(1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Tone 2: 1318.51 Hz (E6) - Harmonious 5th above
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.09);
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.setValueAtTime(1, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.48);

      // Subtle third sparkle: 1760 Hz (A6)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1760, now + 0.16);
      gain3.gain.setValueAtTime(0.0001, now);
      gain3.gain.setValueAtTime(0.4, now + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.16);
      osc3.stop(now + 0.45);
    } catch (e) {
      console.warn('[JALORA Sound] Playback failed:', e);
    }
  }

  public playTestSound() {
    this.playTransactionSuccessSound(true);
  }

  /**
   * Broadcast visual transaction toast
   */
  public notifyTransactionSuccess(details: {
    invoiceNumber: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
  }) {
    if (typeof window === 'undefined') return;
    this.playTransactionSuccessSound();
    const event = new CustomEvent('jalora-transaction-toast', {
      detail: {
        type: 'success',
        title: 'Transaksi Berhasil!',
        ...details,
      },
    });
    window.dispatchEvent(event);
  }

  public notifyTransactionError(message: string) {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('jalora-transaction-toast', {
      detail: {
        type: 'error',
        title: 'Transaksi Gagal Disimpan',
        message,
      },
    });
    window.dispatchEvent(event);
  }
}

export const soundService = new SoundNotificationService();
