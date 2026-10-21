import { describe, expect, it } from 'vitest';
import { audioWaveformBars, formatAudioDuration } from './audioWaveform';

describe('formatAudioDuration', () => {
    it('formats as m:ss', () => {
        expect(formatAudioDuration(0)).toBe('0:00');
        expect(formatAudioDuration(3)).toBe('0:03');
        expect(formatAudioDuration(65)).toBe('1:05');
        expect(formatAudioDuration(125.9)).toBe('2:05');
    });

    it('treats non-finite and negative values as zero', () => {
        expect(formatAudioDuration(Number.NaN)).toBe('0:00');
        expect(formatAudioDuration(-4)).toBe('0:00');
        expect(formatAudioDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
    });
});

describe('audioWaveformBars', () => {
    it('returns a stable set of bar heights for the same seed', () => {
        const a = audioWaveformBars('file_abc', 8);
        const b = audioWaveformBars('file_abc', 8);
        expect(a).toEqual(b);
        expect(a).toHaveLength(8);
        for (const height of a) {
            expect(height).toBeGreaterThan(0);
            expect(height).toBeLessThanOrEqual(1);
        }
    });

    it('differs across seeds', () => {
        expect(audioWaveformBars('a', 12)).not.toEqual(audioWaveformBars('b', 12));
    });
});
