import type { ServerRuntime } from '../domain/ServerRuntime';
import { publicPublishedCityNamesFindMany } from '../utils/contentPageFind';
import { publicCookCityPageMatch } from '../utils/publicCookCityPageMatch';
import type { PublicCookCityPageCandidate } from '../utils/publicCookCityPageMatch';

export async function publicCookCityPageFindOne(
    city: string | null | undefined,
    serverRuntime: ServerRuntime,
): Promise<PublicCookCityPageCandidate | null> {
    const trimmed = city?.trim() ?? '';
    if (!trimmed) return null;
    const candidates = await publicPublishedCityNamesFindMany(serverRuntime.db);
    return publicCookCityPageMatch(trimmed, candidates);
}
