import { capitalizeFirstLetter } from './capitalizeFirstLetter';

/** Trim ends and collapse every run of whitespace to a single space (single-line fields). */
export function textNormalizeSingleLine(value: string): string {
    return value.trim().replace(/\s+/gu, ' ');
}

/**
 * Single-line normalize, then capitalize the first letter. Empty stays empty.
 * Use for names, titles, occasions, subjects, and other short display strings.
 */
export function textNormalizeTitled(value: string): string {
    return capitalizeFirstLetter(textNormalizeSingleLine(value));
}

/**
 * Trim ends, collapse horizontal whitespace (spaces/tabs) without joining lines,
 * strip spaces adjacent to newlines, and collapse 3+ consecutive newlines to a
 * blank line. For multiline prose.
 */
export function textNormalizeProse(value: string): string {
    return value
        .replace(/\r\n/gu, '\n')
        .replace(/\r/gu, '\n')
        .trim()
        .replace(/[^\S\n]+/gu, ' ')
        .replace(/ *\n */gu, '\n')
        .replace(/\n{3,}/gu, '\n\n');
}

/** Prose normalize, then capitalize the first letter. Empty stays empty. */
export function textNormalizeProseTitled(value: string): string {
    return capitalizeFirstLetter(textNormalizeProse(value));
}

/** Like `textNormalizeTitled`, but blank / nullish input becomes `null`. */
export function textNormalizeTitledOrNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const normalized = textNormalizeTitled(value);
    return normalized.length === 0 ? null : normalized;
}
