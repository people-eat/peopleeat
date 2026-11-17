import { eq } from 'drizzle-orm';

import { userAnonymizeApply } from '../../commands/userAnonymizeApply';
import { users } from '../../db/schema';
import { AccountDeletedForUserEmail, accountDeletedForUserEmailSubject } from '../../email/templates/AccountDeletedForUserEmail';
import { environmentVariables } from '../../env/environmentVariablesCreate';
import { slackNotifyAccountDeletionTookPlace } from '../../slack/slackNotifyAccountDeletion';
import {
    USER_ACCOUNT_DELETION_COOL_OFF_MS,
    userAccountDeletionScheduledForResolve,
    userLastDualAcceptedEventDateTimeFind,
} from '../../utils/userDualAcceptedEventCoolOff';
import type { QueuedJobDefinition } from '../types';

interface UserAccountDeletionApplyData {
    userId: string;
}

/**
 * Applies a scheduled account deletion: marketplace cleanup + anonymize scrub,
 * then confirmation email + Slack. Reschedules when a newer dual-accepted event
 * pushed the cool-off window out. See docs/features/account.md.
 */
export const userAccountDeletionApply: QueuedJobDefinition<UserAccountDeletionApplyData> = {
    kind: 'queued',
    name: 'user-account-deletion-apply',
    handler: async ({ data, serverRuntime }) => {
        const [user] = await serverRuntime.db.select().from(users).where(eq(users.userId, data.userId)).limit(1);
        if (!user || user.status === 'ANONYMIZED' || user.accountDeletionScheduledFor == null) {
            return;
        }

        const now = new Date();
        const lastEvent = await userLastDualAcceptedEventDateTimeFind(data.userId, serverRuntime);
        if (lastEvent != null && lastEvent.getTime() > now.getTime() - USER_ACCOUNT_DELETION_COOL_OFF_MS) {
            const scheduledFor = userAccountDeletionScheduledForResolve(now, lastEvent);
            await serverRuntime.db.update(users).set({ accountDeletionScheduledFor: scheduledFor }).where(eq(users.userId, data.userId));
            await serverRuntime.jobs.enqueue(userAccountDeletionApply, { userId: data.userId }, { startAfter: scheduledFor });
            return;
        }

        const snapshot = {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddress: user.emailAddress,
            locale: user.locale,
        };

        await userAnonymizeApply(data.userId, serverRuntime);

        if (snapshot.emailAddress) {
            await serverRuntime.email.send({
                to: snapshot.emailAddress,
                subject: accountDeletedForUserEmailSubject(snapshot.locale),
                react: AccountDeletedForUserEmail({
                    locale: snapshot.locale,
                    webPageUrl: environmentVariables.webPageUrl,
                    recipientFirstName: snapshot.firstName,
                }),
                purpose: 'ACCOUNT_DELETED',
                locale: snapshot.locale,
                userId: snapshot.userId,
            });
        }

        await slackNotifyAccountDeletionTookPlace(serverRuntime, {
            userId: snapshot.userId,
            firstName: snapshot.firstName,
            lastName: snapshot.lastName,
            emailAddress: snapshot.emailAddress,
            source: 'job',
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: data.userId }), serverRuntime.publish.adminUpdates()]);
    },
    options: {
        retryLimit: 2,
        retryDelay: 60,
        expireInSeconds: 300,
    },
};
