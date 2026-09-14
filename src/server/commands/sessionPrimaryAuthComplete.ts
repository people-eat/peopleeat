import { and, eq, isNotNull } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { authTotpPendingExpiresAt } from '../utils/authTotpUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionUserBind } from './sessionUserBind';

/**
 * After primary auth: bind immediately when the user has no confirmed TOTP;
 * otherwise park `pendingTotpUserId` and leave the session anonymous.
 */
export async function sessionPrimaryAuthComplete(
    sessionId: string,
    userId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<'bound' | 'totpPending'> {
    const [totp] = await serverRuntime.db
        .select({ authTimeBasedOneTimePasswordId: authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId })
        .from(authTimeBasedOneTimePasswords)
        .where(and(eq(authTimeBasedOneTimePasswords.userId, userId), isNotNull(authTimeBasedOneTimePasswords.confirmedAt)))
        .limit(1);

    if (!totp) {
        await sessionUserBind(sessionId, userId, requestingSession, serverRuntime);
        return 'bound';
    }

    const expiresAt = authTotpPendingExpiresAt();
    await serverRuntime.db
        .update(sessions)
        .set({ pendingTotpUserId: userId, pendingTotpExpiresAt: expiresAt })
        .where(eq(sessions.sessionId, sessionId));
    await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'AUTH_TOTP_CHALLENGE_PENDING',
        payload: {},
    });
    await serverRuntime.publish.sessionUpdates({ sessionId });
    return 'totpPending';
}
