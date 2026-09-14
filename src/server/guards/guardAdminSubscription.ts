import { eq } from 'drizzle-orm';

import { admins } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Gates `Subscription.adminUpdates`. Same membership check as
// `guardAdminMutation`, but returns the shared `admin-updates` channel so
// every connected admin UI receives catalog pushes. See
// `docs/architecture/authorization-admin.md` and
// `docs/architecture/state-synchronization.md`.
export async function guardAdminSubscription(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<AsyncIterableIterator<unknown>> {
    if (!requestingSession.userId) {
        throw new Error('Unauthorized');
    }
    const [row] = await serverRuntime.db
        .select({ adminId: admins.adminId })
        .from(admins)
        .where(eq(admins.adminId, requestingSession.userId))
        .limit(1);
    if (!row) {
        throw new Error('Unauthorized');
    }
    return serverRuntime.subscribe.to('admin-updates');
}
