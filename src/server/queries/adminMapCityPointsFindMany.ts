import { cities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMapCityPoint } from '../graphql/generated';

export async function adminMapCityPointsFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminMapCityPoint[]> {
    const rows = await serverRuntime.db
        .select({
            cityId: cities.cityId,
            latitude: cities.latitude,
            longitude: cities.longitude,
            nameDe: cities.nameDe,
            nameEn: cities.nameEn,
            publishedAt: cities.publishedAt,
        })
        .from(cities);

    return rows.map((row) => ({
        cityId: row.cityId,
        latitude: row.latitude,
        longitude: row.longitude,
        nameDe: row.nameDe,
        nameEn: row.nameEn,
        published: row.publishedAt != null,
    }));
}
