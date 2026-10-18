import { describe, expect, it } from 'vitest';
import {
    formatVoiceDuration,
    isVoiceNoteMessage,
    voiceNoteCaption,
    voiceWaveformBars,
    WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY,
} from './chatVoiceMessage';

describe('isVoiceNoteMessage', () => {
    it('is true for a single audio attachment', () => {
        expect(isVoiceNoteMessage([{ mediaType: 'audio/ogg' }])).toBe(true);
        expect(isVoiceNoteMessage([{ mediaType: 'Audio/MPEG' }])).toBe(true);
    });

    it('is false for empty, multi, or non-audio attachments', () => {
        expect(isVoiceNoteMessage([])).toBe(false);
        expect(isVoiceNoteMessage([{ mediaType: 'image/jpeg' }])).toBe(false);
        expect(isVoiceNoteMessage([{ mediaType: 'audio/ogg' }, { mediaType: 'audio/ogg' }])).toBe(false);
        expect(isVoiceNoteMessage([{ mediaType: 'application/pdf' }])).toBe(false);
    });
});

describe('voiceNoteCaption', () => {
    it('hides empty and synthetic preview bodies', () => {
        expect(voiceNoteCaption('')).toBeNull();
        expect(voiceNoteCaption('  ')).toBeNull();
        expect(voiceNoteCaption(WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY)).toBeNull();
    });

    it('keeps real captions', () => {
        expect(voiceNoteCaption('Bitte zurückrufen')).toBe('Bitte zurückrufen');
    });
});

describe('formatVoiceDuration', () => {
    it('formats as m:ss', () => {
        expect(formatVoiceDuration(0)).toBe('0:00');
        expect(formatVoiceDuration(3)).toBe('0:03');
        expect(formatVoiceDuration(65)).toBe('1:05');
        expect(formatVoiceDuration(125.9)).toBe('2:05');
    });

    it('treats non-finite and negative values as zero', () => {
        expect(formatVoiceDuration(Number.NaN)).toBe('0:00');
        expect(formatVoiceDuration(-4)).toBe('0:00');
        expect(formatVoiceDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
    });
});

describe('voiceWaveformBars', () => {
    it('returns a stable set of bar heights for the same seed', () => {
        const a = voiceWaveformBars('file_abc', 8);
        const b = voiceWaveformBars('file_abc', 8);
        expect(a).toEqual(b);
        expect(a).toHaveLength(8);
        for (const height of a) {
            expect(height).toBeGreaterThan(0);
            expect(height).toBeLessThanOrEqual(1);
        }
    });

    it('differs across seeds', () => {
        expect(voiceWaveformBars('a', 12)).not.toEqual(voiceWaveformBars('b', 12));
    });
});
