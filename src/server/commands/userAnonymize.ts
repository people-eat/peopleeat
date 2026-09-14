import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { userAnonymizeApply } from './userAnonymizeApply';

/**
 * Self-serve account deletion (customer copy: "delete account").
 * Anonymizes the signed-in user. See docs/features/account.md.
 */
export async function userAnonymize(
    { userId }: GqlSUserMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await userAnonymizeApply(userId, serverRuntime);
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
