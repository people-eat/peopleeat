import { and, eq, isNull } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAuthTotpEnrollConfirmResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationAuthTotpEnrollConfirmArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import {
    authTotpCodeValid,
    authTotpEncryptionKeyRequire,
    authTotpRecoveryCodesGenerate,
    authTotpRecoveryCodesHash,
    authTotpSecretDecrypt,
} from '../utils/authTotpUtils';

export async function authTotpEnrollConfirm(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationAuthTotpEnrollConfirmArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthTotpEnrollConfirmResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    authTotpEncryptionKeyRequire();

    try {
        const [row] = await serverRuntime.db
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(and(eq(authTimeBasedOneTimePasswords.userId, userId), isNull(authTimeBasedOneTimePasswords.confirmedAt)))
            .limit(1);

        if (!row) {
            throw new Error('authTotpEnrollConfirm: no pending enrollment');
        }

        const secret = authTotpSecretDecrypt(row.secretEncrypted);
        if (!authTotpCodeValid(secret, args.code)) {
            throw new Error('authTotpEnrollConfirm: invalid code');
        }

        const recoveryCodes = authTotpRecoveryCodesGenerate();
        const recoveryHashes = authTotpRecoveryCodesHash(recoveryCodes);
        const now = new Date();

        await serverRuntime.db
            .update(authTimeBasedOneTimePasswords)
            .set({
                confirmedAt: now,
                recoveryCodes: recoveryHashes,
                lastUsedAt: now,
            })
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, row.authTimeBasedOneTimePasswordId));

        await serverRuntime.publish.userUpdates({ userId });

        return { recoveryCodes };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
