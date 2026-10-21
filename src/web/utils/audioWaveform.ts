/** Clock-style duration for audio players (`0:03`, `1:05`). */
export function formatAudioDuration(totalSec: number): string {
    const safe = Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Deterministic bar heights in (0, 1] seeded from an id string — enough to
 * look like a speech waveform without decoding audio in the browser.
 */
export function audioWaveformBars(seed: string, barCount = 40): number[] {
    let state = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        state ^= seed.charCodeAt(i);
        state = Math.imul(state, 16777619);
    }
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        const unit = ((state >>> 0) % 1000) / 1000;
        // Bias toward mid heights so the strip reads as speech, not noise.
        bars.push(0.22 + unit * 0.78);
    }
    return bars;
}
