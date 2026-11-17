import { and, eq, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, authOauthStates, authOauthTickets, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { environmentVariables } from '../env/environmentVariablesCreate';
import {
    AUTH_OAUTH_STATE_TTL_MS,
    authFacebookAuthorizationUrlCreate,
    authFacebookLocaleFromReturnTo,
    authFacebookReturnToSafe,
    authFacebookStateSecretsCreate,
} from '../utils/authFacebookOauth';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function authFacebookStart(
    args: { sessionId: string | null; returnTo: string | undefined },
    serverRuntime: ServerRuntime,
): Promise<{ kind: 'facebook'; authorizationUrl: string } | { kind: 'back'; returnTo: string }> {
    const returnTo = authFacebookReturnToSafe(args.returnTo) ?? '/log-on';
    const locale = authFacebookLocaleFromReturnTo(returnTo);

    if (!args.sessionId) {
        return { kind: 'back', returnTo };
    }

    const enabled = await featureToggleIsEnabled('SIGN_IN_FACEBOOK', serverRuntime);
    if (!enabled) {
        return { kind: 'back', returnTo };
    }

    const [session] = await serverRuntime.db
        .select({
            sessionId: sessions.sessionId,
            userId: sessions.userId,
            impersonationReturnSessionId: sessions.impersonationReturnSessionId,
            wasTerminatedAt: sessions.wasTerminatedAt,
        })
        .from(sessions)
        .where(eq(sessions.sessionId, args.sessionId))
        .limit(1);

    if (!session || session.wasTerminatedAt != null || session.userId || session.impersonationReturnSessionId) {
        return { kind: 'back', returnTo };
    }

    const secrets = authFacebookStateSecretsCreate();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUTH_OAUTH_STATE_TTL_MS);

    await serverRuntime.db.transaction(async (transaction) => {
        await transaction.delete(authOauthStates).where(eq(authOauthStates.sessionId, args.sessionId!));
        await transaction.delete(authOauthTickets).where(eq(authOauthTickets.sessionId, args.sessionId!));
        await transaction.delete(authEmailOtps).where(and(eq(authEmailOtps.sessionId, args.sessionId!), isNull(authEmailOtps.consumedAt)));
        await transaction.insert(authOauthStates).values({
            authOauthStateId: idCreate(),
            sessionId: args.sessionId!,
            state: secrets.state,
            codeVerifier: secrets.codeVerifier,
            nonce: secrets.nonce,
            returnTo,
            expiresAt,
        });
    });

    await serverRuntime.publish.sessionUpdates({ sessionId: args.sessionId });

    return {
        kind: 'facebook',
        authorizationUrl: authFacebookAuthorizationUrlCreate({
            env: environmentVariables,
            state: secrets.state,
            locale,
        }),
    };
}
