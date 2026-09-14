/** Trim legal Markdown and ensure a trailing newline so line diffs stay stable. */
export function legalBodyDeNormalize(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return '';
    return `${trimmed}\n`;
}
