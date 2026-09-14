// `@peculiar/x509` (via `@simplewebauthn/server`) needs `Reflect.getMetadata`
// before `tsyringe` loads. Keep this import first; `reflectMetadataForTsyringe`
// in `vite.config.ts` also injects the polyfill into the Nitro SSR chunk.
import 'reflect-metadata';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { and, eq, gt } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authPasskeys, authWebAuthnChallenges } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationAuthPasskeyRegisterVerifyArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { webAuthnOrigin, webAuthnRpId } from '../utils/webAuthnUtils';

export async function authPasskeyRegisterVerify(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationAuthPasskeyRegisterVerifyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    const response = args.response as RegistrationResponseJSON;

    try {
        const [challengeRow] = await serverRuntime.db
            .select()
            .from(authWebAuthnChallenges)
            .where(
                and(
                    eq(authWebAuthnChallenges.sessionId, requestingSession.sessionId),
                    eq(authWebAuthnChallenges.type, 'register'),
                    eq(authWebAuthnChallenges.userId, userId),
                    gt(authWebAuthnChallenges.expiresAt, new Date()),
                ),
            )
            .limit(1);

        if (!challengeRow) {
            serverRuntime.log.warn('authPasskeyRegisterVerify: challenge not found or expired', requestingSession);
            return { success: false };
        }

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: webAuthnOrigin(),
            expectedRPID: webAuthnRpId(),
        });

        if (!verification.verified) {
            serverRuntime.log.warn('authPasskeyRegisterVerify: verification failed', requestingSession);
            return { success: false };
        }

        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .delete(authWebAuthnChallenges)
                .where(eq(authWebAuthnChallenges.authWebAuthnChallengeId, challengeRow.authWebAuthnChallengeId));
            await transaction.insert(authPasskeys).values({
                authPasskeyId: idCreate(),
                userId,
                credentialId: credential.id,
                publicKey: Buffer.from(credential.publicKey),
                counter: credential.counter,
                transports: credential.transports ? [...credential.transports] : null,
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp,
            });
        });

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: credential.id };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
