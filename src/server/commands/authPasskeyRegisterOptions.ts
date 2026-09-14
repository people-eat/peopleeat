// `@peculiar/x509` (via `@simplewebauthn/server`) needs `Reflect.getMetadata`
// before `tsyringe` loads. Keep this import first; `reflectMetadataForTsyringe`
// in `vite.config.ts` also injects the polyfill into the Nitro SSR chunk.
import 'reflect-metadata';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authPasskeys, authWebAuthnChallenges, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUserMutation } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { webAuthnRpId, webAuthnRpName } from '../utils/webAuthnUtils';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function authPasskeyRegisterOptions(
    { userId }: GqlSUserMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<unknown> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    try {
        const [user] = await serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1);
        if (!user?.emailAddress) {
            throw new Error('authPasskeyRegisterOptions: user not found');
        }

        const existing = await serverRuntime.db.select().from(authPasskeys).where(eq(authPasskeys.userId, userId));

        const options = await generateRegistrationOptions({
            rpName: webAuthnRpName(),
            rpID: webAuthnRpId(),
            userName: user.emailAddress,
            userDisplayName: `${user.firstName} ${user.lastName}`.trim(),
            userID: new TextEncoder().encode(user.userId),
            attestationType: 'none',
            excludeCredentials: existing.map((passkey) => ({
                id: passkey.credentialId,
                transports: passkey.transports ?? undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        await serverRuntime.db.insert(authWebAuthnChallenges).values({
            authWebAuthnChallengeId: idCreate(),
            challenge: options.challenge,
            type: 'register',
            sessionId: requestingSession.sessionId,
            userId,
            expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
        });

        return options;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
