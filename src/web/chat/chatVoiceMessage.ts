import { WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY } from '../../shared/whatsappVoiceMessage';
import type { GqlCFileUpload } from '../graphql/generated';

export { WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY } from '../../shared/whatsappVoiceMessage';
export { audioWaveformBars as voiceWaveformBars, formatAudioDuration as formatVoiceDuration } from '../utils/audioWaveform';

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
