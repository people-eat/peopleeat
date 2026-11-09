import { pathNameSlugify } from './contentSection';
import { isNanoId } from './idCreate';

const COOK_PATH_NAME_EMPTY_FALLBACK = 'chef';

/** German umlauts before NFKD so Müller → mueller, not muller. */
function cookPathNameTransliterate(value: string): string {
    return value
        .replaceAll('ß', 'ss')
        .replaceAll('ä', 'ae')
        .replaceAll('ö', 'oe')
        .replaceAll('ü', 'ue')
        .replaceAll('Ä', 'ae')
        .replaceAll('Ö', 'oe')
        .replaceAll('Ü', 'ue');
}

export function cookPathNameSlugify(value: string): string {
    return pathNameSlugify(cookPathNameTransliterate(value.trim()));
}

/** Auto-assign from legal names. Empty after slugify becomes `chef`. */
export function cookPathNameFromNames(firstName: string, lastName: string): string {
    return cookPathNameSlugify(`${firstName}-${lastName}`) || COOK_PATH_NAME_EMPTY_FALLBACK;
}

/**
 * Manual edit / create slug. Empty after slugify throws. 20-char nanoId-shaped
 * slugs are reserved so `/chefs/<cookId>` stays an id URL.
 */
export function cookPathNameNormalize(pathName: string): string {
    const slug = cookPathNameTryNormalize(pathName);
    if (!slug) {
        throw new Error('pathName must not be empty');
    }
    return slug;
}

/** Null when empty or reserved nanoId shape (live availability uses this). */
export function cookPathNameTryNormalize(pathName: string): string | null {
    const slug = cookPathNameSlugify(pathName);
    if (!slug || isNanoId(slug)) {
        return null;
    }
    return slug;
}

export function cookPathNameCandidate(base: string, index: number): string {
    return index <= 1 ? base : `${base}-${index}`;
}
