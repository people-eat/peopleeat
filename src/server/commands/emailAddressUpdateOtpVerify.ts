import { and, desc, eq, isNull, ne } from 'drizzle-orm';

import { authEmailOtps, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationEmailAddressUpdateOtpVerifyArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userKlaviyoProfileSync } from '../jobs/handlers/userKlaviyoProfileSync';
import { authOtpCodeMatches, authOtpPepperRequire } from '../utils/authOtpUtils';

const MAX_ATTEMPTS = 5;

export async function emailAddressUpdateOtpVerify(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationEmailAddressUpdateOtpVerifyArgs,
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
            .where(and(eq(authEmailOtps.sessionId, requestingSession.sessionId), isNull(authEmailOtps.consumedAt)))
            .orderBy(desc(authEmailOtps.createdAt))
            .limit(1);

        if (!otp || otp.expiresAt.getTime() <= now.getTime()) {
            throw new Error('emailAddressUpdateOtpVerify: invalid or expired code');
        }

        if (otp.verifiedAt != null) {
            throw new Error('emailAddressUpdateOtpVerify: invalid or expired code');
        }

        if (otp.attemptCount >= MAX_ATTEMPTS) {
            throw new Error('emailAddressUpdateOtpVerify: too many attemptCount');
        }

        if (!authOtpCodeMatches(args.code.trim(), otp.codeHash, pepper)) {
            await serverRuntime.db
                .update(authEmailOtps)
                .set({ attemptCount: otp.attemptCount + 1 })
                .where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
            throw new Error('emailAddressUpdateOtpVerify: invalid or expired code');
        }

        const [currentUser] = await serverRuntime.db
            .select({ emailAddress: users.emailAddress, previousEmailAddresses: users.previousEmailAddresses })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!currentUser) {
            throw new Error('emailAddressUpdateOtpVerify: user not found');
        }
        if (currentUser.emailAddress === otp.emailAddress) {
            throw new Error('emailAddressUpdateOtpVerify: email unchanged');
        }

        const [taken] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(and(eq(users.emailAddress, otp.emailAddress), ne(users.userId, userId)))
            .limit(1);
        if (taken) {
            throw new Error('emailAddressUpdateOtpVerify: email already registered');
        }

        const previousEmailAddresses = [
            ...currentUser.previousEmailAddresses.filter((address) => address !== otp.emailAddress),
            ...(currentUser.emailAddress != null ? [currentUser.emailAddress] : []),
        ];

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.update(users).set({ emailAddress: otp.emailAddress, previousEmailAddresses }).where(eq(users.userId, userId));
            await transaction.update(authEmailOtps).set({ consumedAt: now }).where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
        });

        await serverRuntime.publish.userUpdates({ userId });
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
        await serverRuntime.publish.adminUpdates();

        try {
            await serverRuntime.jobs.enqueue(userKlaviyoProfileSync, { userId });
        } catch (enqueueError) {
            serverRuntime.log.error(enqueueError, requestingSession);
        }

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
