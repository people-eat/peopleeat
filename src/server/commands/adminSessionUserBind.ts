import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationSessionUserBindArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/**
 * Admin impersonation: mint a new cookie session bound to a target ACTIVE user.
 * The admin session stays intact; `/api/graphql` swaps the HttpOnly cookie via
 * `pendingSessionCookieId`. Exit is `sessionImpersonationEnd`.
 */
export async function adminSessionUserBind(
    { adminId }: GqlSAdminMutation,
    { userId }: GqlSAdminMutationSessionUserBindArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        if (requestingSession.impersonationReturnSessionId) {
            throw new Error('adminSessionUserBind: already impersonating');
        }

        if (userId === adminId) {
            throw new Error('adminSessionUserBind: cannot bind to the current admin');
        }

        const [target] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        if (!target) {
            throw new Error('adminSessionUserBind: user not found');
        }
        if (target.status !== 'ACTIVE') {
            throw new Error('adminSessionUserBind: user is not ACTIVE');
        }

        const [adminSession] = await serverRuntime.db
            .select({
                sessionId: sessions.sessionId,
                userAgent: sessions.userAgent,
                ipHash: sessions.ipHash,
                isBot: sessions.isBot,
            })
            .from(sessions)
            .where(eq(sessions.sessionId, requestingSession.sessionId))
            .limit(1);

        if (!adminSession) {
            throw new Error('adminSessionUserBind: admin session not found');
        }

        const impersonationSessionId = idCreate();
        await serverRuntime.db.insert(sessions).values({
            sessionId: impersonationSessionId,
            userId: target.userId,
            impersonationReturnSessionId: adminSession.sessionId,
            userAgent: adminSession.userAgent,
            ipHash: adminSession.ipHash,
            isBot: adminSession.isBot,
        });

        requestingSession.pendingSessionCookieId = impersonationSessionId;

        serverRuntime.log.info(
            `adminSessionUserBind adminId=${adminId} targetUserId=${target.userId} impersonationSessionId=${impersonationSessionId}`,
            requestingSession,
        );
        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: impersonationSessionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
