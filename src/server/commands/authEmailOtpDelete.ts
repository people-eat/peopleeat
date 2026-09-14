import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { authEmailOtps } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationAuthEmailOtpDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function authEmailOtpDelete(
    args: GqlSMutationAuthEmailOtpDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const [row] = await serverRuntime.db
            .select({
                authEmailOtpId: authEmailOtps.authEmailOtpId,
                verifiedAt: authEmailOtps.verifiedAt,
            })
            .from(authEmailOtps)
            .where(
                and(
                    eq(authEmailOtps.authEmailOtpId, args.authEmailOtpId),
                    eq(authEmailOtps.sessionId, requestingSession.sessionId),
                    isNull(authEmailOtps.consumedAt),
                ),
            )
            .limit(1);

        if (!row) {
            throw new Error('authEmailOtpDelete: not found');
        }

        if (row.verifiedAt) {
            // Registration ticket discard: remove entirely so a new email can be requested.
            await serverRuntime.db
                .delete(authEmailOtps)
                .where(and(eq(authEmailOtps.authEmailOtpId, args.authEmailOtpId), isNotNull(authEmailOtps.verifiedAt)));
        } else {
            // Soft-dismiss: keep the code so a retry can send the same OTP again.
            await serverRuntime.db
                .update(authEmailOtps)
                .set({ dismissedAt: new Date() })
                .where(eq(authEmailOtps.authEmailOtpId, args.authEmailOtpId));
        }

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: args.authEmailOtpId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
