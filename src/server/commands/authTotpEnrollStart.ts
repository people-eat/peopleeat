import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authTimeBasedOneTimePasswords, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAuthTotpEnrollStartResult, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { authTotpEncryptionKeyRequire, authTotpOtpauthUrl, authTotpSecretEncrypt, authTotpSecretGenerate } from '../utils/authTotpUtils';

export async function authTotpEnrollStart(
    { userId }: GqlSUserMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthTotpEnrollStartResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    authTotpEncryptionKeyRequire();

    try {
        const [user] = await serverRuntime.db
            .select({ emailAddress: users.emailAddress })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!user?.emailAddress) {
            throw new Error('authTotpEnrollStart: user not found');
        }

        const [existing] = await serverRuntime.db
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.userId, userId))
            .limit(1);

        if (existing?.confirmedAt != null) {
            throw new Error('authTotpEnrollStart: already enabled');
        }

        const secret = authTotpSecretGenerate();
        const secretEncrypted = authTotpSecretEncrypt(secret);
        const now = new Date();

        if (existing) {
            await serverRuntime.db
                .update(authTimeBasedOneTimePasswords)
                .set({
                    secretEncrypted,
                    confirmedAt: null,
                    recoveryCodes: [],
                    lastUsedAt: null,
                    createdAt: now,
                })
                .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, existing.authTimeBasedOneTimePasswordId));
        } else {
            await serverRuntime.db.insert(authTimeBasedOneTimePasswords).values({
                authTimeBasedOneTimePasswordId: idCreate(),
                userId,
                secretEncrypted,
                confirmedAt: null,
                recoveryCodes: [],
            });
        }

        await serverRuntime.publish.userUpdates({ userId });

        return {
            otpauthUrl: authTotpOtpauthUrl(secret, user.emailAddress),
            secret,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
