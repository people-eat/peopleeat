import { containsPhoneNumber } from './containsPhoneNumber';
import { textNormalizeProse } from './textNormalize';

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const SCHEMED_LINK_PATTERN = /(?:https?:\/\/|www\.|mailto:|tel:)[^\s<>]+/giu;
const BARE_DOMAIN_PATTERN =
    /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.(?:com|net|org|io|app|info|me|eu|de|fr|it|nl|ch|at|uk|dev|bio|link|site|online|shop|blog|co\.uk)(?:\/[^\s]*)?/giu;
const INSTAGRAM_LABEL_PATTERN = /\b(?:ig|insta|instagram)\b\s*[:/@]\s*@?[\w.]+/giu;
const AT_HANDLE_PATTERN = /(^|[\s(])@[a-z0-9._]{2,30}\b/giu;
const PHONE_LIKE_PATTERN = /(?:\+|00)?\d(?:[\s\-./()]*\d){6,14}/gu;

function resetPattern(pattern: RegExp): RegExp {
    pattern.lastIndex = 0;
    return pattern;
}

function replaceSchemedLink(match: string): string {
    const core = match.replace(/[.,;:!?)]+$/u, '');
    const trailing = match.slice(core.length);
    return trailing.length > 0 ? ` ${trailing}` : ' ';
}

function replacePhoneLike(match: string): string {
    const digits = match.replace(/\D/gu, '');
    return digits.length >= 7 && digits.length <= 15 ? ' ' : match;
}

/**
 * Removes website links, Instagram handles, emails, and digit phone numbers from
 * cook biography prose. Spelled-out numbers are left for the summary LLM.
 */
export function cookBiographyContactStrip(text: string): string {
    const stripped = text
        .replace(EMAIL_PATTERN, ' ')
        .replace(SCHEMED_LINK_PATTERN, replaceSchemedLink)
        .replace(INSTAGRAM_LABEL_PATTERN, ' ')
        .replace(AT_HANDLE_PATTERN, '$1')
        .replace(BARE_DOMAIN_PATTERN, ' ')
        .replace(PHONE_LIKE_PATTERN, replacePhoneLike);
    if (stripped === text) {
        return text;
    }
    return textNormalizeProse(stripped.replace(/ +([.,;:!?])/gu, '$1'));
}

export function cookBiographyContactContains(text: string): boolean {
    if (containsPhoneNumber(text)) {
        return true;
    }
    return (
        resetPattern(EMAIL_PATTERN).test(text) ||
        resetPattern(INSTAGRAM_LABEL_PATTERN).test(text) ||
        resetPattern(SCHEMED_LINK_PATTERN).test(text) ||
        resetPattern(BARE_DOMAIN_PATTERN).test(text) ||
        resetPattern(AT_HANDLE_PATTERN).test(text)
    );
}

/** Persist cook biography / summary: prose normalize, then cut contact. */
export function cookBiographyNormalize(value: string): string {
    return cookBiographyContactStrip(textNormalizeProse(value));
}
