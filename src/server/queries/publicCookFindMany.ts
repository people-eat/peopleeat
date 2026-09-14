import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicCookFindManyCriterion, GqlSPublicCookQueryFindManyArgs } from '../graphql/generated';
import { cookIsInTravelRadius } from '../utils/cookIsInTravelRadius';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';
import { publicVisibleCookIdsFindMany } from '../utils/publicVisibleCookIdsFindMany';

/** Visible + approved + ACTIVE cooks with ≥1 published meal that has an image; optional search + geo filters. */
export async function publicCookFindMany(
    args: GqlSPublicCookQueryFindManyArgs | undefined,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCook[]> {
    const criterion: GqlSPublicCookFindManyCriterion | null | undefined = args?.criterion;
    const rows = await publicVisibleCookIdsFindMany(serverRuntime.db, criterion);

    const geo = criterion?.geoCoordinates ?? null;
    const filtered = geo
        ? rows.filter((row) => cookIsInTravelRadius(row.cook, { latitude: geo.latitude, longitude: geo.longitude }))
        : rows;

    const byId = await publicCooksByIdFindMany(
        serverRuntime.db,
        filtered.map((row) => row.cookId),
    );
    return filtered.flatMap((row) => {
        const cook = byId.get(row.cookId);
        return cook ? [cook] : [];
    });
}
