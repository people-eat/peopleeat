import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSSession } from '../graphql/generated';

// Gates the cook write namespace (`UserMutation.cook`). Throws when the session
// user has no `Cooks` row. Stamps `cookId` (= `userId`) onto the parent via
// module augmentation in `extensions.ts` (not in the SDL) for downstream
// commands. Read-side equivalent: `User.cook` returns null instead of throwing.
export async function guardCookMutation(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSCookMutation> {
    if (!requestingSession.userId) {
        throw new Error('Unauthorized');
    }
    const [row] = await serverRuntime.db
        .select({ cookId: cooks.cookId })
        .from(cooks)
        .where(eq(cooks.cookId, requestingSession.userId))
        .limit(1);
    if (!row) {
        throw new Error('Unauthorized');
    }
    return { cookId: requestingSession.userId } as GqlSCookMutation;
}
