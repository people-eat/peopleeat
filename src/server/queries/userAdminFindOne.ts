import { eq } from 'drizzle-orm';

import { admins } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdmin, GqlSSession, GqlSUser } from '../graphql/generated';

// Admin read namespace, resolved only for the session's own admin user. Null for
// anonymous sessions, non-admin logged-in users, and cross-user lookups — that
// nullability is what lets public pages ask "is the current user an admin?"
// with a single field check instead of catching an exception. See
// `docs/architecture/authorization-admin.md`.
export async function userAdminFindOne(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdmin | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }
    const [row] = await serverRuntime.db
        .select({ adminId: admins.adminId })
        .from(admins)
        .where(eq(admins.adminId, parentUser.userId))
        .limit(1);
    return row ? ({ adminId: row.adminId } as GqlSAdmin) : null;
}
