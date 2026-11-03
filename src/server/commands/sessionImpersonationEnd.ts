import { and, eq, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { admins, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

/**
 * End admin Sign in as: soft-terminate the impersonation session and restore
 * the admin cookie via `pendingSessionCookieId`. If the return session was
 * terminated, mint a fresh session bound to the admin.
 */
export async function sessionImpersonationEnd(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSMutationResult> {
    try {
        const returnSessionId = requestingSession.impersonationReturnSessionId;
        if (!returnSessionId) {
            throw new Error('sessionImpersonationEnd: not impersonating');
        }

        const [impersonationRow] = await serverRuntime.db
            .select({
                userAgent: sessions.userAgent,
                ipHash: sessions.ipHash,
                isBot: sessions.isBot,
            })
            .from(sessions)
            .where(eq(sessions.sessionId, requestingSession.sessionId))
            .limit(1);

        const [returnSession] = await serverRuntime.db
            .select({
                sessionId: sessions.sessionId,
                userId: sessions.userId,
                wasTerminatedAt: sessions.wasTerminatedAt,
            })
            .from(sessions)
            .where(eq(sessions.sessionId, returnSessionId))
            .limit(1);

        if (!returnSession?.userId) {
            throw new Error('sessionImpersonationEnd: return session missing admin user');
        }

        const adminId = returnSession.userId;
        const [adminRow] = await serverRuntime.db
            .select({ adminId: admins.adminId })
            .from(admins)
            .where(eq(admins.adminId, adminId))
            .limit(1);

        if (!adminRow) {
            throw new Error('sessionImpersonationEnd: return user is no longer an admin');
        }

        await serverRuntime.db
            .update(sessions)
            .set({ wasTerminatedAt: new Date() })
            .where(and(eq(sessions.sessionId, requestingSession.sessionId), isNull(sessions.wasTerminatedAt)));

        let restoredSessionId = returnSession.sessionId;
        if (returnSession.wasTerminatedAt != null) {
            restoredSessionId = idCreate();
            await serverRuntime.db.insert(sessions).values({
                sessionId: restoredSessionId,
                userId: adminId,
                userAgent: impersonationRow?.userAgent,
                ipHash: impersonationRow?.ipHash,
                isBot: impersonationRow?.isBot ?? false,
            });
        }

        requestingSession.pendingSessionCookieId = restoredSessionId;

        serverRuntime.log.info(
            `sessionImpersonationEnd adminId=${adminId} impersonationSessionId=${requestingSession.sessionId} restoredSessionId=${restoredSessionId}`,
            requestingSession,
        );
        await serverRuntime.publish.adminUpdates();
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: restoredSessionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
