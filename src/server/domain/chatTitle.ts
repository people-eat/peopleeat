import { textNormalizeSingleLine } from '../../shared/textNormalize';

/** Max persisted chat title length (auto-titler + manual rename). */
export const CHAT_TITLE_MAX_LENGTH = 60;

export function chatTitleNormalize(raw: string): string {
    return textNormalizeSingleLine(raw).slice(0, CHAT_TITLE_MAX_LENGTH);
}
