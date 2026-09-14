import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAuthTotpChallenge, GqlSSession } from '../graphql/generated';

export async function sessionAuthTotpChallengeFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthTotpChallenge | null> {
    const [session] = await serverRuntime.db
        .select({
            pendingTotpUserId: sessions.pendingTotpUserId,
            pendingTotpExpiresAt: sessions.pendingTotpExpiresAt,
        })
        .from(sessions)
        .where(eq(sessions.sessionId, requestingSession.sessionId))
        .limit(1);

    if (!session?.pendingTotpUserId || !session.pendingTotpExpiresAt) {
        return null;
    }

    if (session.pendingTotpExpiresAt.getTime() <= Date.now()) {
        await serverRuntime.db
            .update(sessions)
            .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
            .where(eq(sessions.sessionId, requestingSession.sessionId));
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
        return null;
    }

    return { expiresAt: session.pendingTotpExpiresAt };
}
