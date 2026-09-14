/** Max persisted chat title length (auto-titler + manual rename). */
export const CHAT_TITLE_MAX_LENGTH = 60;

export function chatTitleNormalize(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ').slice(0, CHAT_TITLE_MAX_LENGTH);
}
