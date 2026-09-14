import { and, eq, isNotNull } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationAuthTotpDisableArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { authTotpCodeValid, authTotpEncryptionKeyRequire, authTotpSecretDecrypt } from '../utils/authTotpUtils';

export async function authTotpDisable(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationAuthTotpDisableArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    authTotpEncryptionKeyRequire();

    try {
        const [confirmed] = await serverRuntime.db
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(and(eq(authTimeBasedOneTimePasswords.userId, userId), isNotNull(authTimeBasedOneTimePasswords.confirmedAt)))
            .limit(1);

        if (!confirmed) {
            throw new Error('authTotpDisable: not enabled');
        }

        const secret = authTotpSecretDecrypt(confirmed.secretEncrypted);
        if (!authTotpCodeValid(secret, args.code)) {
            throw new Error('authTotpDisable: invalid code');
        }

        await serverRuntime.db
            .delete(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, confirmed.authTimeBasedOneTimePasswordId));

        await serverRuntime.publish.userUpdates({ userId });

        return { success: true, referenceId: confirmed.authTimeBasedOneTimePasswordId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
