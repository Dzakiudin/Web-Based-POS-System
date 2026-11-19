// Web Audio API POS sound synthesizer - zero external dependencies, zero latency
class SoundController {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    private getContext(): AudioContext | null {
        if (!this.enabled) return null;
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

    /** Subtle crisp click/beep when adding an item to the cart or scanning */
    playBeep(frequency = 960, duration = 0.06) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch {
            // AudioContext not allowed before user gesture
        }
    }

    /** Satisfying harmonic chord when a payment / sale succeeds */
    playSuccess() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            // Two-tone cheerful major chord: E5 -> G5
            const notes = [
                { freq: 659.25, time: 0, dur: 0.12 },
                { freq: 783.99, time: 0.08, dur: 0.18 },
                { freq: 1046.50, time: 0.16, dur: 0.28 },
            ];

            notes.forEach(({ freq, time, dur }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

                gain.gain.setValueAtTime(0.15, ctx.currentTime + time);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + time);
                osc.stop(ctx.currentTime + time + dur);
            });
        } catch {
            // AudioContext fallback
        }
    }

    /** Gentle low tone when an item is removed or an error occurs */
    playWarning() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch {
            // AudioContext fallback
        }
    }

    toggle(enabled?: boolean) {
        this.enabled = enabled !== undefined ? enabled : !this.enabled;
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

export const sound = new SoundController();
