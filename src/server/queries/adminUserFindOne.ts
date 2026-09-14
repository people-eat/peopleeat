import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUser, GqlSAdminUserArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';

export async function adminUserFindOne(
    args: GqlSAdminUserArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminUser | null> {
    try {
        const [row] = await serverRuntime.db.select().from(users).where(eq(users.userId, args.userId)).limit(1);
        if (!row) {
            return null;
        }
        const typesByUserId = await adminUserTypesByUserIdFindMany([row.userId], serverRuntime.db);
        return toGqlAdminUser(row, typesByUserId.get(row.userId) ?? ['customer']);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
