import { and, eq, isNull } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function authTotpEnrollCancel(
    { userId }: GqlSUserMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(authTimeBasedOneTimePasswords)
            .where(and(eq(authTimeBasedOneTimePasswords.userId, userId), isNull(authTimeBasedOneTimePasswords.confirmedAt)))
            .returning({ authTimeBasedOneTimePasswordId: authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId });

        if (deleted.length === 0) {
            throw new Error('authTotpEnrollCancel: no pending enrollment');
        }

        await serverRuntime.publish.userUpdates({ userId });

        return { success: true, referenceId: deleted[0]!.authTimeBasedOneTimePasswordId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
