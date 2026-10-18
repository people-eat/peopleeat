import { WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY } from '../../shared/whatsappVoiceMessage';
import type { GqlCFileUpload } from '../graphql/generated';

export { WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY } from '../../shared/whatsappVoiceMessage';

/** True when the message is a single audio attachment (WhatsApp voice-note shape). */
export function isVoiceNoteMessage(attachments: ReadonlyArray<Pick<GqlCFileUpload, 'mediaType'>>): boolean {
    return attachments.length === 1 && attachments[0]!.mediaType.toLowerCase().startsWith('audio/');
}

/** Caption text to show under the player (skips the synthetic inbox preview label). */
export function voiceNoteCaption(body: string): string | null {
    const trimmed = body.trim();
    if (!trimmed || trimmed === WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY) return null;
    return trimmed;
}

/** Clock-style duration for voice bubbles (`0:03`, `1:05`). */
export function formatVoiceDuration(totalSec: number): string {
    const safe = Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Deterministic bar heights in (0, 1] seeded from an id string — enough to
 * look like a WhatsApp waveform without decoding Opus in the browser.
 */
export function voiceWaveformBars(seed: string, barCount = 40): number[] {
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
