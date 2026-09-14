// `@peculiar/x509` (via `@simplewebauthn/server`) needs `Reflect.getMetadata`
// before `tsyringe` loads. Keep this import first; `reflectMetadataForTsyringe`
// in `vite.config.ts` also injects the polyfill into the Nitro SSR chunk.
import 'reflect-metadata';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { and, eq, gt } from 'drizzle-orm';

import { authPasskeys, authWebAuthnChallenges, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationAuthPasskeyAuthenticateVerifyArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { webAuthnOrigin, webAuthnRpId } from '../utils/webAuthnUtils';
import { sessionPrimaryAuthComplete } from './sessionPrimaryAuthComplete';

export async function authPasskeyAuthenticateVerify(
    args: GqlSMutationAuthPasskeyAuthenticateVerifyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const response = args.response as AuthenticationResponseJSON;

    try {
        const [challengeRow] = await serverRuntime.db
            .select()
            .from(authWebAuthnChallenges)
            .where(
                and(
                    eq(authWebAuthnChallenges.sessionId, requestingSession.sessionId),
                    eq(authWebAuthnChallenges.type, 'authenticate'),
                    gt(authWebAuthnChallenges.expiresAt, new Date()),
                ),
            )
            .limit(1);

        if (!challengeRow) {
            serverRuntime.log.warn('authPasskeyAuthenticateVerify: challenge not found or expired', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_PASSKEY_SIGN_IN_FAILED',
                payload: {},
            });
            return { success: false };
        }

        const [passkey] = await serverRuntime.db.select().from(authPasskeys).where(eq(authPasskeys.credentialId, response.id)).limit(1);

        if (!passkey) {
            serverRuntime.log.warn('authPasskeyAuthenticateVerify: unknown credential', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_PASSKEY_SIGN_IN_FAILED',
                payload: {},
            });
            return { success: false };
        }

        const [passkeyUser] = await serverRuntime.db
            .select({ status: users.status })
            .from(users)
            .where(eq(users.userId, passkey.userId))
            .limit(1);

        if (!passkeyUser || passkeyUser.status === 'ANONYMIZED') {
            serverRuntime.log.warn('authPasskeyAuthenticateVerify: user anonymized or missing', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_PASSKEY_SIGN_IN_FAILED',
                payload: {},
            });
            return { success: false };
        }

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: webAuthnOrigin(),
            expectedRPID: webAuthnRpId(),
            credential: {
                id: passkey.credentialId,
                publicKey: new Uint8Array(passkey.publicKey),
                counter: passkey.counter,
                transports: passkey.transports ?? undefined,
            },
        });

        if (!verification.verified) {
            serverRuntime.log.warn('authPasskeyAuthenticateVerify: verification failed', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_PASSKEY_SIGN_IN_FAILED',
                payload: {},
            });
            return { success: false };
        }

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .delete(authWebAuthnChallenges)
                .where(eq(authWebAuthnChallenges.authWebAuthnChallengeId, challengeRow.authWebAuthnChallengeId));
            await transaction
                .update(authPasskeys)
                .set({ counter: verification.authenticationInfo.newCounter })
                .where(eq(authPasskeys.authPasskeyId, passkey.authPasskeyId));
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'AUTH_PASSKEY_SIGN_IN_SUCCEEDED',
            payload: {},
        });
        await sessionPrimaryAuthComplete(requestingSession.sessionId, passkey.userId, requestingSession, serverRuntime);

        return { success: true, referenceId: passkey.userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
