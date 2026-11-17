import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyAccountDeletionIntent } from '../slack/slackNotifyAccountDeletion';

/**
 * Fired when the user clicks delete account on the account page. Slack only.
 * See docs/features/account.md.
 */
export async function userAccountDeletionIntent(
    { userId }: GqlSUserMutation,
    _args: Record<string, never>,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);

    try {
        const [currentUser] = await serverRuntime.db
            .select({
                firstName: users.firstName,
                lastName: users.lastName,
                emailAddress: users.emailAddress,
                status: users.status,
            })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!currentUser) {
            throw new Error('userAccountDeletionIntent: user not found');
        }
        if (currentUser.status === 'ANONYMIZED') {
            throw new Error('userAccountDeletionIntent: already anonymized');
        }

        await slackNotifyAccountDeletionIntent(serverRuntime, {
            userId,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            emailAddress: currentUser.emailAddress,
        });

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
