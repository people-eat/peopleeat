import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserAnonymizeArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyAccountDeletionRequested, slackNotifyAccountDeletionTookPlace } from '../slack/slackNotifyAccountDeletion';
import { userAccountDeletionJobCancel } from '../utils/userAccountDeletionJobCancel';
import { userAccountDeletionSchedule } from '../utils/userAccountDeletionSchedule';
import { userDualAcceptedEventCoolOffAssert } from '../utils/userDualAcceptedEventCoolOff';
import { userAnonymizeApply } from './userAnonymizeApply';

/**
 * Admin-triggered anonymization. IMMEDIATE is cool-off gated then scrubs;
 * SCHEDULE uses the same waiting-period formula as self-serve.
 * See docs/features/account.md.
 */
export async function adminUserAnonymize(
    { adminId }: GqlSAdminMutation,
    { userId, mode }: GqlSAdminMutationUserAnonymizeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [target] = await serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1);
        if (!target) {
            throw new Error('adminUserAnonymize: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserAnonymize: already anonymized');
        }

        if (mode === 'SCHEDULE') {
            const scheduledFor = await userAccountDeletionSchedule(userId, serverRuntime);
            await slackNotifyAccountDeletionRequested(serverRuntime, {
                userId,
                firstName: target.firstName,
                lastName: target.lastName,
                emailAddress: target.emailAddress,
                scheduledFor,
                source: 'admin',
            });
            await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
            return { success: true, referenceId: userId };
        }

        await userDualAcceptedEventCoolOffAssert(userId, serverRuntime, 'adminUserAnonymize');
        await userAccountDeletionJobCancel(serverRuntime, userId);

        const snapshot = {
            firstName: target.firstName,
            lastName: target.lastName,
            emailAddress: target.emailAddress,
        };
        await userAnonymizeApply(userId, serverRuntime);
        await slackNotifyAccountDeletionTookPlace(serverRuntime, {
            userId,
            firstName: snapshot.firstName,
            lastName: snapshot.lastName,
            emailAddress: snapshot.emailAddress,
            source: 'admin',
        });
        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
