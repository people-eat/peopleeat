import { and, desc, eq, isNull } from 'drizzle-orm';

import { authEmailOtps, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationUserAnonymizeArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { authOtpCodeMatches, authOtpPepperRequire } from '../utils/authOtpUtils';
import { userAnonymizeApply } from './userAnonymizeApply';

const MAX_ATTEMPTS = 5;
const PURPOSE = 'ACCOUNT_DELETE';

/**
 * Self-serve account deletion. The code must match an unconsumed account-delete
 * OTP emailed to the current address. See docs/features/account.md.
 */
export async function userAnonymize(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationUserAnonymizeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    const pepper = authOtpPepperRequire();
    const now = new Date();

    try {
        const [otp] = await serverRuntime.db
            .select()
            .from(authEmailOtps)
            .where(
                and(
                    eq(authEmailOtps.sessionId, requestingSession.sessionId),
                    eq(authEmailOtps.purpose, PURPOSE),
                    isNull(authEmailOtps.consumedAt),
                ),
            )
            .orderBy(desc(authEmailOtps.createdAt))
            .limit(1);

        if (!otp || otp.expiresAt.getTime() <= now.getTime() || otp.verifiedAt != null) {
            throw new Error('userAnonymize: invalid or expired code');
        }
        if (otp.attemptCount >= MAX_ATTEMPTS) {
            throw new Error('userAnonymize: too many attemptCount');
        }
        if (!authOtpCodeMatches(args.code.trim(), otp.codeHash, pepper)) {
            await serverRuntime.db
                .update(authEmailOtps)
                .set({ attemptCount: otp.attemptCount + 1 })
                .where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
            throw new Error('userAnonymize: invalid or expired code');
        }

        const [currentUser] = await serverRuntime.db
            .select({ emailAddress: users.emailAddress })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (currentUser?.emailAddress != null && currentUser.emailAddress !== otp.emailAddress) {
            throw new Error('userAnonymize: invalid or expired code');
        }

        await userAnonymizeApply(userId, serverRuntime);
        await serverRuntime.db.update(authEmailOtps).set({ consumedAt: now }).where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.adminUpdates(),
            serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId }),
        ]);
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
