import { inArray } from 'drizzle-orm';

import { admins, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUserType } from '../graphql/generated';

/** Resolves `AdminUserType` membership for a batch of user ids. `customer`
 * means no `Cooks` row (same split as the public profile surface); `admin` /
 * `cook` follow the matching extension tables. A user can match more than one. */
export async function adminUserTypesByUserIdFindMany(
    userIds: string[],
    db: ServerRuntime['db'],
): Promise<Map<string, GqlSAdminUserType[]>> {
    const typesByUserId = new Map<string, GqlSAdminUserType[]>();
    for (const userId of userIds) {
        typesByUserId.set(userId, []);
    }
    if (userIds.length === 0) {
        return typesByUserId;
    }

    const [adminRows, cookRows] = await Promise.all([
        db.select({ adminId: admins.adminId }).from(admins).where(inArray(admins.adminId, userIds)),
        db.select({ cookId: cooks.cookId }).from(cooks).where(inArray(cooks.cookId, userIds)),
    ]);

    const adminIds = new Set(adminRows.map((row) => row.adminId));
    const cookIds = new Set(cookRows.map((row) => row.cookId));

    for (const userId of userIds) {
        const types: GqlSAdminUserType[] = [];
        if (adminIds.has(userId)) {
            types.push('admin');
        }
        if (cookIds.has(userId)) {
            types.push('cook');
        } else {
            types.push('customer');
        }
        typesByUserId.set(userId, types);
    }

    return typesByUserId;
}
