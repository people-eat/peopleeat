import { pathNameSlugify } from '../../shared/contentSection';

export interface PublicCookCityPageCandidate {
    pathName: string;
    nameDe: string;
    nameEn: string;
    nameNl: string;
}

/** Exact slug match against the German, English, or Dutch name, or path. Ambiguous hits return null. */
export function publicCookCityPageMatch(
    city: string,
    candidates: ReadonlyArray<PublicCookCityPageCandidate>,
): PublicCookCityPageCandidate | null {
    const key = pathNameSlugify(city);
    if (!key) return null;
    const matches = candidates.filter((candidate) => {
        const keys = [
            pathNameSlugify(candidate.nameDe),
            pathNameSlugify(candidate.nameEn),
            pathNameSlugify(candidate.nameNl),
            pathNameSlugify(candidate.pathName),
        ];
        return keys.some((candidateKey) => candidateKey.length > 0 && candidateKey === key);
    });
    if (matches.length !== 1) return null;
    return matches[0] ?? null;
}
