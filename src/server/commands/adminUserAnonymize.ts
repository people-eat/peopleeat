import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserAnonymizeArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userAnonymizeApply } from './userAnonymizeApply';

/**
 * Admin-triggered anonymization of any user. Same scrub as self-serve delete.
 * See docs/features/account.md.
 */
export async function adminUserAnonymize(
    { adminId }: GqlSAdminMutation,
    { userId }: GqlSAdminMutationUserAnonymizeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        await userAnonymizeApply(userId, serverRuntime);
        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
