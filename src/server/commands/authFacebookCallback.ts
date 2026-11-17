import { and, eq } from 'drizzle-orm';

import { emailNormalize } from '../../shared/emailNormalize';
import { idCreate } from '../../shared/idCreate';
import { authOauthIdentities, authOauthStates, authOauthTickets, sessions, users } from '../db/schema';
import type { AuthOauthSignInFailReason } from '../domain/authOauth';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { EnvironmentVariables } from '../env/EnvironmentVariables';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSSession } from '../graphql/generated';
import type { AuthFacebookProfileSnapshot } from '../utils/authFacebookOauth';
import {
    AUTH_OAUTH_TICKET_TTL_MS,
    authFacebookMeFetch,
    authFacebookReturnToSafe,
    authFacebookReturnToWithError,
    authFacebookTokenExchange,
} from '../utils/authFacebookOauth';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionPrimaryAuthComplete } from './sessionPrimaryAuthComplete';

export type AuthFacebookCallbackResult = {
    sessionId: string | null;
    returnTo: string;
};

export async function authFacebookCallback(
    args: {
        code: string | null;
        state: string | null;
        error: string | null;
        cookieSessionId: string | null;
        fetchImpl?: typeof fetch;
        env?: Pick<EnvironmentVariables, 'facebookOauthClientId' | 'facebookOauthClientSecret' | 'webPageUrl'>;
    },
    serverRuntime: ServerRuntime,
): Promise<AuthFacebookCallbackResult> {
    const fallbackReturnTo = '/log-on';
    const env = args.env ?? environmentVariables;
    const enabled = await featureToggleIsEnabled('SIGN_IN_FACEBOOK', serverRuntime);
    if (!enabled) {
        return fail(serverRuntime, args.cookieSessionId, fallbackReturnTo, 'toggle_off');
    }

    if (args.error === 'access_denied') {
        const deniedState = args.state ? await stateFind(serverRuntime, args.state) : null;
        const returnTo = deniedState?.returnTo ?? fallbackReturnTo;
        if (deniedState) {
            await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, deniedState.authOauthStateId));
        }
        return fail(serverRuntime, deniedState?.sessionId ?? args.cookieSessionId, returnTo, 'denied');
    }

    if (!args.code || !args.state) {
        return fail(serverRuntime, args.cookieSessionId, fallbackReturnTo, 'invalid_state');
    }

    const stateRow = await stateFind(serverRuntime, args.state);
    if (!stateRow || stateRow.expiresAt.getTime() <= Date.now()) {
        if (stateRow) {
            await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));
        }
        return fail(serverRuntime, stateRow?.sessionId ?? args.cookieSessionId, stateRow?.returnTo ?? fallbackReturnTo, 'invalid_state');
    }

    const returnTo = authFacebookReturnToSafe(stateRow.returnTo) ?? fallbackReturnTo;
    const sessionId = stateRow.sessionId;

    const [session] = await serverRuntime.db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    if (!session || session.wasTerminatedAt != null) {
        await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));
        return fail(serverRuntime, sessionId, returnTo, 'invalid_state');
    }
    if (session.userId || session.impersonationReturnSessionId) {
        await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));
        return { sessionId, returnTo };
    }

    await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));

    let snapshot: AuthFacebookProfileSnapshot;
    try {
        const tokens = await authFacebookTokenExchange({
            env,
            code: args.code,
            fetchImpl: args.fetchImpl,
        });
        snapshot = await authFacebookMeFetch({
            accessToken: tokens.accessToken,
            clientSecret: env.facebookOauthClientSecret,
            fetchImpl: args.fetchImpl,
        });
        snapshot = { ...snapshot, emailAddress: emailNormalize(snapshot.emailAddress) };
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('missing email')) {
            serverRuntime.log.warn('authFacebookCallback: Facebook email missing', { sessionId });
            return fail(serverRuntime, sessionId, returnTo, 'unverified_email');
        }
        serverRuntime.log.warn('authFacebookCallback: token exchange failed', { sessionId });
        serverRuntime.log.error(error, { sessionId });
        return fail(serverRuntime, sessionId, returnTo, 'token');
    }

    const requestingSession = { sessionId } as GqlSSession;

    const [identity] = await serverRuntime.db
        .select()
        .from(authOauthIdentities)
        .where(and(eq(authOauthIdentities.provider, 'FACEBOOK'), eq(authOauthIdentities.subject, snapshot.subject)))
        .limit(1);

    const [emailUser] = await serverRuntime.db
        .select({ userId: users.userId, status: users.status, emailAddress: users.emailAddress })
        .from(users)
        .where(eq(users.emailAddress, snapshot.emailAddress))
        .limit(1);

    if (identity && emailUser && identity.userId !== emailUser.userId) {
        serverRuntime.log.warn('authFacebookCallback: identity/email conflict', { sessionId });
        return fail(serverRuntime, sessionId, returnTo, 'conflict');
    }

    const existingUserId = identity?.userId ?? emailUser?.userId;
    if (existingUserId) {
        const [existing] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, existingUserId))
            .limit(1);
        if (!existing || existing.status === 'ANONYMIZED') {
            return fail(serverRuntime, sessionId, returnTo, 'anonymized');
        }

        const userEnabled = await featureToggleIsEnabled('SIGN_IN_FACEBOOK', serverRuntime, existing.userId);
        if (!userEnabled) {
            return fail(serverRuntime, sessionId, returnTo, 'toggle_off');
        }

        if (!identity) {
            await serverRuntime.db.insert(authOauthIdentities).values({
                authOauthIdentityId: idCreate(),
                userId: existing.userId,
                provider: 'FACEBOOK',
                subject: snapshot.subject,
            });
        }

        await sessionPrimaryAuthComplete(sessionId, existing.userId, requestingSession, serverRuntime);
        await sessionEventCreate(serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
            payload: { provider: 'FACEBOOK', outcome: 'sign_in' },
        });
        return { sessionId, returnTo };
    }

    const now = new Date();
    await serverRuntime.db.transaction(async (transaction) => {
        await transaction.delete(authOauthTickets).where(eq(authOauthTickets.sessionId, sessionId));
        await transaction.insert(authOauthTickets).values({
            authOauthTicketId: idCreate(),
            sessionId,
            provider: 'FACEBOOK',
            subject: snapshot.subject,
            emailAddress: snapshot.emailAddress,
            firstName: snapshot.firstName,
            lastName: snapshot.lastName,
            phoneNumber: null,
            birthDate: null,
            verifiedAt: now,
            expiresAt: new Date(now.getTime() + AUTH_OAUTH_TICKET_TTL_MS),
        });
    });
    await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
        payload: { provider: 'FACEBOOK', outcome: 'registration_ticket' },
    });
    await serverRuntime.publish.sessionUpdates({ sessionId });
    return { sessionId, returnTo };
}

async function stateFind(serverRuntime: ServerRuntime, state: string) {
    const [row] = await serverRuntime.db.select().from(authOauthStates).where(eq(authOauthStates.state, state)).limit(1);
    return row ?? null;
}

async function fail(
    serverRuntime: ServerRuntime,
    sessionId: string | null,
    returnTo: string,
    reason: AuthOauthSignInFailReason,
): Promise<AuthFacebookCallbackResult> {
    if (sessionId) {
        await sessionEventCreate(serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_SIGN_IN_FAILED',
            payload: { provider: 'FACEBOOK', reason },
        });
    }
    return { sessionId, returnTo: authFacebookReturnToWithError(returnTo) };
}
