import { and, eq } from 'drizzle-orm';

import { authPasskeys } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationAuthPasskeyDeleteArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function authPasskeyDelete(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationAuthPasskeyDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    try {
        const deleted = await serverRuntime.db
            .delete(authPasskeys)
            .where(and(eq(authPasskeys.authPasskeyId, args.authPasskeyId), eq(authPasskeys.userId, userId)))
            .returning({ authPasskeyId: authPasskeys.authPasskeyId });

        if (deleted.length === 0) {
            throw new Error('authPasskeyDelete: passkey not found');
        }

        await serverRuntime.publish.userUpdates({ userId });

        return {
            success: true,
            referenceId: args.authPasskeyId,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
