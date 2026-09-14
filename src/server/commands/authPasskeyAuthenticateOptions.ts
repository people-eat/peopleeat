// `@peculiar/x509` (via `@simplewebauthn/server`) needs `Reflect.getMetadata`
// before `tsyringe` loads. Keep this import first; `reflectMetadataForTsyringe`
// in `vite.config.ts` also injects the polyfill into the Nitro SSR chunk.
import 'reflect-metadata';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

import { idCreate } from '../../shared/idCreate';
import { authWebAuthnChallenges } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { webAuthnRpId } from '../utils/webAuthnUtils';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function authPasskeyAuthenticateOptions(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<unknown> {
    try {
        const options = await generateAuthenticationOptions({
            rpID: webAuthnRpId(),
            userVerification: 'preferred',
        });

        await serverRuntime.db.insert(authWebAuthnChallenges).values({
            authWebAuthnChallengeId: idCreate(),
            challenge: options.challenge,
            type: 'authenticate',
            sessionId: requestingSession.sessionId,
            expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
        });

        return options;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
