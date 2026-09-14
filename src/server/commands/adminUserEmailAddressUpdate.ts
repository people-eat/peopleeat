import { and, eq, ne } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserEmailAddressUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userKlaviyoProfileSync } from '../jobs/handlers/userKlaviyoProfileSync';

/**
 * Admin direct email change (no OTP). Archives the previous address and enqueues
 * Klaviyo sync — same side effects as self-serve email verify.
 */
export async function adminUserEmailAddressUpdate(
    { adminId }: GqlSAdminMutation,
    { userId, emailAddress }: GqlSAdminMutationUserEmailAddressUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const nextEmail = emailAddress.trim();
    if (nextEmail.length === 0) {
        throw new Error('adminUserEmailAddressUpdate: emailAddress must not be empty');
    }

    try {
        const [currentUser] = await serverRuntime.db
            .select({
                emailAddress: users.emailAddress,
                previousEmailAddresses: users.previousEmailAddresses,
                status: users.status,
            })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        if (!currentUser) {
            throw new Error('adminUserEmailAddressUpdate: user not found');
        }
        if (currentUser.status === 'ANONYMIZED') {
            throw new Error('adminUserEmailAddressUpdate: user is anonymized');
        }
        if (currentUser.emailAddress === nextEmail) {
            throw new Error('adminUserEmailAddressUpdate: email unchanged');
        }

        const [taken] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(and(eq(users.emailAddress, nextEmail), ne(users.userId, userId)))
            .limit(1);
        if (taken) {
            throw new Error('adminUserEmailAddressUpdate: email already registered');
        }

        const previousEmailAddresses = [
            ...currentUser.previousEmailAddresses.filter((address) => address !== nextEmail),
            ...(currentUser.emailAddress != null ? [currentUser.emailAddress] : []),
        ];

        await serverRuntime.db.update(users).set({ emailAddress: nextEmail, previousEmailAddresses }).where(eq(users.userId, userId));

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId }),
            serverRuntime.publish.adminUpdates(),
        ]);

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
