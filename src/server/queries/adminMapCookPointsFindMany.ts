import { eq, isNotNull } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMapCookPoint } from '../graphql/generated';
import { adminMapCookStatusDerive } from './adminMapCookStatusDerive';

export async function adminMapCookPointsFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminMapCookPoint[]> {
    const rows = await serverRuntime.db
        .select({
            cookId: cooks.cookId,
            stageName: cooks.stageName,
            isVisible: cooks.isVisible,
            isApprovedByAdmin: cooks.isApprovedByAdmin,
            maximumTravelDistance: cooks.maximumTravelDistance,
            exactTravelOriginAddress: cooks.exactTravelOriginAddress,
            firstName: users.firstName,
            status: users.status,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(isNotNull(cooks.exactTravelOriginAddress));

    return rows.flatMap((row) => {
        const address = row.exactTravelOriginAddress;
        if (!address) return [];
        const stageName = row.stageName?.trim();
        return [
            {
                cookId: row.cookId,
                latitude: address.latitude,
                longitude: address.longitude,
                displayName: stageName && stageName.length > 0 ? stageName : row.firstName,
                maximumTravelDistance: row.maximumTravelDistance ?? null,
                mapStatus: adminMapCookStatusDerive(row, row.status),
            },
        ];
    });
}
